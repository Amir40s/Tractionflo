"use client";

import { useState } from "react";
import { ArrowRight, SlidersHorizontal, Target, TrendingUp } from "lucide-react";
import { CreatorDateRangeSelect, type AdminDateRangePreset } from "../admin/shared";
import { formatCreatorInteger } from "../creator-insights";
import type { CreatorLiveSummary, LeadCategoryFilter, LeadUrgencyFilter, OpportunityPageCard } from "./types";
import { BrandMark } from "./BrandMark";

const opportunityToneClasses = {
  purple: {
    tile: "bg-[#f0edff] text-[#4b3cff]",
    badge: "bg-[#ece8ff] text-[#4b3cff]",
    value: "text-[#4b3cff]",
    progress: "bg-[#4b3cff]",
    action: "text-black",
  },
  green: {
    tile: "bg-[#eafaf0] text-[#13a84f]",
    badge: "bg-[#e7f8ed] text-[#0a9b3f]",
    value: "text-[#0a9b3f]",
    progress: "bg-[#20b85c]",
    action: "text-black",
  },
  blue: {
    tile: "bg-[#eef4ff] text-[#246bff]",
    badge: "bg-[#e8f0ff] text-[#246bff]",
    value: "text-[#155bdc]",
    progress: "bg-[#246bff]",
    action: "text-black",
  },
  orange: {
    tile: "bg-[#fff3e6] text-[#ff850d]",
    badge: "bg-[#fff0df] text-[#ff850d]",
    value: "text-[#ff850d]",
    progress: "bg-[#ff850d]",
    action: "text-black",
  },
  red: {
    tile: "bg-[#fff0f3] text-[#df405b]",
    badge: "bg-[#ffedf1] text-[#df405b]",
    value: "text-[#df405b]",
    progress: "bg-[#df405b]",
    action: "text-[#df405b]",
  },
};


const leadCategoryFilters: { id: LeadCategoryFilter; label: string; detail: string }[] = [
  { id: "all", label: "All leads", detail: "Every qualified lead" },
  { id: "high-intent", label: "High intent", detail: "Buying or booking intent" },
  { id: "warm", label: "Warm leads", detail: "Active leads still warming up" },
  { id: "partner", label: "Partner leads", detail: "Partnership or brand deal signals" },
  { id: "community", label: "Community leads", detail: "Community and referral signals" },
];

const leadUrgencyFilters: { id: LeadUrgencyFilter; label: string }[] = [
  { id: "all", label: "Any urgency" },
  { id: "High", label: "High urgency" },
  { id: "Medium", label: "Medium urgency" },
  { id: "Low", label: "Low urgency" },
];


function getLeadCategoryFromTabLabel(label: string): LeadCategoryFilter {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("high intent")) return "high-intent";
  if (normalizedLabel.includes("warm")) return "warm";
  if (normalizedLabel.includes("partner")) return "partner";
  if (normalizedLabel.includes("community")) return "community";
  return "all";
}

function isOpportunityInLeadCategory(opportunity: OpportunityPageCard, filter: LeadCategoryFilter) {
  switch (filter) {
    case "high-intent":
      return opportunity.badge === "HIGH INTENT";
    case "warm":
      return opportunity.stage === "Warm";
    case "partner":
      return opportunity.badge === "PARTNERSHIP";
    case "community":
      return opportunity.badge === "COMMUNITY";
    case "all":
    default:
      return true;
  }
}


