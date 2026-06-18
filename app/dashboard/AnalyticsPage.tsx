"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  escalationRulesChangedEvent,
  normalizeEscalationRuleSettings,
  type EscalationRuleSetting,
} from "@/lib/conversation-escalation";
import { settingsStateStorageKey } from "@/lib/notification-preferences";
import {
  buildAnalyticsSummary,
  formatAnalyticsInteger,
} from "./creator-insights";

type InstagramSettingsMessage = {
  id: string;
  text: string;
  attachments?: {
    type: string;
    url: string;
    preview_url?: string;
    name?: string;
  }[];
  from: "me" | "user" | "note";
  sender_name?: string;
  sender_id?: string;
  time: string;
};

type InstagramSettingsConversation = {
  id: string;
  participant: {
    id: string;
    name?: string;
    username?: string;
    profile_pic?: string;
  };
  updated_time?: string;
  messages: InstagramSettingsMessage[];
};

type InstagramConversationsResponse = {
  conversations?: InstagramSettingsConversation[];
  conversation_count?: number;
  error?: string;
};

type AnalyticsMetric = {
  label: string;
  value: string;
  change: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
};

type AnalyticsChannel = {
  label: string;
  value: string;
  count: string;
  color: string;
};

type AnalyticsAutomationMetric = {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
};

type AnalyticsReportRow = {
  label: string;
  source: string;
  conversations: string;
  conversion: string;
  lastActive: string;
  status: string;
  statusTone: string;
};

type AnalyticsPerformanceBucket = {
  label: string;
  conversations: number;
  messages: number;
};

function readStoredEscalationRules() {
  if (typeof window === "undefined") {
    return normalizeEscalationRuleSettings(undefined);
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);
    if (!storedValue) {
      return normalizeEscalationRuleSettings(undefined);
    }

    const parsed = JSON.parse(storedValue) as { rules?: unknown };
    return normalizeEscalationRuleSettings(parsed.rules);
  } catch {
    return normalizeEscalationRuleSettings(undefined);
  }
}

