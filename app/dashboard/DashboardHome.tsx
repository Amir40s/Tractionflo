"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Heart,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import Inbox from "../components/Inbox";
import InstagramContentPage from "../components/InstagramContentPage";
import { signout } from "../login/actions";
import {
  allPagePermissionIds,
  type PagePermissionId,
} from "@/lib/agent-permissions";
import {
  escalationRulesChangedEvent,
  normalizeEscalationRuleSettings,
  type EscalationRuleSetting,
} from "@/lib/conversation-escalation";
import type { AdminDateRangePreset } from "./admin/shared";
import AnalyticsPage from "./AnalyticsPage";
import EscalationsPage from "./EscalationsPage";
import SettingsPage from "./SettingsPage";
import { readStoredSettingsState } from "./settings-state";
import SuperAdminDashboard from "./super-admin/SuperAdminDashboard";
import { AudiencePage } from "./creator/AudiencePage";
import { DashboardOverview } from "./creator/DashboardOverview";
import { KnowledgeBasePage } from "./creator/KnowledgeBasePage";
import { BrandMark } from "./creator/BrandMark";
import { OpportunitiesPage } from "./creator/LeadsPage";
import { RosPage } from "./creator/RosPage";
import {
  escalationWorkflowStateChangedEvent,
  loadEscalationWorkflowStateFromDatabase,
  readStoredEscalationWorkflowState,
  saveEscalationWorkflowStateToDatabase,
} from "./escalation-resolution";
import {
  loadOpportunityWorkflowStateFromDatabase,
  opportunityWorkflowStateChangedEvent,
  readStoredOpportunityWorkflowState,
  saveOpportunityWorkflowStateToDatabase,
} from "./opportunity-resolution";
import type {
  AccountProfile,
  AccountProfileResponse,
  CommerceOrdersResponse,
  DashboardTab,
  InstagramConversationsResponse,
  NavigationCounts,
  NavItem,
  OpportunityPageCard,
} from "./creator/types";
import { buildCreatorLiveSummary } from "./creator-insights";
import { emptyEscalationWorkflowState } from "@/lib/escalation-workflow-state";
import { emptyOpportunityWorkflowState } from "@/lib/opportunity-workflow-state";

const accountProfileStorageKey = "tractionflo_account_profile";

const defaultAccountProfile: AccountProfile = {
  name: "TractionFlo user",
  email: "",
  role: "Creator",
  avatarUrl: "",
  timeZone: "(GMT-5) Eastern Time",
  language: "English",
  currency: "USD ($)",
  accountId: "acct_pending",
  isSuperAdmin: false,
  isAgent: false,
  allowedPages: allPagePermissionIds,
  assignedConversationIds: [],
  humanEscalation: true,
};

function readStoredAccountProfile() {
  if (typeof window === "undefined") {
    return defaultAccountProfile;
  }

  try {
    const storedValue = window.localStorage.getItem(accountProfileStorageKey);

    if (!storedValue) {
      return defaultAccountProfile;
    }

    return {
      ...defaultAccountProfile,
      ...(JSON.parse(storedValue) as Partial<AccountProfile>),
    };
  } catch {
    return defaultAccountProfile;
  }
}

function mergeAccountProfile(authProfile: AccountProfile | null, storedProfile: AccountProfile) {
  if (!authProfile) {
    return storedProfile;
  }

  return {
    ...storedProfile,
    ...authProfile,
    name: authProfile.name || storedProfile.name,
    email: authProfile.email || storedProfile.email,
    accountId: authProfile.accountId || storedProfile.accountId,
    isAgent: authProfile.isAgent,
    allowedPages: authProfile.allowedPages.length > 0 ? authProfile.allowedPages : storedProfile.allowedPages,
    assignedConversationIds: authProfile.assignedConversationIds,
    humanEscalation: authProfile.humanEscalation,
  };
}

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

