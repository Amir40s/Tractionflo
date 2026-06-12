"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Box,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock,
  ChartPie,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Code2,
  Copy,
  CreditCard,
  Crown,
  Database,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Flame,
  FileText,
  Globe2,
  GraduationCap,
  Handshake,
  Heart,
  Home,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Play,
  Plus,
  PencilLine,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  TriangleAlert,
  TrendingUp,
  UploadCloud,
  User,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Inbox from "../components/Inbox";
import { signout } from "../login/actions";
import {
  defaultAiBehaviorSettings,
  defaultAiIntegrationSettings,
  openAiModelOptions,
  type AiBehaviorSettings,
  type AiIntegrationSettings,
  type AiWorkflowRunResult,
  type AiWorkflowSetting,
} from "@/lib/ai-integration";
import {
  allPagePermissionIds,
  pagePermissionOptions,
  type AgentStatus,
  type PagePermissionId,
} from "@/lib/agent-permissions";

type DashboardTab = "dashboard" | "inbox" | "opportunities" | "audience" | "knowledge" | "escalations" | "analytics" | "settings";

type SuperAdminPage =
  | "overview"
  | "creators-connected"
  | "creators-trials"
  | "creators-churn"
  | "revenue-subscriptions"
  | "revenue-payments"
  | "revenue-refunds"
  | "platform-instagram"
  | "platform-api"
  | "platform-queue"
  | "ai-usage"
  | "ai-costs"
  | "ai-escalations"
  | "support-tickets"
  | "support-issues"
  | "settings";

type ConnectedInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  connectedAt?: string;
};

type AccountProfile = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  timeZone: string;
  language: string;
  currency: string;
  accountId: string;
  isSuperAdmin: boolean;
  isAgent: boolean;
  allowedPages: PagePermissionId[];
  assignedConversationIds: string[];
  humanEscalation: boolean;
};

type AccountProfileResponse = {
  profile?: AccountProfile;
  pendingEmail?: string;
  error?: string;
};

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
  ig_user_id?: string;
  account?: ConnectedInstagramAccount | null;
  error?: string;
};

type NavigationCounts = Partial<Record<DashboardTab, number | null>>;

