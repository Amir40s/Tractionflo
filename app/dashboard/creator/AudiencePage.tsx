"use client";

import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  MoreHorizontal,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";
import NotificationBell from "../../components/NotificationBell";
import { CreatorDateRangeSelect, type AdminDateRangePreset } from "../admin/shared";
import { formatCreatorInteger } from "../creator-insights";
import { BrandMark } from "./BrandMark";
import type {
  AudienceMetric,
  AudienceProfile,
  AudienceSegment,
  AudienceSegmentFilter,
  AudienceSource,
  CreatorLiveSummary,
  InstagramSettingsConversation,
} from "./types";

const audienceMetricToneClasses = {

  green: "bg-[#eafaf0] text-[#13a84f]",
  blue: "bg-[#eef4ff] text-[#246bff]",
  orange: "bg-[#fff3e6] text-[#ff850d]",
};


const audienceSegmentFilters: { id: AudienceSegmentFilter; label: string }[] = [
  { id: "all", label: "Most engaged" },
  { id: "high-intent", label: "High intent" },
  { id: "engaged", label: "Engaged" },
  { id: "needs-attention", label: "Needs attention" },
  { id: "contacts", label: "Contacts" },
];

type AudienceGrowthRange = "7d" | "30d" | "90d";

const audienceGrowthRangeOptions = [
  { value: "7d", label: "This week", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
] satisfies { value: AudienceGrowthRange; label: string; days: number }[];

function getAudienceGrowthRangeLabel(value: AudienceGrowthRange) {
  return audienceGrowthRangeOptions.find((option) => option.value === value)?.label || "This week";
}

function getAudienceGrowthRangeDays(value: AudienceGrowthRange) {
  return audienceGrowthRangeOptions.find((option) => option.value === value)?.days || 7;
}


function isAudienceProfileInSegment(person: AudienceProfile, filter: AudienceSegmentFilter) {
  const tag = person.tag.toLowerCase();

  switch (filter) {
    case "high-intent":
      return tag.includes("high intent");
    case "engaged":
      return tag.includes("engaged");
    case "needs-attention":
      return tag.includes("needs attention");
    case "contacts":
      return tag.includes("contact");
    case "all":
    default:
      return true;
  }
}

function getAudienceConversationActivityTime(conversation: InstagramSettingsConversation, rangeStart: number, rangeEnd: number) {
  const messageTimes = conversation.messages
    .map((message) => new Date(message.time).getTime())
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp >= rangeStart && timestamp <= rangeEnd);

  if (messageTimes.length > 0) {
    return Math.min(...messageTimes);
  }

  const updatedTime = conversation.updated_time ? new Date(conversation.updated_time).getTime() : 0;
  return Number.isFinite(updatedTime) && updatedTime >= rangeStart && updatedTime <= rangeEnd ? updatedTime : null;
}

