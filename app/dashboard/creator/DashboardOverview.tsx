"use client";

import { useState, type MouseEvent } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  Flame,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CreatorDateRangeSelect, type AdminDateRangePreset } from "../admin/shared";
import {
  classifyCreatorOpportunity,
  formatCreatorInteger,
  formatCreatorMoney,
  formatCreatorPercent,
  getCreatorConversationPreview,
  getCreatorConversationTime,
  getCreatorLastMessage,
  getCreatorParticipantName,
  truncateCreatorText,
  creatorBuyerKeywords,
  getCreatorLatestInboundText,
  getCreatorConversationText,
  countCreatorKeywordHits,
  hasCreatorGoalSignal,
  hasCreatorBudgetSignal,
  hasCreatorTimelineSignal,
  hasCreatorSalesLeadSignal,
} from "../creator-insights";
import NotificationBell from "../../components/NotificationBell";
import { BrandMark } from "./BrandMark";
import type {
  AccountProfile,
  CreatorLiveSummary,
  DashboardTab,
  InstagramSettingsConversation,
} from "./types";

type DashboardChartRange = "7d" | "30d";
type ToneName = "orange" | "pink" | "green" | "blue" | "amber";

const dashboardChartRangeOptions = [
  { value: "7d", label: "This week", points: 7 },
  { value: "30d", label: "Last 30 days", points: 30 },
] satisfies { value: DashboardChartRange; label: string; points: number }[];

const panelClass = "rounded-[8px] border border-[#eceff5] bg-white shadow-[0_18px_55px_rgba(20,28,53,0.035)]";

const dashboardTabUrlValues: Record<DashboardTab, string> = {
  dashboard: "/dashboard",
  inbox: "/conversations",
  "instagram-content": "/instagram-content",
  opportunities: "/opportunities",
  ros: "/ros",
  audience: "/audience",
  knowledge: "/knowledge-base",
  escalations: "/escalations",
  analytics: "/analytics",
  settings: "/settings",
};

function openDashboardTab(
  tab: DashboardTab,
  onNavigate?: (tab: DashboardTab) => void,
  event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>
) {
  event?.preventDefault();
  onNavigate?.(tab);

  if (typeof window === "undefined") {
    return;
  }

  const targetPath = dashboardTabUrlValues[tab];

  if (!targetPath) {
    return;
  }

  if (window.location.pathname === targetPath) {
    return;
  }

  window.history.pushState(null, "", targetPath);
  window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
}

function getDashboardTabHref(tab: DashboardTab) {
  return dashboardTabUrlValues[tab] || "/dashboard";
}

function isOpportunityLabel(label: string) {
  return label.toLowerCase().includes("opportunit");
}

const toneClasses: Record<ToneName, { soft: string; text: string; bar: string; dot: string }> = {
  orange: {
    soft: "bg-[#fff2e8] text-[#ff6b00]",
    text: "text-[#ff6b00]",
    bar: "from-[#ff6b00] to-[#ff2f7d]",
    dot: "bg-[#ff6b00]",
  },
  pink: {
    soft: "bg-[#fff0f6] text-[#e81f72]",
    text: "text-[#e81f72]",
    bar: "from-[#ff2f7d] to-[#e81f72]",
    dot: "bg-[#e81f72]",
  },

  green: {
    soft: "bg-[#eafaf0] text-[#15a84f]",
    text: "text-[#15a84f]",
    bar: "from-[#15a84f] to-[#36d16d]",
    dot: "bg-[#15a84f]",
  },
  blue: {
    soft: "bg-[#eef5ff] text-[#2f63f6]",
    text: "text-[#2f63f6]",
    bar: "from-[#2f63f6] to-[#38a3ff]",
    dot: "bg-[#2f63f6]",
  },
  amber: {
    soft: "bg-[#fff7e3] text-[#cc8500]",
    text: "text-[#cc8500]",
    bar: "from-[#ff9f1a] to-[#ff6b00]",
    dot: "bg-[#ff9f1a]",
  },
};

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
    <label className="relative flex h-8 min-w-[122px] cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-[#e6e9f2] bg-white px-3 text-[11px] font-extrabold text-black">
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

function getPaginatedItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    safePage,
    startItem: items.length === 0 ? 0 : startIndex + 1,
    endItem: Math.min(items.length, startIndex + pageSize),
    totalPages,
  };
}

function CardPagination({
  endItem,
  onPageChange,
  page,
  startItem,
  totalItems,
  totalPages,
}: {
  endItem: number;
  onPageChange: (page: number) => void;
  page: number;
  startItem: number;
  totalItems: number;
  totalPages: number;
}) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-[8px] bg-[#fff5fa] px-3 py-2.5">
      <p className="text-[11px] font-extrabold text-[#e81f72]">
        Rows {formatCreatorInteger(startItem)}-{formatCreatorInteger(endItem)} of {formatCreatorInteger(totalItems)}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous rows"
          title="Previous rows"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#ffd2e4] bg-white text-[#e81f72] transition hover:bg-[#ffeaf3] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={15} strokeWidth={2.6} />
        </button>
        <span className="min-w-10 text-center text-[11px] font-extrabold text-[#30384d]">
          {formatCreatorInteger(page)}/{formatCreatorInteger(totalPages)}
        </span>
        <button
          type="button"
          aria-label="Next rows"
          title="Next rows"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#ffd2e4] bg-white text-[#e81f72] transition hover:bg-[#ffeaf3] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronRight size={15} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
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
    html, body { min-height: 100%; background: #ffffff; color: #000; }
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
      background: #ff2f7d;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      padding: 10px 14px;
    }
    .dashboard-export-page { background: #ffffff; }
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
      background: #ffffff;
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

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(profile: AccountProfile) {
  return profile.name.trim().split(/\s+/)[0] || "there";
}

function countConversationsMatching(
  conversations: InstagramSettingsConversation[],
  pattern: RegExp,
  from?: "me" | "user" | "note"
) {
  return conversations.filter((conversation) => {
    const ordered = [...conversation.messages].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const recent = ordered.slice(-3);
    return recent.some((message) => (!from || message.from === from) && pattern.test(message.text || ""));
  }).length;
}

function countNeedsFollowUp(conversations: InstagramSettingsConversation[]) {
  return conversations.filter((conversation) => {
    const orderedMessages = [...conversation.messages].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const lastMessage = orderedMessages[orderedMessages.length - 1];

    return lastMessage?.from === "user";
  }).length;
}

function getCreatorAvatarSeed(name: string) {
  return name.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TF";
}

function InitialAvatar({ name }: { name: string }) {
  const palettes = [
    "from-[#ff6b00] to-[#ff2f7d]",
    "from-[#7548ff] to-[#38a3ff]",
    "from-[#15a84f] to-[#36d16d]",
    "from-[#111827] to-[#4b5563]",
    "from-[#f59e0b] to-[#f97316]",
  ];
  const palette = palettes[getCreatorAvatarSeed(name) % palettes.length];

  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${palette} text-[12px] font-extrabold text-white`}>
      {getInitials(name)}
    </span>
  );
}

function IconBubble({ icon: Icon, tone }: { icon: LucideIcon; tone: ToneName }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[tone].soft}`}>
      <Icon size={20} strokeWidth={2.25} />
    </span>
  );
}

function TrendText({ children }: { children: string }) {
  return (
    <span className="mt-2 flex items-center gap-1.5 text-[11px] font-extrabold text-[#20b85a]">
      <TrendingUp size={13} strokeWidth={2.5} />
      {children}
    </span>
  );
}

function getTrendShare(value: number, total: number) {
  return `${formatCreatorPercent(value, Math.max(1, total))} of selected range`;
}

