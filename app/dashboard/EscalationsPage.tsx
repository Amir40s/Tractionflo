"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import { formatCreatorInteger } from "./creator-insights";
import {
  escalationWorkflowStateChangedEvent,
  loadEscalationWorkflowStateFromDatabase,
  readStoredEscalationWorkflowState,
  saveEscalationWorkflowStateToDatabase,
  writeStoredEscalationWorkflowState,
} from "./escalation-resolution";
import {
  emptyEscalationWorkflowState,
  mergeEscalationWorkflowState,
  type EscalationWorkflowStatePatch,
} from "@/lib/escalation-workflow-state";

type EscalationTab = {
  id: string;
  label: string;
  count: string;
  tone: string;
  icon: LucideIcon;
};

type EscalationItem = {
  id: string;
  conversationId: string;
  name: string;
  handle: string;
  profileUrl: string;
  avatar: string;
  channel: "instagram";
  time: string;
  category: string;
  riskLevel: "High" | "Medium" | "Low";
  badge: string;
  badgeTone: string;
  title: string;
  detail: string;
  recommendedAction: string;
  meta: string[];
  metaTone: string;
  borderTone: string;
  glowTone: string;
  dotTone: string;
  icon: LucideIcon;
};

type EscalationDetailRow = {
  label: string;
  value: string;
  icon: LucideIcon;
  valueTone?: string;
};

type CreatorLiveSummary = {
  escalations: EscalationItem[];
  escalationTabs: EscalationTab[];
};

function EscalationsBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-8 w-8">
        <div className="absolute left-0 top-0 h-2 w-7 rounded-full bg-gradient-to-r from-[#8156ff] to-[#3529ff]" />
        <div className="absolute left-[9px] top-[2px] h-6 w-2 rounded-full bg-gradient-to-b from-[#5d43ff] to-[#8b6dff]" />
        <div className="absolute right-0.5 top-[6px] h-2.5 w-2.5 rounded-full bg-[#8a70ff]" />
      </div>
      <span className="text-[20px] font-extrabold leading-none text-black">TractionFlo</span>
    </div>
  );
}

function InstagramDot() {
  return (
    <span className="relative h-3.5 w-3.5 rounded-[4px] bg-gradient-to-tr from-[#ffb000] via-[#ff3e8a] to-[#7b39ff]">
      <span className="absolute left-[3.5px] top-[3.5px] h-[6px] w-[6px] rounded-full border border-white" />
      <span className="absolute right-[2px] top-[2px] h-[2.5px] w-[2.5px] rounded-full bg-white" />
    </span>
  );
}