function OpportunityPageCardView({ opportunity }: { opportunity: OpportunityPageCard }) {
  const Icon = opportunity.icon;
  const tone = opportunityToneClasses[opportunity.tone];
  const scoreText = opportunity.risk ?? opportunity.score ?? "0/100";
  const missing = opportunity.missing?.length ? opportunity.missing : ["Nothing critical"];
  const signals = opportunity.signals?.length ? opportunity.signals : [opportunity.intent || opportunity.subtitle];

  return (
    <article className="flex min-h-[384px] flex-col rounded-[11px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${tone.tile}`}>
            <Icon size={21} strokeWidth={2.25} />
          </div>
          <div className="min-w-0 pt-0.5">
            <span className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${tone.badge}`}>
              {opportunity.badge}
            </span>
            <h3 className="mt-3 flex items-center gap-1.5 text-[14px] font-extrabold leading-tight text-black">
              <span className="min-w-0 break-words">{opportunity.name}</span>
              {opportunity.verified ? (
                <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#246bff] text-[8px] font-black leading-none text-white">
                  ✓
                </span>
              ) : null}
            </h3>
            <p className="mt-2 text-[12px] font-semibold leading-none text-[#4f566c]">{opportunity.subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-[#596175]">{opportunity.time}</span>
      </div>

      <p className="mt-4 text-[11px] font-medium leading-[1.55] text-[#3f4659]">{opportunity.detail}</p>

      <div className="mt-4 grid gap-2 border-t border-[#edf0f6] pt-3 text-[11px] font-semibold sm:grid-cols-2">
        {(opportunity.qualificationFacts || []).map((fact) => (
          <div key={fact.label} className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-[#697083]">{fact.label}</span>
            <span className={`truncate text-right font-extrabold ${fact.value === "Missing" ? "text-[#df405b]" : "text-[#13a84f]"}`}>
              {fact.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 text-[11px] font-semibold">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[#697083]">Stage</span>
          <span className="truncate font-extrabold text-black">{opportunity.stage || "Warm"}</span>
          <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            opportunity.urgency === "High"
              ? "bg-[#fff0f3] text-[#df405b]"
              : opportunity.urgency === "Medium"
                ? "bg-[#fff3e6] text-[#ff850d]"
                : "bg-[#eff1f6] text-[#596175]"
          }`}>
            {opportunity.urgency || "Low"} urgency
          </span>
        </div>
        <div className="flex min-w-0 gap-2">
          <span className="shrink-0 text-[#697083]">Signals</span>
          <span className="truncate font-medium text-[#30384d]">{signals.join(", ")}</span>
        </div>
        <div className="flex min-w-0 gap-2">
          <span className="shrink-0 text-[#697083]">Missing</span>
          <span className="truncate font-medium text-[#30384d]">{missing.join(", ")}</span>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <p className="text-[11px] font-medium text-[#596175]">{opportunity.recommendedAction || "Review the lead and send the next reply."}</p>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-semibold text-[#697083]">{opportunity.scoreLabel ?? "Lead Score"}</p>
                <p className={`mt-1 text-[16px] font-extrabold leading-none ${tone.value}`}>{scoreText}</p>
              </div>
              {opportunity.value ? (
                <div>
                  <p className="text-[10px] font-semibold text-[#697083]">Est. value</p>
                  <p className={`mt-1 text-[16px] font-extrabold leading-none ${tone.value}`}>{opportunity.value}</p>
                </div>
              ) : null}
            </div>
            {opportunity.progress ? (
              <div className="mt-2 h-[3px] w-[138px] max-w-full rounded-full bg-[#edf0f6]">
                <div className={`h-full rounded-full ${tone.progress}`} style={{ width: opportunity.progress }} />
              </div>
            ) : null}
          </div>

          <OpportunityReviewButton
            tone={tone.action}
            onClick={() => {
              window.location.href = `/conversations?conversation=${encodeURIComponent(opportunity.id)}`;
            }}
          >
            {opportunity.action}
          </OpportunityReviewButton>
        </div>
      </div>
    </article>
  );
}

