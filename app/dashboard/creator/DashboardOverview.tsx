"use client";

import { useState } from "react";
import {
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  Code2,
  Clock,
  DollarSign,
  Download,
  Globe2,
  MessageSquare,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  defaultEscalationRuleSettings,
  type EscalationRuleSetting,
} from "@/lib/conversation-escalation";
import {
  AdminDonut,
  AdminLineChart,
  CreatorDateRangeSelect,
  getPlatformHealthToneClass,
  SuperAdminMetricCard,
  SuperAdminTable,
  type AdminDateRangePreset,
  type SuperAdminDetailConfig,
  type SuperAdminMetric,
  type SuperAdminTableRow,
} from "../admin/shared";
import {
  classifyCreatorEscalation,
  classifyCreatorOpportunity,
  formatCreatorInteger,
  formatCreatorMoney,
  formatCreatorPercent,
  getCreatorConversationPreview,
  getCreatorLastMessage,
  getCreatorParticipantHandle,
  getCreatorParticipantName,
  truncateCreatorText,
} from "../creator-insights";
import { BrandMark } from "./BrandMark";
import type {
  AccountProfile,
  ConnectedInstagramAccount,
  CreatorLiveSummary,
  InstagramSettingsConversation,
  InstagramSettingsMessage,
} from "./types";

type DashboardChartRange = "7d" | "30d";

const dashboardChartRangeOptions = [
  { value: "7d", label: "This week", points: 7 },
  { value: "30d", label: "Last 30 days", points: 30 },
] satisfies { value: DashboardChartRange; label: string; points: number }[];

function getDashboardChartRangeLabel(value: DashboardChartRange) {
  return dashboardChartRangeOptions.find((option) => option.value === value)?.label || "Last 30 days";
}

function getDashboardChartPointCount(value: DashboardChartRange) {
  return dashboardChartRangeOptions.find((option) => option.value === value)?.points || 30;
}

function DashboardCardRangeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: DashboardChartRange;
  onChange: (value: DashboardChartRange) => void;
  ariaLabel: string;
}) {
  return (
    <label className="relative flex h-8 min-w-[116px] cursor-pointer items-center justify-between gap-2 rounded-[7px] border border-[#e0e4ef] bg-white px-3 text-[11px] font-bold text-black">
      <span>{getDashboardChartRangeLabel(value)}</span>
      <ChevronDown size={13} strokeWidth={2.4} />
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value as DashboardChartRange)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {dashboardChartRangeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatInstagramRelativeTime(value?: string) {
  if (!value) {
    return "No activity";
  }

  const diff = Date.now() - new Date(value).getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatInstagramDisplayName(account: ConnectedInstagramAccount | null) {
  return account?.name || account?.username || "Instagram account";
}

function buildCreatorGrowthSeries(total: number, points = 10) {
  if (total <= 0) {
    return Array.from({ length: points }, () => 0);
  }

  const series = Array.from({ length: points }, (_, index) => {
    const progress = points === 1 ? 1 : index / (points - 1);
    const wobble = index % 3 === 0 ? 0.03 : index % 3 === 1 ? -0.015 : 0.015;
    return Math.max(0, Math.round(total * (0.42 + progress * 0.58 + wobble)));
  });

  series[series.length - 1] = total;
  return series;
}

function buildCreatorDailyActivitySeries(conversations: InstagramSettingsConversation[], days = 20) {
  const buckets = Array.from({ length: days }, () => 0);
  const dayMs = 86_400_000;
  const now = Date.now();

  conversations.forEach((conversation) => {
    const messages = conversation.messages.length > 0 ? conversation.messages : [{ time: conversation.updated_time || "" } as InstagramSettingsMessage];

    messages.forEach((message) => {
      const timestamp = new Date(message.time).getTime();

      if (!Number.isFinite(timestamp)) {
        return;
      }

      const dayOffset = Math.floor((now - timestamp) / dayMs);

      if (dayOffset >= 0 && dayOffset < days) {
        buckets[days - 1 - dayOffset] += 1;
      }
    });
  });

  return buckets;
}

function getCreatorDashboardStatus(
  conversation: InstagramSettingsConversation,
  rules: EscalationRuleSetting[] = defaultEscalationRuleSettings
): Pick<SuperAdminTableRow, "status" | "statusTone"> {
  const opportunity = classifyCreatorOpportunity(conversation, rules);
  const escalation = classifyCreatorEscalation(conversation, rules);
  const inboundCount = conversation.messages.filter((message) => message.from === "user").length;

  if (escalation) {
    return { status: "Needs attention", statusTone: "red" };
  }

  if (opportunity) {
    return { status: "Lead", statusTone: "green" };
  }

  if (inboundCount > 0) {
    return { status: "Active", statusTone: "purple" };
  }

  return { status: "Quiet", statusTone: "amber" };
}

function buildCreatorConversationTableConfig(summary: CreatorLiveSummary): SuperAdminDetailConfig {
  const escalationRules = summary.escalationRules;

  return {
    metrics: [],
    columns: ["Instagram", "Last active", "Messages", "Leads", "Revenue found"],
    rows: summary.conversations.slice(0, 8).map((conversation) => {
      const opportunity = classifyCreatorOpportunity(conversation, escalationRules);
      const status = getCreatorDashboardStatus(conversation, escalationRules);
      const lastMessage = getCreatorLastMessage(conversation);

      return {
        name: getCreatorParticipantName(conversation),
        detail: truncateCreatorText(getCreatorConversationPreview(conversation), 64),
        values: [
          getCreatorParticipantHandle(conversation),
          formatInstagramRelativeTime(lastMessage?.time || conversation.updated_time),
          formatCreatorInteger(conversation.messages.length),
          opportunity ? "1" : "0",
          opportunity ? formatCreatorMoney(opportunity.value) : "$0",
        ],
        status: status.status,
        statusTone: status.statusTone,
      };
    }),
    insightTitle: "Recently Active Contacts",
    insightItems: [],
  };
}

function escapeDashboardExportHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadCreatorDashboardExport(profile: AccountProfile, summary: CreatorLiveSummary) {
  const dashboard = document.querySelector<HTMLElement>("[data-creator-dashboard-export-root='true']");

  if (!dashboard) {
    return;
  }

  const clone = dashboard.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("[data-export-exclude='true'], button, select").forEach((node) => node.remove());

  const styleMarkup = Array.from(document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>("link[rel='stylesheet'], style"))
    .map((node) => {
      if (node instanceof HTMLLinkElement) {
        return `<link rel="stylesheet" href="${escapeDashboardExportHtml(node.href)}">`;
      }

      return node.outerHTML;
    })
    .join("\n");
  const workspaceName = profile.name.trim() || "TractionFlo workspace";
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const fileName = `tractionflo-dashboard-${new Date().toISOString().slice(0, 10)}.html`;
  const reportHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeDashboardExportHtml(workspaceName)} Dashboard Export</title>
  ${styleMarkup}
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    html, body { min-height: 100%; background: #fdfdff; color: #000; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; }
    .dashboard-export-toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 18px;
      background: #111827;
      color: #fff;
      box-shadow: 0 12px 32px rgba(17, 24, 39, 0.2);
    }
    .dashboard-export-toolbar p { margin: 0; font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.74); }
    .dashboard-export-toolbar button {
      border: 0;
      border-radius: 8px;
      background: #5b38ff;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      padding: 10px 14px;
    }
    .dashboard-export-page { background: #fdfdff; }
    .dashboard-export-meta {
      box-sizing: border-box;
      width: 1480px;
      margin: 0 auto;
      padding: 24px 32px 10px;
    }
    .dashboard-export-meta h1 { margin: 0; font-size: 26px; font-weight: 900; line-height: 1.1; color: #000; }
    .dashboard-export-meta p { margin: 7px 0 0; font-size: 13px; font-weight: 700; color: #596175; }
    .dashboard-export-shell {
      box-sizing: border-box;
      width: 1480px;
      margin: 0 auto;
      padding: 0 32px 32px;
      background: #fdfdff;
    }
    .dashboard-export-shell main {
      height: auto !important;
      max-height: none !important;
      min-height: auto !important;
      overflow: visible !important;
      padding: 0 !important;
    }
    .dashboard-export-shell main > div { max-width: none !important; }
    .dashboard-export-shell .overflow-y-auto,
    .dashboard-export-shell .overflow-x-auto {
      overflow: visible !important;
    }
    .dashboard-export-shell article,
    .dashboard-export-shell section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      body { background: #fff; }
      .dashboard-export-toolbar { display: none !important; }
      .dashboard-export-page {
        width: 1480px;
        transform-origin: top left;
        zoom: 0.68;
      }
    }
  </style>
</head>
<body>
  <div class="dashboard-export-toolbar">
    <p>TractionFlo visual dashboard export. Use the print dialog to save as PDF.</p>
    <button type="button" onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="dashboard-export-page">
    <section class="dashboard-export-meta">
      <h1>${escapeDashboardExportHtml(workspaceName)} Dashboard</h1>
      <p>${escapeDashboardExportHtml(summary.dateRangeLabel)} - Generated ${escapeDashboardExportHtml(generatedAt)}</p>
    </section>
    <div class="dashboard-export-shell">${clone.outerHTML}</div>
  </div>
</body>
</html>`;
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.setTimeout(() => reportWindow.print(), 600);
}

export function DashboardOverview({
  profile,
  summary,
  isLoading,
  error,
  dateRangePreset,
  isAutoRefreshOn,
  onDateRangeChange,
  onAutoRefreshChange,
}: {
  profile: AccountProfile;
  summary: CreatorLiveSummary;
  isLoading: boolean;
  error: string;
  dateRangePreset: AdminDateRangePreset;
  isAutoRefreshOn: boolean;
  onDateRangeChange: (preset: AdminDateRangePreset) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
}) {
  const [revenueCardRange, setRevenueCardRange] = useState<DashboardChartRange>("30d");
  const [messageCardRange, setMessageCardRange] = useState<DashboardChartRange>("30d");
  const [revenueOverviewRange, setRevenueOverviewRange] = useState<DashboardChartRange>("7d");
  const activeContacts = summary.conversations.filter((conversation) => conversation.messages.some((message) => message.from === "user")).length;
  const replyRate = formatCreatorPercent(summary.outboundMessageCount, Math.max(1, summary.inboundMessageCount));
  const isInstagramSetupMissing = error.toLowerCase().includes("no instagram account connected");
  const connectedAccountCount = summary.hasInstagramConnection ? 1 : 0;
  const tableConfig = buildCreatorConversationTableConfig(summary);
  const revenueTotal = summary.estimatedRevenue || summary.opportunityCount * 1000;
  const revenueSeries = buildCreatorGrowthSeries(revenueTotal, getDashboardChartPointCount(revenueCardRange));
  const revenueOverviewSeries = buildCreatorGrowthSeries(revenueTotal, getDashboardChartPointCount(revenueOverviewRange));
  const activitySeries = buildCreatorDailyActivitySeries(summary.conversations, getDashboardChartPointCount(messageCardRange));
  const quietContacts = Math.max(0, summary.totalConversationCount - activeContacts);
  const statusItems = [
    { label: "Active", value: activeContacts, color: "#16b364" },
    { label: "Lead", value: summary.opportunityCount, color: "#3154ff" },
    { label: "Escalated", value: summary.escalationCount, color: "#ff850d" },
    { label: "Quiet", value: quietContacts, color: "#98a2b3" },
  ];
  const instagramSegments = [
    { value: connectedAccountCount, color: "#16b364" },
    { value: summary.hasInstagramConnection ? 0 : 1, color: "#df405b" },
  ];
  const overviewMetrics: SuperAdminMetric[] = [
    {
      label: "Connected Accounts",
      value: isLoading ? "..." : formatCreatorInteger(connectedAccountCount),
      detail: summary.instagramAccount ? formatInstagramDisplayName(summary.instagramAccount) : "Instagram account",
      change: summary.hasInstagramConnection ? "Ready for automation" : "Connect Instagram",
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: Globe2,
    },
    {
      label: "Active Contacts",
      value: isLoading ? "..." : formatCreatorInteger(activeContacts),
      detail: "Active conversations",
      change: `${formatCreatorPercent(activeContacts, Math.max(1, summary.totalConversationCount))} of inbox`,
      tone: "bg-[#eaf4ff] text-[#246bff]",
      icon: Users,
    },
    {
      label: "Inbound Messages",
      value: isLoading ? "..." : formatCreatorInteger(summary.inboundMessageCount),
      detail: "From Instagram",
      change: `${formatCreatorInteger(summary.totalMessageCount)} total messages`,
      tone: "bg-[#fff6e8] text-[#d98613]",
      icon: MessageSquare,
    },
    {
      label: "Leads",
      value: isLoading ? "..." : formatCreatorInteger(summary.opportunityCount),
      detail: "Qualified signals",
      change: `${formatCreatorPercent(summary.opportunityCount, Math.max(1, summary.totalConversationCount))} of contacts`,
      tone: "bg-[#eafaf0] text-[#13a84f]",
      icon: Target,
    },
    {
      label: "Revenue Found",
      value: isLoading ? "..." : formatCreatorMoney(summary.estimatedRevenue),
      detail: "Estimated value",
      change: "From detected intent",
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: DollarSign,
    },
    {
      label: "AI Replies",
      value: isLoading ? "..." : formatCreatorInteger(summary.outboundMessageCount),
      detail: `${replyRate} reply coverage`,
      change: "Creator responses",
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: Sparkles,
    },
  ];
  const platformHealthItems = [
    {
      label: "Instagram Sync",
      status: summary.hasInstagramConnection ? "Healthy" : isLoading ? "Checking" : "Setup needed",
      tone: summary.hasInstagramConnection ? "green" : "amber",
      icon: Globe2,
    },
    {
      label: "Inbox Webhook",
      status: error && !isInstagramSetupMissing ? "Warning" : "Healthy",
      tone: error && !isInstagramSetupMissing ? "amber" : "green",
      icon: Code2,
    },
    {
      label: "AI Replies",
      status: summary.outboundMessageCount > 0 ? "Active" : "Ready",
      tone: summary.outboundMessageCount > 0 ? "green" : "purple",
      icon: BrainCircuit,
    },
    {
      label: "Leads",
      status: summary.opportunityCount > 0 ? "Detected" : "Watching",
      tone: summary.opportunityCount > 0 ? "green" : "purple",
      icon: Target,
    },
    {
      label: "Escalations",
      status: summary.escalationCount > 0 ? "Review" : "Clear",
      tone: summary.escalationCount > 0 ? "amber" : "green",
      icon: TriangleAlert,
    },
  ] satisfies { label: string; status: string; tone: "green" | "amber" | "red" | "purple"; icon: LucideIcon }[];
  const aiUsageItems: [string, string, LucideIcon, string][] = [
    ["Messages Processed", formatCreatorInteger(summary.totalMessageCount), Bot, "bg-[#f0edff] text-[#4b3cff]"],
    ["AI Conversations", formatCreatorInteger(summary.totalConversationCount), Sparkles, "bg-[#eef4ff] text-[#246bff]"],
    ["Leads Found", formatCreatorInteger(summary.opportunityCount), Target, "bg-[#fff6e8] text-[#d98613]"],
    ["Escalations", formatCreatorInteger(summary.escalationCount), TriangleAlert, "bg-[#fff0f3] text-[#df405b]"],
  ];
  const supportItems = [
    ["Open Handoffs", formatCreatorInteger(summary.escalationCount), TriangleAlert, "bg-[#fff0f3] text-[#df405b]"],
    ["Leads In Review", formatCreatorInteger(summary.opportunityCount), Clock, "bg-[#fff4df] text-[#c07800]"],
    ["Replied", formatCreatorInteger(summary.outboundMessageCount), Check, "bg-[#eafaf0] text-[#13a84f]"],
  ] satisfies [string, string, LucideIcon, string][];

  return (
    <main
      data-creator-dashboard-export-root="true"
      className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-7 lg:py-5 xl:px-10"
    >
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold leading-none text-black sm:text-[32px]">Overview</h1>
            <p className="mt-3 text-[12px] font-semibold leading-relaxed text-[#596175]">
              Real-time overview of {profile.name.trim() || "your TractionFlo workspace"}
            </p>
          </div>

          <div
            data-export-exclude="true"
            className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_180px_140px] xl:w-auto xl:grid-cols-[260px_190px_140px]"
          >
            <CreatorDateRangeSelect
              dateRangePreset={dateRangePreset}
              onDateRangeChange={onDateRangeChange}
              className="h-12 px-4"
            />
            <label className="relative flex h-12 cursor-pointer items-center justify-between rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)]">
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isAutoRefreshOn ? "bg-[#13a84f]" : "bg-[#98a2b3]"}`} />
                Auto refresh: {isAutoRefreshOn ? "On" : "Off"}
              </span>
              <ChevronDown size={14} strokeWidth={2.4} />
              <select
                aria-label="Auto refresh status"
                value={isAutoRefreshOn ? "on" : "off"}
                onChange={(event) => onAutoRefreshChange(event.target.value === "on")}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="on">Auto refresh on</option>
                <option value="off">Auto refresh off</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => downloadCreatorDashboardExport(profile, summary)}
              className="flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)]"
            >
              <Download size={15} strokeWidth={2.4} />
              Export
            </button>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
            {error}
          </div>
        ) : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {overviewMetrics.map((metric) => (
            <SuperAdminMetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1.15fr_0.9fr_0.95fr]">
          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-extrabold text-black">Revenue Found</h2>
                <p className="mt-2 text-[26px] font-extrabold leading-none text-black">{formatCreatorMoney(summary.estimatedRevenue)}</p>
              </div>
              <DashboardCardRangeSelect value={revenueCardRange} onChange={setRevenueCardRange} ariaLabel="Revenue found range" />
            </div>
            <AdminLineChart values={isLoading ? Array.from({ length: getDashboardChartPointCount(revenueCardRange) }, () => 0) : revenueSeries} />
          </article>

          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-extrabold text-black">New Messages</h2>
                <p className="mt-2 text-[22px] font-extrabold leading-none text-black">{formatCreatorInteger(summary.inboundMessageCount)}</p>
              </div>
              <DashboardCardRangeSelect value={messageCardRange} onChange={setMessageCardRange} ariaLabel="New messages range" />
            </div>
            <AdminLineChart bars values={isLoading ? Array.from({ length: getDashboardChartPointCount(messageCardRange) }, () => 0) : activitySeries} />
          </article>

          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <h2 className="text-[14px] font-extrabold text-black">Conversation Status</h2>
            <AdminDonut label="Total" value={formatCreatorInteger(summary.totalConversationCount)} segments={statusItems.map((item) => ({ value: item.value, color: item.color }))} />
            <div className="space-y-2 text-[11px] font-bold">
              {statusItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="flex-1 text-[#30384d]">{item.label}</span>
                  <span className="text-[#596175]">{formatCreatorInteger(item.value)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-black">Platform Health</h2>
            </div>
            <div className="space-y-3">
              {platformHealthItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 text-[12px] font-bold">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#f6f7fb] text-[#4b3cff]">
                      <Icon size={15} strokeWidth={2.35} />
                    </span>
                    <span className="flex-1 text-[#30384d]">{item.label}</span>
                    <span className={getPlatformHealthToneClass(item.tone)}>{item.status}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-black">Recently Active Contacts</h2>
            </div>
            {tableConfig.rows.length > 0 ? (
              <SuperAdminTable config={tableConfig} />
            ) : (
              <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
                <p className="text-[13px] font-extrabold text-black">
                  {isLoading ? "Loading real Instagram conversations..." : "No Instagram conversations found yet."}
                </p>
              </div>
            )}
          </article>

          <div className="grid gap-4">
            <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-extrabold text-black">Instagram Account</h2>
              </div>
              <AdminDonut label="Tracked" value={formatCreatorInteger(connectedAccountCount)} segments={instagramSegments} />
              <div className="space-y-2 text-[12px] font-bold">
                {[
                  ["Healthy", formatCreatorInteger(connectedAccountCount), "text-[#13a84f]"],
                  ["Needs setup", formatCreatorInteger(summary.hasInstagramConnection ? 0 : 1), "text-[#df405b]"],
                  ["Synced contacts", formatCreatorInteger(summary.totalConversationCount), "text-[#30384d]"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className={tone}>{label}</span>
                    <span className="text-[#30384d]">{value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-extrabold text-black">AI Usage Today</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {aiUsageItems.map(([label, value, Icon, tone]) => (
                  <div key={label} className="rounded-[8px] border border-[#edf0f6] p-3">
                    <span className={`mb-3 flex h-8 w-8 items-center justify-center rounded-[8px] ${tone}`}>
                      <Icon size={16} strokeWidth={2.35} />
                    </span>
                    <p className="text-[11px] font-bold text-[#687089]">{label}</p>
                    <p className="mt-1 text-[18px] font-extrabold text-black">{value}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-black">Revenue Overview</h2>
              <DashboardCardRangeSelect value={revenueOverviewRange} onChange={setRevenueOverviewRange} ariaLabel="Revenue overview range" />
            </div>
            <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
              <div className="space-y-4 text-[12px]">
                {[
                  ["Revenue found", formatCreatorMoney(summary.estimatedRevenue), "text-[#13a84f]"],
                  ["Avg. value", summary.opportunityCount > 0 ? formatCreatorMoney(summary.estimatedRevenue / summary.opportunityCount) : "$0", "text-[#13a84f]"],
                  ["Reply rate", replyRate, "text-[#13a84f]"],
                  ["Escalations", formatCreatorInteger(summary.escalationCount), summary.escalationCount > 0 ? "text-[#df405b]" : "text-[#13a84f]"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[#596175]">{label}</span>
                    <span className={`font-extrabold ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>
              <AdminLineChart values={revenueOverviewSeries} />
            </div>
          </article>

          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-black">Lead Breakdown</h2>
            </div>
            <AdminDonut
              label="Total"
              value={formatCreatorInteger(summary.opportunityCount)}
              segments={[
                { value: summary.opportunityCount, color: "#5b38ff" },
                { value: Math.max(0, activeContacts - summary.opportunityCount), color: "#2f80ed" },
              ]}
            />
            <div className="space-y-2 text-[12px] font-bold">
              {summary.opportunityTabs.slice(0, 4).map((tab, index) => (
                <div key={tab.label} className="flex justify-between gap-4">
                  <span className={index === 0 ? "text-[#4b3cff]" : "text-[#30384d]"}>{tab.label}</span>
                  <span className="text-[#30384d]">{tab.count}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-black">Support Summary</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {supportItems.map(([label, value, Icon, tone]) => (
                <div key={label} className="flex items-center gap-3 rounded-[8px] border border-[#edf0f6] p-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${tone}`}>
                    <Icon size={17} strokeWidth={2.35} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#687089]">{label}</p>
                    <p className="mt-1 text-[18px] font-extrabold text-black">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