function getDashboardTabFromUrl(): DashboardTab {
  if (typeof window === "undefined") {
    return "dashboard";
  }

  const pathname = window.location.pathname;

  if (pathname === "/conversations" || pathname === "/conversation") {
    return "inbox";
  }

  if (
    pathname === "/instagram-content" ||
    pathname.startsWith("/instagram-content/") ||
    pathname === "/instagram" ||
    pathname === "/instagram-posts" ||
    pathname === "/instagram-stories"
  ) {
    return "instagram-content";
  }

  if (pathname === "/opportunities" || pathname === "/opporunies") {
    return "opportunities";
  }

  if (pathname === "/ros" || pathname === "/revenue-operating-system") {
    return "ros";
  }

  if (pathname === "/audience") {
    return "audience";
  }

  if (pathname === "/knowledge-base" || pathname === "/knowledge") {
    return "knowledge";
  }

  if (pathname === "/escalations" || pathname === "/esclations") {
    return "escalations";
  }

  if (pathname === "/analytics" || pathname === "/analysis") {
    return "analytics";
  }

  if (pathname === "/settings" || pathname === "/setting") {
    return "settings";
  }

  const view = new URLSearchParams(window.location.search).get("view");

  if (view === "conversations" || view === "conversation" || view === "inbox") {
    return "inbox";
  }

  if (view === "instagram-content" || view === "instagram" || view === "instagram-posts" || view === "instagram-stories") {
    return "instagram-content";
  }

  if (view === "opportunities" || view === "opporunies") {
    return "opportunities";
  }

  if (view === "ros" || view === "revenue-operating-system") {
    return "ros";
  }

  if (view === "audience") {
    return "audience";
  }

  if (view === "knowledge" || view === "knowledge-base") {
    return "knowledge";
  }

  if (view === "escalations" || view === "esclations") {
    return "escalations";
  }

  if (view === "analytics" || view === "analysis") {
    return "analytics";
  }

  if (view === "settings" || view === "setting") {
    return "settings";
  }

  return "dashboard";
}

function getDashboardUrl(tab: DashboardTab) {
  return dashboardTabUrlValues[tab];
}

function isSuperAdminProfile(profile: AccountProfile) {
  const normalizedRole = profile.role.toLowerCase();

  return (
    profile.isSuperAdmin ||
    normalizedRole === "super admin" ||
    normalizedRole === "superadmin" ||
    profile.email.toLowerCase() === "tractionflo@gmail.com"
  );
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, tab: "dashboard" },
  { label: "Conversations", icon: MessageSquare, tab: "inbox" },
  { label: "Posts & Stories", icon: Heart, tab: "instagram-content" },
  { label: "Leads", icon: Target, tab: "opportunities" },
  { label: "ROS", icon: BrainCircuit, tab: "ros" },
  { label: "Audience", icon: Users, tab: "audience" },
  { label: "Knowledge Base", icon: BookOpen, tab: "knowledge" },
  { label: "Escalations", icon: TriangleAlert, tab: "escalations" },
  { label: "Analytics", icon: BarChart3, tab: "analytics" },
  { label: "Settings", icon: Settings, tab: "settings" },
];

function canOpenDashboardTab(profile: AccountProfile, tab: DashboardTab) {
  return !profile.isAgent || profile.allowedPages.includes(tab as PagePermissionId);
}

function getFirstAllowedTab(profile: AccountProfile): DashboardTab {
  const firstAllowed = allPagePermissionIds.find((pageId) => profile.allowedPages.includes(pageId)) || "dashboard";
  return firstAllowed as DashboardTab;
}

function getVisibleNavItems(profile: AccountProfile) {
  if (!profile.isAgent) {
    return navItems;
  }

  return navItems.filter((item) => item.tab && profile.allowedPages.includes(item.tab as PagePermissionId));
}

function isOpportunityCardInTab(card: OpportunityPageCard, label: string) {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("hot")) return card.classification === "Hot";
  if (normalizedLabel.includes("warm")) return card.classification === "Warm";
  if (normalizedLabel.includes("cold")) return card.classification === "Cold";
  if (normalizedLabel.includes("partner")) return card.badge === "PARTNERSHIP";
  if (normalizedLabel.includes("community")) return card.badge === "COMMUNITY";
  return true;
}

function formatDashboardMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDashboardPercent(value: number, total: number) {
  return `${Math.round((value / Math.max(1, total)) * 100)}%`;
}

function buildDisplayOpportunityTabs(
  tabs: ReturnType<typeof buildCreatorLiveSummary>["opportunityTabs"],
  cards: OpportunityPageCard[],
) {
  return tabs.map((tab) => ({
    ...tab,
    count: cards.filter((card) => isOpportunityCardInTab(card, tab.label)).length.toLocaleString("en-US"),
  }));
}

function buildDisplayOpportunityMetrics(
  metrics: ReturnType<typeof buildCreatorLiveSummary>["opportunityMetrics"],
  cards: OpportunityPageCard[],
  totalConversationCount: number,
  revenueTotal: number,
) {
  const hotLeadCount = cards.filter((card) => card.classification === "Hot").length;

  return metrics.map((metric) => {
    const normalizedLabel = metric.label.toLowerCase();

    if (normalizedLabel.includes("leads generated")) {
      return { ...metric, value: cards.length.toLocaleString("en-US") };
    }

    if (normalizedLabel.includes("hot")) {
      return { ...metric, value: hotLeadCount.toLocaleString("en-US") };
    }

    if (normalizedLabel.includes("revenue")) {
      return { ...metric, value: formatDashboardMoney(revenueTotal) };
    }

    if (normalizedLabel.includes("rate")) {
      return { ...metric, value: formatDashboardPercent(cards.length, totalConversationCount) };
    }

    return metric;
  });
}

function LogoutButton() {
  return (
    <form action={signout}>
      <button
        type="submit"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#ffd5dd] bg-[#fff7f9] px-3 text-[12px] font-extrabold text-[#df405b] shadow-[0_14px_28px_rgba(223,64,91,0.06)] transition hover:bg-[#fff0f3]"
      >
        <LogOut size={15} strokeWidth={2.35} />
        Logout
      </button>
    </form>
  );
}