function OpportunityReviewButton({ children, tone, onClick }: { children: string; tone: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 w-[118px] items-center justify-between rounded-[8px] border border-[#dde2ed] bg-white px-4 text-[12px] font-extrabold shadow-[0_12px_28px_rgba(20,28,53,0.03)] ${tone}`}
    >
      {children}
      <ArrowRight size={15} strokeWidth={2.5} />
    </button>
  );
}

export function OpportunitiesPage({
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
  const [leadCategoryFilter, setLeadCategoryFilter] = useState<LeadCategoryFilter>("all");
  const [leadUrgencyFilter, setLeadUrgencyFilter] = useState<LeadUrgencyFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeFilterCount = Number(leadCategoryFilter !== "all") + Number(leadUrgencyFilter !== "all");
  const filteredOpportunityCards = summary.opportunityCards.filter(
    (opportunity) =>
      isOpportunityInLeadCategory(opportunity, leadCategoryFilter) &&
      (leadUrgencyFilter === "all" || opportunity.urgency === leadUrgencyFilter)
  );

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[26px] font-extrabold leading-none text-black sm:text-[28px]">Leads</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#596175]">
              Qualified Instagram leads with score, intent, missing details, and the next action to take.
            </p>
          </div>

          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
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
                className={`flex h-11 w-[86px] items-center justify-center gap-2 rounded-[9px] border text-[12px] font-extrabold shadow-[0_12px_36px_rgba(20,28,53,0.025)] transition sm:h-12 sm:w-[94px] sm:text-[13px] ${
                  activeFilterCount > 0
                    ? "border-[#c8bfff] bg-[#f0edff] text-[#3044ff]"
                    : "border-[#e0e4ef] bg-white text-black hover:bg-[#f6f7fb]"
                }`}
              >
                <SlidersHorizontal size={15} strokeWidth={2.4} />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3044ff] px-1 text-[9px] font-extrabold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              {isFilterOpen ? (
                <div className="absolute right-0 top-[52px] z-30 w-[286px] rounded-[12px] border border-[#dde3ee] bg-white p-3 text-black shadow-[0_24px_70px_rgba(20,28,53,0.16)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[12px] font-extrabold text-black">Filter leads</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setLeadCategoryFilter("all");
                        setLeadUrgencyFilter("all");
                      }}
                      className="text-[11px] font-extrabold text-[#3044ff]"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <p className="text-[10px] font-extrabold uppercase text-[#596175]">Category</p>
                    {leadCategoryFilters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setLeadCategoryFilter(filter.id)}
                        className={`rounded-[9px] border px-3 py-2 text-left transition ${
                          leadCategoryFilter === filter.id
                            ? "border-[#c8bfff] bg-[#f0edff]"
                            : "border-[#edf0f6] bg-white hover:bg-[#f8f9fd]"
                        }`}
                      >
                        <span className="block text-[11px] font-extrabold text-black">{filter.label}</span>
                        <span className="mt-1 block text-[10px] font-semibold text-[#596175]">{filter.detail}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <p className="text-[10px] font-extrabold uppercase text-[#596175]">Urgency</p>
                    <div className="grid grid-cols-2 gap-2">
                      {leadUrgencyFilters.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setLeadUrgencyFilter(filter.id)}
                          className={`h-8 rounded-[8px] border text-[11px] font-extrabold transition ${
                            leadUrgencyFilter === filter.id
                              ? "border-[#c8bfff] bg-[#f0edff] text-[#3044ff]"
                              : "border-[#edf0f6] bg-white text-[#31394f] hover:bg-[#f8f9fd]"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-6 lg:px-0">
          <div className="grid w-max grid-cols-[135px_185px_165px_230px_195px] lg:grid-cols-[150px_210px_190px_260px_220px]">
            {summary.opportunityTabs.map((tab, index) => {
              const Icon = tab.icon;
              const tabFilter = getLeadCategoryFromTabLabel(tab.label);
              const isActive = leadCategoryFilter === tabFilter;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setLeadCategoryFilter(tabFilter)}
                  className={`relative flex h-11 items-center justify-center gap-2 text-[11px] font-extrabold sm:gap-3 sm:text-[12px] ${
                    isActive ? "text-[#4b3cff]" : "text-black"
                  } ${index < summary.opportunityTabs.length - 1 ? "border-r border-[#e2e6f0]" : ""}`}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.4 : 2.1} />
                  <span>{tab.label}</span>
                  <span className="rounded-full bg-[#eff1f6] px-2 py-0.5 text-[11px] font-extrabold text-[#596175]">
                    {tab.count}
                  </span>
                  {isActive ? <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-[#4b3cff]" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {(isLoading || error) && (
          <div className="mt-4 rounded-[10px] border border-[#edf0f6] bg-white px-4 py-3 text-[12px] font-semibold text-[#46506a] shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            {isLoading ? "Loading real Instagram conversations..." : error}
          </div>
        )}

        <section className="mt-4 grid rounded-[12px] border border-[#e5e8f0] bg-white shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:grid-cols-2 xl:h-[112px] xl:grid-cols-4">
          {summary.opportunityMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`flex min-h-[96px] items-center gap-4 px-4 sm:px-5 xl:min-h-0 xl:gap-5 xl:px-7 ${
                  index < summary.opportunityMetrics.length - 1 ? "border-b border-[#e5e8f0] sm:border-r sm:last:border-r-0 xl:border-b-0" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#f0edff] text-[#4b3cff]">
                  <Icon size={22} strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#596175]">{metric.label}</p>
                  <p className="mt-2 text-[22px] font-extrabold leading-none text-black">{metric.value}</p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#13a84f]">
                    <TrendingUp size={11} strokeWidth={2.5} />
                    {metric.change}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {filteredOpportunityCards.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredOpportunityCards.map((opportunity) => (
              <OpportunityPageCardView key={`${opportunity.name}-${opportunity.badge}-${opportunity.time}`} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <section className="mt-5 rounded-[12px] border border-dashed border-[#d7deeb] bg-white p-8 text-center shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            <Target className="mx-auto text-[#3044ff]" size={28} strokeWidth={2.35} />
            <h2 className="mt-3 text-[15px] font-extrabold text-black">
              {activeFilterCount > 0 || leadCategoryFilter !== "all" ? "No leads match these filters" : "No qualified leads yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-[440px] text-[12px] font-medium leading-relaxed text-[#596175]">
              {activeFilterCount > 0 || leadCategoryFilter !== "all"
                ? "Try another category or urgency level to see more Instagram lead signals."
                : "TractionFlo is reading real Instagram conversations. Pricing, buying, booking, partnership, or ready-to-purchase signals will appear here as leads."}
            </p>
          </section>
        )}

        <footer className="relative mt-4 flex items-center justify-center pb-2">
          <p className="text-[12px] font-medium text-[#596175]">
            Showing {filteredOpportunityCards.length > 0 ? `1 to ${filteredOpportunityCards.length}` : "0"} of {formatCreatorInteger(summary.opportunityCount)} leads
          </p>
        </footer>
      </div>
    </main>
  );
}
