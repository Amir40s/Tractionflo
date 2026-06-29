"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, SlidersHorizontal, Target, TrendingUp } from "lucide-react";
import { CreatorDateRangeSelect, type AdminDateRangePreset } from "../admin/shared";
import { formatCreatorInteger } from "../creator-insights";
import type { CreatorLiveSummary, LeadCategoryFilter, LeadUrgencyFilter, OpportunityPageCard } from "./types";
import { BrandMark } from "./BrandMark";
import {
  loadOpportunityWorkflowStateFromDatabase,
  opportunityWorkflowStateChangedEvent,
  readStoredOpportunityWorkflowState,
  saveOpportunityWorkflowStateToDatabase,
  writeStoredOpportunityWorkflowState,
} from "../opportunity-resolution";
import {
  emptyOpportunityWorkflowState,
  mergeOpportunityWorkflowState,
  type OpportunityWorkflowStatePatch,
} from "@/lib/opportunity-workflow-state";

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
  { id: "hot", label: "Hot leads", detail: "Score 75+ and ready for action" },
  { id: "warm", label: "Warm leads", detail: "Score 50-74 and still qualifying" },
  { id: "cold", label: "Cold leads", detail: "Early interest or missing key details" },
  { id: "partner", label: "Partner leads", detail: "Partnership or brand deal signals" },
  { id: "community", label: "Community leads", detail: "Community and referral signals" },
];

const leadUrgencyFilters: { id: LeadUrgencyFilter; label: string }[] = [
  { id: "all", label: "Any urgency" },
  { id: "High", label: "High urgency" },
  { id: "Medium", label: "Medium urgency" },
  { id: "Low", label: "Low urgency" },
];

const leadsPerPage = 4;

function buildLeadPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
    .reduce<(number | "ellipsis")[]>((items, page, index, orderedPages) => {
      const previousPage = orderedPages[index - 1];

      if (previousPage && page - previousPage > 1) {
        items.push("ellipsis");
      }

      items.push(page);
      return items;
    }, []);
}

function getLeadCategoryFromTabLabel(label: string): LeadCategoryFilter {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("hot")) return "hot";
  if (normalizedLabel.includes("warm")) return "warm";
  if (normalizedLabel.includes("cold")) return "cold";
  if (normalizedLabel.includes("partner")) return "partner";
  if (normalizedLabel.includes("community")) return "community";
  return "all";
}

function isOpportunityInLeadCategory(opportunity: OpportunityPageCard, filter: LeadCategoryFilter) {
  switch (filter) {
    case "hot":
      return opportunity.classification === "Hot";
    case "warm":
      return opportunity.classification === "Warm";
    case "cold":
      return opportunity.classification === "Cold";
    case "partner":
      return opportunity.badge === "PARTNERSHIP";
    case "community":
      return opportunity.badge === "COMMUNITY";
    case "all":
    default:
      return true;
  }
}