function EscalationTabs({
  tabs,
  activeTabId,
  onTabChange,
}: {
  tabs: EscalationTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}) {
  return (
    <div className="-mx-4 mt-8 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="grid w-max grid-flow-col auto-cols-max lg:grid-cols-[88px_142px_162px_178px_180px_160px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex h-11 items-center justify-center gap-2 border-r border-[#e2e6f0] px-3 text-[12px] font-extrabold last:border-r-0 ${
                isActive ? "text-[#3044ff]" : "text-black"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tab.tone}`}>
                <Icon size={15} strokeWidth={2.35} />
              </span>
              <span>{tab.label}</span>
              <span className="rounded-full bg-[#eff1f6] px-2 py-0.5 text-[10px] font-extrabold text-[#596175]">
                {tab.count}
              </span>
              {isActive ? <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#3044ff]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EscalationCard({
  escalation,
  isSelected,
  isWorking,
  onViewDetails,
  onResolve,
}: {
  escalation: EscalationItem;
  isSelected: boolean;
  isWorking: boolean;
  onViewDetails: () => void;
  onResolve: () => void;
}) {
  const Icon = escalation.icon;

  return (
    <article
      onClick={onViewDetails}
      className={`relative cursor-pointer overflow-hidden rounded-[13px] border transition hover:shadow-[0_26px_70px_rgba(20,28,53,0.045)] ${isSelected ? "ring-2 ring-[#3044ff]/20" : ""} ${escalation.borderTone} ${escalation.glowTone} p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:p-5 lg:p-6`}
    >
      {!isWorking ? <span className={`absolute right-6 top-7 h-2.5 w-2.5 rounded-full ${escalation.dotTone}`} /> : null}

      <div className="grid gap-5 md:grid-cols-[176px_minmax(0,1fr)]">
        <div className="flex min-w-0 items-start gap-3 md:border-r md:border-[#dfe3ed] md:pr-5">
          <span
            aria-label={escalation.name}
            role="img"
            className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${escalation.avatar})` }}
          />
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-extrabold text-black">{escalation.name}</h3>
            <p className="mt-1 truncate text-[12px] font-medium text-[#46506a]">{escalation.handle}</p>
            <div className="mt-3 flex items-center gap-3">
              <InstagramDot />
              <span className="text-[12px] font-medium text-[#46506a]">{escalation.time}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 pr-5 sm:pr-8">
          <span className={`inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2.5 text-[11px] font-bold ${escalation.badgeTone}`}>
            <Icon size={13} strokeWidth={2.3} />
            {escalation.badge}
          </span>
          <h2 className="mt-4 text-[15px] font-extrabold leading-tight text-black">{escalation.title}</h2>
          <p className="mt-4 max-w-[360px] text-[13px] font-medium leading-[1.65] text-[#253049]">{escalation.detail}</p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {escalation.meta.map((meta) => (
                <span key={meta} className={`rounded-[7px] px-2.5 py-1 text-[11px] font-bold ${escalation.metaTone}`}>
                  {meta}
                </span>
              ))}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onResolve();
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#cdeedb] bg-[#eafaf0] px-3 text-[12px] font-extrabold text-[#0a9b3f] shadow-[0_12px_28px_rgba(20,28,53,0.025)] sm:w-[132px]"
              >
                <CheckCircle2 size={15} strokeWidth={2.4} />
                Mark resolved
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onViewDetails();
                }}
                className="flex h-10 w-full items-center justify-center gap-4 rounded-[8px] border border-[#dde3ee] bg-white text-[12px] font-extrabold text-black shadow-[0_12px_28px_rgba(20,28,53,0.035)] sm:w-[128px]"
              >
                View details
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function EscalationDetailPanel({
  escalation,
  rows,
  onClose,
  onResolve,
}: {
  escalation?: EscalationItem;
  rows: EscalationDetailRow[];
  onClose: () => void;
  onResolve: () => void;
}) {
  if (!escalation) {
    return (
      <aside className="rounded-[13px] border border-dashed border-[#d7deeb] bg-white p-5 text-center shadow-[0_22px_60px_rgba(20,28,53,0.025)] xl:sticky xl:top-6">
        <TriangleAlert className="mx-auto text-[#3044ff]" size={28} strokeWidth={2.35} />
        <h2 className="mt-3 text-[15px] font-extrabold text-black">No escalation selected</h2>
        <p className="mx-auto mt-2 max-w-[260px] text-[12px] font-medium leading-relaxed text-[#596175]">
          Refunds, complaints, damaged orders, complex requests, and human handoffs will show details here.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[13px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] xl:sticky xl:top-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-black">Escalation Details</h2>
        <button type="button" aria-label="Close details" onClick={onClose} className="text-black">
          <X size={18} strokeWidth={2.3} />
        </button>
      </div>

      <div className="mt-7 grid grid-cols-[52px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[52px_minmax(0,1fr)_118px]">
        <span
          aria-label={escalation.name}
          role="img"
          className="h-[52px] w-[52px] shrink-0 rounded-full bg-cover bg-center"
          style={{ backgroundImage: `url(${escalation.avatar})` }}
        />
        <div className="min-w-0">
          <h3 className="whitespace-nowrap text-[14px] font-extrabold text-black">{escalation.name}</h3>
          <p className="mt-1 truncate text-[12px] font-medium text-[#46506a]">{escalation.handle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (escalation.profileUrl) {
              window.open(escalation.profileUrl, "_blank", "noopener,noreferrer");
            }
          }}
          disabled={!escalation.profileUrl}
          className="col-span-2 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black sm:col-span-1 sm:w-[118px]"
        >
          View profile
          <ExternalLink size={13} strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-[13px] font-extrabold text-black">Summary</h3>
        <p className="mt-3 text-[12px] font-medium leading-[1.75] text-[#253049]">
          {escalation.detail}
        </p>
      </div>

      <div className="mt-5 divide-y divide-[#edf0f6] border-y border-[#edf0f6]">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex min-h-[38px] items-center gap-3 py-2 text-[12px]">
              <Icon size={14} className="shrink-0 text-[#31394f]" strokeWidth={2.2} />
              <span className="flex-1 font-medium text-[#31394f]">{row.label}</span>
              {row.valueTone ? (
                <span className={`rounded-[6px] px-2 py-1 text-[10px] font-extrabold ${row.valueTone}`}>{row.value}</span>
              ) : (
                <span className="text-right font-medium text-[#253049]">{row.value}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <h3 className="text-[13px] font-extrabold text-black">AI Recommended Response</h3>
        <div className="mt-3 rounded-[8px] bg-[#f0efff] p-4 text-[12px] font-medium leading-[1.7] text-[#253049]">
          {escalation.recommendedAction}
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#46506a]">
          <Sparkles size={13} className="text-[#6d3cff]" strokeWidth={2.2} />
          Generated by TractionFlo AI
        </p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onResolve}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#cdeedb] bg-[#eafaf0] text-[12px] font-extrabold text-[#0a9b3f] shadow-[0_18px_36px_rgba(10,155,63,0.08)]"
        >
          <CheckCircle2 size={15} strokeWidth={2.35} />
          Mark resolved
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = `/conversations?conversation=${encodeURIComponent(escalation.conversationId)}`;
          }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)]"
        >
          <Send size={15} strokeWidth={2.25} />
          Take over in Inbox
        </button>
      </div>
    </aside>
  );
}

