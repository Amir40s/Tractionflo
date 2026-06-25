"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Crown, MessageSquare, Play, ShoppingCart, Sparkles, TriangleAlert, Users } from "lucide-react";
import NotificationBell from "../../components/NotificationBell";
import { adminDateRangeOptions, type AdminDateRangePreset, getAdminDateRangeLabel, getAdminRangeLabel, readDashboardJsonResponse } from "../admin/shared";
import { formatCreatorInteger, formatCreatorMoney, formatCreatorPercent, truncateCreatorText } from "../creator-insights";
import type { AccountProfile, Opportunity, PipelineStep, RecentActivityItem, SuperAdminConnectedAccountApiRow, SuperAdminConnectedAccountsResponse, SuperAdminPage } from "./types";
import { BrandMark } from "./Chrome";

function getAdminRowNumber(value?: string) {
  const numericValue = Number((value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getCreatorAdminRows(data: SuperAdminConnectedAccountsResponse | null) {
  return (data?.rows || []).filter((row) => row.source !== "instagram");
}

type SuperAdminOverviewSummary = {
  dateRangeLabel: string;
  estimatedRevenue: number;
  opportunityCount: number;
  dashboardOpportunities: Opportunity[];
  dashboardPipeline: PipelineStep[];
  recentActivity: RecentActivityItem[];
  opportunityAvatarIds: number[];
  notificationCount: number;
};

function getSuperAdminRowTimestamp(row: SuperAdminConnectedAccountApiRow) {
  const timestamp = new Date(row.lastActiveAt || row.createdAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSuperAdminRowAvatarNumber(row: SuperAdminConnectedAccountApiRow, index = 0) {
  const seed = `${row.id}${row.name}${row.detail}${index}`;
  const total = seed.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return (total % 65) + 1;
}

function getSuperAdminOpportunityCount(row: SuperAdminConnectedAccountApiRow) {
  return Math.max(0, row.opportunityCount || getAdminRowNumber(row.opportunities));
}

function getSuperAdminOpportunityValue(row: SuperAdminConnectedAccountApiRow) {
  const opportunityCount = getSuperAdminOpportunityCount(row);
  const messageCount = getAdminRowNumber(row.messages);
  const metadataRevenue = Math.max(0, row.revenueAmount || 0);
  const signalValue = opportunityCount > 0 ? 1800 + opportunityCount * 300 + Math.min(300, messageCount * 25) : 0;
  const activityValue = messageCount > 0 ? Math.min(2400, 900 + messageCount * 75) : 0;

  return Math.max(metadataRevenue, signalValue, activityValue);
}

function getSuperAdminOpportunityTone(row: SuperAdminConnectedAccountApiRow): Opportunity["tone"] {
  if (row.riskLevel === "High") {
    return "red";
  }

  if (row.accountStatus === "trial") {
    return "orange";
  }

  return row.instagram === "Connected" ? "blue" : "purple";
}

function buildSuperAdminOverviewSummary(
  data: SuperAdminConnectedAccountsResponse | null,
  dateRangePreset: AdminDateRangePreset
): SuperAdminOverviewSummary {
  const metrics = data?.metrics;
  const creatorRows = getCreatorAdminRows(data).sort((first, second) => getSuperAdminRowTimestamp(second) - getSuperAdminRowTimestamp(first));
  const connectedCount = metrics?.totalConnected || creatorRows.filter((row) => row.instagram === "Connected").length;
  const totalConversations = metrics?.totalConversations || creatorRows.reduce((sum, row) => sum + getAdminRowNumber(row.conversations), 0);
  const totalMessages = metrics?.totalMessages || creatorRows.reduce((sum, row) => sum + getAdminRowNumber(row.messages), 0);
  const rowsWithMessages = creatorRows.filter((row) => getAdminRowNumber(row.messages) > 0).length;
  const riskRows = creatorRows.filter((row) => row.riskSignal && row.riskSignal !== "Healthy");
  const signalRows = creatorRows
    .filter((row) => getSuperAdminOpportunityCount(row) > 0 || getSuperAdminOpportunityValue(row) > 0)
    .sort((first, second) => {
      const opportunityDifference = getSuperAdminOpportunityCount(second) - getSuperAdminOpportunityCount(first);

      if (opportunityDifference !== 0) {
        return opportunityDifference;
      }

      const valueDifference = getSuperAdminOpportunityValue(second) - getSuperAdminOpportunityValue(first);

      if (valueDifference !== 0) {
        return valueDifference;
      }

      return getSuperAdminRowTimestamp(second) - getSuperAdminRowTimestamp(first);
    });
  const explicitOpportunityCount = metrics?.totalOpportunities || creatorRows.reduce((sum, row) => sum + getSuperAdminOpportunityCount(row), 0);
  const opportunityCount = Math.max(explicitOpportunityCount, signalRows.length);
  const estimatedRevenue = signalRows.reduce((sum, row) => sum + getSuperAdminOpportunityValue(row), 0);
  const dashboardOpportunities: Opportunity[] = signalRows.slice(0, 4).map((row) => {
    const opportunityCountForRow = getSuperAdminOpportunityCount(row);
    const messageCount = getAdminRowNumber(row.messages);
    const conversationCount = getAdminRowNumber(row.conversations);
    const title = row.riskLevel === "High" ? "Needs attention" : opportunityCountForRow > 0 ? "Buying intent" : "Creator opportunity";
    const signalDetail =
      row.riskSignal && row.riskSignal !== "Healthy"
        ? row.riskSignal
        : conversationCount > 0
          ? `${formatCreatorInteger(messageCount)} messages across ${formatCreatorInteger(conversationCount)} conversations`
          : `${formatCreatorInteger(messageCount)} messages`;

    return {
      title,
      eyebrow: row.riskLevel === "High" ? "REVIEW" : opportunityCountForRow > 0 ? "HIGH INTENT" : "ACTIVE",
      body: [row.detail, truncateCreatorText(signalDetail, 74)],
      value: `${formatCreatorMoney(getSuperAdminOpportunityValue(row))} est.`,
      action: "Review",
      tone: getSuperAdminOpportunityTone(row),
      icon: row.riskLevel === "High" ? TriangleAlert : opportunityCountForRow > 0 ? ShoppingCart : Sparkles,
    };
  });
  const recentActivity: RecentActivityItem[] = creatorRows.slice(0, 4).map((row) => {
    const opportunityCountForRow = getSuperAdminOpportunityCount(row);
    const hasRisk = Boolean(row.riskSignal && row.riskSignal !== "Healthy");
    const title = hasRisk ? "Creator needs attention" : opportunityCountForRow > 0 ? "Opportunity signal received" : "Creator activity updated";
    const subtitle = `${row.name}: ${
      hasRisk
        ? row.riskSignal
        : opportunityCountForRow > 0
          ? `${formatCreatorInteger(opportunityCountForRow)} opportunity signals`
          : `${formatCreatorInteger(getAdminRowNumber(row.messages))} messages`
    }`;

    return {
      title,
      subtitle: truncateCreatorText(subtitle, 78),
      time: row.lastActive,
      icon: hasRisk ? TriangleAlert : opportunityCountForRow > 0 ? ShoppingCart : MessageSquare,
      tone: hasRisk ? "text-[#df405b] bg-[#fff0f3]" : opportunityCountForRow > 0 ? "text-[#4b3cff] bg-[#f0edff]" : "text-[#246bff] bg-[#eef4ff]",
      meta: getSuperAdminOpportunityValue(row) > 0 ? `${formatCreatorMoney(getSuperAdminOpportunityValue(row))} est.` : undefined,
    };
  });

  return {
    dateRangeLabel: getAdminDateRangeLabel(dateRangePreset),
    estimatedRevenue: estimatedRevenue || metrics?.mrr || 0,
    opportunityCount,
    dashboardOpportunities,
    dashboardPipeline: [
      {
        label: "Conversations",
        value: formatCreatorInteger(totalConversations),
        detail: `${formatCreatorInteger(rowsWithMessages)}\nwith messages`,
        tone: "text-[#4b3cff] bg-[#f0edff]",
        icon: MessageSquare,
      },
      {
        label: "Inbound",
        value: formatCreatorInteger(totalMessages),
        detail: `${formatCreatorInteger(connectedCount)}\nconnected accounts`,
        tone: "text-[#246bff] bg-[#eef4ff]",
        icon: Users,
      },
      {
        label: "Qualified",
        value: formatCreatorInteger(opportunityCount),
        detail: `${formatCreatorPercent(opportunityCount, Math.max(1, totalConversations || creatorRows.length))}\nof chats`,
        tone: "text-[#13b95f] bg-[#eafaf0]",
        icon: Sparkles,
      },
      {
        label: "Escalations",
        value: formatCreatorInteger(riskRows.length),
        detail: `${formatCreatorPercent(riskRows.length, Math.max(1, creatorRows.length))}\nneed handoff`,
        tone: "text-[#ff850d] bg-[#fff3e6]",
        icon: TriangleAlert,
      },
      {
        label: "Est. value",
        value: formatCreatorMoney(estimatedRevenue || metrics?.mrr || 0),
        detail: "based on\nreal intent",
        tone: "text-[#df405b] bg-[#fff0f3]",
        icon: Crown,
      },
    ],
    recentActivity,
    opportunityAvatarIds: (signalRows.length > 0 ? signalRows : creatorRows).slice(0, 3).map((row, index) => getSuperAdminRowAvatarNumber(row, index)),
    notificationCount: riskRows.length,
  };
}

export function SuperAdminOverviewPage({
  refreshKey = 0,
  profile,
  dateRangePreset,
  onDateRangeChange,
  onNavigate,
}: {
  refreshKey?: number;
  profile: AccountProfile;
  dateRangePreset: AdminDateRangePreset;
  onDateRangeChange: (preset: AdminDateRangePreset) => void;
  onNavigate: (page: SuperAdminPage) => void;
}) {
  const [data, setData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchOverviewData = useCallback(async () => {
    const response = await fetch("/api/admin/connected-accounts", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(response, "Could not load overview data");
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOverviewData() {
      try {
        const nextData = await fetchOverviewData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load overview data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOverviewData();

    return () => {
      isMounted = false;
    };
  }, [fetchOverviewData, refreshKey]);

  const summary = buildSuperAdminOverviewSummary(data, dateRangePreset);
  const greetingName = profile.name.trim() || "Super Admin";
  const visibleOpportunities = summary.dashboardOpportunities;
  const visiblePipeline = summary.dashboardPipeline;
  const visibleActivity = summary.recentActivity;

  return (
    <div className="relative min-h-dvh bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-7 lg:py-5 xl:px-10">
      <RevenueChart />

      <div className="relative z-10 mx-auto max-w-[1320px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div className="lg:pt-4">
            <p className="text-[17px] font-bold tracking-[-0.01em] text-black">Good morning, {greetingName} 👋</p>
          </div>

          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <label className="relative flex h-11 min-w-0 cursor-pointer items-center justify-between rounded-[10px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)] sm:h-[52px] sm:w-[252px] sm:px-5 sm:text-[14px]">
              {summary.dateRangeLabel}
              <CalendarDays size={18} strokeWidth={2.3} />
              <select
                aria-label="Superadmin dashboard date range"
                value={dateRangePreset}
                onChange={(event) => onDateRangeChange(event.target.value as AdminDateRangePreset)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {adminDateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <NotificationBell
              ariaLabel="Superadmin notifications"
              iconSize={20}
              buttonClassName="relative flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.035)] transition hover:bg-[#f6f7fb] sm:h-[52px] sm:w-[52px]"
            />
          </div>
        </header>

        <section className="relative mt-6 max-w-[640px]">
          <div className="flex items-center gap-4 sm:gap-5">
            <h1 className="text-[48px] font-extrabold leading-[0.9] tracking-[-0.04em] text-black sm:text-[68px] xl:text-[78px]">
              {isLoading && !data ? "..." : formatCreatorMoney(summary.estimatedRevenue)}
            </h1>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e3e6f0] bg-white shadow-[0_18px_52px_rgba(77,60,255,0.08)] sm:h-[58px] sm:w-[58px]">
              <Sparkles size={25} className="text-[#4b3cff] sm:size-[29px]" strokeWidth={2.2} />
            </div>
          </div>
          <p className="mt-3 text-[15px] font-semibold leading-[1.3] text-[#596175] sm:text-[18px] sm:leading-none">
            Potential revenue discovered this week
          </p>
          {(isLoading || errorMessage) && (
            <div className="mt-4 rounded-[8px] border border-[#e5e8f0] bg-white px-3 py-2 text-[12px] font-bold text-[#596175] shadow-[0_12px_36px_rgba(20,28,53,0.025)]">
              {isLoading ? "Loading superadmin opportunity data..." : errorMessage}
            </div>
          )}

          <div className="mt-7 flex items-center gap-3.5">
            <div className="flex -space-x-3">
              {(summary.opportunityAvatarIds.length > 0 ? summary.opportunityAvatarIds : [12]).map((image, index) => (
                <span
                  key={`${image}-${index}`}
                  aria-label={index === 0 ? "Opportunity reviewer" : undefined}
                  aria-hidden={index === 0 ? undefined : true}
                  role={index === 0 ? "img" : undefined}
                  className="h-8 w-8 rounded-full border-2 border-white bg-cover bg-center shadow-sm"
                  style={{ backgroundImage: `url(https://i.pravatar.cc/48?img=${image})` }}
                />
              ))}
            </div>
            <p className="text-[13px] font-semibold text-[#4b5268]">
              <span className="font-extrabold text-[#4b3cff]">{formatCreatorInteger(summary.opportunityCount)}</span> opportunities waiting for your review
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-5">
            <button
              type="button"
              onClick={() => onNavigate("creators-connected")}
              className="flex h-[42px] w-full items-center justify-center gap-5 rounded-[8px] bg-gradient-to-r from-[#563cff] to-[#4a32f2] text-[13px] font-extrabold text-white shadow-[0_22px_40px_rgba(75,60,255,0.22)] sm:w-[190px]"
            >
              Review opportunities
              <ArrowRight size={17} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("ai-usage")}
              className="flex items-center gap-3 text-[12px] font-bold text-[#596175]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dde3ee] bg-white text-black">
                <Play size={13} className="ml-0.5" fill="currentColor" strokeWidth={1.5} />
              </span>
              See how TractionFlo works
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[14px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.035)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-[16px] font-extrabold text-black">Top opportunities</h2>
              <span className="rounded-full bg-[#eff2f7] px-2.5 py-0.5 text-[12px] font-extrabold text-[#596175]">
                {formatCreatorInteger(visibleOpportunities.length)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("creators-connected")}
              className="flex items-center gap-2 text-[13px] font-extrabold text-[#4b3cff]"
            >
              View all
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {visibleOpportunities.length > 0 ? (
              visibleOpportunities.map((opportunity) => (
                <OpportunityCard key={`${opportunity.eyebrow}-${opportunity.title}-${opportunity.body.join("-")}`} opportunity={opportunity} />
              ))
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#d9deea] p-6 text-[13px] font-bold text-[#596175] xl:col-span-4">
                {isLoading ? "Loading real creator opportunities..." : "No creator opportunity signals found yet."}
              </div>
            )}
          </div>
        </section>

        <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1.36fr)_minmax(390px,0.96fr)]">
          <section className="rounded-[14px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.035)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-black">Audience pipeline</h2>
              <label className="relative flex h-8 cursor-pointer items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black">
                {getAdminRangeLabel(dateRangePreset).replace("Last 7 days", "This week")}
                <ChevronDown size={14} strokeWidth={2.5} />
                <select
                  aria-label="Audience pipeline range"
                  value={dateRangePreset}
                  onChange={(event) => onDateRangeChange(event.target.value as AdminDateRangePreset)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  {adminDateRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="pointer-events-none absolute bottom-0 right-2 top-0 hidden w-16 skew-x-[-12deg] border-r border-[#e9ecf3] md:block" />
              {visiblePipeline.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="relative text-center">
                    <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-[15px]">
                      <span className={`flex h-full w-full items-center justify-center rounded-[15px] ${step.tone}`}>
                        <Icon size={23} strokeWidth={2.3} />
                      </span>
                    </div>
                    {index < visiblePipeline.length - 1 ? (
                      <ArrowRight
                        size={15}
                        strokeWidth={2.4}
                        className="absolute right-[-10px] top-[19px] hidden text-[#596175] md:block"
                      />
                    ) : null}
                    <p className="mt-3 text-[12px] font-semibold text-[#596175]">{step.label}</p>
                    <p className="mt-2 text-[19px] font-extrabold leading-none text-black">{step.value}</p>
                    <p className="mt-4 whitespace-pre-line text-[12px] font-extrabold leading-[1.3] text-[#4b3cff]">
                      {step.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[14px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.035)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-black">Recent activity</h2>
              <button
                type="button"
                onClick={() => onNavigate("creators-connected")}
                className="flex items-center gap-2 text-[13px] font-extrabold text-[#4b3cff]"
              >
                View all
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div>
              {visibleActivity.length > 0 ? visibleActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={`${activity.title}-${activity.subtitle}`}
                    className={`flex items-center gap-3 py-[9px] ${
                      index < visibleActivity.length - 1 ? "border-b border-[#edf0f6]" : ""
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activity.tone}`}>
                      <Icon size={19} strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-extrabold text-black">{activity.title}</p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-[#596175]">{activity.subtitle}</p>
                    </div>
                    <div className="text-right text-[10px] font-semibold text-[#596175]">
                      <p>{activity.time}</p>
                      {activity.meta ? <p className="mt-2 font-extrabold text-[#13a84f]">{activity.meta}</p> : null}
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-[10px] border border-dashed border-[#d9deea] p-5 text-[12px] font-bold text-[#596175]">
                  {isLoading ? "Loading recent creator activity..." : "No recent activity loaded yet."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


const toneClasses = {
  purple: {
    tile: "bg-[#f0edff] text-[#4b3cff]",
    badge: "bg-[#ece8ff] text-[#4b3cff]",
    value: "text-[#4b3cff]",
  },
  blue: {
    tile: "bg-[#eef4ff] text-[#246bff]",
    badge: "bg-[#e8f0ff] text-[#246bff]",
    value: "text-[#246bff]",
  },
  orange: {
    tile: "bg-[#fff3e6] text-[#ff850d]",
    badge: "bg-[#fff0df] text-[#ff850d]",
    value: "text-[#ff850d]",
  },
  red: {
    tile: "bg-[#fff0f3] text-[#df405b]",
    badge: "bg-[#ffedf1] text-[#df405b]",
    value: "text-[#df405b]",
  },
};


function RevenueChart() {
  const markers = [
    { x: 314, y: 128 },
    { x: 420, y: 88 },
    { x: 535, y: 60 },
    { x: 640, y: 57 },
    { x: 724, y: 25 },
  ];

  return (
    <div className="pointer-events-none absolute right-6 top-[108px] hidden h-[220px] w-[660px] xl:block">
      <svg viewBox="0 0 760 270" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#6654ff" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="chartStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#d9d5ff" />
            <stop offset="35%" stopColor="#6458ff" />
            <stop offset="100%" stopColor="#6458ff" />
          </linearGradient>
          <filter id="dotGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M0 248 C95 230 153 214 250 168 C321 133 379 105 480 81 C573 58 641 47 724 25 L724 232 C585 232 409 232 252 232 C131 232 50 246 0 248 Z"
          fill="url(#chartFill)"
        />
        <path
          d="M0 248 C95 230 153 214 250 168 C321 133 379 105 480 81 C573 58 641 47 724 25"
          fill="none"
          stroke="url(#chartStroke)"
          strokeLinecap="round"
          strokeWidth="3"
        />
        {markers.map((marker, index) => (
          <g key={`${marker.x}-${marker.y}`}>
            <line
              x1={marker.x}
              x2={marker.x}
              y1={marker.y}
              y2="224"
              stroke="#6458ff"
              strokeDasharray="1 4"
              strokeOpacity={index === markers.length - 1 ? 0.4 : 0.5}
            />
            {index === markers.length - 1 ? (
              <>
                <circle cx={marker.x} cy={marker.y} r="26" fill="#6654ff" opacity="0.1" filter="url(#dotGlow)" />
                <circle cx={marker.x} cy={marker.y} r="10" fill="#6654ff" />
                <circle cx={marker.x} cy={marker.y} r="5" fill="#ffffff" />
              </>
            ) : (
              <circle cx={marker.x} cy={marker.y} r="4" fill="#4d3cff" />
            )}
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-[96px] h-[56px] w-[96px] rounded-[8px] bg-white px-3 py-3 shadow-[0_24px_60px_rgba(82,67,210,0.16)]">
        <div className="text-[14px] font-extrabold leading-none text-[#4b3cff]">+23%</div>
        <div className="mt-1.5 text-[10px] font-semibold text-[#596175]">vs last week</div>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const Icon = opportunity.icon;
  const tone = toneClasses[opportunity.tone];
  const openConversation = () => {
    if (!opportunity.id) {
      return;
    }

    window.location.href = `/conversations?conversation=${encodeURIComponent(opportunity.conversationId || opportunity.id)}`;
  };

  return (
    <article className="flex min-h-[194px] flex-col rounded-[10px] border border-[#e6e9f1] bg-white p-4 shadow-[0_18px_40px_rgba(20,28,53,0.025)]">
      <div className="flex items-start gap-4">
        <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[13px] ${tone.tile}`}>
          <Icon size={22} strokeWidth={2.3} />
        </div>
        <div className="min-w-0 pt-1">
          <span className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-extrabold ${tone.badge}`}>
            {opportunity.eyebrow}
          </span>
          <h3 className="mt-3 whitespace-nowrap text-[14px] font-extrabold leading-tight text-black">{opportunity.title}</h3>
          <div className="mt-2 space-y-0.5 text-[11px] font-semibold leading-[1.35] text-[#596175]">
            {opportunity.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-5">
        {opportunity.value ? (
          <>
            <div className="text-[11px] font-semibold text-[#6a7084]">Potential value</div>
            <div className={`mt-1 text-[20px] font-extrabold leading-none ${tone.value}`}>{opportunity.value}</div>
          </>
        ) : (
          <div className="text-[11px] font-semibold text-[#6a7084]">Needs your response</div>
        )}
        <button
          type="button"
          onClick={openConversation}
          className="mt-3 flex h-9 w-full items-center justify-between rounded-[7px] border border-[#dde2ed] bg-white px-3 text-[12px] font-extrabold text-black shadow-[0_12px_28px_rgba(20,28,53,0.03)]"
        >
          {opportunity.action}
          <ArrowRight size={16} strokeWidth={2.4} />
        </button>
      </div>
    </article>
  );
}