function Sidebar({
  activeTab,
  onChangeTab,
  profile,
  navigationCounts,
}: {
  activeTab: string;
  onChangeTab: (tab: DashboardTab) => void;
  profile: AccountProfile;
  navigationCounts: NavigationCounts;
}) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const visibleItems = getVisibleNavItems(profile);

  return (
    <aside className="sticky top-0 hidden h-screen min-h-screen w-[228px] shrink-0 flex-col overflow-hidden border-r border-[#e7eaf2] bg-white px-[18px] py-6 lg:flex">
      <div className="shrink-0">
        <BrandMark />
      </div>

      <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.tab === activeTab;
          const isAfterDivider = item.label === "Analytics" || item.label === "Settings";
          const count = item.tab ? navigationCounts[item.tab] : null;

          return (
            <div key={item.label} className={isAfterDivider ? "border-t border-[#d7dbe6] pt-4" : ""}>
              <button
                type="button"
                onClick={() => item.tab && onChangeTab(item.tab)}
                className={`flex h-[46px] w-full items-center gap-3.5 rounded-[9px] px-3.5 text-left text-[13px] font-semibold transition ${
                  isActive
                    ? "bg-[#f0edff] text-black shadow-[0_22px_45px_rgba(85,70,190,0.08)]"
                    : "text-black hover:bg-[#f8f9fc]"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.8 : 2}
                  className={isActive ? "text-[#4b3cff]" : "text-black"}
                />
                <span className="flex-1">{item.label}</span>
                {typeof count === "number" ? (
                  <span className={`min-w-7 rounded-full bg-[#f0f1f5] px-2 py-0.5 text-center text-[12px] font-extrabold ${isActive ? "text-[#4b3cff]" : "text-black"}`}>
                    {count}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 pb-1 pt-4">
        <button
          type="button"
          onClick={() => onChangeTab("settings")}
          className="flex min-h-[68px] w-full items-center gap-3 rounded-[10px] border border-[#e6e9f1] bg-white px-3 shadow-[0_18px_38px_rgba(20,28,53,0.04)] transition hover:border-[#d9def0] hover:bg-[#fbfbff]"
        >
          {profile.avatarUrl ? (
            <span
              aria-label={profile.name}
              role="img"
              className="h-12 w-12 shrink-0 rounded-full border border-[#e3e7f0] bg-cover bg-center shadow-[0_10px_22px_rgba(20,28,53,0.08)]"
              style={{ backgroundImage: `url(${profile.avatarUrl})` }}
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[12px] font-extrabold text-white shadow-[0_10px_22px_rgba(124,58,237,0.16)]">
              {initials || "TF"}
            </span>
          )}
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[12px] font-extrabold text-black">{profile.name}</span>
            <span className="block truncate text-[11px] font-semibold text-[#697083]">{profile.role}</span>
          </span>
          <ChevronDown size={16} className="shrink-0" strokeWidth={2.4} />
        </button>

        <LogoutButton />
      </div>
    </aside>
  );
}

function MobileNavigation({
  activeTab,
  onChangeTab,
  profile,
}: {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  profile: AccountProfile;
}) {
  const mobileItems = getVisibleNavItems(profile).filter((item): item is NavItem & { tab: DashboardTab } =>
    Boolean(item.tab)
  );

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[14px] border border-[#e0e4ef] bg-white/95 p-1.5 shadow-[0_18px_60px_rgba(20,28,53,0.18)] backdrop-blur sm:grid-cols-10 lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.tab === activeTab;
        const label =
          item.label === "Dashboard"
            ? "Home"
            : item.label === "Conversations"
            ? "Chats"
            : item.label === "Posts & Stories"
            ? "Posts"
            : item.label === "Leads"
              ? "Leads"
              : item.label === "ROS"
                ? "ROS"
              : item.label === "Knowledge Base"
                ? "KB"
                : item.label === "Escalations"
                  ? "Alerts"
                  : item.label === "Analytics"
                    ? "Stats"
                  : item.label === "Settings"
                    ? "Set"
                : item.label;

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onChangeTab(item.tab)}
            className={`flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] text-[9px] font-extrabold transition sm:text-[10px] ${
              isActive ? "bg-[#f0edff] text-[#4b3cff]" : "text-[#596175]"
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.7 : 2.2} />
            <span className="max-w-full truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function RestrictedPage() {
  return (
    <main className="flex h-dvh flex-1 items-center justify-center bg-[#fdfdff] p-6">
      <section className="max-w-md rounded-[12px] border border-[#e5e8f0] bg-white p-6 text-center shadow-[0_22px_60px_rgba(20,28,53,0.04)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#f0edff] text-[#3044ff]">
          <Shield size={22} strokeWidth={2.35} />
        </span>
        <h1 className="mt-4 text-[18px] font-extrabold text-black">Access not enabled</h1>
        <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#46506a]">
          Ask an admin to add this page to your permissions.
        </p>
      </section>
    </main>
  );
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(defaultAccountProfile);
  const [creatorConversationResponse, setCreatorConversationResponse] = useState<InstagramConversationsResponse>({
    conversations: [],
    conversation_count: 0,
  });
  const [creatorOrderResponse, setCreatorOrderResponse] = useState<CommerceOrdersResponse>({
    orders: [],
    tableReady: true,
  });
  const [isLoadingCreatorData, setIsLoadingCreatorData] = useState(true);
  const [creatorDataError, setCreatorDataError] = useState("");
  const [creatorDateRangePreset, setCreatorDateRangePreset] = useState<AdminDateRangePreset>("7d");
  const [creatorAutoRefreshOn, setCreatorAutoRefreshOn] = useState(true);
  const [creatorEscalationRules, setCreatorEscalationRules] = useState<EscalationRuleSetting[]>(() => readStoredSettingsState().rules);
  const [escalationWorkflowState, setEscalationWorkflowState] = useState(emptyEscalationWorkflowState);
  const [opportunityWorkflowState, setOpportunityWorkflowState] = useState(emptyOpportunityWorkflowState);
  const hasLoadedAccountProfileRef = useRef(false);
  const creatorSummary = buildCreatorLiveSummary(
    creatorConversationResponse.conversations || [],
    creatorConversationResponse.conversation_count,
    creatorConversationResponse.account,
    creatorDateRangePreset,
    creatorEscalationRules,
    creatorOrderResponse.orders || [],
    creatorOrderResponse.tableReady !== false,
  );
  const resolvedEscalationIdSet = new Set(escalationWorkflowState.resolvedIds);
  const readEscalationIdSet = new Set(escalationWorkflowState.readIds);
  const resolvedOpportunityIdSet = new Set(opportunityWorkflowState.resolvedIds);
  const readOpportunityIdSet = new Set(opportunityWorkflowState.readIds);
  const unresolvedEscalations = creatorSummary.escalations.filter((escalation) => !resolvedEscalationIdSet.has(escalation.id));
  const unresolvedOpportunityCards = creatorSummary.opportunityCards.filter((opportunity) => !resolvedOpportunityIdSet.has(opportunity.id));
  const unreadEscalationCount = unresolvedEscalations.filter((escalation) => !readEscalationIdSet.has(escalation.id)).length;
  const unreadOpportunityCount = unresolvedOpportunityCards.filter((opportunity) => !readOpportunityIdSet.has(opportunity.id)).length;
  const unresolvedEscalationIdsKey = unresolvedEscalations.map((escalation) => escalation.id).join("|");
  const unresolvedOpportunityIdsKey = unresolvedOpportunityCards.map((opportunity) => opportunity.id).join("|");
  const readEscalationIdsKey = escalationWorkflowState.readIds.join("|");
  const readOpportunityIdsKey = opportunityWorkflowState.readIds.join("|");
  const creatorSummaryForDisplay = {
    ...creatorSummary,
    dashboardOpportunities: creatorSummary.dashboardOpportunities.filter((opportunity) => !opportunity.id || !resolvedOpportunityIdSet.has(opportunity.id)),
    estimatedRevenue: creatorSummary.estimatedRevenue,
    estimatedPipelineRevenue: creatorSummary.estimatedPipelineRevenue,
    opportunityCount: unresolvedOpportunityCards.length,
    opportunityTabs: buildDisplayOpportunityTabs(creatorSummary.opportunityTabs, unresolvedOpportunityCards),
    opportunityMetrics: buildDisplayOpportunityMetrics(
      creatorSummary.opportunityMetrics,
      unresolvedOpportunityCards,
      creatorSummary.totalConversationCount,
      creatorSummary.estimatedRevenue,
    ),
    opportunityCards: unresolvedOpportunityCards,
    escalations: unresolvedEscalations,
    escalationCount: unresolvedEscalations.length,
  };

  useEffect(() => {
    const syncFromUrl = () => {
      setActiveTab(getDashboardTabFromUrl());
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);

    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      async function loadAccountProfile() {
        const storedProfile = readStoredAccountProfile();

        try {
          const response = await fetch("/api/auth/profile", {
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          const data: AccountProfileResponse = await response.json();

          if (!response.ok || data.error) {
            throw new Error(data.error || "Could not load profile");
          }

          setAccountProfile(mergeAccountProfile(data.profile ?? null, storedProfile));
        } catch {
          setAccountProfile(storedProfile);
        } finally {
          hasLoadedAccountProfileRef.current = true;
        }
      }

      void loadAccountProfile();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const syncStoredRules = () => {
      setCreatorEscalationRules(readStoredSettingsState().rules);
    };
    const handleRulesChanged = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      setCreatorEscalationRules(normalizeEscalationRuleSettings(detail));
    };
    const timeout = window.setTimeout(syncStoredRules, 0);

    window.addEventListener(escalationRulesChangedEvent, handleRulesChanged);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener(escalationRulesChangedEvent, handleRulesChanged);
    };
  }, []);

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

  useEffect(() => {
    const syncOpportunityWorkflowState = () => {
      setOpportunityWorkflowState(readStoredOpportunityWorkflowState());
    };

    syncOpportunityWorkflowState();
    void loadOpportunityWorkflowStateFromDatabase().catch((error) => {
      console.error("Lead workflow state load error:", error);
    });
    window.addEventListener("storage", syncOpportunityWorkflowState);
    window.addEventListener(opportunityWorkflowStateChangedEvent, syncOpportunityWorkflowState);

    return () => {
      window.removeEventListener("storage", syncOpportunityWorkflowState);
      window.removeEventListener(opportunityWorkflowStateChangedEvent, syncOpportunityWorkflowState);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "escalations" || !unresolvedEscalationIdsKey) {
      return;
    }

    const unresolvedEscalationIds = unresolvedEscalationIdsKey.split("|").filter(Boolean);
    const readIds = new Set(readEscalationIdsKey.split("|").filter(Boolean));
    const unreadEscalationIds = unresolvedEscalationIds.filter((escalationId) => !readIds.has(escalationId));

    if (unreadEscalationIds.length === 0) {
      return;
    }

    void saveEscalationWorkflowStateToDatabase({ readIds: unreadEscalationIds }).catch((error) => {
      console.error("Escalation read state save error:", error);
    });
  }, [activeTab, unresolvedEscalationIdsKey, readEscalationIdsKey]);

  useEffect(() => {
    if (activeTab !== "opportunities" || !unresolvedOpportunityIdsKey) {
      return;
    }

    const unresolvedOpportunityIds = unresolvedOpportunityIdsKey.split("|").filter(Boolean);
    const readIds = new Set(readOpportunityIdsKey.split("|").filter(Boolean));
    const unreadOpportunityIds = unresolvedOpportunityIds.filter((opportunityId) => !readIds.has(opportunityId));

    if (unreadOpportunityIds.length === 0) {
      return;
    }

    void saveOpportunityWorkflowStateToDatabase({ readIds: unreadOpportunityIds }).catch((error) => {
      console.error("Lead read state save error:", error);
    });
  }, [activeTab, unresolvedOpportunityIdsKey, readOpportunityIdsKey]);

  useEffect(() => {
    if (!hasLoadedAccountProfileRef.current) {
      return;
    }

    window.localStorage.setItem(accountProfileStorageKey, JSON.stringify(accountProfile));
  }, [accountProfile]);

  useEffect(() => {
    if (canOpenDashboardTab(accountProfile, activeTab)) {
      return;
    }

    const nextTab = getFirstAllowedTab(accountProfile);
    const timeout = window.setTimeout(() => {
      setActiveTab(nextTab);
      window.history.replaceState(null, "", getDashboardUrl(nextTab));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [accountProfile, activeTab]);

  useEffect(() => {
    let isMounted = true;

    async function loadCreatorConversations() {
      try {
        const [conversationResponse, orderResponse] = await Promise.all([
          fetch("/api/instagram/conversations", {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
          fetch("/api/commerce/orders", {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
        ]);
        const data: InstagramConversationsResponse = await conversationResponse.json();
        const orderData: CommerceOrdersResponse = await orderResponse.json().catch(() => ({ orders: [], tableReady: false }));

        if (!isMounted) {
          return;
        }

        if (!conversationResponse.ok || (data.error && data.error !== "No Instagram account connected")) {
          throw new Error(data.error || "Could not load Instagram conversations");
        }

        setCreatorConversationResponse(data);
        setCreatorOrderResponse({
          orders: orderResponse.ok && !orderData.error ? orderData.orders || [] : [],
          tableReady: orderData.tableReady !== false,
          error: orderData.error,
        });
        setCreatorDataError(data.error || "");
      } catch (error) {
        if (isMounted) {
          setCreatorConversationResponse({ conversations: [], conversation_count: 0 });
          setCreatorOrderResponse({ orders: [], tableReady: false });
          setCreatorDataError(error instanceof Error ? error.message : "Could not load Instagram conversations");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCreatorData(false);
        }
      }
    }

    const handleWindowFocus = () => {
      if (creatorAutoRefreshOn) {
        void loadCreatorConversations();
      }
    };
    const timeout = window.setTimeout(() => void loadCreatorConversations(), 0);
    const interval = creatorAutoRefreshOn ? window.setInterval(() => void loadCreatorConversations(), 30000) : undefined;

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
      if (interval) {
        window.clearInterval(interval);
      }
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [creatorAutoRefreshOn]);

  function handleTabChange(tab: DashboardTab) {
    if (!canOpenDashboardTab(accountProfile, tab)) {
      return;
    }

    setActiveTab(tab);

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", getDashboardUrl(tab));
    }
  }

  async function updateAccountProfile(profile: AccountProfile) {
    const response = await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });
    const data: AccountProfileResponse = await response.json();

    if (!response.ok || data.error || !data.profile) {
      throw new Error(data.error || "Could not update profile");
    }

    const nextProfile = {
      ...profile,
      ...data.profile,
      email: data.pendingEmail || data.profile.email || profile.email,
    };

    setAccountProfile(nextProfile);
    return nextProfile;
  }

  if (isSuperAdminProfile(accountProfile)) {
    return <SuperAdminDashboard profile={accountProfile} onProfileChange={updateAccountProfile} />;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#fdfdff] font-sans text-black">
      <Sidebar
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        profile={accountProfile}
        navigationCounts={{
          inbox: creatorSummary.totalConversationCount,
          opportunities: unreadOpportunityCount > 0 ? unreadOpportunityCount : null,
          escalations: unreadEscalationCount > 0 ? unreadEscalationCount : null,
        }}
      />

      {!canOpenDashboardTab(accountProfile, activeTab) ? (
        <RestrictedPage />
      ) : activeTab === "dashboard" ? (
        <DashboardOverview
          profile={accountProfile}
          summary={creatorSummaryForDisplay}
          isLoading={isLoadingCreatorData}
          error={creatorDataError}
          dateRangePreset={creatorDateRangePreset}
          isAutoRefreshOn={creatorAutoRefreshOn}
          onDateRangeChange={setCreatorDateRangePreset}
          onAutoRefreshChange={setCreatorAutoRefreshOn}
          onNavigate={handleTabChange}
        />
      ) : activeTab === "opportunities" ? (
        <OpportunitiesPage
          summary={creatorSummaryForDisplay}
          isLoading={isLoadingCreatorData}
          error={creatorDataError}
          dateRangePreset={creatorDateRangePreset}
          onDateRangeChange={setCreatorDateRangePreset}
        />
      ) : activeTab === "ros" ? (
        <RosPage />
      ) : activeTab === "instagram-content" ? (
        <InstagramContentPage />
      ) : activeTab === "audience" ? (
        <AudiencePage
          summary={creatorSummary}
          isLoading={isLoadingCreatorData}
          error={creatorDataError}
          dateRangePreset={creatorDateRangePreset}
          onDateRangeChange={setCreatorDateRangePreset}
        />
      ) : activeTab === "knowledge" ? (
        <KnowledgeBasePage summary={creatorSummary} isLoading={isLoadingCreatorData} error={creatorDataError} />
      ) : activeTab === "escalations" ? (
        <EscalationsPage summary={creatorSummaryForDisplay} isLoading={isLoadingCreatorData} error={creatorDataError} />
      ) : activeTab === "analytics" ? (
        <AnalyticsPage />
      ) : activeTab === "settings" ? (
        <SettingsPage profile={accountProfile} onProfileChange={updateAccountProfile} />
      ) : (
        <main className="flex h-dvh max-h-dvh flex-1 flex-col overflow-hidden bg-white pb-20 lg:pb-0">
          <div className="shrink-0 border-b border-[#e7eaf2] px-4 py-4 lg:hidden">
            <BrandMark />
          </div>
          <div className="min-h-0 flex-1">
            <Inbox />
          </div>
        </main>
      )}
      <MobileNavigation activeTab={activeTab} onChangeTab={handleTabChange} profile={accountProfile} />
    </div>
  );
}

export default function DashboardHome() {
  return <DashboardContent />;
}