function OpportunityPageCardView({
  opportunity,
  isWorking,
  onMarkWorking,
  onResolve,
}: {
  opportunity: OpportunityPageCard;
  isWorking: boolean;
  onMarkWorking: () => void;
  onResolve: () => void;
}) {
  const Icon = opportunity.icon;
  const tone = opportunityToneClasses[opportunity.tone];
  const scoreText = opportunity.risk ?? opportunity.score ?? "0/100";
  const missing = opportunity.missing?.length ? opportunity.missing : ["Nothing critical"];
  const signals = opportunity.signals?.length ? opportunity.signals : [opportunity.intent || opportunity.subtitle];

  return (
    <article
      onClick={onMarkWorking}
      className="relative flex min-h-[384px] cursor-pointer flex-col rounded-[11px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)] transition hover:shadow-[0_26px_70px_rgba(20,28,53,0.045)]"
    >
      {!isWorking ? <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-[#13a84f]" /> : null}
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
          <span className="shrink-0 text-[#697083]">Classification</span>
          <span className="truncate font-extrabold text-black">{opportunity.classification || opportunity.stage || "Warm"}</span>
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

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onResolve();
              }}
              className="flex h-9 w-[132px] items-center justify-center gap-2 rounded-[8px] border border-[#cdeedb] bg-[#eafaf0] px-3 text-[12px] font-extrabold text-[#0a9b3f] shadow-[0_12px_28px_rgba(20,28,53,0.025)]"
            >
              <CheckCircle2 size={15} strokeWidth={2.4} />
              Mark resolved
            </button>
            <OpportunityReviewButton
              tone={tone.action}
              onClick={() => {
                onMarkWorking();
                window.location.href = `/conversations?conversation=${encodeURIComponent(opportunity.conversationId || opportunity.id)}`;
              }}
            >
              {opportunity.action}
            </OpportunityReviewButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function OpportunityReviewButton({ children, tone, onClick }: { children: string; tone: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [opportunityWorkflowState, setOpportunityWorkflowState] = useState(emptyOpportunityWorkflowState);
  const resolvedOpportunityIdSet = new Set(opportunityWorkflowState.resolvedIds);
  const workingOpportunityIdSet = new Set(opportunityWorkflowState.workingIds);
  const unresolvedOpportunityCards = summary.opportunityCards.filter((opportunity) => !resolvedOpportunityIdSet.has(opportunity.id));
  const visibleOpportunityTabs = summary.opportunityTabs.map((tab) => ({
    ...tab,
    count: formatCreatorInteger(unresolvedOpportunityCards.filter((opportunity) => isOpportunityInLeadCategory(opportunity, getLeadCategoryFromTabLabel(tab.label))).length),
  }));
  const activeFilterCount = Number(leadCategoryFilter !== "all") + Number(leadUrgencyFilter !== "all");
  const filteredOpportunityCards = unresolvedOpportunityCards.filter(
    (opportunity) =>
      isOpportunityInLeadCategory(opportunity, leadCategoryFilter) &&
      (leadUrgencyFilter === "all" || opportunity.urgency === leadUrgencyFilter)
  );
  const totalFilteredLeads = filteredOpportunityCards.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredLeads / leadsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalFilteredLeads === 0 ? 0 : (activePage - 1) * leadsPerPage;
  const pageEndIndex = Math.min(pageStartIndex + leadsPerPage, totalFilteredLeads);
  const visibleOpportunityCards = filteredOpportunityCards.slice(pageStartIndex, pageEndIndex);
  const paginationItems = buildLeadPaginationItems(activePage, totalPages);

  useEffect(() => {
    const syncOpportunityWorkflowState = () => {
      setOpportunityWorkflowState(readStoredOpportunityWorkflowState());
    };

    syncOpportunityWorkflowState();
    void loadOpportunityWorkflowStateFromDatabase().catch((stateError) => {
      console.error("Lead workflow state load error:", stateError);
    });
    window.addEventListener("storage", syncOpportunityWorkflowState);
    window.addEventListener(opportunityWorkflowStateChangedEvent, syncOpportunityWorkflowState);

    return () => {
      window.removeEventListener("storage", syncOpportunityWorkflowState);
      window.removeEventListener(opportunityWorkflowStateChangedEvent, syncOpportunityWorkflowState);
    };
  }, []);

  function handleMarkOpportunityWorking(opportunityId: string) {
    if (workingOpportunityIdSet.has(opportunityId)) {
      return;
    }

    applyOpportunityWorkflowPatch({ workingIds: [opportunityId], readIds: [opportunityId] });
    void saveOpportunityWorkflowStateToDatabase({ workingIds: [opportunityId], readIds: [opportunityId] }).catch((stateError) => {
      console.error("Lead working state save error:", stateError);
    });
  }

  function applyOpportunityWorkflowPatch(patch: OpportunityWorkflowStatePatch) {
    const nextState = mergeOpportunityWorkflowState(readStoredOpportunityWorkflowState(), patch);

    writeStoredOpportunityWorkflowState(nextState);
    setOpportunityWorkflowState(nextState);
  }

  function handleResolveOpportunity(opportunityId: string) {
    const nextFilteredCount = filteredOpportunityCards.filter((opportunity) => opportunity.id !== opportunityId).length;
    const nextTotalPages = Math.max(1, Math.ceil(nextFilteredCount / leadsPerPage));

    applyOpportunityWorkflowPatch({ resolvedIds: [opportunityId] });
    void saveOpportunityWorkflowStateToDatabase({ resolvedIds: [opportunityId] }).catch((stateError) => {
      console.error("Lead resolve state save error:", stateError);
    });
    setCurrentPage((page) => Math.min(page, nextTotalPages));
  }

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
              onDateRangeChange={(preset) => {
                onDateRangeChange(preset);
                setCurrentPage(1);
              }}
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
                        setCurrentPage(1);
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
                        onClick={() => {
                          setLeadCategoryFilter(filter.id);
                          setCurrentPage(1);
                        }}
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
                          onClick={() => {
                            setLeadUrgencyFilter(filter.id);
                            setCurrentPage(1);
                          }}
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
          <div className="grid w-max auto-cols-[150px] grid-flow-col lg:auto-cols-[190px]">
            {visibleOpportunityTabs.map((tab, index) => {
              const Icon = tab.icon;
              const tabFilter = getLeadCategoryFromTabLabel(tab.label);
              const isActive = leadCategoryFilter === tabFilter;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => {
                    setLeadCategoryFilter(tabFilter);
                    setCurrentPage(1);
                  }}
                  className={`relative flex h-11 items-center justify-center gap-2 text-[11px] font-extrabold sm:gap-3 sm:text-[12px] ${
                    isActive ? "text-[#4b3cff]" : "text-black"
                  } ${index < visibleOpportunityTabs.length - 1 ? "border-r border-[#e2e6f0]" : ""}`}
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

        {visibleOpportunityCards.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleOpportunityCards.map((opportunity) => (
              <OpportunityPageCardView
                key={`${opportunity.name}-${opportunity.badge}-${opportunity.time}`}
                opportunity={opportunity}
                isWorking={workingOpportunityIdSet.has(opportunity.id)}
                onMarkWorking={() => handleMarkOpportunityWorking(opportunity.id)}
                onResolve={() => handleResolveOpportunity(opportunity.id)}
              />
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

        <footer className="relative mt-5 flex flex-col items-center justify-between gap-3 rounded-[12px] border border-[#e5e8f0] bg-white px-4 py-3 shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:flex-row">
          <p className="text-[12px] font-semibold text-[#596175]">
            Showing {totalFilteredLeads > 0 ? `${formatCreatorInteger(pageStartIndex + 1)} to ${formatCreatorInteger(pageEndIndex)}` : "0"} of {formatCreatorInteger(totalFilteredLeads)} leads
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={activePage === 1}
              className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-[#30384d] transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              Prev
            </button>

            <div className="flex items-center gap-1">
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="flex h-9 w-8 items-center justify-center text-[11px] font-extrabold text-[#8b92a6]">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    aria-current={item === activePage ? "page" : undefined}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-[8px] border px-3 text-[11px] font-extrabold transition ${
                      item === activePage
                        ? "border-[#4b3cff] bg-[#f0edff] text-[#3044ff]"
                        : "border-[#dde3ee] bg-white text-[#30384d] hover:bg-[#f6f7fb]"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={activePage === totalPages}
              className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-[#30384d] transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