function buildAudienceGrowthSeries(conversations: InstagramSettingsConversation[], range: AudienceGrowthRange) {
  const pointCount: number = 7;
  const dayMs = 86_400_000;
  const days = getAudienceGrowthRangeDays(range);
  const now = Date.now();
  const rangeStart = now - (days - 1) * dayMs;
  const rangeSpan = Math.max(1, now - rangeStart);
  const firstSeenByParticipant = new Map<string, number>();

  conversations.forEach((conversation) => {
    const activityTime = getAudienceConversationActivityTime(conversation, rangeStart, now);

    if (activityTime === null) {
      return;
    }

    const participantKey = conversation.participant.id || conversation.id;
    const existingTime = firstSeenByParticipant.get(participantKey);

    if (existingTime === undefined || activityTime < existingTime) {
      firstSeenByParticipant.set(participantKey, activityTime);
    }
  });

  const participantTimes = Array.from(firstSeenByParticipant.values());

  return Array.from({ length: pointCount }, (_, index) => {
    const progress = pointCount === 1 ? 1 : index / (pointCount - 1);
    const bucketEnd = rangeStart + rangeSpan * progress;

    return {
      label: new Date(bucketEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: participantTimes.filter((activityTime) => activityTime <= bucketEnd).length,
    };
  });
}


function AudienceMetricStrip({ metrics }: { metrics: AudienceMetric[] }) {
  return (
    <section className="mt-6 grid overflow-hidden rounded-[12px] border border-[#e5e8f0] bg-white shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:grid-cols-2 xl:h-[112px] xl:grid-cols-5">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const isLast = index === metrics.length - 1;
        const hasMobileRightBorder = index % 2 === 0 && !isLast;
        const hasDesktopRightBorder = !isLast;

        return (
          <div
            key={metric.label}
            className={`flex min-h-[86px] items-center gap-4 border-[#e5e8f0] px-4 sm:min-h-[96px] sm:px-5 xl:min-h-0 xl:gap-5 xl:px-5 ${
              !isLast ? "border-b xl:border-b-0" : ""
            } ${
              hasMobileRightBorder ? "sm:border-r" : "sm:border-r-0"
            } ${
              hasDesktopRightBorder ? "xl:border-r" : "xl:border-r-0"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] sm:h-11 sm:w-11 sm:rounded-[13px] ${audienceMetricToneClasses[metric.tone]}`}>
              <Icon size={21} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#596175]">{metric.label}</p>
              <p className="mt-2 text-[19px] font-extrabold leading-none text-black sm:text-[20px]">{metric.value}</p>
              <p className="mt-2 flex min-w-0 items-center gap-1 text-[10px] font-semibold text-[#13a84f]">
                <TrendingUp size={11} strokeWidth={2.5} />
                {metric.change}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function AudienceGrowthChart({ conversations }: { conversations: InstagramSettingsConversation[] }) {
  const [growthRange, setGrowthRange] = useState<AudienceGrowthRange>("7d");
  const series = buildAudienceGrowthSeries(conversations, growthRange);
  const chartTop = 24;
  const chartBottom = 198;
  const chartHeight = chartBottom - chartTop;
  const currentAudience = series[series.length - 1]?.value || 0;
  const maxValue = Math.max(...series.map((point) => point.value), 1);
  const yLabels = [maxValue, Math.ceil(maxValue * 0.66), Math.ceil(maxValue * 0.33), 0];
  const points = series.map((point, index) => {
    const x = 60 + index * (580 / Math.max(1, series.length - 1));
    const y = chartBottom - (point.value / maxValue) * chartHeight;

    return { ...point, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const lastPoint = points[points.length - 1];

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-black">Audience growth</h2>
        <label className="relative flex h-8 min-w-[118px] cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black">
          <span>{getAudienceGrowthRangeLabel(growthRange)}</span>
          <ChevronDown size={14} strokeWidth={2.5} />
          <select
            aria-label="Audience growth range"
            value={growthRange}
            onChange={(event) => setGrowthRange(event.target.value as AudienceGrowthRange)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {audienceGrowthRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="-mx-2 overflow-x-auto px-2 no-scrollbar">
        <svg viewBox="0 0 690 242" className="h-[210px] min-w-[560px] w-full overflow-visible sm:h-[238px] sm:min-w-[620px]">
          <defs>
            <linearGradient id="audienceGrowthFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6654ff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <filter id="audienceDotGlow" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[24, 82, 140, 198].map((y) => (
            <line key={y} x1="58" x2="640" y1={y} y2={y} stroke="#e7eaf2" strokeWidth="1" />
          ))}

          {yLabels.map((label, index) => (
            <text key={`${label}-${index}`} x="16" y={32 + index * 58} fill="#46506a" fontSize="12" fontWeight="600">
              {formatCreatorInteger(label)}
            </text>
          ))}

          <path
            d={`${path} L640 198 L60 198 Z`}
            fill="url(#audienceGrowthFill)"
          />
          <path
            d={path}
            fill="none"
            stroke="#4b3cff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {points.slice(0, -1).map((point) => (
            <circle key={point.x} cx={point.x} cy={point.y} r="3.5" fill="#4b3cff" />
          ))}
          <circle cx={lastPoint.x} cy={lastPoint.y} r="9" fill="#edeaff" filter="url(#audienceDotGlow)" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="5.5" fill="#4b3cff" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill="#ffffff" />

          {points.map((point) => (
            <text key={point.label} x={point.x} y="232" textAnchor="middle" fill="#46506a" fontSize="12" fontWeight="600">
              {point.label}
            </text>
          ))}
        </svg>

        <div className="pointer-events-none absolute right-8 top-[126px] hidden h-[58px] w-[94px] rounded-[8px] bg-white px-3 py-2.5 shadow-[0_24px_60px_rgba(82,67,210,0.16)] xl:block">
          <p className="text-[10px] font-semibold text-black">Current</p>
          <p className="mt-1 text-[15px] font-extrabold leading-none text-[#4b3cff]">{formatCreatorInteger(currentAudience)}</p>
        </div>
      </div>
    </section>
  );
}

function AudienceSourceCard({ sources, totalAudience }: { sources: AudienceSource[]; totalAudience: number }) {
  const instagramSource = sources[0];

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Audience by source</h2>

      <div className="mt-5 grid items-center gap-6 md:grid-cols-[190px_minmax(0,1fr)]">
        <div
          className="relative mx-auto h-[166px] w-[166px] rounded-full"
          style={{
            background: totalAudience > 0 ? `conic-gradient(${instagramSource?.color || "#3f3cff"} 0deg 360deg)` : "#eff1f6",
          }}
        >
          <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-[21px] font-extrabold leading-none text-black">{formatCreatorInteger(totalAudience)}</span>
            <span className="mt-2 text-[12px] font-medium text-[#596175]">Total</span>
          </div>
        </div>

        <div className="space-y-4">
          {sources.map((source) => (
            <div key={source.label} className="grid grid-cols-[minmax(0,1fr)_54px_64px] items-center gap-3 text-[12px]">
              <div className="flex items-center gap-3 font-medium text-black">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                {source.label}
              </div>
              <span className="text-right font-medium text-black">{source.percent}</span>
              <span className="text-right font-medium text-[#46506a]">{source.count}</span>
            </div>
          ))}
        </div>
      </div>

      {sources.length === 0 ? (
        <p className="mt-5 text-center text-[12px] font-medium text-[#596175]">No audience source data yet.</p>
      ) : null}
    </section>
  );
}

function AudienceAvatar({ src, name }: { src: string; name: string }) {
  const [failedSrc, setFailedSrc] = useState("");
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "IG";

  if (!src || failedSrc === src) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[10px] font-extrabold text-white">
        {initials}
      </span>
    );
  }

  return (
    // Instagram profile pictures are short-lived CDN URLs, so render them directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="h-9 w-9 shrink-0 rounded-full object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}

function TopAudienceCard({
  people,
  activeFilter,
  onFilterChange,
}: {
  people: AudienceProfile[];
  activeFilter: AudienceSegmentFilter;
  onFilterChange: (filter: AudienceSegmentFilter) => void;
}) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Top audience</h2>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {audienceSegmentFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onFilterChange(filter.id)}
            className={`h-6 rounded-full px-3 text-[11px] font-bold ${
              activeFilter === filter.id ? "bg-[#f0edff] text-[#4b3cff]" : "bg-[#f3f4f8] text-[#31394f]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="hidden grid-cols-[minmax(210px,1fr)_110px_120px_110px_28px] px-2 pb-2 text-[10px] font-medium text-[#596175] md:grid">
          <span />
          <span>Engagement</span>
          <span>Last active</span>
          <span />
          <span />
        </div>

        {people.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#d7deeb] bg-white p-6 text-center">
            <Users className="mx-auto text-[#3044ff]" size={26} strokeWidth={2.35} />
            <p className="mt-3 text-[12px] font-semibold text-[#596175]">
              {activeFilter === "all" ? "No real audience members loaded yet." : "No audience members match this filter."}
            </p>
          </div>
        ) : people.map((person, index) => (
          <div
            key={person.name}
            className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-2 py-2.5 md:grid-cols-[minmax(210px,1fr)_110px_120px_110px_28px] md:items-center ${
              index > 0 ? "border-t border-[#edf0f6]" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <AudienceAvatar src={person.avatarUrl} name={person.name} />
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold leading-tight text-black">{person.name}</p>
                <p className="mt-1 truncate text-[11px] font-medium text-[#46506a]">{person.handle}</p>
              </div>
            </div>
            <div className="col-start-1 flex items-center gap-2 text-[12px] font-medium text-black md:col-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-[#13a84f]" />
              {person.engagement}
            </div>
            <p className="col-start-1 text-[12px] font-medium text-[#46506a] md:col-auto">{person.active}</p>
            <span className={`col-start-1 w-max rounded-[7px] px-2.5 py-1 text-[11px] font-medium md:col-auto ${person.tagTone}`}>
              {person.tag}
            </span>
            <button type="button" aria-label={`More actions for ${person.name}`} className="col-start-2 row-start-1 justify-self-end text-[#1f2638] md:col-auto md:row-auto md:justify-self-auto">
              <MoreHorizontal size={16} strokeWidth={2.4} />
            </button>
          </div>
        ))}
      </div>

    </section>
  );
}

function AudienceSegmentsCard({ segments }: { segments: AudienceSegment[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-black">Audience segments</h2>
      </div>

      <div className="mt-4">
        {segments.map((segment, index) => {
          const Icon = segment.icon;
          return (
            <div
              key={segment.label}
              className={`flex items-center gap-3 py-3 ${index > 0 ? "border-t border-[#edf0f6]" : ""}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${segment.tone}`}>
                <Icon size={19} strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold leading-tight text-black">{segment.label}</p>
                <p className="mt-1 truncate text-[11px] font-medium text-[#46506a]">{segment.detail}</p>
              </div>
              <div className="w-[62px] text-right">
                <p className="text-[12px] font-extrabold text-black">{segment.count}</p>
                <p className={`mt-1 text-[10px] font-extrabold ${segment.negative ? "text-[#df405b]" : "text-[#13a84f]"}`}>
                  {segment.negative ? "↘" : "↗"} {segment.change}
                </p>
              </div>
              <ArrowRight size={15} className="shrink-0 text-[#1f2638]" strokeWidth={2.2} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AudiencePage({
  summary,
  isLoading,
  error,
  dateRangePreset,
  onDateRangeChange,
}: {
  summary: CreatorLiveSummary;
  isLoading: boolean;
  error: string;
  dateRangePreset: AdminDateRangePreset;
  onDateRangeChange: (preset: AdminDateRangePreset) => void;
}) {
  const [audienceFilter, setAudienceFilter] = useState<AudienceSegmentFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filteredTopAudience = summary.topAudience.filter((person) => isAudienceProfileInSegment(person, audienceFilter));
  const activeFilterCount = audienceFilter === "all" ? 0 : 1;

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[30px] font-extrabold leading-none text-black sm:text-[34px]">Audience</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#596175]">
              Understand your audience. Grow your revenue.
            </p>
          </div>

          <div className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <CreatorDateRangeSelect
              dateRangePreset={dateRangePreset}
              onDateRangeChange={onDateRangeChange}
              className="h-11 px-4 sm:h-12 sm:w-[252px] sm:px-5 sm:text-[13px]"
            />
            <div className="relative">
              <button
                type="button"
                aria-expanded={isFilterOpen}
                onClick={() => setIsFilterOpen((open) => !open)}
                className={`flex h-11 w-[78px] items-center justify-center gap-2 rounded-[9px] border text-[12px] font-extrabold shadow-[0_12px_36px_rgba(20,28,53,0.025)] transition sm:h-12 sm:w-[94px] sm:text-[13px] ${
                  activeFilterCount > 0
                    ? "border-[#c8bfff] bg-[#f0edff] text-[#3044ff]"
                    : "border-[#e0e4ef] bg-white text-black hover:bg-[#f6f7fb]"
                }`}
              >
                <SlidersHorizontal size={15} strokeWidth={2.4} />
                Filter
              </button>

              {isFilterOpen ? (
                <div className="absolute right-0 top-[52px] z-30 w-[260px] rounded-[12px] border border-[#dde3ee] bg-white p-3 text-black shadow-[0_24px_70px_rgba(20,28,53,0.16)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[12px] font-extrabold text-black">Filter audience</h2>
                    <button
                      type="button"
                      onClick={() => setAudienceFilter("all")}
                      className="text-[11px] font-extrabold text-[#3044ff]"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {audienceSegmentFilters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setAudienceFilter(filter.id)}
                        className={`flex h-9 items-center justify-between rounded-[9px] border px-3 text-left text-[11px] font-extrabold transition ${
                          audienceFilter === filter.id
                            ? "border-[#c8bfff] bg-[#f0edff] text-[#3044ff]"
                            : "border-[#edf0f6] bg-white text-[#31394f] hover:bg-[#f8f9fd]"
                        }`}
                      >
                        {filter.label}
                        <span className="rounded-full bg-[#eff1f6] px-2 py-0.5 text-[10px] text-[#596175]">
                          {summary.topAudience.filter((person) => isAudienceProfileInSegment(person, filter.id)).length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <NotificationBell
              buttonClassName="relative flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.025)] transition hover:bg-[#f6f7fb] sm:h-12 sm:w-12"
            />
          </div>
        </header>

        {(isLoading || error) && (
          <div className="mt-4 rounded-[10px] border border-[#edf0f6] bg-white px-4 py-3 text-[12px] font-semibold text-[#46506a] shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            {isLoading ? "Loading real audience data..." : error}
          </div>
        )}

        <AudienceMetricStrip metrics={summary.audienceMetrics} />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(390px,0.98fr)]">
          <div className="relative">
            <AudienceGrowthChart conversations={summary.conversations} />
          </div>
          <AudienceSourceCard sources={summary.audienceSources} totalAudience={summary.totalConversationCount} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(390px,0.98fr)]">
          <TopAudienceCard people={filteredTopAudience} activeFilter={audienceFilter} onFilterChange={setAudienceFilter} />
          <AudienceSegmentsCard segments={summary.audienceSegments} />
        </div>
      </div>
    </main>
  );
}