type SettingsSection =
  | "account"
  | "instagram"
  | "ai-integration"
  | "agents"
  | "permissions"
  | "escalations"
  | "notifications"
  | "team"
  | "billing"
  | "api"
  | "security"
  | "brand";

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
  opportunities: "/opportunities",
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

  if (pathname === "/opportunities" || pathname === "/opporunies") {
    return "opportunities";
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

  if (view === "opportunities" || view === "opporunies") {
    return "opportunities";
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

const superAdminPageIds: SuperAdminPage[] = [
  "overview",
  "creators-connected",
  "creators-trials",
  "creators-churn",
  "revenue-subscriptions",
  "revenue-payments",
  "revenue-refunds",
  "platform-instagram",
  "platform-api",
  "platform-queue",
  "ai-usage",
  "ai-costs",
  "ai-escalations",
  "support-tickets",
  "support-issues",
  "settings",
];

function isSuperAdminPage(value: string | null): value is SuperAdminPage {
  return Boolean(value && superAdminPageIds.includes(value as SuperAdminPage));
}

function getSuperAdminPageFromUrl(): SuperAdminPage {
  if (typeof window === "undefined") {
    return "overview";
  }

  const pathname = window.location.pathname;
  const page = new URLSearchParams(window.location.search).get("admin");

  if (isSuperAdminPage(page)) {
    return page;
  }

  if (pathname === "/settings") {
    return "settings";
  }

  return "overview";
}

function getSuperAdminUrl(page: SuperAdminPage) {
  return page === "overview" ? "/dashboard" : `/dashboard?admin=${page}`;
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

type NavItem = {
  label: string;
  count?: string;
  icon: LucideIcon;
  tab?: DashboardTab;
};

type Opportunity = {
  title: string;
  eyebrow: string;
  body: string[];
  value?: string;
  action: string;
  tone: "purple" | "blue" | "orange" | "red";
  icon: LucideIcon;
};

type PipelineStep = {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
};

type OpportunityPageCard = {
  name: string;
  subtitle: string;
  detail: string;
  badge: string;
  time: string;
  tone: "purple" | "green" | "blue" | "orange" | "red";
  icon: LucideIcon;
  value?: string;
  scoreLabel?: string;
  score?: string;
  progress?: string;
  risk?: string;
  action: string;
  verified?: boolean;
  avatars?: number[];
  extraAvatars?: string;
};

type AudienceMetric = {
  label: string;
  value: string;
  change: string;
  tone: "purple" | "green" | "blue" | "violet" | "orange";
  icon: LucideIcon;
};

type AudienceSource = {
  label: string;
  percent: string;
  count: string;
  color: string;
};

type AudienceProfile = {
  name: string;
  handle: string;
  avatar: number;
  engagement: string;
  active: string;
  tag: string;
  tagTone: string;
};

type AudienceSegment = {
  label: string;
  detail: string;
  count: string;
  change: string;
  tone: string;
  icon: LucideIcon;
  negative?: boolean;
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

type AnalyticsSummary = {
  metrics: AnalyticsMetric[];
  channels: AnalyticsChannel[];
  automationMetrics: AnalyticsAutomationMetric[];
  reportRows: AnalyticsReportRow[];
  performanceBuckets: AnalyticsPerformanceBucket[];
  loadedConversationCount: number;
  totalConversationCount: number;
  totalMessageCount: number;
  latestActivity: string;
};

type KnowledgeTab = {
  label: string;
  count: string;
  icon: LucideIcon;
};

type KnowledgeSource = {
  title: string;
  subtitle: string;
  type: string;
  status: string;
  statusTone: string;
  updated: string;
  tone: string;
  typeTone: string;
  icon: LucideIcon;
};

type KnowledgeInsight = {
  title: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
};

type KnowledgeUpdate = {
  title: string;
  detail: string;
  time: string;
  tone: string;
  icon: LucideIcon;
};

type EscalationTab = {
  label: string;
  count: string;
  tone: string;
  icon: LucideIcon;
};

type EscalationItem = {
  name: string;
  handle: string;
  avatar: string;
  channel: "instagram";
  time: string;
  badge: string;
  badgeTone: string;
  title: string;
  detail: string;
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

type SettingsMenuItem = {
  id: SettingsSection;
  label: string;
  detail: string;
  icon: LucideIcon;
};

type AiSettings = AiBehaviorSettings;

type EscalationRuleSetting = {
  id: string;
  label: string;
  action: string;
  priority: string;
  enabled: boolean;
};

type NotificationSetting = {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
};

type TeamMemberSetting = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Invited";
};

type AgentAccount = {
  id: string;
  name: string;
  email: string;
  status: AgentStatus;
  allowedPages: PagePermissionId[];
  assignedConversationIds: string[];
  humanEscalation: boolean;
  createdAt?: string;
  lastSignInAt?: string;
};

type AgentsResponse = {
  agents?: AgentAccount[];
  agent?: AgentAccount;
  error?: string;
};

type BillingSettings = {
  plan: string;
  status: string;
  price: string;
  nextBillingDate: string;
  seats: number;
  invoiceEmail: string;
};

type ApiEventSetting = {
  id: string;
  label: string;
  enabled: boolean;
};

type ApiSettings = {
  webhookUrl: string;
  signingSecret: string;
  events: ApiEventSetting[];
};

type SecuritySettings = {
  twoFactor: boolean;
  loginAlerts: boolean;
  sessionTimeout: string;
  trustedDevices: boolean;
};

type BrandSettings = {
  brandName: string;
  primaryColor: string;
  voice: string;
  replySignature: string;
  blockedWords: string;
};

type AppSettingsState = {
  ai: AiSettings;
  aiIntegration: AiIntegrationSettings;
  rules: EscalationRuleSetting[];
  notifications: NotificationSetting[];
  team: TeamMemberSetting[];
  billing: BillingSettings;
  api: ApiSettings;
  security: SecuritySettings;
  brand: BrandSettings;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, tab: "dashboard" },
  { label: "Conversations", icon: MessageSquare, tab: "inbox" },
  { label: "Opportunities", icon: Target, tab: "opportunities" },
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

function getVisibleSettingsMenuItems(profile: AccountProfile) {
  if (!profile.isAgent) {
    return settingsMenuItems;
  }

  const agentSections: SettingsSection[] = ["account", "notifications", "security", "brand"];
  return settingsMenuItems.filter((item) => agentSections.includes(item.id));
}

const opportunities: Opportunity[] = [
  {
    title: "Brand Partnership",
    eyebrow: "PARTNERSHIP",
    body: ["Brand: GlowSkin", "Interested in sponsored", "campaign."],
    value: "$5,000+",
    action: "Review",
    tone: "purple",
    icon: Handshake,
  },
  {
    title: "Ready-to-Buy Lead",
    eyebrow: "HIGH INTENT",
    body: ["Interested in Coaching", "Asked about pricing 3 times."],
    value: "$2,800+",
    action: "Review",
    tone: "blue",
    icon: User,
  },
  {
    title: "Community Leader",
    eyebrow: "SUPERFAN",
    body: ["Engages with 100s", "Active in your community."],
    value: "$1,200+",
    action: "Review",
    tone: "orange",
    icon: Star,
  },
  {
    title: "Refund Request",
    eyebrow: "ESCALATION",
    body: ["Order #1024", "Requesting full refund."],
    action: "Take over",
    tone: "red",
    icon: TriangleAlert,
  },
];

const pipeline: PipelineStep[] = [
  {
    label: "Engaged",
    value: "12,480",
    detail: "2.6%\nconversion",
    tone: "text-[#4b3cff] bg-[#f0edff]",
    icon: Users,
  },
  {
    label: "Conversations",
    value: "328",
    detail: "25.6%\nconversion",
    tone: "text-[#4b3cff] bg-[#f0edff]",
    icon: MessageSquare,
  },
  {
    label: "Qualified",
    value: "84",
    detail: "27.4%\nconversion",
    tone: "text-[#13b95f] bg-[#eafaf0]",
    icon: Sparkles,
  },
  {
    label: "Opportunities",
    value: "23",
    detail: "26.1%\nconversion",
    tone: "text-[#ff850d] bg-[#fff3e6]",
    icon: Target,
  },
  {
    label: "Customers",
    value: "6",
    detail: "$4,280\nrevenue influenced",
    tone: "text-[#df405b] bg-[#fff0f3]",
    icon: Crown,
  },
];

const recentActivity = [
  {
    title: "Partnership inquiry received",
    subtitle: "GlowSkin interested in collaboration",
    time: "2m ago",
    icon: Handshake,
    tone: "text-[#4b3cff] bg-[#f0edff]",
  },
  {
    title: "Course sale generated",
    subtitle: "The Creator System",
    time: "1h ago",
    meta: "+$297",
    icon: ShoppingCart,
    tone: "text-[#16b857] bg-[#eafaf0]",
  },
  {
    title: "New community member",
    subtitle: "Joined from AI conversation",
    time: "3h ago",
    icon: Users,
    tone: "text-[#ff850d] bg-[#fff3e6]",
  },
  {
    title: "Lead qualified",
    subtitle: "High intent coaching prospect",
    time: "5h ago",
    icon: User,
    tone: "text-[#246bff] bg-[#eef4ff]",
  },
];

const opportunityTabs = [
  { label: "Buyers", count: "6", icon: Users },
  { label: "Partnerships", count: "3", icon: Handshake },
  { label: "Superfans", count: "2", icon: Crown },
  { label: "Community Leaders", count: "2", icon: User },
  { label: "All Opportunities", count: "12", icon: Users },
] as const;

const opportunityMetrics = [
  {
    label: "Potential Revenue",
    value: "$18,400",
    change: "+23% vs last 7 days",
    icon: CircleDollarSign,
  },
  {
    label: "Opportunities",
    value: "12",
    change: "+3 vs last 7 days",
    icon: BriefcaseBusiness,
  },
  {
    label: "Avg. Deal Value",
    value: "$1,533",
    change: "+18% vs last 7 days",
    icon: TrendingUp,
  },
  {
    label: "Conversion Rate",
    value: "24%",
    change: "+5% vs last 7 days",
    icon: ChartPie,
  },
] as const;

const opportunityPageCards: OpportunityPageCard[] = [
  {
    name: "GlowSkin",
    subtitle: "Brand Partnership",
    detail: "Interested in sponsored content collaboration and long-term partnership.",
    badge: "PARTNERSHIP",
    time: "2m ago",
    tone: "purple",
    icon: Handshake,
    value: "$5,000+",
    action: "Review",
    verified: true,
    avatars: [47, 32, 12],
    extraAvatars: "+3",
  },
  {
    name: "Jessica Parker",
    subtitle: "1:1 Coaching Inquiry",
    detail: "Asked about pricing 3 times and requested more information about the program.",
    badge: "HIGH INTENT",
    time: "15m ago",
    tone: "green",
    icon: User,
    scoreLabel: "Lead Score",
    score: "92/100",
    progress: "92%",
    action: "Review",
  },
  {
    name: "Michael Chen",
    subtitle: "Course Buyer",
    detail: "Viewed pricing page 4 times and asked about payment plan options.",
    badge: "READY TO BUY",
    time: "28m ago",
    tone: "blue",
    icon: ShoppingCart,
    scoreLabel: "Lead Score",
    score: "88/100",
    progress: "88%",
    action: "Review",
  },
  {
    name: "Sofia Martinez",
    subtitle: "Superfan",
    detail: "Highly engaged across content. Advocating for you in the community.",
    badge: "SUPERFAN",
    time: "1h ago",
    tone: "orange",
    icon: Sparkles,
    scoreLabel: "Engagement Score",
    score: "95/100",
    progress: "95%",
    action: "Review",
  },
  {
    name: "FitLife Apparel",
    subtitle: "Brand Partnership",
    detail: "Interested in product placement and affiliate partnership opportunities.",
    badge: "PARTNERSHIP",
    time: "3h ago",
    tone: "purple",
    icon: BriefcaseBusiness,
    value: "$3,500+",
    action: "Review",
  },
  {
    name: "Daniel Lewis",
    subtitle: "Coaching Inquiry",
    detail: "Asked detailed questions about the program and implementation process.",
    badge: "HIGH INTENT",
    time: "5h ago",
    tone: "green",
    icon: User,
    scoreLabel: "Lead Score",
    score: "78/100",
    progress: "78%",
    action: "Review",
  },
  {
    name: "Ava Thompson",
    subtitle: "Course Interest",
    detail: "Downloaded lead magnet and showed interest in starting soon.",
    badge: "WARM LEAD",
    time: "7h ago",
    tone: "blue",
    icon: ShoppingCart,
    scoreLabel: "Lead Score",
    score: "65/100",
    progress: "65%",
    action: "Review",
  },
  {
    name: "Refund Requested",
    subtitle: "Order #1024",
    detail: "Customer requested refund citing content expectations not met.",
    badge: "AT RISK",
    time: "9h ago",
    tone: "red",
    icon: TriangleAlert,
    scoreLabel: "Risk Score",
    risk: "High",
    action: "Take over",
  },
];

const audienceMetrics: AudienceMetric[] = [
  {
    label: "Total Audience",
    value: "124,580",
    change: "12.4%",
    tone: "purple",
    icon: Users,
  },
  {
    label: "Engaged Audience",
    value: "18,247",
    change: "18.7%",
    tone: "green",
    icon: Sparkles,
  },
  {
    label: "Leads",
    value: "2,381",
    change: "15.3%",
    tone: "blue",
    icon: User,
  },
  {
    label: "Customers",
    value: "846",
    change: "8.2%",
    tone: "violet",
    icon: ShoppingCart,
  },
  {
    label: "Partners",
    value: "24",
    change: "20.0%",
    tone: "orange",
    icon: Handshake,
  },
];

const audienceSources: AudienceSource[] = [
  { label: "Instagram", percent: "68.7%", count: "85,600", color: "#3f3cff" },
  { label: "TikTok", percent: "17.3%", count: "21,500", color: "#bd35d2" },
  { label: "YouTube", percent: "8.6%", count: "10,700", color: "#fb3d5d" },
  { label: "Email", percent: "3.2%", count: "4,000", color: "#13a84f" },
  { label: "Other", percent: "2.2%", count: "2,780", color: "#9aa1b5" },
];

const topAudience: AudienceProfile[] = [
  {
    name: "Jessica Parker",
    handle: "@jess.parker",
    avatar: 47,
    engagement: "98",
    active: "2m ago",
    tag: "High intent",
    tagTone: "bg-[#e7f8ed] text-[#0a9b3f]",
  },
  {
    name: "Michael Chen",
    handle: "@michaelchen",
    avatar: 12,
    engagement: "95",
    active: "5m ago",
    tag: "Lead",
    tagTone: "bg-[#e8f0ff] text-[#246bff]",
  },
  {
    name: "Sofia Martinez",
    handle: "@sofia.martinez",
    avatar: 32,
    engagement: "92",
    active: "12m ago",
    tag: "Superfan",
    tagTone: "bg-[#f2e8ff] text-[#8a35ff]",
  },
  {
    name: "Ava Thompson",
    handle: "@ava.thompson",
    avatar: 48,
    engagement: "89",
    active: "18m ago",
    tag: "Lead",
    tagTone: "bg-[#e8f0ff] text-[#246bff]",
  },
  {
    name: "Daniel Lewis",
    handle: "@daniel.lewis",
    avatar: 52,
    engagement: "87",
    active: "27m ago",
    tag: "High intent",
    tagTone: "bg-[#e7f8ed] text-[#0a9b3f]",
  },
];

const audienceSegments: AudienceSegment[] = [
  {
    label: "High Intent Leads",
    detail: "Actively researching or asking about offers",
    count: "1,245",
    change: "16.4%",
    tone: "bg-[#eafaf0] text-[#13a84f]",
    icon: User,
  },
  {
    label: "Warm Leads",
    detail: "Engaged and considering",
    count: "3,782",
    change: "8.7%",
    tone: "bg-[#eef4ff] text-[#246bff]",
    icon: Flame,
  },
  {
    label: "Engaged Followers",
    detail: "Interacts regularly with your content",
    count: "18,247",
    change: "18.7%",
    tone: "bg-[#f0edff] text-[#6d3cff]",
    icon: Heart,
  },
  {
    label: "Superfans",
    detail: "Highly engaged and supportive",
    count: "2,341",
    change: "22.1%",
    tone: "bg-[#fff3e6] text-[#ff850d]",
    icon: Sparkles,
  },
  {
    label: "At Risk",
    detail: "Decreasing engagement",
    count: "1,102",
    change: "-6.3%",
    tone: "bg-[#fff0f3] text-[#df405b]",
    icon: TriangleAlert,
    negative: true,
  },
];

const knowledgeTabs: KnowledgeTab[] = [
  { label: "All Sources", count: "12", icon: Bot },
  { label: "FAQs", count: "3", icon: CircleHelp },
  { label: "Pricing", count: "2", icon: DollarSign },
  { label: "Products", count: "2", icon: Box },
  { label: "Services", count: "2", icon: Sparkles },
  { label: "Courses", count: "1", icon: GraduationCap },
  { label: "Policies", count: "1", icon: Shield },
  { label: "Website", count: "1", icon: Globe2 },
  { label: "PDFs", count: "0", icon: FileText },
];

const knowledgeSources: KnowledgeSource[] = [
  {
    title: "Website",
    subtitle: "tractionflo.com",
    type: "Website",
    status: "Synced",
    statusTone: "bg-[#e7f8ed] text-[#0a8f3b]",
    updated: "May 18, 2025\n10:32 AM",
    tone: "bg-[#eef4ff] text-[#246bff]",
    typeTone: "bg-[#e8f0ff] text-[#246bff]",
    icon: Globe2,
  },
  {
    title: "FAQ",
    subtitle: "Common questions and answers",
    type: "FAQ",
    status: "Up to date",
    statusTone: "bg-[#e7f8ed] text-[#0a8f3b]",
    updated: "May 17, 2025\n4:15 PM",
    tone: "bg-[#f0edff] text-[#6d3cff]",
    typeTone: "bg-[#f2e8ff] text-[#7a35ff]",
    icon: CircleHelp,
  },
  {
    title: "Pricing & Packages",
    subtitle: "Current pricing, plans, and terms",
    type: "Pricing",
    status: "Up to date",
    statusTone: "bg-[#e7f8ed] text-[#0a8f3b]",
    updated: "May 16, 2025\n2:40 PM",
    tone: "bg-[#eafaf0] text-[#0a9b3f]",
    typeTone: "bg-[#e7f8ed] text-[#0a9b3f]",
    icon: DollarSign,
  },
  {
    title: "Coaching Programs",
    subtitle: "1:1 Coaching, Group Coaching, Mentorship",
    type: "Products",
    status: "Up to date",
    statusTone: "bg-[#e7f8ed] text-[#0a8f3b]",
    updated: "May 16, 2025\n11:20 AM",
    tone: "bg-[#eef4ff] text-[#246bff]",
    typeTone: "bg-[#e8f0ff] text-[#246bff]",
    icon: Box,
  },
  {
    title: "Services",
    subtitle: "Done-for-you services and offerings",
    type: "Services",
    status: "Up to date",
    statusTone: "bg-[#e7f8ed] text-[#0a8f3b]",
    updated: "May 15, 2025\n9:08 AM",
    tone: "bg-[#fff3e6] text-[#ff850d]",
    typeTone: "bg-[#fff0df] text-[#ff850d]",
    icon: Sparkles,
  },
  {
    title: "Courses",
    subtitle: "Course outlines, bonuses, curriculum",
    type: "Courses",
    status: "Needs review",
    statusTone: "bg-[#fff0df] text-[#ff7a00]",
    updated: "May 12, 2025\n3:22 PM",
    tone: "bg-[#f0edff] text-[#6d3cff]",
    typeTone: "bg-[#f2e8ff] text-[#7a35ff]",
    icon: GraduationCap,
  },
  {
    title: "Refund Policy",
    subtitle: "Refunds, cancellations, chargebacks",
    type: "Policies",
    status: "Up to date",
    statusTone: "bg-[#e7f8ed] text-[#0a8f3b]",
    updated: "May 10, 2025\n1:05 PM",
    tone: "bg-[#fff0f3] text-[#df405b]",
    typeTone: "bg-[#ffedf1] text-[#df405b]",
    icon: Shield,
  },
  {
    title: "Brand Guidelines",
    subtitle: "Tone of voice, brand rules, examples",
    type: "PDF",
    status: "Up to date",
    statusTone: "bg-[#e7f8ed] text-[#0a8f3b]",
    updated: "May 8, 2025\n6:30 PM",
    tone: "bg-[#f3f4f8] text-[#596175]",
    typeTone: "bg-[#eff1f6] text-[#596175]",
    icon: FileText,
  },
];

const knowledgeInsights: KnowledgeInsight[] = [
  {
    title: "Top question categories",
    detail: "See what your audience asks most",
    tone: "bg-[#f0edff] text-[#4b3cff]",
    icon: BarChart3,
  },
  {
    title: "Gaps in knowledge",
    detail: "Find missing information",
    tone: "bg-[#f3f4f8] text-[#31394f]",
    icon: Box,
  },
  {
    title: "Improve AI responses",
    detail: "Review and refine content",
    tone: "bg-[#fff3e6] text-[#ff850d]",
    icon: Bot,
  },
];

const knowledgeUpdates: KnowledgeUpdate[] = [
  {
    title: "Website synced",
    detail: "tractionflo.com",
    time: "2h ago",
    tone: "bg-[#eef4ff] text-[#246bff]",
    icon: Globe2,
  },
  {
    title: "Pricing updated",
    detail: "2 changes made",
    time: "1d ago",
    tone: "bg-[#eafaf0] text-[#0a9b3f]",
    icon: DollarSign,
  },
  {
    title: "FAQ updated",
    detail: "1 change made",
    time: "2d ago",
    tone: "bg-[#f0edff] text-[#6d3cff]",
    icon: CircleHelp,
  },
];

const escalationTabs: EscalationTab[] = [
  { label: "All", count: "3", tone: "text-[#3044ff] bg-[#eef0ff]", icon: Sparkles },
  { label: "Refunds", count: "1", tone: "text-[#df405b] bg-[#fff0f3]", icon: Shield },
  { label: "Complaints", count: "1", tone: "text-[#ff850d] bg-[#fff3e6]", icon: Sparkles },
  { label: "Partnerships", count: "0", tone: "text-[#7a35ff] bg-[#f0edff]", icon: Handshake },
  { label: "Brand Deals", count: "1", tone: "text-[#0a9b3f] bg-[#eafaf0]", icon: BriefcaseBusiness },
  { label: "VIP Leads", count: "0", tone: "text-[#3044ff] bg-[#eef4ff]", icon: Star },
];

const escalationItems: EscalationItem[] = [
  {
    name: "Ava Thompson",
    handle: "@ava.thompson",
    avatar: "https://i.pravatar.cc/96?img=47",
    channel: "instagram",
    time: "2h ago",
    badge: "Refund Request",
    badgeTone: "bg-[#fff0f3] text-[#df405b]",
    title: "Order #1024 - Refund request",
    detail: "Customer is unhappy with course content and requesting a full refund.",
    meta: ["Risk: High", "Order value: $297"],
    metaTone: "first:bg-[#fff0f3] first:text-[#df405b] bg-[#eff1f6] text-[#31394f]",
    borderTone: "border-[#ffc7d0]",
    glowTone: "bg-[#fffafa]",
    dotTone: "bg-[#df405b]",
    icon: TriangleAlert,
  },
  {
    name: "Michael Chen",
    handle: "@michael.chen",
    avatar: "https://i.pravatar.cc/96?img=12",
    channel: "instagram",
    time: "5h ago",
    badge: "Complaint",
    badgeTone: "bg-[#fff3e6] text-[#ff850d]",
    title: "Course access issue",
    detail: "User reports they can't access the course materials after purchase.",
    meta: ["Risk: Medium", "Order value: $197"],
    metaTone: "first:bg-[#fff3e6] first:text-[#ff850d] bg-[#eff1f6] text-[#31394f]",
    borderTone: "border-[#ffe0ba]",
    glowTone: "bg-[#fffdf9]",
    dotTone: "bg-[#ff850d]",
    icon: CircleHelp,
  },
  {
    name: "GlowSkin",
    handle: "@glowskin.co",
    avatar: "https://i.pravatar.cc/96?img=32",
    channel: "instagram",
    time: "1d ago",
    badge: "Partnership Inquiry",
    badgeTone: "bg-[#e7f8ed] text-[#0a9b3f]",
    title: "Collaboration terms question",
    detail: "Brand asked for product integration details and audience reach.",
    meta: ["Potential value: $5,000+", "Status: Waiting"],
    metaTone: "first:bg-[#e7f8ed] first:text-[#0a9b3f] bg-[#eff1f6] text-[#31394f]",
    borderTone: "border-[#cbeedd]",
    glowTone: "bg-[#fbfffd]",
    dotTone: "bg-[#13a84f]",
    icon: Handshake,
  },
];

const escalationDetailRows: EscalationDetailRow[] = [
  { label: "Escalation type", value: "Refund Request", icon: TriangleAlert, valueTone: "bg-[#fff0f3] text-[#df405b]" },
  { label: "Order", value: "#1024", icon: BriefcaseBusiness },
  { label: "Order value", value: "$297", icon: CircleDollarSign },
  { label: "Escalated", value: "May 18, 2025 at 9:41 AM", icon: Clock },
  { label: "Risk level", value: "High", icon: TriangleAlert, valueTone: "bg-[#fff0f3] text-[#df405b]" },
];

const settingsMenuItems: SettingsMenuItem[] = [
  { id: "account", label: "Account", detail: "Profile, plan and billing", icon: User },
  { id: "instagram", label: "Instagram", detail: "Connect & manage", icon: MessageSquare },
  { id: "ai-integration", label: "AI Integration", detail: "OpenAI key & automations", icon: BrainCircuit },
  { id: "agents", label: "Agents", detail: "Human escalation team", icon: Users },
  { id: "permissions", label: "Permissions", detail: "Pages and assignments", icon: Shield },
  { id: "escalations", label: "Escalation Rules", detail: "When to escalate", icon: TriangleAlert },
  { id: "notifications", label: "Notifications", detail: "Alerts & preferences", icon: Bell },
  { id: "team", label: "Team", detail: "Manage collaborators", icon: Users },
  { id: "billing", label: "Billing", detail: "Subscription & invoices", icon: CreditCard },
  { id: "api", label: "API & Webhooks", detail: "Developers", icon: Code2 },
  { id: "security", label: "Security", detail: "Password & access", icon: Shield },
  { id: "brand", label: "Brand Settings", detail: "Your brand & voice", icon: Palette },
];

const settingsStateStorageKey = "tractionflo_settings_state";

const defaultSettingsState: AppSettingsState = {
  ai: {
    ...defaultAiBehaviorSettings,
  },
  aiIntegration: defaultAiIntegrationSettings,
  rules: [
    { id: "refunds", label: "Refund requests", action: "Always escalate", priority: "High", enabled: true },
    { id: "complaints", label: "Complaints", action: "High priority", priority: "High", enabled: true },
    { id: "partnerships", label: "Partnership deals > $2,500", action: "Escalate for approval", priority: "Medium", enabled: true },
    { id: "vip", label: "VIP leads", action: "Escalate immediately", priority: "High", enabled: true },
  ],
  notifications: [
    { id: "email", label: "Email notifications", value: "All important updates", enabled: true },
    { id: "push", label: "Push notifications", value: "On", enabled: true },
    { id: "digest", label: "Daily digest", value: "Every morning", enabled: true },
    { id: "escalation", label: "Escalation alerts", value: "Instant", enabled: true },
  ],
  team: [
    { id: "owner", name: "Sarah Creates", email: "sarah@creates.com", role: "Owner", status: "Active" },
    { id: "ops", name: "Maya Support", email: "maya@tractionflo.test", role: "Support", status: "Active" },
  ],
  billing: {
    plan: "Pro Plan",
    status: "Active",
    price: "$249 / month",
    nextBillingDate: "June 24, 2025",
    seats: 3,
    invoiceEmail: "billing@creates.com",
  },
  api: {
    webhookUrl: "/api/webhooks/meta",
    signingSecret: "tf_live_8b4f2c9a",
    events: [
      { id: "messages", label: "Instagram messages", enabled: true },
      { id: "comments", label: "Comments and mentions", enabled: true },
      { id: "escalations", label: "Escalation created", enabled: true },
      { id: "billing", label: "Billing events", enabled: false },
    ],
  },
  security: {
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: "30 days",
    trustedDevices: true,
  },
  brand: {
    brandName: "TractionFlo",
    primaryColor: "#3044ff",
    voice: "Confident and helpful",
    replySignature: "Thanks, Sarah",
    blockedWords: "cheap, spam, guaranteed",
  },
};

const ruleVisuals: Record<string, { icon: LucideIcon; tone: string }> = {
  refunds: { icon: TriangleAlert, tone: "bg-[#fff0f3] text-[#df405b]" },
  complaints: { icon: Sparkles, tone: "bg-[#fff3e6] text-[#ff850d]" },
  partnerships: { icon: Handshake, tone: "bg-[#f0edff] text-[#6d3cff]" },
  vip: { icon: Star, tone: "bg-[#eef4ff] text-[#3044ff]" },
};

const notificationVisuals: Record<string, { icon: LucideIcon }> = {
  email: { icon: Mail },
  push: { icon: Bell },
  digest: { icon: CalendarDays },
  escalation: { icon: TriangleAlert },
};

function mergeArrayById<T extends { id: string }>(defaults: T[], stored?: Partial<T>[]) {
  if (!Array.isArray(stored)) {
    return defaults;
  }

  return defaults.map((item) => ({
    ...item,
    ...(stored.find((storedItem) => storedItem?.id === item.id) || {}),
  }));
}

function mergeSettingsState(storedValue: Partial<AppSettingsState> | null): AppSettingsState {
  if (!storedValue) {
    return defaultSettingsState;
  }

  const aiBehavior = {
    ...defaultSettingsState.ai,
    ...storedValue.ai,
    ...storedValue.aiIntegration?.behavior,
  };

  return {
    ai: aiBehavior,
    aiIntegration: {
      ...defaultSettingsState.aiIntegration,
      ...storedValue.aiIntegration,
      behavior: aiBehavior,
      workflows: mergeArrayById(
        defaultSettingsState.aiIntegration.workflows,
        storedValue.aiIntegration?.workflows
      ) as AiWorkflowSetting[],
    },
    rules: mergeArrayById(defaultSettingsState.rules, storedValue.rules),
    notifications: mergeArrayById(defaultSettingsState.notifications, storedValue.notifications),
    team: Array.isArray(storedValue.team) && storedValue.team.length > 0 ? storedValue.team : defaultSettingsState.team,
    billing: {
      ...defaultSettingsState.billing,
      ...storedValue.billing,
    },
    api: {
      ...defaultSettingsState.api,
      ...storedValue.api,
      events: mergeArrayById(defaultSettingsState.api.events, storedValue.api?.events),
    },
    security: {
      ...defaultSettingsState.security,
      ...storedValue.security,
    },
    brand: {
      ...defaultSettingsState.brand,
      ...storedValue.brand,
    },
  };
}

function readStoredSettingsState() {
  if (typeof window === "undefined") {
    return defaultSettingsState;
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);

    if (!storedValue) {
      return defaultSettingsState;
    }

    return mergeSettingsState(JSON.parse(storedValue) as Partial<AppSettingsState>);
  } catch {
    return defaultSettingsState;
  }
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

const audienceMetricToneClasses = {
  purple: "bg-[#f0edff] text-[#4b3cff]",
  green: "bg-[#eafaf0] text-[#13a84f]",
  blue: "bg-[#eef4ff] text-[#246bff]",
  violet: "bg-[#f0edff] text-[#6d3cff]",
  orange: "bg-[#fff3e6] text-[#ff850d]",
};

function BrandMark() {
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
          className="flex h-[58px] w-full items-center gap-3 rounded-[10px] border border-[#e6e9f1] bg-white px-3 shadow-[0_18px_38px_rgba(20,28,53,0.04)]"
        >
          {profile.avatarUrl ? (
            <span
              aria-label={profile.name}
              role="img"
              className="h-10 w-10 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.avatarUrl})` }}
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[11px] font-extrabold text-white">
              {initials || "TF"}
            </span>
          )}
          <span className="flex-1 text-left">
            <span className="block truncate text-[12px] font-extrabold text-black">{profile.name}</span>
            <span className="block truncate text-[11px] font-semibold text-[#697083]">{profile.role}</span>
          </span>
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>

        <button
          type="button"
          className="flex h-[62px] w-full items-center gap-3 rounded-[10px] border border-[#e6e9f1] bg-white px-3.5 shadow-[0_18px_38px_rgba(20,28,53,0.04)]"
        >
          <Sparkles size={20} className="text-[#4b3cff]" strokeWidth={2.3} />
          <span className="flex-1 text-left">
            <span className="block text-[12px] font-extrabold text-black">Pro Plan</span>
            <span className="block text-[11px] font-semibold text-[#697083]">Renews Jun 24, 2025</span>
          </span>
          <ChevronRight size={16} className="text-[#4b3cff]" strokeWidth={2.6} />
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
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-8 rounded-[14px] border border-[#e0e4ef] bg-white/95 p-1.5 shadow-[0_18px_60px_rgba(20,28,53,0.18)] backdrop-blur lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.tab === activeTab;
        const label =
          item.label === "Dashboard"
            ? "Home"
            : item.label === "Conversations"
            ? "Chats"
            : item.label === "Opportunities"
              ? "Opps"
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

type SuperAdminMetric = {
  label: string;
  value: string;
  detail: string;
  change: string;
  tone: string;
  icon: LucideIcon;
};

type SuperAdminTableRow = {
  name: string;
  detail: string;
  values: string[];
  status: string;
  statusTone: "green" | "amber" | "red" | "purple";
};

type SuperAdminDetailConfig = {
  metrics: SuperAdminMetric[];
  columns: string[];
  rows: SuperAdminTableRow[];
  insightTitle: string;
  insightItems: { label: string; value: string; detail: string; tone: string; icon: LucideIcon }[];
};

const superAdminNavGroups: {
  label: string;
  icon: LucideIcon;
  page?: SuperAdminPage;
  children?: { label: string; page: SuperAdminPage }[];
}[] = [
  { label: "Overview", icon: Box, page: "overview" },
  {
    label: "Creators",
    icon: Users,
    children: [
      { label: "Connected Accounts", page: "creators-connected" },
      { label: "Trials", page: "creators-trials" },
      { label: "Churn Risk", page: "creators-churn" },
    ],
  },
  {
    label: "Revenue",
    icon: CreditCard,
    children: [
      { label: "Subscriptions", page: "revenue-subscriptions" },
      { label: "Payments", page: "revenue-payments" },
      { label: "Refunds", page: "revenue-refunds" },
    ],
  },
  {
    label: "Platform",
    icon: Globe2,
    children: [
      { label: "Instagram Accounts", page: "platform-instagram" },
      { label: "API Health", page: "platform-api" },
      { label: "Queue Monitoring", page: "platform-queue" },
    ],
  },
  {
    label: "AI",
    icon: Sparkles,
    children: [
      { label: "Usage", page: "ai-usage" },
      { label: "Costs", page: "ai-costs" },
      { label: "Escalations", page: "ai-escalations" },
    ],
  },
  {
    label: "Support",
    icon: CircleHelp,
    children: [
      { label: "Tickets", page: "support-tickets" },
      { label: "Creator Issues", page: "support-issues" },
    ],
  },
  { label: "Settings", icon: Settings, page: "settings" },
];

const superAdminPageMeta: Record<SuperAdminPage, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Real-time overview of the TractionFlo platform",
  },
  "creators-connected": {
    title: "Connected Accounts",
    subtitle: "Instagram creator accounts, token status, and recent activity.",
  },
  "creators-trials": {
    title: "Trials",
    subtitle: "Trial creators, conversion windows, and upgrade readiness.",
  },
  "creators-churn": {
    title: "Churn Risk",
    subtitle: "Creators with billing, usage, or support signals that need attention.",
  },
  "revenue-subscriptions": {
    title: "Subscriptions",
    subtitle: "Plan mix, recurring revenue, and customer lifecycle metrics.",
  },
  "revenue-payments": {
    title: "Payments",
    subtitle: "Successful charges, failed payments, and settlement monitoring.",
  },
  "revenue-refunds": {
    title: "Refunds",
    subtitle: "Refund volume, reasons, and recovery impact.",
  },
  "platform-instagram": {
    title: "Instagram Accounts",
    subtitle: "Connected Instagram accounts and token health across creators.",
  },
  "platform-api": {
    title: "API Health",
    subtitle: "Core service status, response times, and integration health.",
  },
  "platform-queue": {
    title: "Queue Monitoring",
    subtitle: "Webhook queues, retries, stuck jobs, and processing latency.",
  },
  "ai-usage": {
    title: "AI Usage",
    subtitle: "Message processing, AI conversations, and automation coverage.",
  },
  "ai-costs": {
    title: "AI Costs",
    subtitle: "Model spend, token usage, and margin impact.",
  },
  "ai-escalations": {
    title: "AI Escalations",
    subtitle: "Human handoff triggers, urgent chats, and AI confidence signals.",
  },
  "support-tickets": {
    title: "Tickets",
    subtitle: "Open tickets, response times, and resolution workload.",
  },
  "support-issues": {
    title: "Creator Issues",
    subtitle: "Creator-reported blockers and operational follow-up.",
  },
  settings: {
    title: "Settings",
    subtitle: "Superadmin controls, workspace preferences, and platform defaults.",
  },
};

const superAdminOverviewMetrics: SuperAdminMetric[] = [
  {
    label: "Connected Accounts",
    value: "1,284",
    detail: "Instagram accounts",
    change: "18.6% vs last 30 days",
    tone: "bg-[#f0edff] text-[#4b3cff]",
    icon: Globe2,
  },
  {
    label: "Active Creators",
    value: "892",
    detail: "Active this month",
    change: "14.2% vs last 30 days",
    tone: "bg-[#eaf4ff] text-[#246bff]",
    icon: Users,
  },
  {
    label: "Trial Accounts",
    value: "412",
    detail: "In trial",
    change: "8.7% vs last 30 days",
    tone: "bg-[#fff6e8] text-[#d98613]",
    icon: User,
  },
  {
    label: "Paid Accounts",
    value: "872",
    detail: "Paying customers",
    change: "16.3% vs last 30 days",
    tone: "bg-[#eafaf0] text-[#13a84f]",
    icon: Handshake,
  },
  {
    label: "MRR",
    value: "$216,928",
    detail: "Monthly recurring revenue",
    change: "19.8% vs last 30 days",
    tone: "bg-[#f0edff] text-[#4b3cff]",
    icon: DollarSign,
  },
  {
    label: "ARR",
    value: "$2.6M",
    detail: "Annual recurring revenue",
    change: "19.8% vs last 30 days",
    tone: "bg-[#f0edff] text-[#4b3cff]",
    icon: CircleDollarSign,
  },
];

const superAdminCreatorRows = [
  ["Sarah Creates", "@sarah.creates", "Pro", "Connected", "2 min ago", "328", "12", "$18,400", "Active"],
  ["Mike Coach", "@mike.coach", "Founder", "Connected", "1 hour ago", "243", "6", "$9,800", "Active"],
  ["Emma Fitness", "@emma.fitness", "Pro", "Connected", "3 hours ago", "182", "5", "$7,200", "Active"],
  ["James Wilson", "@james.wilson", "Trial", "Not connected", "1 day ago", "0", "0", "$0", "Trial"],
  ["GlowSkin", "@glowskin.co", "Founder", "Connected", "1 hour ago", "412", "9", "$15,200", "Active"],
];

const statusToneClasses = {
  green: "bg-[#e8f8ed] text-[#0a9b3f]",
  amber: "bg-[#fff4df] text-[#c07800]",
  red: "bg-[#fff0f3] text-[#df405b]",
  purple: "bg-[#f0edff] text-[#4b3cff]",
};

const superAdminDetailConfigs: Record<Exclude<SuperAdminPage, "overview" | "settings">, SuperAdminDetailConfig> = {
  "creators-connected": {
    metrics: [
      { label: "Total connected", value: "1,284", detail: "Instagram accounts", change: "+18.6%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Globe2 },
      { label: "Healthy tokens", value: "1,242", detail: "Ready for automation", change: "96.7%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Expired tokens", value: "28", detail: "Need reconnect", change: "-2.2%", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Disconnected", value: "14", detail: "No active Instagram link", change: "1.1%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Plan", "Instagram", "Last active", "Messages", "Revenue"],
    rows: [
      { name: "Sarah Creates", detail: "@sarah.creates", values: ["Pro", "Connected", "2 min ago", "328", "$18,400"], status: "Active", statusTone: "green" },
      { name: "Mike Coach", detail: "@mike.coach", values: ["Founder", "Connected", "1 hour ago", "243", "$9,800"], status: "Active", statusTone: "green" },
      { name: "James Wilson", detail: "@james.wilson", values: ["Trial", "Not connected", "1 day ago", "0", "$0"], status: "Trial", statusTone: "amber" },
    ],
    insightTitle: "Account health",
    insightItems: [
      { label: "Reconnect required", value: "42", detail: "Expired or disconnected Instagram tokens", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
      { label: "Automation ready", value: "1,242", detail: "Accounts with healthy token state", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
    ],
  },
  "creators-trials": {
    metrics: [
      { label: "Trial accounts", value: "412", detail: "Currently evaluating", change: "+8.7%", tone: "bg-[#fff6e8] text-[#d98613]", icon: User },
      { label: "Conversion ready", value: "86", detail: "High engagement trials", change: "+12.4%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Target },
      { label: "Expiring this week", value: "51", detail: "Need outreach", change: "7 days", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Trial pipeline", value: "$64.2K", detail: "Potential MRR", change: "+10.8%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
    ],
    columns: ["Start", "Plan target", "Messages", "Signals", "Owner"],
    rows: [
      { name: "James Wilson", detail: "@james.wilson", values: ["May 14", "Pro", "0", "Setup pending", "Success"], status: "Trial", statusTone: "amber" },
      { name: "Fit Launch", detail: "@fitlaunch", values: ["May 12", "Founder", "91", "Pricing viewed", "Sales"], status: "Ready", statusTone: "green" },
      { name: "Studio North", detail: "@studionorth", values: ["May 10", "Pro", "43", "High reply rate", "Sales"], status: "Ready", statusTone: "green" },
    ],
    insightTitle: "Trial actions",
    insightItems: [
      { label: "Needs activation", value: "51", detail: "Trials with low first-week usage", tone: "bg-[#fff4df] text-[#c07800]", icon: Play },
      { label: "Upgrade nudges", value: "86", detail: "Trials ready for payment follow-up", tone: "bg-[#eafaf0] text-[#13a84f]", icon: ArrowRight },
    ],
  },
  "creators-churn": {
    metrics: [
      { label: "At-risk creators", value: "37", detail: "Usage or billing risk", change: "-4.6%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
      { label: "Low usage", value: "21", detail: "No activity in 7 days", change: "Needs review", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Failed payment", value: "9", detail: "Card action needed", change: "$2.8K MRR", tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
      { label: "Recovered", value: "14", detail: "Saved this month", change: "+6.1%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
    ],
    columns: ["Risk", "Plan", "MRR", "Last signal", "Owner"],
    rows: [
      { name: "Creator Lab", detail: "@creatorlab", values: ["High", "Founder", "$499", "Failed payment", "Support"], status: "At risk", statusTone: "red" },
      { name: "Wellness Hub", detail: "@wellhub", values: ["Medium", "Pro", "$249", "Low usage", "Success"], status: "Watch", statusTone: "amber" },
      { name: "Nova Coach", detail: "@novacoach", values: ["Low", "Pro", "$249", "Ticket resolved", "Success"], status: "Recovered", statusTone: "green" },
    ],
    insightTitle: "Retention queue",
    insightItems: [
      { label: "Save playbooks", value: "18", detail: "Accounts queued for retention outreach", tone: "bg-[#f0edff] text-[#4b3cff]", icon: BriefcaseBusiness },
      { label: "Revenue at risk", value: "$11.7K", detail: "MRR attached to current risk signals", tone: "bg-[#fff0f3] text-[#df405b]", icon: DollarSign },
    ],
  },
  "revenue-subscriptions": {
    metrics: [
      { label: "MRR", value: "$216,928", detail: "Monthly recurring revenue", change: "+19.8%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
      { label: "ARR", value: "$2.6M", detail: "Annual recurring revenue", change: "+19.8%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: CircleDollarSign },
      { label: "Paid accounts", value: "872", detail: "Active subscriptions", change: "+16.3%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
      { label: "Churn rate", value: "2.4%", detail: "Current month", change: "-0.6%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
    ],
    columns: ["Plan", "MRR", "Accounts", "Growth", "Retention"],
    rows: [
      { name: "Founder Plan", detail: "$499 monthly", values: ["Founder", "$170,159", "341", "+21.1%", "114%"], status: "Strong", statusTone: "green" },
      { name: "Pro Plan", detail: "$249 monthly", values: ["Pro", "$132,219", "531", "+17.4%", "109%"], status: "Strong", statusTone: "green" },
      { name: "Trial pool", detail: "Not billed yet", values: ["Trial", "$64,200", "412", "+8.7%", "Pending"], status: "Pipeline", statusTone: "purple" },
    ],
    insightTitle: "Revenue mix",
    insightItems: [
      { label: "Founder share", value: "39.1%", detail: "Of paid accounts", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Crown },
      { label: "Pro share", value: "60.9%", detail: "Of paid accounts", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Sparkles },
    ],
  },
  "revenue-payments": {
    metrics: [
      { label: "Successful charges", value: "1,039", detail: "This month", change: "+13.8%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Failed payments", value: "9", detail: "Needs retry", change: "$2.8K", tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
      { label: "Processing", value: "$41.6K", detail: "Pending settlement", change: "2 days", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Recovered revenue", value: "$8.9K", detail: "Dunning wins", change: "+6.1%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
    ],
    columns: ["Amount", "Method", "Date", "Retry", "Owner"],
    rows: [
      { name: "Sarah Creates", detail: "Invoice INV-2042", values: ["$499", "Visa", "Today", "None", "Billing"], status: "Paid", statusTone: "green" },
      { name: "Creator Lab", detail: "Invoice INV-2039", values: ["$499", "Mastercard", "Today", "2nd retry", "Billing"], status: "Failed", statusTone: "red" },
      { name: "Studio North", detail: "Invoice INV-2033", values: ["$249", "Visa", "Yesterday", "None", "Billing"], status: "Paid", statusTone: "green" },
    ],
    insightTitle: "Payment ops",
    insightItems: [
      { label: "Retry queue", value: "9", detail: "Failed invoices in retry workflow", tone: "bg-[#fff0f3] text-[#df405b]", icon: RefreshCw },
      { label: "Settlement health", value: "99.1%", detail: "Charges settled successfully", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Shield },
    ],
  },
  "revenue-refunds": {
    metrics: [
      { label: "Refunds", value: "$3,218", detail: "This month", change: "-4.2%", tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
      { label: "Refund rate", value: "1.5%", detail: "Of paid revenue", change: "-0.3%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
      { label: "Open disputes", value: "3", detail: "Needs evidence", change: "24h SLA", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
      { label: "Saved refunds", value: "$1,842", detail: "Resolved by support", change: "+9.2%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
    ],
    columns: ["Amount", "Reason", "Date", "Plan", "Owner"],
    rows: [
      { name: "Build Better", detail: "@buildbetter", values: ["$249", "Duplicate charge", "May 17", "Pro", "Billing"], status: "Resolved", statusTone: "green" },
      { name: "Creator Lab", detail: "@creatorlab", values: ["$499", "Cancellation", "May 16", "Founder", "Success"], status: "Review", statusTone: "amber" },
      { name: "Fit Launch", detail: "@fitlaunch", values: ["$249", "Product fit", "May 15", "Pro", "Support"], status: "Open", statusTone: "red" },
    ],
    insightTitle: "Refund reasons",
    insightItems: [
      { label: "Billing issues", value: "46%", detail: "Duplicate, failed, or unclear charges", tone: "bg-[#fff4df] text-[#c07800]", icon: CreditCard },
      { label: "Product fit", value: "31%", detail: "Feature gap or onboarding mismatch", tone: "bg-[#f0edff] text-[#4b3cff]", icon: SlidersHorizontal },
    ],
  },
  "platform-instagram": {
    metrics: [
      { label: "Instagram accounts", value: "1,284", detail: "Connected total", change: "96.7% healthy", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Globe2 },
      { label: "Webhook events", value: "184K", detail: "Today", change: "+22.4%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Code2 },
      { label: "Expired tokens", value: "28", detail: "Reconnect required", change: "2.2%", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
      { label: "Disconnected", value: "14", detail: "No active channel", change: "1.1%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Token", "Messages", "Webhook", "Last sync", "Owner"],
    rows: [
      { name: "Sarah Creates", detail: "@sarah.creates", values: ["Healthy", "328", "Live", "2 min ago", "Platform"], status: "Healthy", statusTone: "green" },
      { name: "James Wilson", detail: "@james.wilson", values: ["Expired", "0", "Paused", "1 day ago", "Success"], status: "Reconnect", statusTone: "amber" },
      { name: "Creator Lab", detail: "@creatorlab", values: ["Disconnected", "0", "Failed", "3 days ago", "Support"], status: "Issue", statusTone: "red" },
    ],
    insightTitle: "Instagram status",
    insightItems: [
      { label: "Healthy", value: "1,242", detail: "Accounts ready for automation", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Needs action", value: "42", detail: "Expired or disconnected tokens", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
    ],
  },
  "platform-api": {
    metrics: [
      { label: "Instagram API", value: "Healthy", detail: "99.98% uptime", change: "132ms avg", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Globe2 },
      { label: "OpenAI API", value: "Healthy", detail: "99.95% uptime", change: "421ms avg", tone: "bg-[#eafaf0] text-[#13a84f]", icon: BrainCircuit },
      { label: "Database", value: "Healthy", detail: "No incidents", change: "18ms avg", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Database },
      { label: "Webhook queue", value: "Warning", detail: "Retry spike", change: "284 pending", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
    ],
    columns: ["Status", "Latency", "Uptime", "Incidents", "Owner"],
    rows: [
      { name: "Instagram API", detail: "Meta graph and messaging", values: ["Healthy", "132ms", "99.98%", "0", "Platform"], status: "Healthy", statusTone: "green" },
      { name: "OpenAI API", detail: "Drafts and qualification", values: ["Healthy", "421ms", "99.95%", "0", "AI"], status: "Healthy", statusTone: "green" },
      { name: "Webhook queue", detail: "Instagram webhook workers", values: ["Warning", "1.8s", "99.64%", "1", "Platform"], status: "Warning", statusTone: "amber" },
    ],
    insightTitle: "Service health",
    insightItems: [
      { label: "Healthy services", value: "5", detail: "No action required", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Warning", value: "1", detail: "Webhook queue needs monitoring", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
    ],
  },
  "platform-queue": {
    metrics: [
      { label: "Pending jobs", value: "284", detail: "Webhook queue", change: "+6.3%", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Processed today", value: "184K", detail: "Events handled", change: "+22.4%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Retries", value: "41", detail: "Automatic retry", change: "15 min", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
      { label: "Failed jobs", value: "3", detail: "Needs operator", change: "Open", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Queue", "Pending", "Oldest", "Retries", "Worker"],
    rows: [
      { name: "Webhook ingest", detail: "Instagram messages", values: ["High", "184", "8 min", "22", "Live"], status: "Warning", statusTone: "amber" },
      { name: "AI drafts", detail: "OpenAI reply generation", values: ["Normal", "31", "1 min", "4", "Live"], status: "Healthy", statusTone: "green" },
      { name: "Media sync", detail: "Attachment fetch jobs", values: ["Normal", "69", "4 min", "15", "Live"], status: "Healthy", statusTone: "green" },
    ],
    insightTitle: "Queue operations",
    insightItems: [
      { label: "Avg processing", value: "1.8s", detail: "Across active workers", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
      { label: "Manual review", value: "3", detail: "Jobs that need operator retry", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
  },
  "ai-usage": {
    metrics: [
      { label: "Messages processed", value: "124,580", detail: "Today", change: "+22.4%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Bot },
      { label: "AI conversations", value: "18,420", detail: "Automated chats", change: "+18.7%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Sparkles },
      { label: "Opportunities found", value: "3,281", detail: "Buying signals", change: "+27.1%", tone: "bg-[#fff6e8] text-[#d98613]", icon: Target },
      { label: "Escalations", value: "284", detail: "Human handoffs", change: "-6.3%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
    columns: ["Messages", "AI replies", "Opportunities", "Escalations", "Health"],
    rows: [
      { name: "Lead qualification", detail: "Pricing and booking intent", values: ["58,420", "21,310", "1,284", "94", "Good"], status: "Healthy", statusTone: "green" },
      { name: "CTA drafts", detail: "Suggested replies", values: ["42,118", "18,002", "1,031", "72", "Good"], status: "Healthy", statusTone: "green" },
      { name: "Support intent", detail: "Refund or issue detection", values: ["24,042", "9,108", "966", "118", "Watch"], status: "Watch", statusTone: "amber" },
    ],
    insightTitle: "Automation coverage",
    insightItems: [
      { label: "AI-ready chats", value: "92%", detail: "Conversations handled without handoff", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Handoff load", value: "284", detail: "Escalations created today", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
    ],
  },
  "ai-costs": {
    metrics: [
      { label: "AI spend", value: "$1,842", detail: "Month to date", change: "+11.2%", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
      { label: "Cost per reply", value: "$0.018", detail: "Average", change: "-4.1%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
      { label: "Token volume", value: "102M", detail: "Input and output", change: "+21.4%", tone: "bg-[#eaf4ff] text-[#246bff]", icon: BrainCircuit },
      { label: "Gross margin", value: "91.4%", detail: "After AI costs", change: "+1.3%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: CircleDollarSign },
    ],
    columns: ["Spend", "Tokens", "Replies", "Cost/reply", "Trend"],
    rows: [
      { name: "GPT reply drafts", detail: "Suggested and sent replies", values: ["$912", "51M", "49,200", "$0.019", "Stable"], status: "Normal", statusTone: "green" },
      { name: "Lead qualification", detail: "Opportunity scoring", values: ["$684", "38M", "31,004", "$0.022", "Up"], status: "Watch", statusTone: "amber" },
      { name: "Workflow tests", detail: "Internal AI tests", values: ["$246", "13M", "8,210", "$0.030", "Review"], status: "Review", statusTone: "purple" },
    ],
    insightTitle: "Cost controls",
    insightItems: [
      { label: "Projected spend", value: "$3.2K", detail: "Expected month-end AI usage", tone: "bg-[#f0edff] text-[#4b3cff]", icon: CalendarDays },
      { label: "Savings target", value: "$420", detail: "Available through prompt compression", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
    ],
  },
  "ai-escalations": {
    metrics: [
      { label: "Escalations", value: "284", detail: "Today", change: "-6.3%", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
      { label: "Urgent", value: "18", detail: "High-priority handoffs", change: "Open", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
      { label: "Avg handoff time", value: "2m 14s", detail: "AI to human", change: "-18s", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Clock },
      { label: "Resolved", value: "241", detail: "Handled today", change: "+9.8%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
    ],
    columns: ["Reason", "Count", "Avg time", "Owner", "Trend"],
    rows: [
      { name: "Refund request", detail: "Billing or cancellation language", values: ["Refund", "74", "1m 58s", "Support", "Down"], status: "Handled", statusTone: "green" },
      { name: "Angry sentiment", detail: "Urgent support tone", values: ["Sentiment", "58", "2m 41s", "Support", "Up"], status: "Watch", statusTone: "amber" },
      { name: "Human requested", detail: "Creator wants manual takeover", values: ["Human", "152", "2m 10s", "Agents", "Stable"], status: "Handled", statusTone: "green" },
    ],
    insightTitle: "Handoff signals",
    insightItems: [
      { label: "Needs tuning", value: "31", detail: "Escalations caused by low AI confidence", tone: "bg-[#fff4df] text-[#c07800]", icon: SlidersHorizontal },
      { label: "Human load", value: "18", detail: "Urgent active conversations", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
    ],
  },
  "support-tickets": {
    metrics: [
      { label: "Open tickets", value: "18", detail: "Current queue", change: "-3", tone: "bg-[#fff0f3] text-[#df405b]", icon: Mail },
      { label: "In progress", value: "7", detail: "Assigned now", change: "2h SLA", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
      { label: "Resolved today", value: "24", detail: "Closed issues", change: "+12%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      { label: "Satisfaction", value: "4.8/5", detail: "Latest support score", change: "+0.2", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Star },
    ],
    columns: ["Priority", "Topic", "Age", "Assignee", "SLA"],
    rows: [
      { name: "Webhook not receiving", detail: "Sarah Creates", values: ["High", "Instagram", "18 min", "Platform", "On track"], status: "Open", statusTone: "red" },
      { name: "Billing question", detail: "GlowSkin", values: ["Medium", "Billing", "1h 04m", "Support", "On track"], status: "In progress", statusTone: "amber" },
      { name: "AI reply tone", detail: "Mike Coach", values: ["Low", "AI", "2h 10m", "AI", "On track"], status: "Open", statusTone: "purple" },
    ],
    insightTitle: "Support summary",
    insightItems: [
      { label: "Avg response", value: "2h 14m", detail: "Across open tickets", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
      { label: "First response", value: "1h 06m", detail: "Median first support reply", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Send },
    ],
  },
  "support-issues": {
    metrics: [
      { label: "Creator issues", value: "31", detail: "Open creator blockers", change: "-8%", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
      { label: "Product issues", value: "11", detail: "Need engineering triage", change: "4 high", tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
      { label: "Onboarding issues", value: "13", detail: "Setup help needed", change: "-3", tone: "bg-[#fff4df] text-[#c07800]", icon: GraduationCap },
      { label: "Resolved today", value: "19", detail: "Creator blockers closed", change: "+14%", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
    ],
    columns: ["Category", "Impact", "Age", "Owner", "Next step"],
    rows: [
      { name: "Instagram reconnect loop", detail: "6 creators affected", values: ["Platform", "High", "42 min", "Platform", "Patch"], status: "Open", statusTone: "red" },
      { name: "AI draft too long", detail: "3 creators affected", values: ["AI", "Medium", "2h", "AI", "Tune"], status: "Review", statusTone: "amber" },
      { name: "Plan upgrade blocked", detail: "2 creators affected", values: ["Billing", "Medium", "4h", "Billing", "Retry"], status: "Open", statusTone: "purple" },
    ],
    insightTitle: "Issue themes",
    insightItems: [
      { label: "Platform blockers", value: "11", detail: "Need engineering or API follow-up", tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
      { label: "Success follow-up", value: "20", detail: "Can be handled by support team", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
    ],
  },
};

function SuperAdminBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-8 w-8">
        <div className="absolute left-0 top-0 h-2 w-7 rounded-full bg-gradient-to-r from-[#8156ff] to-[#3529ff]" />
        <div className="absolute left-[9px] top-[2px] h-6 w-2 rounded-full bg-gradient-to-b from-[#5d43ff] to-[#8b6dff]" />
        <div className="absolute right-0.5 top-[6px] h-2.5 w-2.5 rounded-full bg-[#8a70ff]" />
      </div>
      <span className="text-[18px] font-extrabold leading-none text-white">TractionFlo</span>
      <span className="rounded-[5px] bg-[#5b38ff] px-2 py-1 text-[10px] font-extrabold text-white">Admin</span>
    </div>
  );
}

function SuperAdminSidebar({
  activePage,
  onChangePage,
  profile,
}: {
  activePage: SuperAdminPage;
  onChangePage: (page: SuperAdminPage) => void;
  profile: AccountProfile;
}) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen min-h-screen w-[238px] shrink-0 flex-col overflow-hidden bg-[#071022] px-3.5 py-5 text-white lg:flex">
      <SuperAdminBrandMark />

      <nav className="mt-7 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {superAdminNavGroups.map((group) => {
          const Icon = group.icon;
          const isGroupActive =
            group.page === activePage || Boolean(group.children?.some((child) => child.page === activePage));

          if (group.page) {
            return (
              <button
                key={group.label}
                type="button"
                onClick={() => onChangePage(group.page!)}
                className={`flex h-11 items-center gap-3 rounded-[8px] px-3 text-left text-[13px] font-extrabold transition ${
                  isGroupActive ? "bg-[#5b38ff] text-white shadow-[0_16px_35px_rgba(91,56,255,0.28)]" : "text-[#cbd3e2] hover:bg-white/8"
                }`}
              >
                <Icon size={18} strokeWidth={2.35} />
                <span className="flex-1">{group.label}</span>
              </button>
            );
          }

          return (
            <div key={group.label} className="py-1">
              <div className={`flex h-9 items-center gap-3 px-3 text-[13px] font-extrabold ${isGroupActive ? "text-white" : "text-[#cbd3e2]"}`}>
                <Icon size={17} strokeWidth={2.25} />
                <span className="flex-1">{group.label}</span>
                <ChevronDown size={14} strokeWidth={2.4} />
              </div>
              <div className="ml-[21px] mt-1 border-l border-white/15 pl-4">
                {group.children?.map((child) => {
                  const isActive = child.page === activePage;

                  return (
                    <button
                      key={child.page}
                      type="button"
                      onClick={() => onChangePage(child.page)}
                      className={`block h-8 w-full rounded-[7px] px-2 text-left text-[12px] font-semibold transition ${
                        isActive ? "bg-white/12 text-white" : "text-[#9faac0] hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {child.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 pt-4">
        <div className="flex h-[58px] items-center gap-3 rounded-[10px] bg-white/6 px-3">
          {profile.avatarUrl ? (
            <span
              aria-label={profile.name}
              role="img"
              className="h-10 w-10 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.avatarUrl})` }}
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[11px] font-extrabold text-white">
              {initials || "SA"}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-extrabold text-white">{profile.name || "Super Admin"}</span>
            <span className="block truncate text-[11px] font-semibold text-[#9faac0]">Super Admin</span>
          </span>
          <ChevronRight size={15} className="text-[#9faac0]" strokeWidth={2.4} />
        </div>

        <form action={signout}>
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[12px] font-extrabold text-[#ffd1dc] transition hover:bg-white/10"
          >
            <LogOut size={15} strokeWidth={2.35} />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

function SuperAdminHeader({ page }: { page: SuperAdminPage }) {
  const meta = superAdminPageMeta[page];

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-4 lg:hidden">
          <BrandMark />
        </div>
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.02em] text-black md:text-[38px]">
          {meta.title}
        </h1>
        <p className="mt-3 text-[13px] font-semibold text-[#596175]">{meta.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="flex h-11 items-center gap-3 rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)]"
        >
          May 12 - May 18, 2025
          <CalendarDays size={16} strokeWidth={2.3} />
        </button>
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)]"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#13a84f]" />
          Auto refresh: On
          <ChevronDown size={14} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)]"
        >
          <Download size={15} strokeWidth={2.4} />
          Export
        </button>
      </div>
    </header>
  );
}

function SuperAdminMetricCard({ metric }: { metric: SuperAdminMetric }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${metric.tone}`}>
          <Icon size={22} strokeWidth={2.35} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-[#687089]">{metric.label}</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-black">{metric.value}</p>
          <p className="mt-2 text-[11px] font-semibold text-[#687089]">{metric.detail}</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] font-extrabold text-[#13a84f]">
        <TrendingUp size={13} strokeWidth={2.4} />
        {metric.change}
      </p>
    </article>
  );
}

function AdminLineChart({ bars = false }: { bars?: boolean }) {
  if (bars) {
    const values = [14, 34, 11, 28, 16, 38, 19, 26, 51, 18, 13, 45, 24, 31, 55, 20, 36, 27, 48, 62];

    return (
      <div className="flex h-[190px] items-end gap-2 rounded-[8px] bg-[#fbfbff] px-4 pb-5 pt-3">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="flex-1 rounded-t-[5px] bg-gradient-to-t from-[#5b38ff] to-[#9a89ff]"
            style={{ height: `${Math.max(18, value * 2.1)}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-[230px] rounded-[8px] bg-[#fbfbff]">
      <svg viewBox="0 0 640 230" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="adminMrrFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5b38ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#5b38ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M24 180 C88 156 132 160 185 142 C230 126 271 114 318 92 C366 70 412 82 462 55 C520 25 562 45 616 22 L616 220 L24 220 Z"
          fill="url(#adminMrrFill)"
        />
        <path
          d="M24 180 C88 156 132 160 185 142 C230 126 271 114 318 92 C366 70 412 82 462 55 C520 25 562 45 616 22"
          fill="none"
          stroke="#5b38ff"
          strokeLinecap="round"
          strokeWidth="3"
        />
        {[24, 185, 318, 462, 616].map((x, index) => (
          <circle key={x} cx={x} cy={[180, 142, 92, 55, 22][index]} r="4" fill="#5b38ff" />
        ))}
      </svg>
    </div>
  );
}

function AdminDonut({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div
        className="relative flex h-[154px] w-[154px] items-center justify-center rounded-full"
        style={{ background: "conic-gradient(#16b364 0 69.5%, #3154ff 69.5% 89.5%, #ff850d 89.5% 95.8%, #98a2b3 95.8% 100%)" }}
      >
        <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-white">
          <span className="text-[24px] font-extrabold text-black">{value}</span>
          <span className="text-[11px] font-semibold text-[#687089]">{label}</span>
        </div>
      </div>
    </div>
  );
}

function SuperAdminOverviewPage() {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {superAdminOverviewMetrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1.15fr_0.9fr_0.95fr]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)] xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-extrabold text-black">MRR Growth</h2>
              <p className="mt-2 text-[26px] font-extrabold leading-none text-black">$216,928</p>
            </div>
            <button type="button" className="flex h-8 items-center gap-2 rounded-[7px] border border-[#e0e4ef] px-3 text-[11px] font-bold">
              Last 30 days
              <ChevronDown size={13} />
            </button>
          </div>
          <AdminLineChart />
        </article>

        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-extrabold text-black">New Signups</h2>
              <p className="mt-2 text-[22px] font-extrabold leading-none text-black">341</p>
            </div>
            <button type="button" className="flex h-8 items-center gap-2 rounded-[7px] border border-[#e0e4ef] px-3 text-[11px] font-bold">
              Last 30 days
              <ChevronDown size={13} />
            </button>
          </div>
          <AdminLineChart bars />
        </article>

        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[14px] font-extrabold text-black">Account Status</h2>
          <AdminDonut label="Total" value="1,284" />
          <div className="space-y-2 text-[11px] font-bold">
            {[
              ["Active", "892 (69.5%)", "#16b364"],
              ["Trial", "412 (32.1%)", "#3154ff"],
              ["Inactive", "72 (6.6%)", "#ff850d"],
              ["Cancelled", "54 (4.2%)", "#98a2b3"],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="flex-1 text-[#30384d]">{label}</span>
                <span className="text-[#596175]">{value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-extrabold text-black">Platform Health</h2>
            <button type="button" className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
          </div>
          <div className="space-y-3">
            {[
              ["Instagram API", "Healthy", Globe2, "green"],
              ["OpenAI API", "Healthy", BrainCircuit, "green"],
              ["Database", "Healthy", Database, "green"],
              ["Webhook Queue", "Warning", TriangleAlert, "amber"],
              ["Email Service", "Healthy", Mail, "green"],
              ["Payment Service", "Healthy", CreditCard, "green"],
            ].map(([label, status, IconValue, tone]) => {
              const Icon = IconValue as LucideIcon;
              return (
                <div key={label as string} className="flex items-center gap-3 text-[12px] font-bold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#f6f7fb] text-[#4b3cff]">
                    <Icon size={15} strokeWidth={2.35} />
                  </span>
                  <span className="flex-1 text-[#30384d]">{label as string}</span>
                  <span className={tone === "green" ? "text-[#13a84f]" : "text-[#c07800]"}>{status as string}</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-extrabold text-black">Recently Active Creators</h2>
            <button type="button" className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12px]">
              <thead className="border-b border-[#edf0f6] text-[10px] uppercase text-[#687089]">
                <tr>
                  {["Creator", "Plan", "Instagram", "Last active", "Conversations", "Opportunities", "Revenue found", "Status"].map((header) => (
                    <th key={header} className="py-3 font-extrabold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {superAdminCreatorRows.map((row) => (
                  <tr key={row[0]} className="border-b border-[#edf0f6] last:border-b-0">
                    <td className="py-3">
                      <p className="font-extrabold text-black">{row[0]}</p>
                      <p className="text-[11px] font-semibold text-[#687089]">{row[1]}</p>
                    </td>
                    <td className="py-3 font-bold text-[#4b3cff]">{row[2]}</td>
                    <td className={`py-3 font-bold ${row[3] === "Connected" ? "text-[#13a84f]" : "text-[#df405b]"}`}>{row[3]}</td>
                    <td className="py-3 font-semibold text-[#30384d]">{row[4]}</td>
                    <td className="py-3 font-extrabold text-black">{row[5]}</td>
                    <td className="py-3 font-extrabold text-black">{row[6]}</td>
                    <td className="py-3 font-extrabold text-black">{row[7]}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${row[8] === "Active" ? statusToneClasses.green : statusToneClasses.amber}`}>
                        {row[8]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="grid gap-4">
          <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-black">Instagram Accounts</h2>
              <button type="button" className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
            </div>
            <AdminDonut label="Connected" value="1,284" />
            <div className="space-y-2 text-[12px] font-bold">
              {[
                ["Healthy", "1,242 (96.7%)", "text-[#13a84f]"],
                ["Expired Token", "28 (2.2%)", "text-[#c07800]"],
                ["Disconnected", "14 (1.1%)", "text-[#df405b]"],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex justify-between">
                  <span className={tone}>{label}</span>
                  <span className="text-[#30384d]">{value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <h2 className="text-[14px] font-extrabold text-black">AI Usage Today</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Messages Processed", "124,580", Bot, "bg-[#f0edff] text-[#4b3cff]"],
                ["AI Conversations", "18,420", Sparkles, "bg-[#f0edff] text-[#4b3cff]"],
                ["Opportunities Found", "3,281", Target, "bg-[#fff6e8] text-[#d98613]"],
                ["Escalations", "284", TriangleAlert, "bg-[#fff0f3] text-[#df405b]"],
              ].map(([label, value, IconValue, tone]) => {
                const Icon = IconValue as LucideIcon;
                return (
                  <div key={label as string} className="rounded-[8px] border border-[#edf0f6] p-3">
                    <span className={`mb-3 flex h-8 w-8 items-center justify-center rounded-[8px] ${tone as string}`}>
                      <Icon size={16} strokeWidth={2.35} />
                    </span>
                    <p className="text-[11px] font-bold text-[#687089]">{label as string}</p>
                    <p className="mt-1 text-[18px] font-extrabold text-black">{value as string}</p>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function SuperAdminTable({ config }: { config: SuperAdminDetailConfig }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[12px]">
        <thead className="border-b border-[#edf0f6] text-[10px] uppercase text-[#687089]">
          <tr>
            <th className="py-3 font-extrabold">Name</th>
            {config.columns.map((column) => (
              <th key={column} className="py-3 font-extrabold">{column}</th>
            ))}
            <th className="py-3 font-extrabold">Status</th>
            <th className="py-3 text-right font-extrabold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {config.rows.map((row) => (
            <tr key={row.name} className="border-b border-[#edf0f6] last:border-b-0">
              <td className="py-4">
                <p className="font-extrabold text-black">{row.name}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#687089]">{row.detail}</p>
              </td>
              {row.values.map((value, index) => (
                <td key={`${row.name}-${index}`} className="py-4 font-bold text-[#30384d]">{value}</td>
              ))}
              <td className="py-4">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusToneClasses[row.statusTone]}`}>
                  {row.status}
                </span>
              </td>
              <td className="py-4 text-right">
                <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e0e4ef] text-black">
                  <MoreHorizontal size={16} strokeWidth={2.4} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuperAdminDetailPage({ page }: { page: Exclude<SuperAdminPage, "overview" | "settings"> }) {
  const config = superAdminDetailConfigs[page];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
            <div className="flex gap-2">
              <button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                Search
              </button>
              <button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <RefreshCw size={14} strokeWidth={2.4} />
                Refresh
              </button>
            </div>
          </div>
          <SuperAdminTable config={config} />
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">{config.insightTitle}</h2>
          <div className="mt-4 space-y-3">
            {config.insightItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

function SuperAdminSettingsPage({ profile }: { profile: AccountProfile }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
        <h2 className="text-[17px] font-extrabold text-black">Workspace settings</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["Workspace name", "TractionFlo"],
            ["Admin email", profile.email],
            ["Default timezone", "(GMT-5) Eastern Time"],
            ["Billing currency", "USD ($)"],
          ].map(([label, value]) => (
            <label key={label} className="block">
              <span className="text-[12px] font-extrabold text-[#46506a]">{label}</span>
              <input
                readOnly
                value={value}
                className="mt-2 h-12 w-full rounded-[8px] border border-[#dfe4ee] bg-[#f9faff] px-3 text-[13px] font-bold text-black outline-none"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[13px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)]"
        >
          <Shield size={16} strokeWidth={2.4} />
          Save admin settings
        </button>
      </section>

      <aside className="space-y-4">
        {[
          ["Admin access", "Superadmin can open every platform page.", Shield, "bg-[#f0edff] text-[#4b3cff]"],
          ["Audit exports", "Reports export with platform-wide data.", Download, "bg-[#eaf4ff] text-[#246bff]"],
          ["System alerts", "Warnings appear for queues and API health.", Bell, "bg-[#fff4df] text-[#c07800]"],
        ].map(([title, detail, IconValue, tone]) => {
          const Icon = IconValue as LucideIcon;

          return (
            <article key={title as string} className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
              <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${tone as string}`}>
                <Icon size={18} strokeWidth={2.35} />
              </span>
              <h3 className="mt-3 text-[14px] font-extrabold text-black">{title as string}</h3>
              <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">{detail as string}</p>
            </article>
          );
        })}
      </aside>
    </div>
  );
}

function SuperAdminMobileNavigation({
  activePage,
  onChangePage,
}: {
  activePage: SuperAdminPage;
  onChangePage: (page: SuperAdminPage) => void;
}) {
  const mobileItems = superAdminNavGroups.filter((group): group is { label: string; icon: LucideIcon; page: SuperAdminPage } =>
    Boolean(group.page)
  );

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-2 rounded-[14px] border border-[#17213a] bg-[#071022]/95 p-1.5 shadow-[0_18px_60px_rgba(20,28,53,0.28)] backdrop-blur lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.page === activePage;

        return (
          <button
            key={item.page}
            type="button"
            onClick={() => onChangePage(item.page)}
            className={`flex h-12 items-center justify-center gap-2 rounded-[10px] text-[11px] font-extrabold transition ${
              isActive ? "bg-[#5b38ff] text-white" : "text-[#cbd3e2]"
            }`}
          >
            <Icon size={16} strokeWidth={2.4} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function SuperAdminDashboard({ profile }: { profile: AccountProfile }) {
  const [activePage, setActivePage] = useState<SuperAdminPage>("overview");

  useEffect(() => {
    const syncFromUrl = () => {
      setActivePage(getSuperAdminPageFromUrl());
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);

    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  function handlePageChange(page: SuperAdminPage) {
    setActivePage(page);

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", getSuperAdminUrl(page));
    }
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f8f9fd] font-sans text-black">
      <SuperAdminSidebar activePage={activePage} onChangePage={handlePageChange} profile={profile} />

      <main className="h-dvh flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-8 xl:px-9">
        <div className="mx-auto max-w-[1440px]">
          <SuperAdminHeader page={activePage} />

          <div className="mt-6">
            {activePage === "overview" ? (
              <SuperAdminOverviewPage />
            ) : activePage === "settings" ? (
              <SuperAdminSettingsPage profile={profile} />
            ) : (
              <SuperAdminDetailPage page={activePage} />
            )}
          </div>
        </div>
      </main>

      <SuperAdminMobileNavigation activePage={activePage} onChangePage={handlePageChange} />
    </div>
  );
}

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
          className="mt-3 flex h-9 w-full items-center justify-between rounded-[7px] border border-[#dde2ed] bg-white px-3 text-[12px] font-extrabold text-black shadow-[0_12px_28px_rgba(20,28,53,0.03)]"
        >
          {opportunity.action}
          <ArrowRight size={16} strokeWidth={2.4} />
        </button>
      </div>
    </article>
  );
}

function OpportunityPageCardView({ opportunity }: { opportunity: OpportunityPageCard }) {
  const Icon = opportunity.icon;
  const tone = opportunityToneClasses[opportunity.tone];
  const scoreText = opportunity.risk ?? opportunity.score;

  return (
    <article className="flex min-h-[276px] flex-col rounded-[11px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
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

      <p className="mt-4 max-w-[230px] text-[11px] font-medium leading-[1.65] text-[#3f4659]">{opportunity.detail}</p>

      <div className="mt-auto pt-4">
        <p className="text-[11px] font-medium text-[#596175]">{opportunity.scoreLabel ?? "Potential Value"}</p>

        {opportunity.value ? (
          <>
            <p className={`mt-1 text-[20px] font-extrabold leading-none ${tone.value}`}>{opportunity.value}</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="flex items-center">
                {opportunity.avatars?.map((avatar, index) => (
                  <span
                    key={avatar}
                    aria-label={index === 0 ? "Interested profile" : undefined}
                    aria-hidden={index === 0 ? undefined : true}
                    role={index === 0 ? "img" : undefined}
                    className="-ml-1 first:ml-0 h-6 w-6 rounded-full border-2 border-white bg-cover bg-center"
                    style={{ backgroundImage: `url(https://i.pravatar.cc/48?img=${avatar})` }}
                  />
                ))}
                {opportunity.extraAvatars ? (
                  <span className="-ml-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#eff1f6] px-1.5 text-[10px] font-bold text-[#596175]">
                    {opportunity.extraAvatars}
                  </span>
                ) : null}
              </div>
              <OpportunityReviewButton tone={tone.action}>{opportunity.action}</OpportunityReviewButton>
            </div>
          </>
        ) : (
          <>
            <p className={`mt-1 text-[15px] font-extrabold leading-none ${tone.value}`}>{scoreText}</p>
            <div className="mt-3 flex items-center gap-4">
              {opportunity.progress ? (
                <div className="h-[3px] flex-1 rounded-full bg-[#edf0f6]">
                  <div className={`h-full rounded-full ${tone.progress}`} style={{ width: opportunity.progress }} />
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <OpportunityReviewButton tone={tone.action}>{opportunity.action}</OpportunityReviewButton>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function OpportunityReviewButton({ children, tone }: { children: string; tone: string }) {
  return (
    <button
      type="button"
      className={`flex h-9 w-[118px] items-center justify-between rounded-[8px] border border-[#dde2ed] bg-white px-4 text-[12px] font-extrabold shadow-[0_12px_28px_rgba(20,28,53,0.03)] ${tone}`}
    >
      {children}
      <ArrowRight size={15} strokeWidth={2.5} />
    </button>
  );
}

function OpportunitiesPage() {
  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[26px] font-extrabold leading-none text-black sm:text-[28px]">Opportunities</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#596175]">
              High potential opportunities TractionFlo has identified for you.
            </p>
          </div>

          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <button
              type="button"
              className="flex h-11 min-w-0 items-center justify-between rounded-[9px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:h-12 sm:w-[252px] sm:px-5 sm:text-[13px]"
            >
              <span className="min-w-0 truncate">May 12 - May 18, 2025</span>
              <CalendarDays size={16} strokeWidth={2.3} />
            </button>
            <button
              type="button"
              className="flex h-11 w-[86px] items-center justify-center gap-2 rounded-[9px] border border-[#e0e4ef] bg-white text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:h-12 sm:w-[94px] sm:text-[13px]"
            >
              <SlidersHorizontal size={15} strokeWidth={2.4} />
              Filter
            </button>
          </div>
        </header>

        <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-6 lg:px-0">
          <div className="grid w-max grid-cols-[135px_185px_165px_230px_195px] lg:grid-cols-[150px_210px_190px_260px_220px]">
            {opportunityTabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = index === 0;
              return (
                <button
                  key={tab.label}
                  type="button"
                  className={`relative flex h-11 items-center justify-center gap-2 text-[11px] font-extrabold sm:gap-3 sm:text-[12px] ${
                    isActive ? "text-[#4b3cff]" : "text-black"
                  } ${index < opportunityTabs.length - 1 ? "border-r border-[#e2e6f0]" : ""}`}
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

        <section className="mt-4 grid rounded-[12px] border border-[#e5e8f0] bg-white shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:grid-cols-2 xl:h-[112px] xl:grid-cols-4">
          {opportunityMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`flex min-h-[96px] items-center gap-4 px-4 sm:px-5 xl:min-h-0 xl:gap-5 xl:px-7 ${
                  index < opportunityMetrics.length - 1 ? "border-b border-[#e5e8f0] sm:border-r sm:last:border-r-0 xl:border-b-0" : ""
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

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {opportunityPageCards.map((opportunity) => (
            <OpportunityPageCardView key={`${opportunity.name}-${opportunity.badge}`} opportunity={opportunity} />
          ))}
        </div>

        <footer className="relative mt-4 flex items-center justify-center pb-2">
          <p className="text-[12px] font-medium text-[#596175]">Showing 1 to 8 of 12 opportunities</p>
          <button
            type="button"
            className="absolute right-4 flex h-10 w-[118px] items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white text-[12px] font-extrabold text-black"
          >
            Load more
            <ChevronDown size={15} strokeWidth={2.5} />
          </button>
        </footer>
      </div>
    </main>
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

function EscalationTabs() {
  return (
    <div className="-mx-4 mt-8 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="grid w-max grid-flow-col auto-cols-max lg:grid-cols-[88px_142px_162px_178px_180px_160px]">
        {escalationTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === 0;

          return (
            <button
              key={tab.label}
              type="button"
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

function EscalationCard({ escalation }: { escalation: EscalationItem }) {
  const Icon = escalation.icon;

  return (
    <article className={`relative overflow-hidden rounded-[13px] border ${escalation.borderTone} ${escalation.glowTone} p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:p-5 lg:p-6`}>
      <span className={`absolute right-6 top-7 h-2.5 w-2.5 rounded-full ${escalation.dotTone}`} />

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
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center gap-4 rounded-[8px] border border-[#dde3ee] bg-white text-[12px] font-extrabold text-black shadow-[0_12px_28px_rgba(20,28,53,0.035)] sm:w-[128px]"
            >
              View details
              <ArrowRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function EscalationDetailPanel() {
  return (
    <aside className="rounded-[13px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] xl:sticky xl:top-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-black">Escalation Details</h2>
        <button type="button" aria-label="Close details" className="text-black">
          <X size={18} strokeWidth={2.3} />
        </button>
      </div>

      <div className="mt-7 grid grid-cols-[52px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[52px_minmax(0,1fr)_118px]">
        <span
          aria-label="Ava Thompson"
          role="img"
          className="h-[52px] w-[52px] shrink-0 rounded-full bg-cover bg-center"
          style={{ backgroundImage: "url(https://i.pravatar.cc/96?img=47)" }}
        />
        <div className="min-w-0">
          <h3 className="whitespace-nowrap text-[14px] font-extrabold text-black">Ava Thompson</h3>
          <p className="mt-1 truncate text-[12px] font-medium text-[#46506a]">@ava.thompson</p>
        </div>
        <button
          type="button"
          className="col-span-2 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black sm:col-span-1 sm:w-[118px]"
        >
          View profile
          <ExternalLink size={13} strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-[13px] font-extrabold text-black">Summary</h3>
        <p className="mt-3 text-[12px] font-medium leading-[1.75] text-[#253049]">
          Ava is requesting a full refund for Order #1024. She says the course content didn&apos;t meet her expectations and is not as advertised.
        </p>
      </div>

      <div className="mt-5 divide-y divide-[#edf0f6] border-y border-[#edf0f6]">
        {escalationDetailRows.map((row) => {
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
          We&apos;re sorry to hear the course didn&apos;t meet your expectations. We want you to get the most value from your purchase. Can you share what specific parts fell short for you? We&apos;d love to make this right.
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#46506a]">
          <Sparkles size={13} className="text-[#6d3cff]" strokeWidth={2.2} />
          Generated by TractionFlo AI
        </p>
      </div>

      <button
        type="button"
        className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)]"
      >
        <Send size={15} strokeWidth={2.25} />
        Take over conversation
      </button>
      <button
        type="button"
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white text-[12px] font-extrabold text-black"
      >
        <PencilLine size={15} strokeWidth={2.25} />
        Add internal note
      </button>
    </aside>
  );
}

function EscalationsPage() {
  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[30px] font-extrabold leading-none text-black sm:text-[32px]">Escalations</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#46506a]">
              Human attention needed. Respond or take over.
            </p>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <div className="flex h-10 min-w-0 items-center gap-3 rounded-[9px] border border-[#e0e4ef] bg-white px-3 text-[#596175] shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[228px]">
              <Search size={16} strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">Search escalations...</span>
              <span className="hidden rounded bg-[#eff1f6] px-1.5 py-0.5 text-[11px] font-extrabold text-[#8b92a6] sm:inline">⌘K</span>
            </div>
            <button
              type="button"
              className="flex h-10 w-[78px] items-center justify-center gap-2 rounded-[9px] border border-[#e0e4ef] bg-white text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[94px]"
            >
              <SlidersHorizontal size={15} strokeWidth={2.4} />
              Filter
            </button>
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.025)]"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={2.25} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#3044ff]" />
            </button>
          </div>
        </header>

        <EscalationTabs />

        <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            {escalationItems.map((escalation) => (
              <EscalationCard key={escalation.title} escalation={escalation} />
            ))}
            <p className="pt-2 text-center text-[13px] font-medium text-[#46506a]">Showing 1 to 3 of 3 escalations</p>
          </section>

          <EscalationDetailPanel />
        </div>
      </div>
    </main>
  );
}

function InstagramLogoTile() {
  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-tr from-[#ffbd00] via-[#ff2d85] to-[#6d3cff] shadow-[0_14px_26px_rgba(255,61,129,0.2)]">
      <div className="h-[31px] w-[31px] rounded-[9px] border-[3px] border-white" />
      <div className="absolute h-[12px] w-[12px] rounded-full border-[3px] border-white" />
      <div className="absolute right-[14px] top-[14px] h-[5px] w-[5px] rounded-full bg-white" />
    </div>
  );
}

function SettingsSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-9 min-w-0 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 ${className}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SettingsToggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-10 rounded-full transition ${
        checked ? "bg-[#3044ff] shadow-[0_10px_18px_rgba(48,68,255,0.22)]" : "bg-[#dfe4f1]"
      }`}
    >
      <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition ${checked ? "right-0.5" : "left-0.5"}`} />
    </button>
  );
}

function SettingsMenuCard({
  activeSection,
  onSectionChange,
  profile,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  profile: AccountProfile;
}) {
  const visibleMenuItems = getVisibleSettingsMenuItems(profile);

  return (
    <aside className="self-start rounded-[12px] border border-[#e5e8f0] bg-white p-3 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeSection;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`flex min-h-[58px] w-full items-center gap-3 rounded-[9px] px-3 text-left transition ${
                isActive ? "bg-[#f0edff] text-[#3044ff]" : "text-black hover:bg-[#f8f9fc]"
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.45 : 2.15} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[12px] font-extrabold ${isActive ? "text-[#3044ff]" : "text-black"}`}>
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-[11px] font-medium text-[#46506a]">{item.detail}</span>
              </span>
              <ChevronRight size={15} strokeWidth={2.35} className="shrink-0 text-black" />
            </button>
          );
        })}
      </div>
      <div className="mt-3 border-t border-[#edf0f6] pt-3 lg:hidden">
        <LogoutButton />
      </div>
    </aside>
  );
}

const timeZoneOptions = [
  "(GMT-8) Pacific Time",
  "(GMT-6) Central Time",
  "(GMT-5) Eastern Time",
  "(GMT+0) Greenwich Mean Time",
  "(GMT+1) Central European Time",
  "(GMT+5) Pakistan Time",
];

const languageOptions = ["English", "Spanish", "French", "German", "Urdu", "Arabic"];
const currencyOptions = ["USD ($)", "EUR (€)", "GBP (£)", "PKR (₨)", "AED (د.إ)"];

function readProfileImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file."));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Choose an image smaller than 8MB."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const size = 192;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not process image."));
        return;
      }

      canvas.width = size;
      canvas.height = size;

      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;

      context.clearRect(0, 0, size, size);
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image."));
    };

    image.src = objectUrl;
  });
}

function SettingsAccountCard({
  profile,
  onProfileChange,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AccountProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = [
    ["Time zone", profile.timeZone],
    ["Language", profile.language],
    ["Currency", profile.currency],
  ];

  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function openEditor() {
    setDraft(profile);
    setIsEditing(true);
  }

  function updateDraft(key: keyof AccountProfile, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleProfileImageUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    setSaveError("");
    setImageUploadMessage("Preparing image...");

    try {
      const avatarDataUrl = await readProfileImage(file);

      updateDraft("avatarUrl", avatarDataUrl);
      setImageUploadMessage("Image ready. Save profile to apply it.");
    } catch (error) {
      setImageUploadMessage("");
      setSaveError(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function saveProfile() {
    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const updatedProfile = await onProfileChange({
        ...draft,
        name: draft.name.trim() || defaultAccountProfile.name,
        email: draft.email.trim() || defaultAccountProfile.email,
        role: draft.role.trim() || defaultAccountProfile.role,
        avatarUrl: draft.avatarUrl.trim(),
        accountId: profile.accountId,
      });

      setDraft(updatedProfile);
      setSaveMessage("Profile updated");
      setIsEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[15px] font-extrabold text-black">Profile</h2>
          <span className="rounded-[7px] bg-[#f0edff] px-2 py-1 text-[10px] font-extrabold text-[#6d3cff]">
            {draft.role || "Creator"}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {draft.avatarUrl ? (
            <span
              aria-label={draft.name || "Profile image"}
              role="img"
              className="h-[76px] w-[76px] shrink-0 rounded-full bg-cover bg-center shadow-[0_16px_34px_rgba(20,28,53,0.08)]"
              style={{ backgroundImage: `url(${draft.avatarUrl})` }}
            />
          ) : (
            <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[13px] font-extrabold text-white shadow-[0_16px_34px_rgba(124,58,237,0.16)]">
              {initials || "TF"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold text-[#46506a]">Profile image</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => void handleProfileImageUpload(event.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
              >
                <UploadCloud size={15} strokeWidth={2.35} />
                Upload image
              </button>
              {draft.avatarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    updateDraft("avatarUrl", "");
                    setImageUploadMessage("Image removed. Save profile to apply it.");
                  }}
                  className="flex h-10 items-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-4 text-[12px] font-extrabold text-[#df405b]"
                >
                  <X size={15} strokeWidth={2.35} />
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] font-medium text-[#697083]">PNG, JPG, WebP, or GIF. The image is cropped square automatically.</p>
            {imageUploadMessage && <p className="mt-2 text-[11px] font-semibold text-[#0a9b3f]">{imageUploadMessage}</p>}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Display name</span>
            <input
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => updateDraft("email", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Role</span>
            <input
              value={draft.role}
              onChange={(event) => updateDraft("role", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Time zone</span>
            <select
              value={draft.timeZone}
              onChange={(event) => updateDraft("timeZone", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            >
              {timeZoneOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Language</span>
            <select
              value={draft.language}
              onChange={(event) => updateDraft("language", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            >
              {languageOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Currency</span>
            <select
              value={draft.currency}
              onChange={(event) => updateDraft("currency", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            >
              {currencyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-[9px] bg-[#f6f7fb] px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase text-[#697083]">Account ID</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="truncate text-[12px] font-semibold text-[#253049]">{profile.accountId}</span>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(profile.accountId)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[#46506a] hover:bg-white hover:text-[#3044ff]"
              aria-label="Copy account ID"
            >
              <Copy size={14} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={isSaving}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={15} strokeWidth={2.3} className="animate-spin" /> : <Check size={15} strokeWidth={2.6} />}
            {isSaving ? "Saving" : "Save profile"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(profile);
              setIsEditing(false);
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
          >
            <X size={15} strokeWidth={2.4} />
            Cancel
          </button>
        </div>
        {saveError && <p className="mt-3 rounded-[8px] bg-[#fff0f3] px-3 py-2 text-[11px] font-semibold text-[#df405b]">{saveError}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Account Information</h2>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        {profile.avatarUrl ? (
          <span
            aria-label={profile.name}
            role="img"
            className="h-[58px] w-[58px] shrink-0 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.avatarUrl})` }}
          />
        ) : (
          <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[12px] font-extrabold text-white">
            {initials || "TF"}
          </span>
        )}
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-extrabold text-black">{profile.name}</h3>
            <span className="rounded-[7px] bg-[#f0edff] px-2 py-1 text-[10px] font-extrabold text-[#6d3cff]">{profile.role}</span>
          </div>
          <p className="mt-1 text-[12px] font-medium text-[#46506a]">{profile.email}</p>
          <button
            type="button"
            onClick={openEditor}
            className="mt-3 flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black"
          >
            <PencilLine size={14} strokeWidth={2.3} />
            Edit profile
          </button>
          {saveMessage && <p className="mt-2 text-[11px] font-semibold text-[#0a9b3f]">{saveMessage}</p>}
        </div>
      </div>

      <div className="mt-6 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-[46px] items-center justify-between gap-4 text-[12px]">
            <span className="font-medium text-black">{label}</span>
            <button type="button" onClick={openEditor} className="flex min-w-0 items-center gap-2 text-right font-medium text-black">
              <span className="truncate">{value}</span>
              <ChevronDown size={13} strokeWidth={2.35} />
            </button>
          </div>
        ))}
        <div className="flex min-h-[46px] items-center justify-between gap-4 text-[12px]">
          <span className="font-medium text-black">Account ID</span>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(profile.accountId)}
            className="flex min-w-0 items-center gap-2 text-right font-medium text-[#253049]"
          >
            <span className="truncate">{profile.accountId}</span>
            <Copy size={14} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </section>
  );
}

function InstagramLogoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function formatInstagramDisplayName(account: ConnectedInstagramAccount | null) {
  return account?.name || account?.username || "Instagram account";
}

function formatInstagramHandle(account: ConnectedInstagramAccount | null) {
  return account?.username ? `@${account.username}` : account?.id ? `ID ${account.id}` : "";
}

function formatConnectionDate(value?: string) {
  if (!value) {
    return "Connected";
  }

  return `Connected on ${new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatInstagramFullDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function formatInstagramMessagePreview(message?: InstagramSettingsMessage) {
  if (!message) return "No messages";
  if (message.text) return message.text;

  const attachment = message.attachments?.[0];
  if (attachment?.type === "image") return "Photo";
  if (attachment?.type === "video") return "Video";
  if (attachment) return attachment.name || "Attachment";

  return "Message";
}

function getInstagramConversationName(conversation: InstagramSettingsConversation) {
  return conversation.participant.username || conversation.participant.name || `User ${conversation.participant.id.slice(-6)}`;
}

function getInstagramProfileUrl(username?: string) {
  return username ? `https://www.instagram.com/${username}/` : "";
}

function InstagramConnectionCard({ onManage }: { onManage?: () => void }) {
  const [isConnected, setIsConnected] = useState(true);
  const [account, setAccount] = useState<ConnectedInstagramAccount | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnectingNew, setIsConnectingNew] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  const permissions = [
    ["Read messages & comments", "Monitor DMs, comments, and mentions"],
    ["Manage messages", "Send replies and interact on your behalf"],
    ["Access insights", "View audience and engagement data"],
  ];

  useEffect(() => {
    let isActive = true;

    async function loadInstagramStatus() {
      try {
        const response = await fetch("/api/auth/instagram/status", {
          headers: { Accept: "application/json" },
        });
        const data: { connected?: boolean; account?: ConnectedInstagramAccount | null; error?: string } = await response.json();

        if (!isActive) {
          return;
        }

        if (response.ok) {
          setIsConnected(Boolean(data.connected));
          setAccount(data.account ?? null);
        }
      } catch {
        // Keep the current optimistic state when status cannot be loaded.
      }
    }

    loadInstagramStatus();

    return () => {
      isActive = false;
    };
  }, []);

  async function disconnectInstagram() {
    setIsDisconnecting(true);
    setConnectionError("");

    try {
      const response = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data: { error?: string } = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not disconnect Instagram");
      }

      setIsConnected(false);
      setAccount(null);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Could not disconnect Instagram");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function connectNewInstagram() {
    setIsConnectingNew(true);
    setConnectionError("");

    window.location.href = "/api/auth/instagram?next=/settings";
  }

  if (!isConnected) {
    return (
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <h2 className="text-[15px] font-extrabold text-black">Instagram Connection</h2>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-[10px] border border-dashed border-[#e0d9ff] bg-[#faf9ff] py-8 px-4 text-center">
          <div className="relative flex h-[56px] w-[56px] items-center justify-center rounded-[16px] bg-gradient-to-tr from-[#ffbd00] via-[#ff2d85] to-[#6d3cff] shadow-[0_14px_26px_rgba(255,61,129,0.22)]">
            <div className="h-[33px] w-[33px] rounded-[9px] border-[3px] border-white" />
            <div className="absolute h-[13px] w-[13px] rounded-full border-[3px] border-white" />
            <div className="absolute right-[14px] top-[14px] h-[5px] w-[5px] rounded-full bg-white" />
          </div>
          <div>
            <p className="text-[14px] font-extrabold text-black">Connect your Instagram</p>
            <p className="mt-2 text-[12px] font-medium leading-[1.5] text-[#46506a]">
              Link a new Instagram Business account to start automating DMs, comments, and monetizing your audience.
            </p>
          </div>
          <a
            href="/api/auth/instagram?next=/settings"
            id="connect-instagram-btn"
            className="flex h-11 w-full max-w-[260px] items-center justify-center gap-2.5 rounded-[9px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] text-[13px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)] transition hover:opacity-90"
          >
            <InstagramLogoIcon />
            Connect new account
          </a>
          {connectionError && <p className="text-[11px] font-semibold text-[#df405b]">{connectionError}</p>}
        </div>

        <div className="mt-5 border-t border-[#edf0f6] pt-4">
          <h3 className="text-[12px] font-extrabold text-black">Permissions that will be granted</h3>
          <div className="mt-3 space-y-3">
            {permissions.map(([title, detail]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#3044ff]">
                  <Check size={13} strokeWidth={2.8} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-[#253049]">{title}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#46506a]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Instagram Connection</h2>

      <div className="mt-8 grid grid-cols-[52px_minmax(0,1fr)] items-center gap-5 sm:grid-cols-[52px_minmax(0,1fr)_110px]">
        <InstagramLogoTile />
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-extrabold text-black">{formatInstagramDisplayName(account)}</h3>
          {formatInstagramHandle(account) && (
            <p className="mt-1 truncate text-[11px] font-semibold text-[#46506a]">{formatInstagramHandle(account)}</p>
          )}
          <span className="mt-3 inline-flex h-6 items-center gap-1.5 rounded-[8px] bg-[#e7f8ed] px-2.5 text-[10px] font-extrabold text-[#0a9b3f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0a9b3f]" />
            Connected
          </span>
          <p className="mt-3 text-[11px] font-medium text-[#46506a]">{formatConnectionDate(account?.connectedAt)}</p>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="col-span-2 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black sm:col-span-1 sm:w-[110px]"
        >
          Manage
          <ExternalLink size={13} strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-6 border-t border-[#edf0f6] pt-5">
        <h3 className="text-[12px] font-extrabold text-black">Permissions</h3>
        <div className="mt-4 space-y-4">
          {permissions.map(([title, detail]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#3044ff]">
                <Check size={13} strokeWidth={2.8} />
              </span>
              <div>
                <p className="text-[12px] font-extrabold text-[#253049]">{title}</p>
                <p className="mt-1 text-[11px] font-medium text-[#46506a]">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={connectNewInstagram}
          disabled={isDisconnecting || isConnectingNew}
          id="connect-instagram-btn"
          className="flex h-10 items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <InstagramLogoIcon />
          {isConnectingNew ? "Opening Instagram" : "Connect new account"}
        </button>
        <button
          type="button"
          onClick={disconnectInstagram}
          disabled={isDisconnecting || isConnectingNew}
          className="flex h-10 items-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-4 text-[12px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f3] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} strokeWidth={2.3} className={isDisconnecting ? "animate-spin" : ""} />
          {isDisconnecting ? "Disconnecting" : "Disconnect"}
        </button>
      </div>
      {connectionError && <p className="mt-3 text-[11px] font-semibold text-[#df405b]">{connectionError}</p>}
    </section>
  );
}

function InstagramProfileAvatar({ src, name }: { src?: string; name: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!src || imageFailed) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[11px] font-extrabold text-white">
        {initials || "IG"}
      </span>
    );
  }

  return (
    // Instagram profile images are external CDN URLs returned by the Graph API.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setImageFailed(true)}
      className="h-11 w-11 shrink-0 rounded-full object-cover"
    />
  );
}

function SettingsInstagramMetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold text-[#46506a]">{label}</p>
          <p className="mt-2 text-[24px] font-extrabold leading-none text-black">{value}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#3044ff]">
          <Icon size={18} strokeWidth={2.35} />
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium leading-[1.35] text-[#46506a]">{detail}</p>
    </section>
  );
}

function SettingsInstagramSection() {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<ConnectedInstagramAccount | null>(null);
  const [conversations, setConversations] = useState<InstagramSettingsConversation[]>([]);
  const [igUserId, setIgUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnectingNew, setIsConnectingNew] = useState(false);
  const [error, setError] = useState("");

  const permissions = [
    ["Basic profile", "Read connected Instagram account identity and username."],
    ["Manage messages", "Receive DMs and send replies from TractionFlo."],
    ["Manage comments", "Read and respond to comments and mentions."],
    ["Content publishing", "Prepare publishing workflows for Instagram content."],
    ["Insights", "Read engagement and audience performance data."],
  ];

  const loadInstagramData = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const [statusResponse, conversationsResponse] = await Promise.all([
        fetch("/api/auth/instagram/status", { headers: { Accept: "application/json" }, cache: "no-store" }),
        fetch("/api/instagram/conversations", { headers: { Accept: "application/json" }, cache: "no-store" }),
      ]);
      const statusData: { connected?: boolean; account?: ConnectedInstagramAccount | null; error?: string } =
        await statusResponse.json();
      const conversationsData: InstagramConversationsResponse = await conversationsResponse.json();
      const nextAccount = statusData.account ?? conversationsData.account ?? null;
      const nextConversations = conversationsData.conversations || [];

      if (!statusResponse.ok || statusData.error) {
        throw new Error(statusData.error || "Could not read Instagram status");
      }

      setIsConnected(Boolean(statusData.connected || nextAccount || nextConversations.length > 0));
      setAccount(nextAccount);
      setConversations(nextConversations);
      setIgUserId(conversationsData.ig_user_id || nextAccount?.id || "");

      if (conversationsData.error && conversationsData.error !== "No Instagram account connected") {
        setError(conversationsData.error);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Instagram data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadInstagramData(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadInstagramData]);

  async function disconnectInstagram() {
    setIsDisconnecting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data: { error?: string } = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not disconnect Instagram");
      }

      setIsConnected(false);
      setAccount(null);
      setConversations([]);
      setIgUserId("");
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Could not disconnect Instagram");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function connectNewInstagram() {
    setIsConnectingNew(true);
    setError("");

    window.location.href = "/api/auth/instagram?next=/settings";
  }

  const nonNoteMessages = conversations.flatMap((conversation) =>
    conversation.messages.filter((message) => message.from !== "note")
  );
  const inboundMessages = nonNoteMessages.filter((message) => message.from === "user");
  const outboundMessages = nonNoteMessages.filter((message) => message.from === "me");
  const mediaMessages = nonNoteMessages.filter((message) => (message.attachments?.length || 0) > 0);
  const latestMessage = [...nonNoteMessages].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )[0];
  const latestConversations = [...conversations]
    .sort((a, b) => new Date(b.updated_time || 0).getTime() - new Date(a.updated_time || 0).getTime())
    .slice(0, 5);
  const profileUrl = getInstagramProfileUrl(account?.username);
  const displayName = formatInstagramDisplayName(account);
  const oauthCallbackPath = "/api/auth/instagram/callback";
  const webhookCallbackPath = "/api/webhooks/meta";

  function copyValue(value: string) {
    void navigator.clipboard?.writeText(value);
  }

  if (!isConnected && !loading) {
    return (
      <div className="grid gap-5">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-6 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <InstagramLogoTile />
              <div>
                <h2 className="text-[18px] font-extrabold text-black">Instagram is not connected</h2>
                <p className="mt-1 text-[12px] font-medium text-[#46506a]">
                  Connect an Instagram Business account to load messages, profile data, and automation settings.
                </p>
              </div>
            </div>
            <a
              href="/api/auth/instagram?next=/settings"
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)]"
            >
              <InstagramLogoIcon />
              Connect Instagram
            </a>
          </div>
          {error && <p className="mt-4 rounded-[9px] bg-[#fff0f3] px-3 py-2 text-[11px] font-semibold text-[#df405b]">{error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <InstagramLogoTile />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[18px] font-extrabold text-black">
                  {loading ? "Loading Instagram..." : displayName}
                </h2>
                <span className="inline-flex h-6 items-center gap-1.5 rounded-[8px] bg-[#e7f8ed] px-2.5 text-[10px] font-extrabold text-[#0a9b3f]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0a9b3f]" />
                  Connected
                </span>
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#46506a]">
                {formatInstagramHandle(account) || (igUserId ? `ID ${igUserId}` : "Instagram Business account")}
              </p>
              <p className="mt-2 text-[11px] font-medium text-[#46506a]">{formatConnectionDate(account?.connectedAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadInstagramData(false)}
              disabled={loading || refreshing}
              className="flex h-10 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} strokeWidth={2.3} className={refreshing ? "animate-spin" : ""} />
              Refresh data
            </button>
            <a
              href="/conversations"
              className="flex h-10 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black transition hover:bg-[#f8f9fc]"
            >
              <MessageSquare size={14} strokeWidth={2.3} />
              Open inbox
            </a>
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1118] px-4 text-[12px] font-extrabold text-white transition hover:bg-black"
              >
                View profile
                <ExternalLink size={13} strokeWidth={2.4} />
              </a>
            )}
          </div>
        </div>

        {error && <p className="mt-4 rounded-[9px] bg-[#fff0f3] px-3 py-2 text-[11px] font-semibold text-[#df405b]">{error}</p>}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SettingsInstagramMetricCard
          label="Conversations"
          value={loading ? "..." : String(conversations.length)}
          detail="Instagram DM threads available in the inbox."
          icon={MessageSquare}
        />
        <SettingsInstagramMetricCard
          label="Messages"
          value={loading ? "..." : String(nonNoteMessages.length)}
          detail={`${inboundMessages.length} received and ${outboundMessages.length} sent.`}
          icon={Send}
        />
        <SettingsInstagramMetricCard
          label="Media"
          value={loading ? "..." : String(mediaMessages.length)}
          detail="Photos, videos, and attachments found in recent DMs."
          icon={UploadCloud}
        />
        <SettingsInstagramMetricCard
          label="Last activity"
          value={loading ? "..." : formatInstagramRelativeTime(latestMessage?.time)}
          detail={formatInstagramMessagePreview(latestMessage)}
          icon={Clock}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <h2 className="text-[15px] font-extrabold text-black">Connected Account</h2>
          <div className="mt-5 flex items-center gap-4">
            <InstagramLogoTile />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-extrabold text-black">{displayName}</p>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#46506a]">{formatInstagramHandle(account) || "No username returned"}</p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
            {[
              ["Instagram name", account?.name || "Not returned"],
              ["Username", account?.username ? `@${account.username}` : "Not returned"],
              ["Graph user ID", igUserId || account?.id || "Not returned"],
              ["Connected date", formatInstagramFullDate(account?.connectedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex min-h-[43px] items-center justify-between gap-4 text-[12px]">
                <span className="font-medium text-black">{label}</span>
                <span className="min-w-0 truncate text-right font-semibold text-[#253049]">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <h2 className="text-[15px] font-extrabold text-black">API Setup</h2>
          <div className="mt-5 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
            {[
              ["OAuth callback", oauthCallbackPath],
              ["Webhook callback", webhookCallbackPath],
              ["Conversations API", "/api/instagram/conversations"],
              ["Send message API", "/api/instagram/send"],
            ].map(([label, value]) => (
              <div key={label} className="grid min-h-[48px] grid-cols-[118px_minmax(0,1fr)_28px] items-center gap-3 text-[12px]">
                <span className="font-medium text-black">{label}</span>
                <code className="truncate rounded-[7px] bg-[#f6f7fb] px-2 py-1 text-[11px] font-semibold text-[#253049]">{value}</code>
                <button
                  type="button"
                  aria-label={`Copy ${label}`}
                  onClick={() => copyValue(value)}
                  className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#46506a] hover:bg-[#f0edff] hover:text-[#3044ff]"
                >
                  <Copy size={14} strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[15px] font-extrabold text-black">Recent Instagram Conversations</h2>
            <span className="rounded-[8px] bg-[#f0edff] px-2.5 py-1 text-[10px] font-extrabold text-[#3044ff]">
              {conversations.length}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {latestConversations.length > 0 ? (
              latestConversations.map((conversation) => {
                const participantName = getInstagramConversationName(conversation);
                const lastMessage = conversation.messages[0];

                return (
                  <a
                    key={conversation.id}
                    href="/conversations"
                    className="grid min-h-[64px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-[#edf0f6] bg-white px-3 py-2 transition hover:border-[#dfe4f1] hover:bg-[#fbfbff]"
                  >
                    <InstagramProfileAvatar src={conversation.participant.profile_pic} name={participantName} />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-extrabold text-black">{participantName}</span>
                      <span className="mt-1 block truncate text-[11px] font-medium text-[#46506a]">
                        {formatInstagramMessagePreview(lastMessage)}
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#46506a]">
                      {formatInstagramRelativeTime(lastMessage?.time || conversation.updated_time)}
                    </span>
                  </a>
                );
              })
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#dde3ee] bg-[#fafbff] px-4 py-8 text-center">
                <p className="text-[13px] font-extrabold text-black">No Instagram DMs yet</p>
                <p className="mt-2 text-[12px] font-medium text-[#46506a]">
                  Messages will appear here once Instagram sends them to the connected account.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <h2 className="text-[15px] font-extrabold text-black">Permissions & Actions</h2>
          <div className="mt-5 space-y-4">
            {permissions.map(([title, detail]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#3044ff]">
                  <Check size={13} strokeWidth={2.8} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-[#253049]">{title}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#46506a]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button
              type="button"
              onClick={connectNewInstagram}
              disabled={isDisconnecting || isConnectingNew}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <InstagramLogoIcon />
              {isConnectingNew ? "Opening" : "Connect new"}
            </button>
            <button
              type="button"
              onClick={disconnectInstagram}
              disabled={isDisconnecting || isConnectingNew}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-4 text-[12px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} strokeWidth={2.3} className={isDisconnecting ? "animate-spin" : ""} />
              {isDisconnecting ? "Disconnecting" : "Disconnect"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsAssistantCard({
  settings,
  onChange,
  onConfigure,
}: {
  settings: AiSettings;
  onChange: (settings: AiSettings) => void;
  onConfigure?: () => void;
}) {
  function updateAiSettings(partial: Partial<AiSettings>) {
    onChange({
      ...settings,
      ...partial,
    });
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center gap-2">
        <Sparkles size={17} className="text-[#3044ff]" strokeWidth={2.35} />
        <h2 className="text-[15px] font-extrabold text-black">AI Assistant</h2>
      </div>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] font-extrabold leading-tight text-black">Personality</span>
          <SettingsSelect
            ariaLabel="AI personality"
            value={settings.personality}
            options={["Professional", "Friendly", "Playful", "Direct"]}
            onChange={(value) => updateAiSettings({ personality: value })}
            className="w-full"
          />
        </div>
        <p className="text-[11px] font-medium text-[#46506a]">Your AI matches your brand voice and tone.</p>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] font-extrabold leading-tight text-black">Response style</span>
          <SettingsSelect
            ariaLabel="AI response style"
            value={settings.responseStyle}
            options={["Helpful & Friendly", "Concise", "Sales focused", "Support first"]}
            onChange={(value) => updateAiSettings({ responseStyle: value })}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] font-extrabold leading-tight text-black">Knowledge usage</span>
          <SettingsSelect
            ariaLabel="AI knowledge usage"
            value={settings.knowledgeUsage}
            options={["Always", "Only when confident", "Ask first"]}
            onChange={(value) => updateAiSettings({ knowledgeUsage: value })}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <span className="text-[12px] font-extrabold text-black">Proactive outreach</span>
          <SettingsToggle
            ariaLabel="Toggle proactive outreach"
            checked={settings.proactiveOutreach}
            onChange={(checked) => updateAiSettings({ proactiveOutreach: checked })}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <span className="text-[12px] font-extrabold text-black">Auto tagging</span>
          <SettingsToggle ariaLabel="Toggle AI auto tagging" checked={settings.autoTagging} onChange={(checked) => updateAiSettings({ autoTagging: checked })} />
        </div>
      </div>

      {onConfigure && (
        <button
          type="button"
          onClick={onConfigure}
          className="mt-5 flex h-10 w-full items-center justify-between rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
        >
          Configure AI Assistant
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      )}
    </section>
  );
}

function getAiBehaviorPreview(settings: AiSettings) {
  if (settings.responseStyle === "Concise") {
    return "Got it. I can help with that. What result are you trying to get first?";
  }

  if (settings.responseStyle === "Sales focused") {
    return "Thanks for reaching out. If growth is the goal, I can point you to the best package and next step.";
  }

  if (settings.responseStyle === "Support first") {
    return "Thanks for sharing that. I will help you sort it out and make sure you get the right next step.";
  }

  if (settings.personality === "Playful") {
    return "Hey, happy to help. Tell me what you are working on and I will point you in the right direction.";
  }

  if (settings.personality === "Direct") {
    return "I can help. Send your goal, budget, and timeline so I can recommend the right next step.";
  }

  return "Hi, thanks for reaching out. I can help with that. What are you hoping to accomplish first?";
}

function getAiBehaviorSummary(settings: AiSettings) {
  return `Personality is ${settings.personality.toLowerCase()}, responses are ${settings.responseStyle.toLowerCase()}, and knowledge usage is set to ${settings.knowledgeUsage.toLowerCase()}.`;
}

type AiIntegrationApiResponse = {
  integration?: AiIntegrationSettings;
  reply?: string;
  error?: string;
};

type AiWorkflowTestResponse = Partial<AiWorkflowRunResult> & {
  error?: string;
};

const aiWorkflowVisuals: Record<AiWorkflowSetting["id"], { icon: LucideIcon; tone: string }> = {
  startConversation: { icon: Send, tone: "bg-[#eef4ff] text-[#3044ff]" },
  answerQuestions: { icon: MessageSquare, tone: "bg-[#f0edff] text-[#6d3cff]" },
  qualifyLeads: { icon: Target, tone: "bg-[#e7f8ed] text-[#0a9b3f]" },
  moveToCta: { icon: ArrowRight, tone: "bg-[#fff3e6] text-[#ff850d]" },
};

function SettingsAiIntegrationSection({
  integration,
  assistantSettings,
  onChange,
  onAssistantChange,
}: {
  integration: AiIntegrationSettings;
  assistantSettings: AiSettings;
  onChange: (integration: AiIntegrationSettings) => void;
  onAssistantChange: (settings: AiSettings) => void;
}) {
  const [draft, setDraft] = useState<AiIntegrationSettings>({
    ...integration,
    behavior: integration.behavior || assistantSettings,
  });
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [testReply, setTestReply] = useState("");
  const [workflowTest, setWorkflowTest] = useState<AiWorkflowTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingWorkflows, setIsTestingWorkflows] = useState(false);
  const onChangeRef = useRef(onChange);
  const onAssistantChangeRef = useRef(onAssistantChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onAssistantChangeRef.current = onAssistantChange;
  }, [onAssistantChange]);

  useEffect(() => {
    let isMounted = true;

    async function loadIntegration() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai/integration", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = (await response.json()) as AiIntegrationApiResponse;

        if (!response.ok || data.error || !data.integration) {
          throw new Error(data.error || "Could not load AI integration");
        }

        if (isMounted) {
          setDraft(data.integration);
          onChangeRef.current(data.integration);
          onAssistantChangeRef.current(data.integration.behavior);
          setStatus(data.integration.apiKeySaved ? "OpenAI key is connected." : "Add an OpenAI key to turn on AI replies.");
        }
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : "Could not load AI integration");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const timeout = window.setTimeout(() => {
      void loadIntegration();
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, []);

  function updateDraft(partial: Partial<AiIntegrationSettings>) {
    setDraft((current) => ({
      ...current,
      ...partial,
    }));
  }

  function updateBehavior(behavior: AiSettings) {
    updateDraft({ behavior });
    onAssistantChange(behavior);
    setStatus("AI tone changed. Save integration to apply it to live OpenAI replies.");
  }

  function updateWorkflow(id: AiWorkflowSetting["id"], enabled: boolean) {
    updateDraft({
      workflows: draft.workflows.map((workflow) => (workflow.id === id ? { ...workflow, enabled } : workflow)),
    });
    setStatus("Workflow changed. Save integration to apply it to AI replies.");
  }

  async function saveIntegration(options?: { clearApiKey?: boolean }) {
    setIsSaving(true);
    setStatus("");
    setTestReply("");
    setWorkflowTest(null);

    try {
      const response = await fetch("/api/ai/integration", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: options?.clearApiKey ? undefined : apiKey.trim() || undefined,
          clearApiKey: options?.clearApiKey,
          model: draft.model,
          workflows: draft.workflows,
          behavior: draft.behavior,
          systemPrompt: draft.systemPrompt,
          leadQualificationRules: draft.leadQualificationRules,
          ctaMessage: draft.ctaMessage,
          autoSend: draft.autoSend,
        }),
      });
      const data = (await response.json()) as AiIntegrationApiResponse;

      if (!response.ok || data.error || !data.integration) {
        throw new Error(data.error || "Could not save AI integration");
      }

      setDraft(data.integration);
      onChange(data.integration);
      onAssistantChange(data.integration.behavior);
      setApiKey("");
      setStatus(options?.clearApiKey ? "OpenAI key removed." : "AI integration saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save AI integration");
    } finally {
      setIsSaving(false);
    }
  }

  async function testIntegration() {
    setIsTesting(true);
    setStatus("");
    setTestReply("");
    setWorkflowTest(null);

    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json()) as AiIntegrationApiResponse;

      if (!response.ok || data.error || !data.reply) {
        throw new Error(data.error || "Could not test OpenAI");
      }

      setTestReply(data.reply);
      setStatus("OpenAI replied successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not test OpenAI");
    } finally {
      setIsTesting(false);
    }
  }

  async function testAllWorkflows() {
    setIsTestingWorkflows(true);
    setStatus("");
    setTestReply("");
    setWorkflowTest(null);

    try {
      const response = await fetch("/api/ai/workflow", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountName: "TractionFlo",
          participant: {
            name: "Sample creator lead",
            username: "samplelead",
          },
          messages: [
            {
              from: "user",
              text: "Hi, I want to know your coaching price and whether you can help me grow my Instagram this month.",
            },
            {
              from: "me",
              text: "Happy to help. What are you trying to improve first?",
            },
            {
              from: "user",
              text: "I need more leads quickly. I can start this week if the package is a good fit.",
            },
          ],
        }),
      });
      const data = (await response.json()) as AiWorkflowTestResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not test AI workflows");
      }

      setWorkflowTest(data);
      setStatus("All enabled AI jobs returned live OpenAI output.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not test AI workflows");
    } finally {
      setIsTestingWorkflows(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader
        section="ai-integration"
        action={
          <span
            className={`rounded-[8px] px-3 py-1.5 text-[11px] font-extrabold ${
              draft.apiKeySaved ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#fff3e6] text-[#ff850d]"
            }`}
          >
            {isLoading ? "Checking" : draft.apiKeySaved ? "Connected" : "Key needed"}
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center gap-2">
            <BrainCircuit size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">OpenAI Connection</h2>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">API key</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                placeholder={draft.apiKeySaved ? draft.apiKeyPreview : "sk-..."}
                className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
              {draft.apiKeySaved && (
                <p className="mt-2 text-[11px] font-medium text-[#46506a]">Saved key: {draft.apiKeyPreview}</p>
              )}
            </label>

            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">Model</span>
              <SettingsSelect
                ariaLabel="OpenAI model"
                value={draft.model}
                options={openAiModelOptions}
                onChange={(model) => updateDraft({ model })}
                className="mt-2 w-full"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void saveIntegration()}
                disabled={isSaving}
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_30px_rgba(48,68,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.4} />}
                Save integration
              </button>
              <button
                type="button"
                onClick={testIntegration}
                disabled={isTesting || isSaving || !draft.apiKeySaved}
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.4} />}
                Test OpenAI
              </button>
            </div>

            {draft.apiKeySaved && (
              <button
                type="button"
                onClick={() => void saveIntegration({ clearApiKey: true })}
                disabled={isSaving}
                className="h-9 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-3 text-[11px] font-extrabold text-[#df405b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove saved key
              </button>
            )}

            {(status || testReply) && (
              <div className="rounded-[10px] bg-[#f6f7fb] p-3 text-[11px] font-semibold leading-relaxed text-[#46506a]">
                {status && <p>{status}</p>}
                {testReply && <p className="mt-2 rounded-[8px] bg-white p-2 text-[#253049]">{testReply}</p>}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">Instagram AI Jobs</h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {draft.workflows.map((workflow) => {
              const visual = aiWorkflowVisuals[workflow.id];
              const Icon = visual.icon;

              return (
                <div key={workflow.id} className="rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${visual.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <SettingsToggle
                      ariaLabel={`Toggle ${workflow.label}`}
                      checked={workflow.enabled}
                      onChange={(checked) => updateWorkflow(workflow.id, checked)}
                    />
                  </div>
                  <h3 className="mt-4 text-[13px] font-extrabold text-black">{workflow.label}</h3>
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#46506a]">{workflow.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[13px] font-extrabold text-black">Workflow test</h3>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#46506a]">
                  Runs opener, answer, lead qualification, and CTA against a sample Instagram thread.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void testAllWorkflows()}
                disabled={isTestingWorkflows || !draft.apiKeySaved}
                className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#0d1118] px-3 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isTestingWorkflows ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={2.35} />}
                Test all jobs
              </button>
            </div>

            {workflowTest && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">Opener</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">{workflowTest.starter || "Off"}</p>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">Answer</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">{workflowTest.reply || "Off"}</p>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">Lead</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">
                    {workflowTest.lead ? `${workflowTest.lead.score}/100 ${workflowTest.lead.stage}: ${workflowTest.lead.summary}` : "Off"}
                  </p>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">CTA</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">{workflowTest.cta || "Off"}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <SettingsAssistantCard settings={draft.behavior} onChange={updateBehavior} />
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center gap-2">
            <Bot size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">AI behavior preview</h2>
          </div>
          <div className="mt-5 rounded-[12px] bg-[#f6f7fb] p-4">
            <p className="text-[12px] font-semibold leading-relaxed text-[#253049]">
              {getAiBehaviorSummary(draft.behavior)}
            </p>
            <p className="mt-3 text-[12px] font-medium leading-relaxed text-[#46506a]">
              Proactive outreach is {draft.behavior.proactiveOutreach ? "on" : "off"} and auto tagging is {draft.behavior.autoTagging ? "on" : "off"}.
            </p>
          </div>
          <div className="mt-4 rounded-[12px] border border-[#edf0f6] bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase text-[#596175]">Sample Instagram reply</p>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#253049]">
              {getAiBehaviorPreview(draft.behavior)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveIntegration()}
            disabled={isSaving}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_30px_rgba(48,68,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.4} />}
            Save AI tone
          </button>
        </section>
      </div>

      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <Bot size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">AI Instructions</h2>
          </div>

          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">System prompt</span>
            <textarea
              value={draft.systemPrompt}
              onChange={(event) => updateDraft({ systemPrompt: event.target.value })}
              className="mt-2 min-h-[122px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Lead qualification rules</span>
            <textarea
              value={draft.leadQualificationRules}
              onChange={(event) => updateDraft({ leadQualificationRules: event.target.value })}
              className="mt-2 min-h-[96px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">CTA message</span>
            <textarea
              value={draft.ctaMessage}
              onChange={(event) => updateDraft({ ctaMessage: event.target.value })}
              className="mt-2 min-h-[96px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>

          <div className="rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4">
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-[13px] font-extrabold text-black">Auto-send AI replies</span>
                <span className="mt-1 block text-[11px] font-medium leading-relaxed text-[#46506a]">
                  Keep off while testing. When off, AI drafts replies for approval.
                </span>
              </span>
              <SettingsToggle
                ariaLabel="Toggle auto-send AI replies"
                checked={draft.autoSend}
                onChange={(autoSend) => updateDraft({ autoSend })}
              />
            </div>
          </div>

          <div className="rounded-[10px] bg-[#f6f7fb] p-4">
            <h3 className="text-[13px] font-extrabold text-black">Live inbox behavior</h3>
            <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#46506a]">
              The inbox AI Reply button uses this OpenAI connection. Lead qualification and CTA guidance are included in generated replies.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsRulesCard({
  rules,
  onChange,
  onManage,
  onAddRule,
}: {
  rules: EscalationRuleSetting[];
  onChange: (rules: EscalationRuleSetting[]) => void;
  onManage?: () => void;
  onAddRule?: () => void;
}) {
  function updateRule(id: string, partial: Partial<EscalationRuleSetting>) {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...partial } : rule)));
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center gap-2">
        <TriangleAlert size={17} strokeWidth={2.35} />
        <h2 className="text-[15px] font-extrabold text-black">Escalation Rules</h2>
      </div>
      <p className="mt-3 text-[11px] font-medium text-[#46506a]">Your AI knows when to escalate to you.</p>

      <div className="mt-4 space-y-4">
        {rules.map((rule) => {
          const visual = ruleVisuals[rule.id] || { icon: TriangleAlert, tone: "bg-[#eef4ff] text-[#3044ff]" };
          const Icon = visual.icon;
          return (
            <div key={rule.id} className="grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 text-left">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${visual.tone}`}>
                <Icon size={15} strokeWidth={2.35} />
              </span>
              <div className="min-w-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <span className="min-w-0">
                    <span className="block text-[12px] font-extrabold leading-tight text-black">{rule.label}</span>
                    <span className="mt-1 block text-[11px] font-medium text-[#46506a]">{rule.priority} priority</span>
                  </span>
                  <SettingsToggle ariaLabel={`Toggle ${rule.label}`} checked={rule.enabled} onChange={(checked) => updateRule(rule.id, { enabled: checked })} />
                </div>
                <SettingsSelect
                  ariaLabel={`${rule.label} action`}
                  value={rule.action}
                  options={["Always escalate", "High priority", "Escalate for approval", "Escalate immediately", "Monitor only"]}
                  onChange={(value) => updateRule(rule.id, { action: value })}
                  className="mt-2 w-full"
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddRule || onManage}
        className="mt-5 flex h-10 w-full items-center justify-between rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
      >
        {onAddRule ? "Add custom rule" : "Manage rules"}
        {onAddRule ? <Plus size={15} strokeWidth={2.5} /> : <ArrowRight size={15} strokeWidth={2.5} />}
      </button>
    </section>
  );
}

function SettingsNotificationsCard({
  notifications,
  onChange,
  onManage,
}: {
  notifications: NotificationSetting[];
  onChange: (notifications: NotificationSetting[]) => void;
  onManage?: () => void;
}) {
  function updateNotification(id: string, partial: Partial<NotificationSetting>) {
    onChange(notifications.map((notification) => (notification.id === id ? { ...notification, ...partial } : notification)));
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center gap-2">
        <Bell size={17} strokeWidth={2.35} />
        <h2 className="text-[15px] font-extrabold text-black">Notifications</h2>
      </div>
      <p className="mt-3 text-[11px] font-medium text-[#46506a]">Choose how and when you are notified.</p>

      <div className="mt-4 space-y-4">
        {notifications.map((item) => {
          const visual = notificationVisuals[item.id] || { icon: Bell };
          const Icon = visual.icon;
          return (
            <div key={item.id} className="grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 text-left">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#f3f4f8] text-[#31394f]">
                <Icon size={15} strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <span className="min-w-0 text-[12px] font-extrabold leading-tight text-black">{item.label}</span>
                  <SettingsToggle ariaLabel={`Toggle ${item.label}`} checked={item.enabled} onChange={(checked) => updateNotification(item.id, { enabled: checked })} />
                </div>
                <SettingsSelect
                  ariaLabel={`${item.label} delivery`}
                  value={item.value}
                  options={["Off", "Instant", "Every morning", "All important updates", "On"]}
                  onChange={(value) => updateNotification(item.id, { value, enabled: value !== "Off" })}
                  className="mt-2 w-full"
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onManage}
        className="mt-5 flex h-10 w-full items-center justify-between rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
      >
        Manage notifications
        <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </section>
  );
}

function SettingsBillingCard({
  billing,
  onManage,
}: {
  billing: BillingSettings;
  onManage?: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#f0edff] text-[#3044ff]">
          <Crown size={24} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[16px] font-extrabold text-black">{billing.plan}</h2>
            <span className="rounded-[8px] bg-[#e7f8ed] px-2.5 py-1 text-[10px] font-extrabold text-[#0a9b3f]">{billing.status}</span>
          </div>
          <p className="mt-2 text-[12px] font-medium text-[#46506a]">
            {billing.price} &middot; Next billing date: {billing.nextBillingDate}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:w-[354px]">
        <button
          type="button"
          onClick={onManage}
          className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
        >
          <FileText size={14} strokeWidth={2.3} />
          View invoices
        </button>
        <button
          type="button"
          onClick={onManage}
          className="flex h-10 items-center justify-center gap-3 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)]"
        >
          Manage billing
          <ArrowRight size={15} strokeWidth={2.4} />
        </button>
      </div>
    </section>
  );
}

function SettingsSectionHeader({
  section,
  action,
}: {
  section: SettingsSection;
  action?: ReactNode;
}) {
  const item = settingsMenuItems.find((menuItem) => menuItem.id === section);
  const Icon = item?.icon || Settings;

  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#f0edff] text-[#3044ff]">
          <Icon size={22} strokeWidth={2.35} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[18px] font-extrabold text-black">{item?.label || "Settings"}</h2>
          <p className="mt-1 text-[12px] font-medium text-[#46506a]">{item?.detail || "Manage this area."}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function SettingsTeamSection({
  profile,
  team,
  onChange,
}: {
  profile: AccountProfile;
  team: TeamMemberSetting[];
  onChange: (team: TeamMemberSetting[]) => void;
}) {
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Support");
  const [message, setMessage] = useState("");
  const inviteCounterRef = useRef(team.length + 1);
  const owner: TeamMemberSetting = {
    id: "owner",
    name: profile.name,
    email: profile.email,
    role: "Owner",
    status: "Active",
  };
  const members = [owner, ...team.filter((member) => member.id !== "owner")];

  function updateMember(id: string, partial: Partial<TeamMemberSetting>) {
    onChange(members.map((member) => (member.id === id ? { ...member, ...partial } : member)));
  }

  function removeMember(id: string) {
    onChange(members.filter((member) => member.id !== id));
  }

  function inviteMember() {
    const name = inviteName.trim();
    const email = inviteEmail.trim();

    if (!name || !email) {
      setMessage("Add a name and email to invite a teammate.");
      return;
    }

    onChange([
      ...members,
      {
        id: `member-${inviteCounterRef.current}`,
        name,
        email,
        role: inviteRole,
        status: "Invited",
      },
    ]);
    inviteCounterRef.current += 1;
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Support");
    setMessage("Invite ready and saved.");
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader
        section="team"
        action={
          <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
            {members.length} members
          </span>
        }
      />

      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_auto]">
          <input
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Name"
            className="h-10 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
          />
          <input
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="h-10 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
          />
          <SettingsSelect
            ariaLabel="Invite role"
            value={inviteRole}
            options={["Admin", "Support", "Analyst", "Viewer"]}
            onChange={setInviteRole}
          />
          <button
            type="button"
            onClick={inviteMember}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white"
          >
            <Plus size={15} strokeWidth={2.5} />
            Invite
          </button>
        </div>
        {message && <p className="rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{message}</p>}

        <div className="divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
          {members.map((member) => (
            <div key={member.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_140px_92px_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-black">{member.name}</p>
                <p className="mt-1 truncate text-[11px] font-medium text-[#46506a]">{member.email}</p>
              </div>
              <SettingsSelect
                ariaLabel={`${member.name} role`}
                value={member.role}
                options={member.id === "owner" ? ["Owner"] : ["Admin", "Support", "Analyst", "Viewer"]}
                onChange={(value) => updateMember(member.id, { role: value })}
              />
              <span className={`w-max rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${member.status === "Active" ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#fff3e6] text-[#ff850d]"}`}>
                {member.status}
              </span>
              {member.id !== "owner" && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="flex h-8 w-max items-center justify-center rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-3 text-[11px] font-extrabold text-[#df405b]"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function getConversationLabel(conversation: InstagramSettingsConversation) {
  return (
    conversation.participant.username ||
    conversation.participant.name ||
    `Instagram user ${conversation.participant.id.slice(-6)}`
  );
}

function getConversationPreviewForSettings(conversation: InstagramSettingsConversation) {
  const lastMessage = conversation.messages[0];

  if (!lastMessage) {
    return "No messages yet";
  }

  if (lastMessage.text) {
    return lastMessage.text;
  }

  const firstAttachment = lastMessage.attachments?.[0];
  if (firstAttachment?.type === "image") return "Photo";
  if (firstAttachment?.type === "video") return "Video";
  if (firstAttachment) return firstAttachment.name || "Attachment";

  return "Message";
}

function createEmptyAgentDraft(): AgentAccount & { password: string } {
  return {
    id: "",
    name: "",
    email: "",
    password: "",
    status: "Active",
    allowedPages: ["inbox", "escalations", "settings"],
    assignedConversationIds: [],
    humanEscalation: true,
  };
}

const agentAccountsPageSize = 5;
const conversationAssignmentsPageSize = 10;

function SettingsAgentsSection({ mode }: { mode: "agents" | "permissions" }) {
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [conversations, setConversations] = useState<InstagramSettingsConversation[]>([]);
  const [draft, setDraft] = useState<AgentAccount & { password: string }>(createEmptyAgentDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agentPage, setAgentPage] = useState(1);
  const [conversationPage, setConversationPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedAgent = agents.find((agent) => agent.id === draft.id);
  const selectedConversationCount = draft.assignedConversationIds.length;
  const isPermissionsMode = mode === "permissions";
  const totalAgentPages = Math.max(1, Math.ceil(agents.length / agentAccountsPageSize));
  const currentAgentPage = Math.min(agentPage, totalAgentPages);
  const agentPageStartIndex = agents.length === 0 ? 0 : (currentAgentPage - 1) * agentAccountsPageSize;
  const paginatedAgents = agents.slice(agentPageStartIndex, agentPageStartIndex + agentAccountsPageSize);
  const agentPageEndIndex = Math.min(agentPageStartIndex + paginatedAgents.length, agents.length);
  const totalConversationPages = Math.max(1, Math.ceil(conversations.length / conversationAssignmentsPageSize));
  const currentConversationPage = Math.min(conversationPage, totalConversationPages);
  const conversationPageStartIndex =
    conversations.length === 0 ? 0 : (currentConversationPage - 1) * conversationAssignmentsPageSize;
  const paginatedConversations = conversations.slice(
    conversationPageStartIndex,
    conversationPageStartIndex + conversationAssignmentsPageSize
  );
  const conversationPageEndIndex = Math.min(conversationPageStartIndex + paginatedConversations.length, conversations.length);
  const allConversationsSelected =
    conversations.length > 0 && conversations.every((conversation) => draft.assignedConversationIds.includes(conversation.id));

  const loadAgents = useCallback(async () => {
    const response = await fetch("/api/agents", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data: AgentsResponse = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Could not load agents");
    }

    setAgents(data.agents || []);
  }, []);

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/instagram/conversations", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data: InstagramConversationsResponse = await response.json();

    if (!response.ok || (data.error && data.error !== "No Instagram account connected")) {
      throw new Error(data.error || "Could not load conversations");
    }

    setConversations(data.conversations || []);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isPermissionsMode) {
        await Promise.all([loadAgents(), loadConversations()]);
      } else {
        await loadAgents();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load agent settings");
    } finally {
      setIsLoading(false);
    }
  }, [isPermissionsMode, loadAgents, loadConversations]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refreshData(), 0);

    return () => window.clearTimeout(timeout);
  }, [refreshData]);

  useEffect(() => {
    if (mode !== "agents") {
      return;
    }

    const resetDraft = () => {
      setDraft(createEmptyAgentDraft());
      setShowPassword(false);
    };
    const immediateReset = window.setTimeout(resetDraft, 0);
    const autofillReset = window.setTimeout(resetDraft, 250);

    return () => {
      window.clearTimeout(immediateReset);
      window.clearTimeout(autofillReset);
    };
  }, [mode]);

  useEffect(() => {
    if (!isPermissionsMode || draft.id || agents.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDraft({
        ...agents[0],
        password: "",
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [agents, draft.id, isPermissionsMode]);

  function updateDraft<K extends keyof (AgentAccount & { password: string })>(
    key: K,
    value: (AgentAccount & { password: string })[K]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectAgent(agent: AgentAccount) {
    setStatusMessage("");
    setErrorMessage("");
    setShowPassword(false);
    setDraft({
      ...agent,
      password: "",
    });
  }

  function startNewAgent() {
    setStatusMessage("");
    setErrorMessage("");
    setShowPassword(false);
    setDraft(createEmptyAgentDraft());
  }

  function togglePage(pageId: PagePermissionId) {
    updateDraft(
      "allowedPages",
      draft.allowedPages.includes(pageId)
        ? draft.allowedPages.filter((item) => item !== pageId)
        : [...draft.allowedPages, pageId]
    );
  }

  function toggleConversation(conversationId: string) {
    updateDraft(
      "assignedConversationIds",
      draft.assignedConversationIds.includes(conversationId)
        ? draft.assignedConversationIds.filter((item) => item !== conversationId)
        : [...draft.assignedConversationIds, conversationId]
    );
  }

  function selectAllConversations() {
    const allConversationIds = conversations.map((conversation) => conversation.id);
    updateDraft("assignedConversationIds", Array.from(new Set([...draft.assignedConversationIds, ...allConversationIds])));
  }

  async function saveAgent() {
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");
    const isCreatingAgent = !draft.id;

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: draft.id ? "update" : "create",
          id: draft.id || undefined,
          name: draft.name,
          email: draft.email,
          password: draft.password || undefined,
          allowedPages: draft.allowedPages,
          assignedConversationIds: draft.assignedConversationIds,
          humanEscalation: draft.humanEscalation,
        }),
      });
      const data: AgentsResponse = await response.json();

      if (!response.ok || data.error || !data.agent) {
        throw new Error(data.error || "Could not save agent");
      }

      setAgents((current) => {
        const exists = current.some((agent) => agent.id === data.agent?.id);
        return exists
          ? current.map((agent) => (agent.id === data.agent?.id ? data.agent : agent))
          : [...current, data.agent!];
      });
      if (isCreatingAgent) {
        setAgentPage(Math.max(1, Math.ceil((agents.length + 1) / agentAccountsPageSize)));
      }
      setShowPassword(false);
      setDraft(isCreatingAgent ? createEmptyAgentDraft() : { ...data.agent, password: "" });
      setStatusMessage(isPermissionsMode ? "Agent permissions updated." : isCreatingAgent ? "Agent login created. Add another agent below." : "Agent updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save agent");
    } finally {
      setIsSaving(false);
    }
  }

  async function suspendAgent(agent: AgentAccount) {
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "suspend", id: agent.id }),
      });
      const data: AgentsResponse = await response.json();

      if (!response.ok || data.error || !data.agent) {
        throw new Error(data.error || "Could not suspend agent");
      }

      setAgents((current) => current.map((item) => (item.id === data.agent?.id ? data.agent : item)));

      if (draft.id === agent.id) {
        setDraft({ ...data.agent, password: "" });
      }

      setStatusMessage("Agent suspended.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not suspend agent");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader
        section={mode}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
              {agents.length} agents
            </span>
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={isLoading}
              className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:opacity-60"
            >
              <RefreshCw size={13} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {(statusMessage || errorMessage) && (
        <p
          className={`rounded-[8px] px-3 py-2 text-[11px] font-semibold ${
            errorMessage ? "bg-[#fff7f9] text-[#df405b]" : "bg-[#f6f7fb] text-[#46506a]"
          }`}
        >
          {errorMessage || statusMessage}
        </p>
      )}

      <div className="grid gap-5">
        {mode === "agents" && (
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-extrabold text-black">{draft.id ? "Edit agent" : "Create agent login"}</h3>
              <p className="mt-1 text-[11px] font-medium text-[#46506a]">
                {draft.id ? "Update access for this support account." : "Create a Supabase login for a support agent."}
              </p>
            </div>
            <button
              type="button"
              onClick={startNewAgent}
              className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black"
            >
              {draft.id ? <Plus size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
              {draft.id ? "New agent" : "Clear"}
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">Name</span>
              <input
                value={draft.name}
                name="agent-display-name"
                autoComplete="off"
                onChange={(event) => updateDraft("name", event.target.value)}
                className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">Login email</span>
              <input
                value={draft.email}
                type="email"
                name="agent-login-email"
                autoComplete="off"
                onChange={(event) => updateDraft("email", event.target.value)}
                className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">
                {draft.id ? "New password" : "Password"}
              </span>
              <span className="relative mt-2 block">
                <input
                  value={draft.password}
                  type={showPassword ? "text" : "password"}
                  name="agent-new-password"
                  autoComplete="new-password"
                  placeholder={draft.id ? "Leave blank to keep current password" : "At least 8 characters"}
                  onChange={(event) => updateDraft("password", event.target.value)}
                  className="h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 pr-11 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[7px] text-[#596175] transition hover:bg-[#f6f7fb] hover:text-black"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={2.3} /> : <Eye size={15} strokeWidth={2.3} />}
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between gap-4 rounded-[10px] border border-[#edf0f6] px-3 py-3">
              <div>
                <p className="text-[12px] font-extrabold text-black">Human escalation</p>
                <p className="mt-1 text-[11px] font-medium text-[#46506a]">Agent can receive escalated conversations.</p>
              </div>
              <SettingsToggle
                ariaLabel="Toggle human escalation"
                checked={draft.humanEscalation}
                onChange={(checked) => updateDraft("humanEscalation", checked)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={saveAgent}
            disabled={isSaving}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <Shield size={14} strokeWidth={2.4} />}
            {draft.id ? "Save agent" : "Create agent"}
          </button>
        </section>
        )}

        {mode === "permissions" && (
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-extrabold text-black">Page permissions</h3>
              <p className="mt-1 text-[11px] font-medium text-[#46506a]">
                {draft.id ? `${draft.name || selectedAgent?.name || "Selected agent"} can only open checked pages.` : "Select an agent below before changing page access."}
              </p>
            </div>
            <span className="rounded-[8px] bg-[#eef4ff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
              {draft.allowedPages.length} pages
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {pagePermissionOptions.map((option) => {
              const checked = draft.allowedPages.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => draft.id && togglePage(option.id)}
                  disabled={!draft.id}
                  className={`min-h-[72px] rounded-[10px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    checked ? "border-[#cfd7ff] bg-[#f6f7ff]" : "border-[#edf0f6] bg-white hover:bg-[#fbfbff]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border ${
                        checked ? "border-[#3044ff] bg-[#3044ff] text-white" : "border-[#d7ddeb] bg-white text-transparent"
                      }`}
                    >
                      <Check size={13} strokeWidth={2.8} />
                    </span>
                    <span className="text-[12px] font-extrabold text-black">{option.label}</span>
                  </span>
                  <span className="mt-2 block text-[11px] font-medium leading-[1.35] text-[#46506a]">{option.detail}</span>
                </button>
              );
            })}
          </div>
        </section>
        )}
      </div>

      {mode === "permissions" && (
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-extrabold text-black">Conversation assignments</h3>
            <p className="mt-1 text-[11px] font-medium text-[#46506a]">
              Agents only see conversations checked here after login.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllConversations}
              disabled={!draft.id || conversations.length === 0 || allConversationsSelected}
              className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Check size={13} strokeWidth={2.6} />
              {allConversationsSelected ? "All selected" : "Select all"}
            </button>
            <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
              {selectedConversationCount} assigned
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 flex min-h-[120px] items-center justify-center gap-2 rounded-[10px] bg-[#f6f7fb] text-[12px] font-semibold text-[#46506a]">
            <RefreshCw size={15} strokeWidth={2.3} className="animate-spin text-[#3044ff]" />
            Loading agents and conversations
          </div>
        ) : conversations.length === 0 ? (
          <div className="mt-5 rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4 text-[12px] font-medium text-[#46506a]">
            Connect Instagram or receive a DM first, then conversations will appear here for assignment.
          </div>
        ) : (
          <div className="mt-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedConversations.map((conversation) => {
                const checked = draft.assignedConversationIds.includes(conversation.id);
                const label = getConversationLabel(conversation);

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => draft.id && toggleConversation(conversation.id)}
                    disabled={!draft.id}
                    className={`min-h-[82px] rounded-[10px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      checked ? "border-[#cfd7ff] bg-[#f6f7ff]" : "border-[#edf0f6] bg-white hover:bg-[#fbfbff]"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-extrabold text-black">{label}</span>
                        <span className="mt-1 block line-clamp-1 text-[11px] font-medium text-[#46506a]">
                          {getConversationPreviewForSettings(conversation)}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border ${
                          checked ? "border-[#3044ff] bg-[#3044ff] text-white" : "border-[#d7ddeb] bg-white text-transparent"
                        }`}
                      >
                        <Check size={13} strokeWidth={2.8} />
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-[10px] font-semibold text-[#697083]">{conversation.id}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-semibold text-[#46506a]">
                Showing {conversationPageStartIndex + 1}-{conversationPageEndIndex} of {conversations.length} conversations
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConversationPage(Math.max(1, currentConversationPage - 1))}
                  disabled={currentConversationPage === 1}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft size={13} strokeWidth={2.5} />
                  Previous
                </button>
                {Array.from({ length: totalConversationPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setConversationPage(page)}
                    aria-current={page === currentConversationPage ? "page" : undefined}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-[11px] font-extrabold ${
                      page === currentConversationPage
                        ? "bg-[#3044ff] text-white"
                        : "border border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setConversationPage(Math.min(totalConversationPages, currentConversationPage + 1))}
                  disabled={currentConversationPage === totalConversationPages}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                  <ChevronRight size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {mode === "permissions" && draft.id && (
        <button
          type="button"
          onClick={saveAgent}
          disabled={isSaving}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <Shield size={14} strokeWidth={2.4} />}
          Save permissions
        </button>
      )}

      <section className={`rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] ${mode === "permissions" ? "order-first" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-black">{mode === "permissions" ? "Select agent" : "Agent accounts"}</h3>
          <span className="text-[11px] font-semibold text-[#46506a]">
            {mode === "permissions" ? "Choose which agent receives these permissions." : "Login uses each agent's own email and password."}
          </span>
        </div>

        <div className="mt-4 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
          {agents.length === 0 ? (
            <p className="py-6 text-[12px] font-medium text-[#46506a]">No agents created yet.</p>
          ) : (
            paginatedAgents.map((agent) => {
	              const isSelectedAgent = mode === "permissions" && draft.id === agent.id;

	              return (
	                <div
	                  key={agent.id}
	                  className={`grid gap-3 py-4 xl:grid-cols-[minmax(0,1fr)_130px_150px_180px] xl:items-center ${
	                    isSelectedAgent ? "rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3 shadow-[0_14px_34px_rgba(48,68,255,0.08)]" : ""
	                  }`}
	                >
	                  <button type="button" onClick={() => selectAgent(agent)} className="min-w-0 text-left">
	                    <p className="truncate text-[13px] font-extrabold text-black">{agent.name}</p>
	                    <p className="mt-1 truncate text-[11px] font-medium text-[#46506a]">{agent.email}</p>
	                  </button>
	                  <span className={`w-max rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${agent.status === "Active" ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#fff3e6] text-[#ff850d]"}`}>
	                    {agent.status}
	                  </span>
	                  <span className="text-[11px] font-semibold text-[#46506a]">
	                    {agent.allowedPages.length} pages · {agent.assignedConversationIds.length} conversations
	                  </span>
	                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
	                    <button
	                      type="button"
	                      onClick={() => selectAgent(agent)}
	                      className={`flex h-8 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[11px] font-extrabold ${
	                        isSelectedAgent
	                          ? "border border-[#7c3aed] bg-[#7c3aed] text-white shadow-[0_12px_24px_rgba(124,58,237,0.24)]"
	                          : "border border-[#dde3ee] bg-white text-black"
	                      }`}
	                    >
	                      {isSelectedAgent && <Check size={13} strokeWidth={2.7} />}
	                      {isSelectedAgent ? "Selected" : mode === "permissions" ? "Select" : "Edit"}
	                    </button>
	                    {mode === "agents" && (
	                      <button
	                        type="button"
	                        onClick={() => void suspendAgent(agent)}
	                        disabled={isSaving || agent.status === "Suspended"}
	                        className="h-8 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-3 text-[11px] font-extrabold text-[#df405b] disabled:cursor-not-allowed disabled:opacity-50"
	                      >
	                        Suspend
	                      </button>
	                    )}
	                  </div>
	                </div>
	              );
            })
          )}
        </div>

        {agents.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold text-[#46506a]">
              Showing {agentPageStartIndex + 1}-{agentPageEndIndex} of {agents.length} agents
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAgentPage(Math.max(1, currentAgentPage - 1))}
                disabled={currentAgentPage === 1}
                className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft size={13} strokeWidth={2.5} />
                Previous
              </button>
              {Array.from({ length: totalAgentPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setAgentPage(page)}
                  aria-current={page === currentAgentPage ? "page" : undefined}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-[11px] font-extrabold ${
                    page === currentAgentPage
                      ? "bg-[#3044ff] text-white"
                      : "border border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAgentPage(Math.min(totalAgentPages, currentAgentPage + 1))}
                disabled={currentAgentPage === totalAgentPages}
                className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsBillingSection({
  billing,
  onChange,
}: {
  billing: BillingSettings;
  onChange: (billing: BillingSettings) => void;
}) {
  const [billingMessage, setBillingMessage] = useState("");
  const invoices = [
    ["INV-2026-06", "June 2026", "$249", "Paid"],
    ["INV-2026-05", "May 2026", "$249", "Paid"],
    ["INV-2026-04", "April 2026", "$249", "Paid"],
  ];

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="billing" />
      <SettingsBillingCard billing={billing} onManage={() => setBillingMessage("Invoices are shown below. Plan and billing preferences are saved on this page.")} />
      {billingMessage && <p className="rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{billingMessage}</p>}
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Plan</span>
            <SettingsSelect
              ariaLabel="Billing plan"
              value={billing.plan}
              options={["Starter Plan", "Pro Plan", "Scale Plan"]}
              onChange={(value) => onChange({ ...billing, plan: value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Invoice email</span>
            <input
              value={billing.invoiceEmail}
              onChange={(event) => onChange({ ...billing, invoiceEmail: event.target.value })}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <div>
            <span className="text-[11px] font-extrabold text-[#46506a]">Seats</span>
            <div className="mt-2 flex w-max items-center rounded-[8px] border border-[#dde3ee]">
              <button type="button" onClick={() => onChange({ ...billing, seats: Math.max(1, billing.seats - 1) })} className="h-10 w-10 text-[16px] font-extrabold">-</button>
              <span className="min-w-10 text-center text-[12px] font-extrabold">{billing.seats}</span>
              <button type="button" onClick={() => onChange({ ...billing, seats: billing.seats + 1 })} className="h-10 w-10 text-[16px] font-extrabold">+</button>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Invoices</h3>
          <div className="mt-4 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
            {invoices.map(([id, date, amount, status]) => (
              <button key={id} type="button" className="grid min-h-[48px] w-full grid-cols-[minmax(0,1fr)_110px_70px_70px] items-center gap-3 text-left text-[12px]">
                <span className="truncate font-extrabold text-black">{id}</span>
                <span className="truncate font-medium text-[#46506a]">{date}</span>
                <span className="font-semibold text-[#253049]">{amount}</span>
                <span className="rounded-[8px] bg-[#e7f8ed] px-2 py-1 text-center text-[10px] font-extrabold text-[#0a9b3f]">{status}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsApiSection({
  api,
  onChange,
}: {
  api: ApiSettings;
  onChange: (api: ApiSettings) => void;
}) {
  const [origin] = useState(() => (typeof window === "undefined" ? "http://localhost:3000" : window.location.origin));
  const [testStatus, setTestStatus] = useState("");

  function updateEvent(id: string, enabled: boolean) {
    onChange({
      ...api,
      events: api.events.map((event) => (event.id === id ? { ...event, enabled } : event)),
    });
  }

  function copyValue(value: string) {
    void navigator.clipboard?.writeText(value);
    setTestStatus("Copied.");
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="api" />
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Endpoints</h3>
          <div className="mt-4 space-y-3">
            {[
              ["Instagram OAuth callback", `${origin}/api/auth/instagram/callback`],
              ["Meta webhook callback", `${origin}/api/webhooks/meta`],
              ["Conversations API", `${origin}/api/instagram/conversations`],
              ["Send message API", `${origin}/api/instagram/send`],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 rounded-[10px] border border-[#edf0f6] p-3 sm:grid-cols-[150px_minmax(0,1fr)_32px] sm:items-center">
                <span className="text-[11px] font-extrabold text-black">{label}</span>
                <code className="truncate rounded-[7px] bg-[#f6f7fb] px-2 py-1 text-[11px] font-semibold text-[#253049]">{value}</code>
                <button type="button" onClick={() => copyValue(value)} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#46506a] hover:bg-[#f0edff] hover:text-[#3044ff]" aria-label={`Copy ${label}`}>
                  <Copy size={14} strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[14px] font-extrabold text-black">Webhook Settings</h3>
          <label className="mt-4 block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Webhook URL</span>
            <input
              value={api.webhookUrl}
              onChange={(event) => onChange({ ...api, webhookUrl: event.target.value })}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Signing secret</span>
            <div className="mt-2 flex gap-2">
              <input value={api.signingSecret} onChange={(event) => onChange({ ...api, signingSecret: event.target.value })} className="h-10 min-w-0 flex-1 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
              <button type="button" onClick={() => copyValue(api.signingSecret)} className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee]">
                <Copy size={14} strokeWidth={2.25} />
              </button>
            </div>
          </label>
          <div className="mt-5 space-y-3">
            {api.events.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4">
                <span className="text-[12px] font-extrabold text-black">{event.label}</span>
                <SettingsToggle ariaLabel={`Toggle ${event.label}`} checked={event.enabled} onChange={(checked) => updateEvent(event.id, checked)} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTestStatus("Webhook configuration looks ready. Use Meta's Test button to send a live event.")}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0d1118] px-4 text-[12px] font-extrabold text-white"
          >
            <Send size={14} strokeWidth={2.4} />
            Test configuration
          </button>
          {testStatus && <p className="mt-3 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{testStatus}</p>}
        </div>
      </section>
    </div>
  );
}

function SettingsSecuritySection({
  security,
  onChange,
}: {
  security: SecuritySettings;
  onChange: (security: SecuritySettings) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function updatePassword() {
    setStatus("");

    if (password.length < 8) {
      setStatus("Use at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/security", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not update password");
      }

      setPassword("");
      setConfirmPassword("");
      setStatus("Password updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="security" />
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Access controls</h3>
          <div className="mt-5 space-y-4">
            {[
              ["Two-factor authentication", "twoFactor"],
              ["Login alerts", "loginAlerts"],
              ["Trusted devices", "trustedDevices"],
            ].map(([label, key]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-[12px] font-extrabold text-black">{label}</span>
                <SettingsToggle
                  ariaLabel={`Toggle ${label}`}
                  checked={Boolean(security[key as keyof SecuritySettings])}
                  onChange={(checked) => onChange({ ...security, [key]: checked })}
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] font-extrabold text-black">Session timeout</span>
              <SettingsSelect
                ariaLabel="Session timeout"
                value={security.sessionTimeout}
                options={["7 days", "14 days", "30 days", "90 days"]}
                onChange={(value) => onChange({ ...security, sessionTimeout: value })}
              />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Password</h3>
          <div className="mt-5 grid gap-3">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="New password"
              className="h-10 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              placeholder="Confirm password"
              className="h-10 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
            <button
              type="button"
              onClick={updatePassword}
              disabled={isSaving}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <RefreshCw size={14} strokeWidth={2.3} className="animate-spin" /> : <Shield size={14} strokeWidth={2.3} />}
              {isSaving ? "Updating" : "Update password"}
            </button>
            {status && <p className="rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{status}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsBrandSection({
  brand,
  onChange,
}: {
  brand: BrandSettings;
  onChange: (brand: BrandSettings) => void;
}) {
  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="brand" />
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-4">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Brand name</span>
            <input value={brand.brandName} onChange={(event) => onChange({ ...brand, brandName: event.target.value })} className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Primary color</span>
            <div className="mt-2 flex gap-2">
              <input type="color" value={brand.primaryColor} onChange={(event) => onChange({ ...brand, primaryColor: event.target.value })} className="h-10 w-12 rounded-[8px] border border-[#dde3ee] bg-white p-1" />
              <input value={brand.primaryColor} onChange={(event) => onChange({ ...brand, primaryColor: event.target.value })} className="h-10 min-w-0 flex-1 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Voice</span>
            <SettingsSelect
              ariaLabel="Brand voice"
              value={brand.voice}
              options={["Confident and helpful", "Warm and casual", "Premium and concise", "Bold and playful"]}
              onChange={(value) => onChange({ ...brand, voice: value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Blocked words</span>
            <textarea value={brand.blockedWords} onChange={(event) => onChange({ ...brand, blockedWords: event.target.value })} className="mt-2 min-h-[84px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
          </label>
        </div>
        <div className="rounded-[12px] border border-[#edf0f6] bg-[#fbfbff] p-5">
          <h3 className="text-[14px] font-extrabold text-black">Reply preview</h3>
          <div className="mt-5 rounded-[12px] bg-white p-4 shadow-[0_16px_34px_rgba(20,28,53,0.06)]">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-full" style={{ backgroundColor: brand.primaryColor }} />
              <div>
                <p className="text-[13px] font-extrabold text-black">{brand.brandName}</p>
                <p className="text-[11px] font-medium text-[#46506a]">{brand.voice}</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] font-medium leading-relaxed text-[#253049]">
              Thanks for reaching out. I can help with your question and make sure you get the right next step.
            </p>
            <input value={brand.replySignature} onChange={(event) => onChange({ ...brand, replySignature: event.target.value })} className="mt-4 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
          </div>
        </div>
      </section>
    </div>
  );
}
function SettingsPage({
  profile,
  onProfileChange,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [settingsState, setSettingsState] = useState<AppSettingsState>(readStoredSettingsState);
  const [quickPanel, setQuickPanel] = useState<"updates" | "help" | null>(null);
  const customRuleCounterRef = useRef(1);

  useEffect(() => {
    window.localStorage.setItem(settingsStateStorageKey, JSON.stringify(settingsState));
  }, [settingsState]);

  useEffect(() => {
    const visibleSections = getVisibleSettingsMenuItems(profile);

    if (!visibleSections.some((item) => item.id === activeSection)) {
      const timeout = window.setTimeout(() => {
        setActiveSection(visibleSections[0]?.id || "account");
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [profile, activeSection]);

  function updateSettingsState<K extends keyof AppSettingsState>(key: K, value: AppSettingsState[K]) {
    setSettingsState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function addEscalationRule() {
    const count = settingsState.rules.filter((rule) => rule.id.startsWith("custom")).length + 1;

    updateSettingsState("rules", [
      ...settingsState.rules,
      {
        id: `custom-${customRuleCounterRef.current}`,
        label: `Custom rule ${count}`,
        action: "Escalate for approval",
        priority: "Medium",
        enabled: true,
      },
    ]);
    customRuleCounterRef.current += 1;
  }

  function renderQuickPanel() {
    if (!quickPanel) {
      return null;
    }

    const content =
      quickPanel === "updates"
        ? {
            icon: Sparkles,
            title: "What is new",
            body: "Instagram account details, settings sections, profile sync, webhooks, and inbox controls are now connected across the dashboard.",
            action: "Open Instagram settings",
            section: "instagram" as SettingsSection,
          }
        : {
            icon: CircleHelp,
            title: "Help",
            body: "Use the left settings menu to update your profile, Instagram connection, AI integration, team access, billing, API, security, and brand voice.",
            action: "Open API settings",
            section: "api" as SettingsSection,
          };
    const Icon = content.icon;

    return (
      <section className="mt-5 flex flex-col gap-4 rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_18px_44px_rgba(20,28,53,0.035)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#3044ff]">
            <Icon size={18} strokeWidth={2.35} />
          </span>
          <div>
            <h2 className="text-[13px] font-extrabold text-black">{content.title}</h2>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#46506a]">{content.body}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveSection(content.section);
              setQuickPanel(null);
            }}
            className="h-9 rounded-[8px] bg-[#3044ff] px-3 text-[11px] font-extrabold text-white"
          >
            {content.action}
          </button>
          <button
            type="button"
            onClick={() => setQuickPanel(null)}
            aria-label="Close panel"
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#dde3ee]"
          >
            <X size={15} strokeWidth={2.35} />
          </button>
        </div>
      </section>
    );
  }

  function renderSettingsContent() {
    if (activeSection === "instagram") {
      return <SettingsInstagramSection />;
    }

    if (activeSection === "ai-integration") {
      return (
        <SettingsAiIntegrationSection
          integration={settingsState.aiIntegration}
          assistantSettings={settingsState.ai}
          onChange={(aiIntegration) => updateSettingsState("aiIntegration", aiIntegration)}
          onAssistantChange={(ai) => updateSettingsState("ai", ai)}
        />
      );
    }

    if (activeSection === "agents") {
      return <SettingsAgentsSection mode="agents" />;
    }

    if (activeSection === "permissions") {
      return <SettingsAgentsSection mode="permissions" />;
    }

    if (activeSection === "escalations") {
      return (
        <div className="grid gap-5">
          <SettingsSectionHeader section="escalations" />
          <SettingsRulesCard rules={settingsState.rules} onChange={(rules) => updateSettingsState("rules", rules)} onAddRule={addEscalationRule} />
        </div>
      );
    }

    if (activeSection === "notifications") {
      return (
        <div className="grid gap-5">
          <SettingsSectionHeader section="notifications" />
          <SettingsNotificationsCard notifications={settingsState.notifications} onChange={(notifications) => updateSettingsState("notifications", notifications)} />
        </div>
      );
    }

    if (activeSection === "team") {
      return <SettingsTeamSection profile={profile} team={settingsState.team} onChange={(team) => updateSettingsState("team", team)} />;
    }

    if (activeSection === "billing") {
      return <SettingsBillingSection billing={settingsState.billing} onChange={(billing) => updateSettingsState("billing", billing)} />;
    }

    if (activeSection === "api") {
      return <SettingsApiSection api={settingsState.api} onChange={(api) => updateSettingsState("api", api)} />;
    }

    if (activeSection === "security") {
      return <SettingsSecuritySection security={settingsState.security} onChange={(security) => updateSettingsState("security", security)} />;
    }

    if (activeSection === "brand") {
      return <SettingsBrandSection brand={settingsState.brand} onChange={(brand) => updateSettingsState("brand", brand)} />;
    }

    return (
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <SettingsAccountCard profile={profile} onProfileChange={onProfileChange} />
          <InstagramConnectionCard onManage={() => setActiveSection("instagram")} />
        </div>

        <div className="grid gap-5 2xl:grid-cols-3">
          <SettingsAssistantCard settings={settingsState.ai} onChange={(ai) => updateSettingsState("ai", ai)} onConfigure={() => setActiveSection("ai-integration")} />
          <SettingsRulesCard rules={settingsState.rules} onChange={(rules) => updateSettingsState("rules", rules)} onManage={() => setActiveSection("escalations")} />
          <SettingsNotificationsCard notifications={settingsState.notifications} onChange={(notifications) => updateSettingsState("notifications", notifications)} onManage={() => setActiveSection("notifications")} />
        </div>

        <SettingsBillingCard billing={settingsState.billing} onManage={() => setActiveSection("billing")} />
      </div>
    );
  }

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[30px] font-extrabold leading-none text-black sm:text-[32px]">Settings</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#46506a]">
              Manage your account, integrations, and automations.
            </p>
          </div>

          <div className="grid w-full grid-cols-[1fr_1fr_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <button
              type="button"
              onClick={() => setQuickPanel((current) => (current === "updates" ? null : "updates"))}
              className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[128px]"
            >
              <Sparkles size={15} className="text-[#3044ff]" strokeWidth={2.35} />
              <span className="whitespace-nowrap">What&apos;s new</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickPanel((current) => (current === "help" ? null : "help"))}
              className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[92px]"
            >
              <CircleHelp size={15} strokeWidth={2.35} />
              Help
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection("notifications");
                setQuickPanel(null);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.025)]"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={2.25} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#3044ff]" />
            </button>
          </div>
        </header>

        {renderQuickPanel()}

        <div className="mt-7 grid items-start gap-5 xl:grid-cols-[252px_minmax(0,1fr)]">
          <SettingsMenuCard activeSection={activeSection} onSectionChange={setActiveSection} profile={profile} />
          {renderSettingsContent()}
        </div>
      </div>
    </main>
  );
}

function KnowledgeTabs() {
  return (
    <div className="-mx-4 mt-8 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="grid w-max grid-flow-col auto-cols-max">
        {knowledgeTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === 0;

          return (
            <button
              key={tab.label}
              type="button"
              className={`relative flex h-11 items-center gap-2 border-r border-[#e2e6f0] px-3 text-[12px] font-extrabold last:border-r-0 ${
                isActive ? "text-[#3044ff]" : "text-black"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.45 : 2.1} />
              <span>{tab.label}</span>
              <span className="rounded-full bg-[#eff1f6] px-2 py-0.5 text-[10px] font-extrabold text-[#596175]">
                {tab.count}
              </span>
              {isActive ? <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-[#3044ff]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KnowledgeSourceRows() {
  return (
    <section>
      <div className="hidden grid-cols-[minmax(260px,1fr)_120px_150px_150px_28px] px-3 pb-3 text-[11px] font-semibold text-[#46506a] md:grid">
        <span>Source</span>
        <span>Type</span>
        <span>Status</span>
        <span>Last updated</span>
        <span />
      </div>

      <div>
        {knowledgeSources.map((source) => {
          const Icon = source.icon;

          return (
            <article
              key={source.title}
              className="grid gap-3 border-b border-[#edf0f6] px-2 py-4 md:grid-cols-[minmax(260px,1fr)_120px_150px_150px_28px] md:items-center md:px-3"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] ${source.tone}`}>
                  <Icon size={21} strokeWidth={2.25} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-extrabold text-black">{source.title}</span>
                  <span className="mt-1 block truncate text-[12px] font-medium text-[#46506a]">{source.subtitle}</span>
                </span>
              </div>

              <div>
                <span className={`inline-flex h-6 items-center rounded-[7px] px-2.5 text-[11px] font-bold ${source.typeTone}`}>
                  {source.type}
                </span>
              </div>

              <div>
                <span className={`inline-flex h-6 items-center gap-2 rounded-[7px] px-2.5 text-[11px] font-bold ${source.statusTone}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {source.status}
                </span>
              </div>

              <p className="whitespace-pre-line text-[12px] font-medium leading-[1.35] text-[#46506a]">{source.updated}</p>

              <button type="button" aria-label={`More actions for ${source.title}`} className="justify-self-end text-black md:justify-self-auto">
                <MoreHorizontal size={17} strokeWidth={2.5} />
              </button>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-6 flex h-[78px] w-full items-center justify-center gap-3 rounded-[10px] border border-dashed border-[#d7deeb] bg-white text-center shadow-[0_18px_45px_rgba(20,28,53,0.025)]"
      >
        <UploadCloud size={18} className="text-[#31394f]" strokeWidth={2.2} />
        <span>
          <span className="block text-[14px] font-semibold text-black">
            Drag and drop files here&nbsp; or&nbsp; <span className="font-extrabold text-[#3044ff]">browse</span>
          </span>
          <span className="mt-1 block text-[11px] font-medium text-[#46506a]">PDF, DOCX, TXT up to 50MB</span>
        </span>
      </button>
    </section>
  );
}

function TrainingStatusCard() {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-black">
          <BrainCircuit size={16} className="text-[#6d3cff]" strokeWidth={2.35} />
          AI Training Status
        </h2>
        <button type="button" className="text-[12px] font-extrabold text-[#3044ff]">Learn more</button>
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#3044ff_0deg_331deg,#eef0fb_331deg_360deg)] sm:mx-0">
          <div className="absolute inset-[8px] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-[20px] font-extrabold leading-none text-black">92%</span>
            <span className="mt-1.5 text-[10px] font-semibold text-[#596175]">Trained</span>
          </div>
        </div>
        <p className="text-[14px] font-medium leading-[1.55] text-black">
          Your AI is well trained and ready to represent your brand.
        </p>
      </div>

      <div className="mt-5 space-y-4 border-t border-[#edf0f6] pt-4">
        {[
          ["Sources synced", "11 / 12", "text-[#0a9b3f]"],
          ["Up to date", "9 / 12", "text-[#0a9b3f]"],
          ["Needs review", "1", "text-[#ff7a00]"],
        ].map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-[#31394f]">{label}</span>
            <span className={`font-extrabold ${tone}`}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function KnowledgeInsightsCard() {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-black">
        <BarChart3 size={15} strokeWidth={2.35} />
        Knowledge Insights
      </h2>

      <div className="mt-4 space-y-3">
        {knowledgeInsights.map((insight) => {
          const Icon = insight.icon;
          return (
            <button key={insight.title} type="button" className="flex w-full items-center gap-3 rounded-[9px] py-1.5 text-left">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${insight.tone}`}>
                <Icon size={15} strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-extrabold text-black">{insight.title}</span>
                <span className="mt-1 block truncate text-[11px] font-medium text-[#596175]">{insight.detail}</span>
              </span>
              <ArrowRight size={15} strokeWidth={2.25} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeUpdatesCard() {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-extrabold text-black">Recent updates</h2>
        <button type="button" className="text-[12px] font-extrabold text-[#3044ff]">View all</button>
      </div>

      <div className="mt-4 space-y-4">
        {knowledgeUpdates.map((update) => {
          const Icon = update.icon;
          return (
            <div key={update.title} className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${update.tone}`}>
                <Icon size={16} strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-extrabold text-black">{update.title}</span>
                <span className="mt-1 block truncate text-[11px] font-medium text-[#46506a]">{update.detail}</span>
              </span>
              <span className="shrink-0 text-right text-[10px] font-medium text-[#596175]">{update.time}</span>
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#13a84f]" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeBasePage() {
  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[28px] font-extrabold leading-none text-black sm:text-[30px]">Knowledge Base</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#596175]">
              Your AI is only as good as the knowledge you give it.
            </p>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <div className="flex h-10 min-w-0 items-center gap-3 rounded-[9px] border border-[#e0e4ef] bg-white px-3 text-[#596175] shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[218px]">
              <Search size={16} strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">Search knowledge...</span>
              <span className="hidden rounded bg-[#eff1f6] px-1.5 py-0.5 text-[11px] font-extrabold text-[#8b92a6] sm:inline">⌘K</span>
            </div>
            <button
              type="button"
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.2)] sm:w-[124px]"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span className="hidden sm:inline">Add source</span>
            </button>
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.025)]"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={2.25} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#3044ff]" />
            </button>
          </div>
        </header>

        <KnowledgeTabs />

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_344px]">
          <KnowledgeSourceRows />

          <aside className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <TrainingStatusCard />
            <KnowledgeInsightsCard />
            <KnowledgeUpdatesCard />
          </aside>
        </div>
      </div>
    </main>
  );
}

function AudienceMetricStrip() {
  return (
    <section className="mt-6 grid overflow-hidden rounded-[12px] border border-[#e5e8f0] bg-white shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:grid-cols-2 xl:h-[112px] xl:grid-cols-5">
      {audienceMetrics.map((metric, index) => {
        const Icon = metric.icon;
        const isLast = index === audienceMetrics.length - 1;
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
                <span className="truncate text-[#596175]">vs last 7 days</span>
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function AudienceGrowthChart() {
  const xLabels = ["May 12", "May 13", "May 14", "May 15", "May 16", "May 17", "May 18"];

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-black">Audience growth</h2>
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black"
        >
          This week
          <ChevronDown size={14} strokeWidth={2.5} />
        </button>
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

          {["150K", "100K", "50K", "0"].map((label, index) => (
            <text key={label} x="16" y={32 + index * 58} fill="#46506a" fontSize="12" fontWeight="600">
              {label}
            </text>
          ))}

          <path
            d="M60 116 L162 101 L263 97 L365 82 L467 69 L568 54 L640 46 L640 198 L60 198 Z"
            fill="url(#audienceGrowthFill)"
          />
          <path
            d="M60 116 L162 101 L263 97 L365 82 L467 69 L568 54 L640 46"
            fill="none"
            stroke="#4b3cff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />

          {[60, 162, 263, 365, 467, 568].map((x, index) => (
            <circle key={x} cx={x} cy={[116, 101, 97, 82, 69, 54][index]} r="3.5" fill="#4b3cff" />
          ))}
          <circle cx="640" cy="46" r="9" fill="#edeaff" filter="url(#audienceDotGlow)" />
          <circle cx="640" cy="46" r="5.5" fill="#4b3cff" />
          <circle cx="640" cy="46" r="3" fill="#ffffff" />

          {xLabels.map((label, index) => (
            <text key={label} x={60 + index * 97} y="232" textAnchor="middle" fill="#46506a" fontSize="12" fontWeight="600">
              {label}
            </text>
          ))}
        </svg>

        <div className="pointer-events-none absolute right-8 top-[126px] hidden h-[58px] w-[94px] rounded-[8px] bg-white px-3 py-2.5 shadow-[0_24px_60px_rgba(82,67,210,0.16)] xl:block">
          <p className="text-[10px] font-semibold text-black">May 18, 2025</p>
          <p className="mt-1 text-[15px] font-extrabold leading-none text-[#4b3cff]">124,580</p>
        </div>
      </div>
    </section>
  );
}

function AudienceSourceCard() {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Audience by source</h2>

      <div className="mt-5 grid items-center gap-6 md:grid-cols-[190px_minmax(0,1fr)]">
        <div className="relative mx-auto h-[166px] w-[166px] rounded-full bg-[conic-gradient(#3f3cff_0deg_247deg,#bd35d2_247deg_309deg,#fb3d5d_309deg_340deg,#13a84f_340deg_352deg,#9aa1b5_352deg_360deg)]">
          <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-[21px] font-extrabold leading-none text-black">124,580</span>
            <span className="mt-2 text-[12px] font-medium text-[#596175]">Total</span>
          </div>
        </div>

        <div className="space-y-4">
          {audienceSources.map((source) => (
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

      <button
        type="button"
        className="mx-auto mt-5 flex h-9 w-[154px] items-center justify-center gap-4 rounded-[8px] border border-[#dde3ee] bg-white text-[12px] font-extrabold text-black"
      >
        View all sources
        <ArrowRight size={14} strokeWidth={2.5} />
      </button>
    </section>
  );
}

function TopAudienceCard() {
  const filters = ["Most engaged", "Top buyers", "Rising stars", "Most active"];

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Top audience</h2>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {filters.map((filter, index) => (
          <button
            key={filter}
            type="button"
            className={`h-6 rounded-full px-3 text-[11px] font-bold ${
              index === 0 ? "bg-[#f0edff] text-[#4b3cff]" : "bg-[#f3f4f8] text-[#31394f]"
            }`}
          >
            {filter}
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

        {topAudience.map((person, index) => (
          <div
            key={person.name}
            className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-2 py-2.5 md:grid-cols-[minmax(210px,1fr)_110px_120px_110px_28px] md:items-center ${
              index > 0 ? "border-t border-[#edf0f6]" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-label={person.name}
                role="img"
                className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(https://i.pravatar.cc/72?img=${person.avatar})` }}
              />
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

      <button type="button" className="mx-auto mt-4 flex items-center gap-3 text-[12px] font-extrabold text-[#3044ff]">
        View all audience
        <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </section>
  );
}

function AudienceSegmentsCard() {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-black">Audience segments</h2>
        <button type="button" className="text-[12px] font-extrabold text-[#3044ff]">View all</button>
      </div>

      <div className="mt-4">
        {audienceSegments.map((segment, index) => {
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

      <button type="button" className="mx-auto mt-4 flex items-center gap-3 text-[12px] font-extrabold text-[#3044ff]">
        View all segments
        <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </section>
  );
}

function AudiencePage() {
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
            <button
              type="button"
              className="flex h-11 min-w-0 items-center justify-between rounded-[9px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:h-12 sm:w-[252px] sm:px-5 sm:text-[13px]"
            >
              May 12 - May 18, 2025
              <CalendarDays size={16} strokeWidth={2.3} />
            </button>
            <button
              type="button"
              className="flex h-11 w-[78px] items-center justify-center gap-2 rounded-[9px] border border-[#e0e4ef] bg-white text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:h-12 sm:w-[94px] sm:text-[13px]"
            >
              <SlidersHorizontal size={15} strokeWidth={2.4} />
              Filter
            </button>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:h-12 sm:w-12"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={2.25} />
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#3044ff] px-1 text-[10px] font-extrabold text-white">
                2
              </span>
            </button>
          </div>
        </header>

        <AudienceMetricStrip />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(390px,0.98fr)]">
          <div className="relative">
            <AudienceGrowthChart />
          </div>
          <AudienceSourceCard />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(390px,0.98fr)]">
          <TopAudienceCard />
          <AudienceSegmentsCard />
        </div>
      </div>
    </main>
  );
}

function formatAnalyticsInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatAnalyticsPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function formatAnalyticsDuration(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "No replies";
  }

  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function getAnalyticsMessageTime(message: InstagramSettingsMessage) {
  return new Date(message.time).getTime();
}

function getAnalyticsConversationTime(conversation: InstagramSettingsConversation) {
  const latestMessageTime = conversation.messages
    .map((message) => getAnalyticsMessageTime(message))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  if (latestMessageTime) {
    return latestMessageTime;
  }

  return conversation.updated_time ? new Date(conversation.updated_time).getTime() : 0;
}

function getAnalyticsMessageText(message: InstagramSettingsMessage) {
  return `${message.text || ""} ${message.attachments?.map((attachment) => attachment.name || attachment.type).join(" ") || ""}`.toLowerCase();
}

function getAnalyticsReplyRate(inboundCount: number, outboundCount: number) {
  return inboundCount > 0 ? Math.min(100, (outboundCount / inboundCount) * 100) : 0;
}

function buildAnalyticsSummary(conversations: InstagramSettingsConversation[], totalConversationCount?: number): AnalyticsSummary {
  const now = Date.now();
  const totalLoaded = conversations.length;
  const totalCount = typeof totalConversationCount === "number" ? totalConversationCount : totalLoaded;
  const allMessages = conversations.flatMap((conversation) => conversation.messages);
  const userMessages = allMessages.filter((message) => message.from === "user");
  const creatorMessages = allMessages.filter((message) => message.from === "me");
  const mediaMessages = allMessages.filter((message) => (message.attachments || []).length > 0);
  const opportunitySignals = userMessages.filter((message) => {
    const text = getAnalyticsMessageText(message);
    return ["price", "pricing", "cost", "book", "buy", "interested", "call", "program"].some((keyword) => text.includes(keyword));
  }).length;
  const escalationSignals = userMessages.filter((message) => {
    const text = getAnalyticsMessageText(message);
    return ["refund", "issue", "problem", "support", "angry", "cancel", "human"].some((keyword) => text.includes(keyword));
  }).length;
  const responseTimes: number[] = [];

  conversations.forEach((conversation) => {
    const chronologicalMessages = [...conversation.messages]
      .filter((message) => Number.isFinite(getAnalyticsMessageTime(message)))
      .sort((a, b) => getAnalyticsMessageTime(a) - getAnalyticsMessageTime(b));

    chronologicalMessages.forEach((message, index) => {
      if (message.from !== "user") {
        return;
      }

      const nextCreatorMessage = chronologicalMessages
        .slice(index + 1)
        .find((candidate) => candidate.from === "me" && getAnalyticsMessageTime(candidate) > getAnalyticsMessageTime(message));

      if (nextCreatorMessage) {
        responseTimes.push(getAnalyticsMessageTime(nextCreatorMessage) - getAnalyticsMessageTime(message));
      }
    });
  });

  const averageResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((total, value) => total + value, 0) / responseTimes.length
      : 0;
  const replyCoverage = getAnalyticsReplyRate(userMessages.length, creatorMessages.length);
  const activeToday = conversations.filter((conversation) => {
    const time = getAnalyticsConversationTime(conversation);
    return time > 0 && now - time <= 86_400_000;
  }).length;
  const latestConversation = [...conversations].sort((a, b) => getAnalyticsConversationTime(b) - getAnalyticsConversationTime(a))[0];
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now - (6 - index) * 86_400_000);
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      label: date.toLocaleDateString([], { weekday: "short" }),
      conversations: 0,
      messages: 0,
    };
  });

  conversations.forEach((conversation) => {
    const conversationKey = new Date(getAnalyticsConversationTime(conversation) || 0).toISOString().slice(0, 10);
    const conversationBucket = buckets.find((bucket) => bucket.key === conversationKey);

    if (conversationBucket) {
      conversationBucket.conversations += 1;
    }

    conversation.messages.forEach((message) => {
      const messageTime = getAnalyticsMessageTime(message);

      if (!Number.isFinite(messageTime)) {
        return;
      }

      const messageKey = new Date(messageTime).toISOString().slice(0, 10);
      const messageBucket = buckets.find((bucket) => bucket.key === messageKey);

      if (messageBucket) {
        messageBucket.messages += 1;
      }
    });
  });

  const totalMessageCount = allMessages.length;
  const channels: AnalyticsChannel[] = [
    {
      label: "Instagram conversations",
      value: formatAnalyticsPercent(totalCount > 0 ? (totalLoaded / totalCount) * 100 : 0),
      count: `${formatAnalyticsInteger(totalLoaded)} loaded of ${formatAnalyticsInteger(totalCount)} total`,
      color: "#3044ff",
    },
    {
      label: "User messages",
      value: formatAnalyticsPercent(totalMessageCount > 0 ? (userMessages.length / totalMessageCount) * 100 : 0),
      count: `${formatAnalyticsInteger(userMessages.length)} inbound`,
      color: "#13a84f",
    },
    {
      label: "Creator replies",
      value: formatAnalyticsPercent(totalMessageCount > 0 ? (creatorMessages.length / totalMessageCount) * 100 : 0),
      count: `${formatAnalyticsInteger(creatorMessages.length)} outbound`,
      color: "#ff850d",
    },
    {
      label: "Media messages",
      value: formatAnalyticsPercent(totalMessageCount > 0 ? (mediaMessages.length / totalMessageCount) * 100 : 0),
      count: `${formatAnalyticsInteger(mediaMessages.length)} with attachments`,
      color: "#df405b",
    },
  ];

  const automationMetrics: AnalyticsAutomationMetric[] = [
    {
      label: "Opportunity signals",
      value: formatAnalyticsInteger(opportunitySignals),
      detail: "Pricing, booking, buying, or program intent",
      tone: "bg-[#eef4ff] text-[#246bff]",
      icon: Target,
    },
    {
      label: "AI-ready conversations",
      value: formatAnalyticsInteger(Math.max(0, userMessages.length - escalationSignals)),
      detail: "Inbound messages without handoff keywords",
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: Sparkles,
    },
    {
      label: "Handoff signals",
      value: formatAnalyticsInteger(escalationSignals),
      detail: "Refund, issue, support, or human keywords",
      tone: "bg-[#fff0f3] text-[#df405b]",
      icon: TriangleAlert,
    },
  ];

  const reportRows: AnalyticsReportRow[] = [...conversations]
    .sort((a, b) => getAnalyticsConversationTime(b) - getAnalyticsConversationTime(a))
    .slice(0, 6)
    .map((conversation) => {
      const inbound = conversation.messages.filter((message) => message.from === "user").length;
      const outbound = conversation.messages.filter((message) => message.from === "me").length;
      const lastMessage = [...conversation.messages].sort((a, b) => getAnalyticsMessageTime(b) - getAnalyticsMessageTime(a))[0];
      const needsReply = lastMessage?.from === "user";
      const noMessages = conversation.messages.length === 0;

      return {
        label: getConversationLabel(conversation),
        source: "Instagram",
        conversations: `${formatAnalyticsInteger(conversation.messages.length)} msgs`,
        conversion: formatAnalyticsPercent(getAnalyticsReplyRate(inbound, outbound)),
        lastActive: formatInstagramRelativeTime(lastMessage?.time || conversation.updated_time),
        status: noMessages ? "No messages" : needsReply ? "Needs reply" : "Handled",
        statusTone: noMessages
          ? "bg-[#f3f4f8] text-[#596175]"
          : needsReply
            ? "bg-[#fff3e6] text-[#ff850d]"
            : "bg-[#e7f8ed] text-[#0a9b3f]",
      };
    });

  return {
    metrics: [
      {
        label: "Total conversations",
        value: formatAnalyticsInteger(totalCount),
        change: `${formatAnalyticsInteger(totalLoaded)} loaded`,
        detail: "from Instagram",
        tone: "bg-[#f0edff] text-[#4b3cff]",
        icon: MessageSquare,
      },
      {
        label: "Reply coverage",
        value: formatAnalyticsPercent(replyCoverage),
        change: `${formatAnalyticsInteger(creatorMessages.length)} replies`,
        detail: `${formatAnalyticsInteger(userMessages.length)} inbound`,
        tone: "bg-[#eafaf0] text-[#13a84f]",
        icon: Bot,
      },
      {
        label: "Avg response time",
        value: formatAnalyticsDuration(averageResponseTime),
        change: `${formatAnalyticsInteger(responseTimes.length)} replies timed`,
        detail: "creator after user",
        tone: "bg-[#eef4ff] text-[#246bff]",
        icon: Clock,
      },
      {
        label: "Opportunity signals",
        value: formatAnalyticsInteger(opportunitySignals),
        change: `${formatAnalyticsInteger(activeToday)} active today`,
        detail: "buying intent",
        tone: "bg-[#fff3e6] text-[#ff850d]",
        icon: Target,
      },
    ],
    channels,
    automationMetrics,
    reportRows,
    performanceBuckets: buckets.map(({ label, conversations: bucketConversations, messages }) => ({
      label,
      conversations: bucketConversations,
      messages,
    })),
    loadedConversationCount: totalLoaded,
    totalConversationCount: totalCount,
    totalMessageCount,
    latestActivity: formatInstagramRelativeTime(latestConversation?.updated_time),
  };
}

function AnalyticsMetricStrip({ metrics }: { metrics: AnalyticsMetric[] }) {
  return (
    <section className="mt-6 grid overflow-hidden rounded-[12px] border border-[#e5e8f0] bg-white shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.label}
            className={`flex min-h-[112px] items-center gap-4 border-[#e5e8f0] px-4 py-4 sm:px-5 ${
              index < metrics.length - 1 ? "border-b sm:border-r xl:border-b-0" : ""
            }`}
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

function AnalyticsPage() {
  const [analyticsResponse, setAnalyticsResponse] = useState<InstagramConversationsResponse | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const conversations = analyticsResponse?.conversations || [];
  const summary = buildAnalyticsSummary(conversations, analyticsResponse?.conversation_count);

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

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[30px] font-extrabold leading-none text-black sm:text-[34px]">Analytics</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#596175]">
              Track Instagram conversations, reply coverage, AI signals, and handoff needs.
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

function DashboardOverview({ profile }: { profile: AccountProfile }) {
  const greetingName = profile.name.trim() || "there";

  return (
    <div className="relative h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-7 lg:py-5 xl:px-10">
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
            <button
              type="button"
              className="flex h-11 min-w-0 items-center justify-between rounded-[10px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)] sm:h-[52px] sm:w-[252px] sm:px-5 sm:text-[14px]"
            >
              May 12 - May 18, 2025
              <CalendarDays size={18} strokeWidth={2.3} />
            </button>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.035)] sm:h-[52px] sm:w-[52px]"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={2.3} />
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#4b3cff]" />
            </button>
          </div>
        </header>

        <section className="relative mt-6 max-w-[640px]">
          <div className="flex items-center gap-4 sm:gap-5">
            <h1 className="text-[48px] font-extrabold leading-[0.9] tracking-[-0.04em] text-black sm:text-[68px] xl:text-[78px]">
              $18,400
            </h1>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e3e6f0] bg-white shadow-[0_18px_52px_rgba(77,60,255,0.08)] sm:h-[58px] sm:w-[58px]">
              <Sparkles size={25} className="text-[#4b3cff] sm:size-[29px]" strokeWidth={2.2} />
            </div>
          </div>
          <p className="mt-3 text-[15px] font-semibold leading-[1.3] text-[#596175] sm:text-[18px] sm:leading-none">
            Potential revenue discovered this week
          </p>

          <div className="mt-7 flex items-center gap-3.5">
            <div className="flex -space-x-3">
              {[12, 32, 48].map((image, index) => (
                <span
                  key={image}
                  aria-label={index === 0 ? "Opportunity reviewer" : undefined}
                  aria-hidden={index === 0 ? undefined : true}
                  role={index === 0 ? "img" : undefined}
                  className="h-8 w-8 rounded-full border-2 border-white bg-cover bg-center shadow-sm"
                  style={{ backgroundImage: `url(https://i.pravatar.cc/48?img=${image})` }}
                />
              ))}
            </div>
            <p className="text-[13px] font-semibold text-[#4b5268]">
              <span className="font-extrabold text-[#4b3cff]">12</span> opportunities waiting for your review
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-5">
            <button
              type="button"
              className="flex h-[42px] w-full items-center justify-center gap-5 rounded-[8px] bg-gradient-to-r from-[#563cff] to-[#4a32f2] text-[13px] font-extrabold text-white shadow-[0_22px_40px_rgba(75,60,255,0.22)] sm:w-[190px]"
            >
              Review opportunities
              <ArrowRight size={17} strokeWidth={2.5} />
            </button>
            <button type="button" className="flex items-center gap-3 text-[12px] font-bold text-[#596175]">
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
              <span className="rounded-full bg-[#eff2f7] px-2.5 py-0.5 text-[12px] font-extrabold text-[#596175]">4</span>
            </div>
            <button type="button" className="flex items-center gap-2 text-[13px] font-extrabold text-[#4b3cff]">
              View all
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.title} opportunity={opportunity} />
            ))}
          </div>
        </section>

        <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1.36fr)_minmax(390px,0.96fr)]">
          <section className="rounded-[14px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.035)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-black">Audience pipeline</h2>
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black"
              >
                This week
                <ChevronDown size={14} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="pointer-events-none absolute bottom-0 right-2 top-0 hidden w-16 skew-x-[-12deg] border-r border-[#e9ecf3] md:block" />
              {pipeline.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="relative text-center">
                    <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-[15px]">
                      <span className={`flex h-full w-full items-center justify-center rounded-[15px] ${step.tone}`}>
                        <Icon size={23} strokeWidth={2.3} />
                      </span>
                    </div>
                    {index < pipeline.length - 1 ? (
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
              <button type="button" className="flex items-center gap-2 text-[13px] font-extrabold text-[#4b3cff]">
                View all
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div>
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.title}
                    className={`flex items-center gap-3 py-[9px] ${
                      index < recentActivity.length - 1 ? "border-b border-[#edf0f6]" : ""
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
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
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
  const [conversationCount, setConversationCount] = useState<number | null>(null);
  const hasLoadedAccountProfileRef = useRef(false);

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

    async function loadConversationCount() {
      try {
        const response = await fetch("/api/instagram/conversations?countOnly=1", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data: InstagramConversationsResponse = await response.json();

        if (!isMounted) {
          return;
        }

        const nextCount = typeof data.conversation_count === "number" ? data.conversation_count : data.conversations?.length;

        if (typeof nextCount === "number") {
          setConversationCount(nextCount);
          return;
        }

        if (!response.ok || (data.error && data.error !== "No Instagram account connected")) {
          throw new Error(data.error || "Could not load conversation count");
        }

        setConversationCount(0);
      } catch {
        if (isMounted) {
          setConversationCount(null);
        }
      }
    }

    const handleWindowFocus = () => void loadConversationCount();
    const timeout = window.setTimeout(() => void loadConversationCount(), 0);
    const interval = window.setInterval(() => void loadConversationCount(), 15000);

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

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
    return <SuperAdminDashboard profile={accountProfile} />;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#fdfdff] font-sans text-black">
      <Sidebar
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        profile={accountProfile}
        navigationCounts={{
          inbox: conversationCount,
          opportunities: opportunities.length,
          escalations: escalationItems.length,
        }}
      />

      {!canOpenDashboardTab(accountProfile, activeTab) ? (
        <RestrictedPage />
      ) : activeTab === "dashboard" ? (
        <DashboardOverview profile={accountProfile} />
      ) : activeTab === "opportunities" ? (
        <OpportunitiesPage />
      ) : activeTab === "audience" ? (
        <AudiencePage />
      ) : activeTab === "knowledge" ? (
        <KnowledgeBasePage />
      ) : activeTab === "escalations" ? (
        <EscalationsPage />
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