function AnalyticsBrandMark() {
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

function AnalyticsMetricStrip({ metrics }: { metrics: AnalyticsMetric[] }) {
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.label}
            className="flex min-h-[124px] items-center gap-4 rounded-[12px] border border-[#e5e8f0] bg-white px-4 py-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${metric.tone}`}>
              <Icon size={21} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#596175]">{metric.label}</p>
              <p className="mt-2 text-[22px] font-extrabold leading-none text-black">{metric.value}</p>
              <p className="mt-2 flex min-w-0 items-center gap-1 text-[10px] font-semibold text-[#13a84f]">
                <TrendingUp size={11} strokeWidth={2.5} />
                {metric.change}
                <span className="truncate text-[#596175]">{metric.detail}</span>
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function AnalyticsPerformanceChart({ buckets }: { buckets: AnalyticsPerformanceBucket[] }) {
  const maxValue = Math.max(1, ...buckets.map((bucket) => Math.max(bucket.conversations, bucket.messages)));
  const hasWeeklyActivity = buckets.some((bucket) => bucket.conversations > 0 || bucket.messages > 0);

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-black">Conversation activity</h2>
          <p className="mt-1 text-[11px] font-medium text-[#596175]">Daily conversations updated and messages received.</p>
        </div>
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black"
        >
          This week
          <ChevronDown size={14} strokeWidth={2.5} />
        </button>
      </div>

      <div className="-mx-2 mt-4 overflow-x-auto px-2 no-scrollbar">
        {hasWeeklyActivity ? (
          <div className="flex min-h-[252px] min-w-[620px] items-end gap-4 rounded-[10px] bg-[#fbfbff] px-4 pb-4 pt-5">
            {buckets.map((bucket) => {
              const conversationHeight = bucket.conversations > 0 ? Math.max(22, (bucket.conversations / maxValue) * 186) : 0;
              const messageHeight = bucket.messages > 0 ? Math.max(18, (bucket.messages / maxValue) * 186) : 0;

              return (
                <div key={bucket.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-[194px] items-end gap-2">
                    <span
                      className="w-5 rounded-t-[6px] bg-[#3044ff] shadow-[0_10px_18px_rgba(48,68,255,0.18)]"
                      style={{ height: `${conversationHeight}px` }}
                      title={`${bucket.conversations} conversations`}
                    />
                    <span
                      className="w-5 rounded-t-[6px] bg-[#13a84f] shadow-[0_10px_18px_rgba(19,168,79,0.16)]"
                      style={{ height: `${messageHeight}px` }}
                      title={`${bucket.messages} messages`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[#596175]">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[252px] min-w-[620px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#dde3ee] bg-[#fbfbff] px-6 text-center">
            <BarChart3 size={34} strokeWidth={2.2} className="text-[#8b92a6]" />
            <p className="mt-3 text-[13px] font-extrabold text-black">No activity in the last 7 days</p>
            <p className="mt-2 max-w-[360px] text-[11px] font-medium leading-relaxed text-[#596175]">
              Older conversations are still counted below. New Instagram messages will appear here automatically.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-[#596175]">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3044ff]" />
          Conversations
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#13a84f]" />
          Messages
        </span>
      </div>
    </section>
  );
}

function AnalyticsChannelCard({
  channels,
  totalConversationCount,
}: {
  channels: AnalyticsChannel[];
  totalConversationCount: number;
}) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Channel split</h2>
      <p className="mt-1 text-[11px] font-medium text-[#596175]">Coverage and message mix from your loaded Instagram data.</p>

      <div className="mt-5">
        <div className="rounded-[12px] bg-[#fbfbff] p-4 text-center">
          <p className="text-[26px] font-extrabold leading-none text-black">{formatAnalyticsInteger(totalConversationCount)}</p>
          <p className="mt-2 text-[11px] font-medium text-[#596175]">total conversations available</p>
        </div>

        <div className="mt-5 space-y-4">
          {channels.map((channel) => (
            <div key={channel.label} className="text-[12px]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: channel.color }} />
                  <span className="truncate font-extrabold text-black">{channel.label}</span>
                </div>
                <span className="shrink-0 font-extrabold text-black">{channel.value}</span>
              </div>
              <div className="h-2 rounded-full bg-[#edf0f6]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: channel.value,
                    backgroundColor: channel.color,
                  }}
                />
              </div>
              <p className="mt-1 truncate text-[11px] font-medium text-[#596175]">{channel.count}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnalyticsAutomationCard({ metrics }: { metrics: AnalyticsAutomationMetric[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-black">AI automation</h2>
          <p className="mt-1 text-[11px] font-medium text-[#596175]">How the assistant is handling active chats.</p>
        </div>
        <span className="rounded-[8px] bg-[#e7f8ed] px-2.5 py-1 text-[10px] font-extrabold text-[#0a9b3f]">Healthy</span>
      </div>

      <div className="mt-4 grid gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="flex items-center gap-3 rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${metric.tone}`}>
                <Icon size={19} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-extrabold text-black">{metric.label}</p>
                <p className="mt-1 truncate text-[11px] font-medium text-[#596175]">{metric.detail}</p>
              </div>
              <span className="text-[18px] font-extrabold text-black">{metric.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AnalyticsReportTable({ rows }: { rows: AnalyticsReportRow[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-black">Recent performance</h2>
          <p className="mt-1 text-[11px] font-medium text-[#596175]">Top conversation groups from the selected period.</p>
        </div>
        <button type="button" className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black">
          Export
          <UploadCloud size={14} strokeWidth={2.35} />
        </button>
      </div>

      <div className="mt-4 overflow-x-auto no-scrollbar">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[minmax(190px,1fr)_140px_110px_110px_110px_92px] border-b border-[#edf0f6] px-2 pb-2 text-[10px] font-semibold uppercase text-[#596175]">
            <span>Segment</span>
            <span>Source</span>
            <span>Conversations</span>
            <span>Reply rate</span>
            <span>Last active</span>
            <span>Status</span>
          </div>
          {rows.length === 0 ? (
            <div className="px-2 py-8 text-center text-[12px] font-medium text-[#596175]">
              No conversations available for reporting yet.
            </div>
          ) : rows.map((row, index) => (
            <div
              key={row.label}
              className={`grid grid-cols-[minmax(190px,1fr)_140px_110px_110px_110px_92px] items-center px-2 py-3 text-[12px] ${
                index < rows.length - 1 ? "border-b border-[#edf0f6]" : ""
              }`}
            >
              <span className="font-extrabold text-black">{row.label}</span>
              <span className="font-medium text-[#46506a]">{row.source}</span>
              <span className="font-semibold text-black">{row.conversations}</span>
              <span className="font-semibold text-black">{row.conversion}</span>
              <span className="font-semibold text-black">{row.lastActive}</span>
              <span className={`w-max rounded-[7px] px-2.5 py-1 text-[10px] font-extrabold ${row.statusTone}`}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [analyticsResponse, setAnalyticsResponse] = useState<InstagramConversationsResponse | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsEscalationRules, setAnalyticsEscalationRules] = useState<EscalationRuleSetting[]>(() => readStoredEscalationRules());
  const conversations = analyticsResponse?.conversations || [];
  const summary = buildAnalyticsSummary(conversations, analyticsResponse?.conversation_count, analyticsEscalationRules);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    setAnalyticsError("");

    try {
      const response = await fetch("/api/instagram/conversations", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data: InstagramConversationsResponse = await response.json();

      if (!response.ok || (data.error && data.error !== "No Instagram account connected")) {
        throw new Error(data.error || "Could not load analytics");
      }

      setAnalyticsResponse(data);

      if (data.error) {
        setAnalyticsError(data.error);
      }

      try {
        const rulesResponse = await fetch("/api/escalation-rules", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (rulesResponse.ok) {
          const rulesPayload = (await rulesResponse.json()) as { rules?: unknown };
          setAnalyticsEscalationRules(normalizeEscalationRuleSettings(rulesPayload.rules));
        }
      } catch (rulesError) {
        console.error("Analytics escalation rules load error:", rulesError);
      }
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : "Could not load analytics");
      setAnalyticsResponse({ conversations: [], conversation_count: 0 });
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAnalytics(), 0);

    return () => window.clearTimeout(timeout);
  }, [loadAnalytics]);

  useEffect(() => {
    const handleRulesChanged = (event: Event) => {
      setAnalyticsEscalationRules(normalizeEscalationRuleSettings((event as CustomEvent<unknown>).detail));
    };

    window.addEventListener(escalationRulesChangedEvent, handleRulesChanged);

    return () => window.removeEventListener(escalationRulesChangedEvent, handleRulesChanged);
  }, []);

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <AnalyticsBrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[30px] font-extrabold leading-none text-black sm:text-[34px]">Analytics</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#596175]">
              Track conversations started, questions answered, leads, sales, conversions, and handoff needs.
            </p>
          </div>

          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-3">
            <div className="min-w-0 rounded-[9px] border border-[#e0e4ef] bg-white px-4 py-2.5 shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[252px]">
              <p className="truncate text-[12px] font-extrabold text-black">
                {isLoadingAnalytics ? "Syncing analytics..." : `${formatAnalyticsInteger(summary.totalMessageCount)} messages tracked`}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold text-[#596175]">
                Last activity: {summary.latestActivity}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAnalytics()}
              disabled={isLoadingAnalytics}
              className="flex h-11 w-[92px] items-center justify-center gap-2 rounded-[9px] border border-[#e0e4ef] bg-white text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-[104px] sm:text-[13px]"
            >
              <RefreshCw size={15} strokeWidth={2.4} className={isLoadingAnalytics ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </header>

        {analyticsError && (
          <div className="mt-5 rounded-[10px] border border-[#edf0f6] bg-white px-4 py-3 text-[12px] font-semibold text-[#46506a] shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            {analyticsError}
          </div>
        )}

        <AnalyticsMetricStrip metrics={summary.metrics} />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(340px,0.9fr)]">
          <AnalyticsPerformanceChart buckets={summary.performanceBuckets} />
          <div className="grid gap-4">
            <AnalyticsChannelCard channels={summary.channels} totalConversationCount={summary.totalConversationCount} />
            <AnalyticsAutomationCard metrics={summary.automationMetrics} />
          </div>
        </div>

        <div className="mt-4">
          <AnalyticsReportTable rows={summary.reportRows} />
        </div>
      </div>
    </main>
  );
}