function buildIntentSnapshot(summary: CreatorLiveSummary) {
  const highIntentCards = summary.opportunityCards.filter(
    (card) => card.classification === "Hot" || card.urgency === "High" || /high/i.test(card.badge)
  );
  const readyToBuyCount = highIntentCards.length;
  const needFollowUpCount = countNeedsFollowUp(summary.conversations);
  const waitingPaymentOrderCount = summary.orders.filter(
    (order) => order.status === "pending_confirmation" || (order.status === "confirmed" && order.paymentStatus !== "paid")
  ).length;
  const waitingPaymentCount = countConversationsMatching(
    summary.conversations,
    /\b(pay|payment|checkout|invoice|paid|card|deposit|transfer)\b/i
  ) + waitingPaymentOrderCount;

  const offersSentCount = summary.conversations.filter((conversation) => {
    const ordered = [...conversation.messages].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const recent = ordered.slice(-3);
    return recent.some((message) => {
      if (message.from !== "me") return false;
      const text = message.text || "";
      const hasUrl = /https?:\/\/[^\s]+/.test(text);
      const hasOfferKeyword = /\b(proposal|pricing|package|plan|payment link|checkout|invoice)\b/i.test(text);
      const hasCatalog = Boolean(message.catalogItems && message.catalogItems.length > 0);
      return hasUrl || hasOfferKeyword || hasCatalog;
    });
  }).length;

  const activeContacts = summary.conversations.filter((conversation) => conversation.messages.some((message) => message.from === "user")).length;

  let buyingSignalCount = 0;
  summary.conversations.forEach((conversation) => {
    const latestText = getCreatorLatestInboundText(conversation);
    const text = getCreatorConversationText(conversation) || latestText;
    
    const inboundCount = conversation.messages.filter((message) => message.from === "user").length;
    const buyerHits = countCreatorKeywordHits(text, creatorBuyerKeywords);
    
    const hasGoal = hasCreatorGoalSignal(text);
    const hasBudget = hasCreatorBudgetSignal(text);
    const hasTimeline = hasCreatorTimelineSignal(text);
    const hasBuyingIntent = hasCreatorSalesLeadSignal(text, buyerHits, inboundCount);

    if (buyerHits > 0) buyingSignalCount++;
    if (hasBuyingIntent && buyerHits === 0) buyingSignalCount++;
    if (hasGoal) buyingSignalCount++;
    if (hasBudget) buyingSignalCount++;
    if (hasTimeline) buyingSignalCount++;
  });
  const buyingSignalCardCount = summary.opportunityCards.filter((card) => {
    const signalText = `${card.badge} ${card.subtitle} ${card.intent || ""} ${(card.signals || []).join(" ")}`.toLowerCase();

    return /\b(paid|checkout|order|buying|booking|payment|budget|pricing|urgent|bulk)\b/.test(signalText);
  }).length;
  const buyingSignalOrderCount = summary.orders.filter(
    (order) => order.status === "confirmed" || order.status === "paid" || order.paymentStatus === "paid" || order.paymentStatus === "pending"
  ).length;
  buyingSignalCount = Math.max(buyingSignalCount, buyingSignalCardCount, buyingSignalOrderCount);

  return {
    activeContacts,
    buyingSignalCount,
    highIntentCards,
    needFollowUpCount,
    offersSentCount,
    readyToBuyCount,
    waitingPaymentCount,
  };
}

function buildRevenueTrendSeries(summary: CreatorLiveSummary, points: number) {
  const buckets = Array.from({ length: points }, () => 0);
  const now = Date.now();
  const dayMs = 86_400_000;

  if (summary.revenueMode === "paid") {
    summary.orders.forEach((order) => {
      if (order.status !== "paid" && order.paymentStatus !== "paid") {
        return;
      }

      const timestamp = new Date(order.paidAt || order.updatedAt || order.createdAt).getTime();

      if (!Number.isFinite(timestamp)) {
        return;
      }

      const dayOffset = Math.floor((now - timestamp) / dayMs);

      if (dayOffset >= 0 && dayOffset < points) {
        buckets[points - 1 - dayOffset] += order.amount || 0;
      }
    });

    let runningTotal = 0;
    return buckets.map((value) => {
      runningTotal += value;
      return runningTotal;
    });
  }

  summary.conversations.forEach((conversation) => {
    const opportunity = classifyCreatorOpportunity(conversation, summary.escalationRules);

    if (!opportunity) {
      return;
    }

    const timestamp = getCreatorConversationTime(conversation);

    if (!Number.isFinite(timestamp)) {
      return;
    }

    const dayOffset = Math.floor((now - timestamp) / dayMs);

    if (dayOffset >= 0 && dayOffset < points) {
      buckets[points - 1 - dayOffset] += opportunity.value || 0;
    }
  });

  let runningTotal = 0;
  return buckets.map((value) => {
    runningTotal += value;
    return runningTotal;
  });
}