function escalationMatchesTab(escalation: EscalationItem, tabId: string) {
  if (tabId === "all") return true;
  if (tabId === "refunds") return escalation.category === "refund";
  if (tabId === "complaints") return ["complaint", "product_issue", "issue"].includes(escalation.category);
  if (tabId === "human") return ["human", "complex"].includes(escalation.category);
  return true;
}

function buildEscalationDetailRows(escalation?: EscalationItem): EscalationDetailRow[] {
  if (!escalation) {
    return [];
  }

  return [
    { label: "Escalation type", value: escalation.badge, icon: TriangleAlert, valueTone: escalation.badgeTone },
    { label: "Conversation", value: escalation.handle, icon: MessageSquare },
    { label: "Escalated", value: escalation.time, icon: Clock },
    {
      label: "Risk level",
      value: escalation.riskLevel,
      icon: TriangleAlert,
      valueTone: escalation.riskLevel === "High" ? "bg-[#fff0f3] text-[#df405b]" : "bg-[#fff3e6] text-[#ff850d]",
    },
    { label: "Required action", value: "Creator takeover", icon: Users, valueTone: "bg-[#f0edff] text-[#6d3cff]" },
  ];
}

function buildVisibleEscalationTabs(tabs: EscalationTab[], escalations: EscalationItem[]) {
  return tabs.map((tab) => ({
    ...tab,
    count: formatCreatorInteger(escalations.filter((escalation) => escalationMatchesTab(escalation, tab.id)).length),
  }));
}

export default function EscalationsPage({ summary, isLoading, error }: { summary: CreatorLiveSummary; isLoading: boolean; error: string }) {
  const pageSize = 3;
  const [activeEscalationTabId, setActiveEscalationTabId] = useState("all");
  const [selectedEscalationId, setSelectedEscalationId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [escalationWorkflowState, setEscalationWorkflowState] = useState(emptyEscalationWorkflowState);
  const resolvedEscalationIdSet = new Set(escalationWorkflowState.resolvedIds);
  const workingEscalationIdSet = new Set(escalationWorkflowState.workingIds);
  const unresolvedEscalations = summary.escalations.filter((escalation) => !resolvedEscalationIdSet.has(escalation.id));
  const visibleEscalationTabs = buildVisibleEscalationTabs(summary.escalationTabs, unresolvedEscalations);
  const filteredEscalations = unresolvedEscalations.filter((escalation) => escalationMatchesTab(escalation, activeEscalationTabId));
  const totalPages = Math.max(1, Math.ceil(filteredEscalations.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedEscalations = filteredEscalations.slice(startIndex, startIndex + pageSize);
  const selectedEscalation =
    paginatedEscalations.find((escalation) => escalation.id === selectedEscalationId) ||
    paginatedEscalations[0];
  const selectedEscalationRows = buildEscalationDetailRows(selectedEscalation);
  const showingStart = filteredEscalations.length > 0 ? startIndex + 1 : 0;
  const showingEnd = Math.min(startIndex + paginatedEscalations.length, filteredEscalations.length);
  const paginationPages = Array.from({ length: totalPages }, (_, index) => index + 1);

  useEffect(() => {
    const syncEscalationWorkflowState = () => {
      setEscalationWorkflowState(readStoredEscalationWorkflowState());
    };

    syncEscalationWorkflowState();
    void loadEscalationWorkflowStateFromDatabase().catch((error) => {
      console.error("Escalation workflow state load error:", error);
    });
    window.addEventListener("storage", syncEscalationWorkflowState);
    window.addEventListener(escalationWorkflowStateChangedEvent, syncEscalationWorkflowState);

    return () => {
      window.removeEventListener("storage", syncEscalationWorkflowState);
      window.removeEventListener(escalationWorkflowStateChangedEvent, syncEscalationWorkflowState);
    };
  }, []);

  function handleWorkEscalation(escalationId: string) {
    if (workingEscalationIdSet.has(escalationId)) {
      return;
    }

    applyEscalationWorkflowPatch({ workingIds: [escalationId], readIds: [escalationId] });
    void saveEscalationWorkflowStateToDatabase({ workingIds: [escalationId], readIds: [escalationId] }).catch((error) => {
      console.error("Escalation working state save error:", error);
    });
  }

  function applyEscalationWorkflowPatch(patch: EscalationWorkflowStatePatch) {
    const nextState = mergeEscalationWorkflowState(readStoredEscalationWorkflowState(), patch);

    writeStoredEscalationWorkflowState(nextState);
    setEscalationWorkflowState(nextState);
  }

  function handleResolveEscalation(escalationId: string) {
    const nextFilteredCount = filteredEscalations.filter((escalation) => escalation.id !== escalationId).length;
    const nextTotalPages = Math.max(1, Math.ceil(nextFilteredCount / pageSize));

    applyEscalationWorkflowPatch({ resolvedIds: [escalationId] });
    void saveEscalationWorkflowStateToDatabase({ resolvedIds: [escalationId] }).catch((error) => {
      console.error("Escalation resolve state save error:", error);
    });
    setSelectedEscalationId("");
    setCurrentPage((page) => Math.min(page, nextTotalPages));
  }

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <EscalationsBrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[30px] font-extrabold leading-none text-black sm:text-[32px]">Escalations</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#46506a]">
              AI flags conversations that need creator attention, manual confirmation, or human takeover.
            </p>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <div className="flex h-10 min-w-0 items-center gap-3 rounded-[9px] border border-[#e0e4ef] bg-white px-3 text-[#596175] shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[228px]">
              <Search size={16} strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">Search escalations...</span>
              <span className="hidden rounded bg-[#eff1f6] px-1.5 py-0.5 text-[11px] font-extrabold text-[#8b92a6] sm:inline">⌘K</span>
            </div>
            <NotificationBell />
          </div>
        </header>

        <EscalationTabs
          tabs={visibleEscalationTabs}
          activeTabId={activeEscalationTabId}
          onTabChange={(tabId) => {
            setActiveEscalationTabId(tabId);
            setSelectedEscalationId("");
            setCurrentPage(1);
          }}
        />

        {(isLoading || error) && (
          <div className="mt-4 rounded-[10px] border border-[#edf0f6] bg-white px-4 py-3 text-[12px] font-semibold text-[#46506a] shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            {isLoading ? "Loading real Instagram conversations..." : error}
          </div>
        )}

        <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            {paginatedEscalations.length > 0 ? (
              paginatedEscalations.map((escalation) => (
                <EscalationCard
                  key={escalation.id}
                  escalation={escalation}
                  isSelected={selectedEscalation?.id === escalation.id}
                  isWorking={workingEscalationIdSet.has(escalation.id)}
                  onViewDetails={() => {
                    handleWorkEscalation(escalation.id);
                    setSelectedEscalationId(escalation.id);
                  }}
                  onResolve={() => handleResolveEscalation(escalation.id)}
                />
              ))
            ) : (
              <section className="rounded-[13px] border border-dashed border-[#d7deeb] bg-white p-8 text-center shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
                <TriangleAlert className="mx-auto text-[#3044ff]" size={28} strokeWidth={2.35} />
                <h2 className="mt-3 text-[15px] font-extrabold text-black">No unresolved escalations</h2>
                <p className="mx-auto mt-2 max-w-[430px] text-[12px] font-medium leading-relaxed text-[#596175]">
                  New refunds, complaints, damaged-order issues, complex requests, and human handoff requests from real Instagram messages will appear here.
                </p>
              </section>
            )}
            {filteredEscalations.length > 0 ? (
              <div className="flex flex-col items-center justify-between gap-3 rounded-[12px] border border-[#e5e8f0] bg-white px-4 py-3 shadow-[0_18px_44px_rgba(20,28,53,0.025)] sm:flex-row">
                <p className="text-[12px] font-semibold text-[#46506a]">
                  Showing {showingStart} to {showingEnd} of {formatCreatorInteger(filteredEscalations.length)} escalations
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEscalationId("");
                      setCurrentPage(Math.max(1, safeCurrentPage - 1));
                    }}
                    disabled={safeCurrentPage <= 1}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft size={14} strokeWidth={2.4} />
                    Previous
                  </button>
                  {paginationPages.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => {
                        setSelectedEscalationId("");
                        setCurrentPage(page);
                      }}
                      className={`flex h-9 min-w-9 items-center justify-center rounded-[8px] px-3 text-[11px] font-extrabold ${
                        safeCurrentPage === page
                          ? "bg-[#3044ff] text-white shadow-[0_12px_24px_rgba(48,68,255,0.18)]"
                          : "border border-[#dde3ee] bg-white text-black"
                      }`}
                      aria-current={safeCurrentPage === page ? "page" : undefined}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEscalationId("");
                      setCurrentPage(Math.min(totalPages, safeCurrentPage + 1));
                    }}
                    disabled={safeCurrentPage >= totalPages}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Next
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <EscalationDetailPanel
            escalation={selectedEscalation}
            rows={selectedEscalationRows}
            onClose={() => setSelectedEscalationId("")}
            onResolve={() => selectedEscalation && handleResolveEscalation(selectedEscalation.id)}
          />
        </div>
      </div>
    </main>
  );
}