function RevenueTrendChart({ values }: { values: number[] }) {
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(1, maxValue - minValue);
  const width = 560;
  const height = 230;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : 24 + (index / (values.length - 1)) * (width - 48);
    const y = height - 34 - ((value - minValue) / range) * 150;
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1]?.x.toFixed(1) || width - 24} 214 L ${points[0]?.x.toFixed(1) || 24} 214 Z`;

  return (
    <div className="relative h-[230px] overflow-hidden rounded-[8px] bg-[#fffafd]">
      <div className="absolute inset-x-0 top-[44px] h-px bg-[#f0edf2]" />
      <div className="absolute inset-x-0 top-[92px] h-px bg-[#f0edf2]" />
      <div className="absolute inset-x-0 top-[140px] h-px bg-[#f0edf2]" />
      <div className="absolute inset-x-0 top-[188px] h-px bg-[#f0edf2]" />
      <svg viewBox="0 0 560 230" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id="creatorRevenueLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#e81f72" />
          </linearGradient>
          <linearGradient id="creatorRevenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff2f7d" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#creatorRevenueFill)" />
        <path d={path} fill="none" stroke="url(#creatorRevenueLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={index === points.length - 1 ? "#e81f72" : "#ff4c68"}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-x-5 bottom-3 flex justify-between text-[10px] font-bold text-[#7b8193]">
        <span>Start</span>
        <span>Mid</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function OpportunityList({
  summary,
  onNavigate,
}: {
  summary: CreatorLiveSummary;
  onNavigate?: (tab: DashboardTab) => void;
}) {
  const [page, setPage] = useState(1);
  const cards = summary.opportunityCards;
  const paginatedCards = getPaginatedItems(cards, page, 4);

  return (
    <article className={`${panelClass} p-5`}>
      <div className="mb-4">
        <h2 className="text-[15px] font-extrabold text-black">High Intent Opportunities ({formatCreatorInteger(summary.opportunityCount)})</h2>
      </div>

      {cards.length > 0 ? (
        <div className="space-y-3">
          {paginatedCards.items.map((card) => {
            const tone: ToneName = card.urgency === "High" ? "pink" : card.urgency === "Medium" ? "orange" : "green";

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => openDashboardTab("opportunities", onNavigate)}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px] p-2 text-left transition hover:bg-[#fff7fb]"
              >
                <span className={`h-2 w-2 rounded-full ${toneClasses[tone].dot}`} />
                <div className="flex min-w-0 items-center gap-3">
                  <InitialAvatar name={card.name} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-extrabold text-black">{card.name}</p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-[#687083]">{card.subtitle}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#687083]">{card.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`hidden rounded-full px-2 py-1 text-[10px] font-extrabold sm:inline-flex ${toneClasses[tone].soft}`}>
                    {card.urgency || card.badge}
                  </span>
                  <span className="text-right text-[11px] font-bold text-[#687083]">{card.time}</span>
                  <Send size={16} strokeWidth={2.25} className="text-[#e81f72]" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-[#e4e7f0] p-6 text-center">
          <p className="text-[13px] font-extrabold text-black">No high intent opportunities yet.</p>
          <p className="mt-2 text-[12px] font-semibold text-[#687083]">New pricing, booking, and buying signals will appear here.</p>
        </div>
      )}

      <CardPagination
        endItem={paginatedCards.endItem}
        onPageChange={setPage}
        page={paginatedCards.safePage}
        startItem={paginatedCards.startItem}
        totalItems={cards.length}
        totalPages={paginatedCards.totalPages}
      />
    </article>
  );
}



function PipelineOverview({
  intent,
  summary,
  onNavigate,
}: {
  intent: ReturnType<typeof buildIntentSnapshot>;
  summary: CreatorLiveSummary;
  onNavigate?: (tab: DashboardTab) => void;
}) {
  const readyBuyerVal = intent.readyToBuyCount;
  const paymentPendingVal = intent.waitingPaymentCount;
  const offersSentVal = intent.offersSentCount;
  const qualifiedVal = Math.max(intent.readyToBuyCount, summary.opportunityCount, offersSentVal, paymentPendingVal, readyBuyerVal);
  const newOppVal = Math.max(summary.opportunityCount, qualifiedVal);

  const steps = [
    {
      label: "New Opportunities",
      value: newOppVal,
      icon: Eye,
      tone: "orange" as ToneName,
    },
    {
      label: "Qualified Opportunities",
      value: qualifiedVal,
      icon: UserCheck,
      tone: "pink" as ToneName,
    },
    {
      label: "Offers Sent",
      value: offersSentVal,
      icon: Send,
      tone: "orange" as ToneName,
    },
    {
      label: "Payment Pending",
      value: paymentPendingVal,
      icon: DollarSign,
      tone: "blue" as ToneName,
    },
    {
      label: "Ready Buyer",
      value: readyBuyerVal,
      icon: Users,
      tone: "green" as ToneName,
    },
  ];

  const getTabForPipeline = (label: string): DashboardTab => {
    if (isOpportunityLabel(label)) return "opportunities";
    if (label.toLowerCase().includes("offer")) return "opportunities";
    if (label.toLowerCase().includes("payment") || label.toLowerCase().includes("pending")) return "ros";
    if (label.toLowerCase().includes("buyer")) return "opportunities";
    return "dashboard";
  };

  return (
    <article className={`${panelClass} p-5`}>
      <div className="mb-5">
        <h2 className="text-[15px] font-extrabold text-black">Pipeline Overview</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div key={step.label} className="relative min-w-0">
              <button
                type="button"
                onClick={() => openDashboardTab(getTabForPipeline(step.label), onNavigate)}
                className="group flex h-full min-h-[126px] w-full cursor-pointer flex-col items-center justify-start overflow-hidden rounded-[8px] px-2 py-3 text-center transition hover:bg-[#f0f1f6] hover:shadow-sm active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3044ff]/25"
              >
                <IconBubble icon={Icon} tone={step.tone} />
                <p className="mt-3 text-[24px] font-extrabold leading-none text-black">{formatCreatorInteger(step.value)}</p>
                <p className="mt-2 w-full max-w-[96px] whitespace-normal break-words text-[11px] font-bold leading-tight text-[#111827]">
                  {step.label}
                </p>
              </button>
              {index < steps.length - 1 ? (
                <ArrowRight
                  size={19}
                  strokeWidth={2.2}
                  className="pointer-events-none absolute right-[-15px] top-1/2 hidden -translate-y-1/2 text-black xl:block"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function getOpportunitySourceLabel(badge: string) {
  if (/partnership/i.test(badge)) {
    return "Partnerships";
  }

  if (/community/i.test(badge)) {
    return "Community";
  }

  if (/high intent|buy/i.test(badge)) {
    return "Buying Intent";
  }

  return "Other Signals";
}





function RealDataNote({ summary }: { summary: CreatorLiveSummary }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
      <span className="inline-flex items-center gap-2 rounded-full bg-[#eafaf0] px-3 py-1.5 text-[#12a150]">
        <span className="h-2 w-2 rounded-full bg-[#12a150]" />
        Live Instagram data
      </span>
      <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/70">
        {formatCreatorInteger(summary.totalConversationCount)} conversations
      </span>
      <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/70">
        {formatCreatorInteger(summary.totalMessageCount)} messages
      </span>
      {summary.orderCount > 0 ? (
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/70">
          {formatCreatorInteger(summary.orderCount)} orders
        </span>
      ) : null}
    </div>
  );
}

function HeroMetricCard({
  icon: Icon,
  item,
  isLoading,
  onClick,
}: {
  icon: LucideIcon;
  item: {
    label: string;
    detail: string;
    value: number;
    tone: ToneName;
  };
  isLoading: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 text-left overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/15 transition focus:outline-none w-full"
    >
      <Icon size={24} strokeWidth={2.35} className={toneClasses[item.tone].text} />
      <p className="mt-5 text-[28px] font-extrabold leading-none text-white">{isLoading ? "..." : formatCreatorInteger(item.value)}</p>
      <p className="mt-4 max-w-full break-words text-[11px] font-extrabold leading-snug text-white/80 [overflow-wrap:anywhere]">
        {item.label}
      </p>
      <p className={`mt-3 max-w-full break-words text-[11px] font-extrabold leading-snug [overflow-wrap:anywhere] ${toneClasses[item.tone].text}`}>
        {item.detail}
      </p>
    </button>
  );
}

function RevenueHero({
  isLoading,
  revenueTotal,
  summary,
  heroStats,
  onNavigate,
}: {
  isLoading: boolean;
  revenueTotal: number;
  summary: CreatorLiveSummary;
  heroStats: {
    label: string;
    detail: string;
    value: number;
    icon: LucideIcon;
    tone: ToneName;
  }[];
  onNavigate?: (tab: DashboardTab) => void;
}) {
  const revenueTitle = "Revenue Collected";
  const revenueDetail = `${formatCreatorInteger(summary.paidOrderCount)} paid order${summary.paidOrderCount === 1 ? "" : "s"} from Instagram checkout.`;

  const getTabForMetric = (label: string): DashboardTab => {
    const lowercase = label.toLowerCase();
    if (lowercase.includes("buy")) return "opportunities";
    if (lowercase.includes("offer")) return "opportunities";
    if (lowercase.includes("follow")) return "inbox" as DashboardTab;
    if (lowercase.includes("payment")) return "ros";
    if (isOpportunityLabel(label)) return "opportunities";
    return "dashboard";
  };

  return (
    <article className="relative overflow-hidden rounded-[8px] bg-black p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.16)] sm:p-7">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[#ff6b00] via-[#e81f72] to-[#7548ff]" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(240px,0.58fr)_minmax(0,1.42fr)] lg:items-center">
        <button
          type="button"
          onClick={() => openDashboardTab("ros", onNavigate)}
          className="text-left w-full hover:opacity-90 transition focus:outline-none"
        >
          <h2 className="text-[15px] font-extrabold text-white">{revenueTitle}</h2>
          <p className="mt-6 max-w-full break-words bg-gradient-to-r from-[#ff6b00] via-[#e81f72] to-[#8b35ff] bg-clip-text text-[44px] font-extrabold leading-none text-transparent sm:text-[56px]">
            {isLoading ? "..." : formatCreatorMoney(revenueTotal)}
          </p>
          <p className="mt-5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-white/80">
            {revenueDetail}
          </p>
          <RealDataNote summary={summary} />
        </button>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {heroStats.map((item) => (
            <HeroMetricCard
              key={item.label}
              icon={item.icon}
              item={item}
              isLoading={isLoading}
              onClick={() => openDashboardTab(getTabForMetric(item.label), onNavigate)}
            />
          ))}
        </div>
      </div>
    </article>
  );
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
  onNavigate,
}: {
  profile: AccountProfile;
  summary: CreatorLiveSummary;
  isLoading: boolean;
  error: string;
  dateRangePreset: AdminDateRangePreset;
  isAutoRefreshOn: boolean;
  onDateRangeChange: (preset: AdminDateRangePreset) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onNavigate?: (tab: DashboardTab) => void;
}) {
  const [revenueTrendRange, setRevenueTrendRange] = useState<DashboardChartRange>("30d");
  const intent = buildIntentSnapshot(summary);
  const revenueTotal = summary.estimatedRevenue;
  const revenueLabel = "Collected Revenue";
  const revenueTrendLabel = revenueTotal > 0 ? "from paid orders" : "waiting for paid Stripe orders";
  const revenueSeries = isLoading
    ? Array.from({ length: getDashboardChartPointCount(revenueTrendRange) }, () => 0)
    : buildRevenueTrendSeries(summary, getDashboardChartPointCount(revenueTrendRange));
  const totalForTrends = Math.max(1, summary.totalConversationCount);
  const heroStats = [
    {
      label: "Ready to buy",
      detail: "High intent",
      value: intent.readyToBuyCount,
      icon: Flame,
      tone: "orange" as ToneName,
    },
    {
      label: "Need follow up",
      detail: "Reply pending",
      value: intent.needFollowUpCount,
      icon: MessageSquare,
      tone: "pink" as ToneName,
    },
    {
      label: "Waiting payment",
      detail: "Payment pending",
      value: intent.waitingPaymentCount,
      icon: Clock,
      tone: "orange" as ToneName,
    },
    {
      label: "Offers Sent",
      detail: "Outbound offers",
      value: intent.offersSentCount,
      icon: Send,
      tone: "pink" as ToneName,
    },
    {
      label: "New opportunities",
      detail: "Recently detected",
      value: Math.max(summary.opportunityCount, intent.readyToBuyCount, intent.waitingPaymentCount, intent.offersSentCount),
      icon: Eye,
      tone: "orange" as ToneName,
    },
    {
      label: "Buying Signals",
      detail: "Signals detected",
      value: intent.buyingSignalCount,
      icon: Sparkles,
      tone: "orange" as ToneName,
    },
  ];

  return (
    <main
      data-creator-dashboard-export-root="true"
      className="h-dvh flex-1 overflow-y-auto bg-white px-4 pb-24 pt-4 text-black sm:px-6 lg:px-7 lg:py-6 xl:px-8"
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-[0] text-black sm:text-[34px]">
              {getGreeting()}, {getFirstName(profile)}
            </h1>
            <p className="mt-2 text-[13px] font-semibold text-[#596175]">Here&apos;s what&apos;s happening with your pipeline today.</p>
          </div>

          <div
            data-export-exclude="true"
            className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_160px_118px_48px] xl:w-auto xl:grid-cols-[250px_160px_118px_48px]"
          >
            <CreatorDateRangeSelect
              dateRangePreset={dateRangePreset}
              onDateRangeChange={onDateRangeChange}
              className="h-12 px-4"
            />
            <label className="relative flex h-12 cursor-pointer items-center justify-between rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)]">
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isAutoRefreshOn ? "bg-[#18ad54]" : "bg-[#98a2b3]"}`} />
                Auto refresh
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
              className="flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)] transition hover:bg-[#4a2fe0]"
            >
              <Download size={15} strokeWidth={2.4} />
              Export
            </button>
            <NotificationBell
              ariaLabel="Open notifications"
              buttonClassName="relative flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#e0e4ef] bg-white text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] transition hover:bg-[#fbfbff]"
              iconSize={19}
            />
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
            {error}
          </div>
        ) : null}

        <section className="mt-7">
          <RevenueHero
            heroStats={heroStats}
            isLoading={isLoading}
            onNavigate={onNavigate}
            revenueTotal={revenueTotal}
            summary={summary}
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.78fr_1.12fr_0.95fr]">
          <OpportunityList summary={summary} onNavigate={onNavigate} />

          <div className="grid content-start gap-5">
            <PipelineOverview intent={intent} summary={summary} onNavigate={onNavigate} />
          </div>

          <div className="grid content-start gap-5">
            <article className={`${panelClass} p-5`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-extrabold text-black">Revenue Trend</h2>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-[25px] font-extrabold leading-none text-black">{isLoading ? "..." : formatCreatorMoney(revenueTotal)}</p>
                    <TrendText>{revenueTrendLabel}</TrendText>
                  </div>
                </div>
                <DashboardCardRangeSelect value={revenueTrendRange} onChange={setRevenueTrendRange} ariaLabel="Revenue trend range" />
              </div>
              <RevenueTrendChart values={revenueSeries} />
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
