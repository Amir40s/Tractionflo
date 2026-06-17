"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
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
  Trash2,
  UploadCloud,
  User,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Inbox from "../components/Inbox";
import InstagramContentPage from "../components/InstagramContentPage";
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
import {
  defaultNotificationSettings,
  dispatchNotificationPreferencesChanged,
  getDefaultNotificationValue,
  getNotificationOptions,
  normalizeNotificationSettings,
  settingsStateStorageKey,
  type NotificationSetting,
} from "@/lib/notification-preferences";
import type { KnowledgeQaPair, KnowledgeSourceChunk, KnowledgeSourceSummary } from "@/lib/knowledge-base";

type DashboardTab =
  | "dashboard"
  | "inbox"
  | "instagram-content"
  | "opportunities"
  | "audience"
  | "knowledge"
  | "escalations"
  | "analytics"
  | "settings";

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
  | "profile"
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
  | "integrations"
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
  "instagram-content": "/instagram-content",
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
  "profile",
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
  stage?: string;
  urgency?: "High" | "Medium" | "Low";
  intent?: string;
  interestLevel?: string;
  qualificationFacts?: { label: string; value: string }[];
  signals?: string[];
  missing?: string[];
  recommendedAction?: string;
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

type RecentActivityItem = {
  title: string;
  subtitle: string;
  time: string;
  icon: LucideIcon;
  tone: string;
  meta?: string;
};

type CreatorLiveSummary = {
  instagramAccount: ConnectedInstagramAccount | null;
  hasInstagramConnection: boolean;
  conversations: InstagramSettingsConversation[];
  totalConversationCount: number;
  totalMessageCount: number;
  inboundMessageCount: number;
  outboundMessageCount: number;
  dateRangeLabel: string;
  estimatedRevenue: number;
  opportunityCount: number;
  escalationCount: number;
  dashboardOpportunities: Opportunity[];
  dashboardPipeline: PipelineStep[];
  recentActivity: RecentActivityItem[];
  opportunityTabs: { label: string; count: string; icon: LucideIcon }[];
  opportunityMetrics: { label: string; value: string; change: string; icon: LucideIcon }[];
  opportunityCards: OpportunityPageCard[];
  audienceMetrics: AudienceMetric[];
  audienceSources: AudienceSource[];
  topAudience: AudienceProfile[];
  audienceSegments: AudienceSegment[];
  knowledgeTabs: KnowledgeTab[];
  knowledgeSources: KnowledgeSource[];
  knowledgeInsights: KnowledgeInsight[];
  knowledgeUpdates: KnowledgeUpdate[];
  knowledgeTrainingPercent: number;
  escalations: EscalationItem[];
  escalationTabs: EscalationTab[];
  escalationDetailRows: EscalationDetailRow[];
};

type KnowledgeTabLabel =
  | "All Sources"
  | "FAQs"
  | "Products"
  | "Services"
  | "Pricing"
  | "Business Info"
  | "PDFs";

type KnowledgeTab = {
  label: KnowledgeTabLabel;
  count: string;
  icon: LucideIcon;
};

type KnowledgeSource = {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  kind: KnowledgeSourceSummary["kind"];
  fileName: string;
  mimeType: string;
  fileSize: number;
  characterCount: number;
  sourceMode: "auto" | "manual";
  sourceModeLabel: string;
  status: string;
  statusTone: string;
  updated: string;
  tone: string;
  typeTone: string;
  icon: LucideIcon;
  directAnswerCount: number;
  active: boolean;
  wordCount: number;
  chunkCount: number;
  categories: string[];
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

type KnowledgeSourcesResponse = {
  assistantId?: string;
  assistant_id?: string;
  source?: KnowledgeSourceSummary;
  sources?: KnowledgeSourceSummary[];
  error?: string;
};

type KnowledgeSourceDetail = KnowledgeSourceSummary & {
  chunks: KnowledgeSourceChunk[];
  qaPairs: KnowledgeQaPair[];
};

type KnowledgeSourceDetailResponse = {
  source?: KnowledgeSourceSummary;
  detail?: KnowledgeSourceDetail;
  error?: string;
};

type KnowledgeViewTab =
  | "overview"
  | "section:FAQs"
  | "section:Products"
  | "section:Services"
  | "section:Pricing"
  | "section:Business Information"
  | "text"
  | "details";

type ManualFaqPair = {
  id: string;
  question: string;
  answer: string;
};

type ManualKnowledgeDraft = {
  title: string;
  category: string;
  content: string;
  faqPairs: ManualFaqPair[];
  categoryContent: Record<string, string>;
  categoryFaqPairs: Record<string, ManualFaqPair[]>;
};

type ManualKnowledgeSectionPayload = {
  category: string;
  content: string;
  title: string;
};

type KnowledgeAssignmentValue = KnowledgeSourceSummary["assignment"];

const knowledgeCategoryOptions = [
  "FAQs",
  "Products",
  "Services",
  "Pricing",
  "Business Information",
] as const;

function createManualFaqPair(): ManualFaqPair {
  return {
    id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: "",
    answer: "",
  };
}

function getEmptyManualCategoryContent() {
  return knowledgeCategoryOptions.reduce<Record<string, string>>((contentByCategory, category) => {
    contentByCategory[category] = "";
    return contentByCategory;
  }, {});
}

function normalizeManualFaqPairs(pairs: ManualFaqPair[]) {
  return pairs.length > 0 ? pairs : [createManualFaqPair()];
}

function createManualKnowledgeDraft(source?: { title?: string } | null): ManualKnowledgeDraft {
  const faqPairs = [createManualFaqPair()];

  return {
    title: source?.title || "",
    category: "FAQs",
    content: "",
    faqPairs,
    categoryContent: getEmptyManualCategoryContent(),
    categoryFaqPairs: {
      FAQs: faqPairs,
    },
  };
}

function getManualDraftCategoryContent(draft: ManualKnowledgeDraft, category = draft.category) {
  return draft.categoryContent[category] ?? (category === draft.category ? draft.content : "");
}

function getManualDraftCategoryFaqPairs(draft: ManualKnowledgeDraft, category = draft.category) {
  return normalizeManualFaqPairs(draft.categoryFaqPairs[category] || (category === draft.category ? draft.faqPairs : []));
}

function setManualDraftCategoryContent(draft: ManualKnowledgeDraft, category: string, content: string): ManualKnowledgeDraft {
  return {
    ...draft,
    content: category === draft.category ? content : draft.content,
    categoryContent: {
      ...draft.categoryContent,
      [category]: content,
    },
  };
}

function setManualDraftCategoryFaqPairs(draft: ManualKnowledgeDraft, category: string, faqPairs: ManualFaqPair[]): ManualKnowledgeDraft {
  const nextPairs = normalizeManualFaqPairs(faqPairs);

  return {
    ...draft,
    faqPairs: category === draft.category ? nextPairs : draft.faqPairs,
    categoryFaqPairs: {
      ...draft.categoryFaqPairs,
      [category]: nextPairs,
    },
  };
}

function switchManualKnowledgeDraftCategory(draft: ManualKnowledgeDraft, category: string): ManualKnowledgeDraft {
  const categoryContent = {
    ...draft.categoryContent,
    [draft.category]: draft.content,
  };
  const categoryFaqPairs = {
    ...draft.categoryFaqPairs,
    [draft.category]: draft.faqPairs,
  };
  const nextFaqPairs = normalizeManualFaqPairs(categoryFaqPairs[category] || []);

  return {
    ...draft,
    category,
    content: categoryContent[category] || "",
    faqPairs: nextFaqPairs,
    categoryContent,
    categoryFaqPairs,
  };
}

function getManualKnowledgeDraftContent(draft: ManualKnowledgeDraft) {
  if (draft.category !== "FAQs") {
    return getManualDraftCategoryContent(draft).trim();
  }

  return getManualDraftCategoryFaqPairs(draft)
    .map((pair) => ({
      question: pair.question.trim(),
      answer: pair.answer.trim(),
    }))
    .filter((pair) => pair.question || pair.answer)
    .map((pair) => `Question: ${pair.question}\nAnswer: ${pair.answer}`)
    .join("\n\n")
    .trim();
}

function getManualKnowledgeDraftCategoryContent(draft: ManualKnowledgeDraft, category: string) {
  if (category !== "FAQs") {
    return getManualDraftCategoryContent(draft, category).trim();
  }

  return getManualDraftCategoryFaqPairs(draft, category)
    .map((pair) => ({
      question: pair.question.trim(),
      answer: pair.answer.trim(),
    }))
    .filter((pair) => pair.question || pair.answer)
    .map((pair) => `Question: ${pair.question}\nAnswer: ${pair.answer}`)
    .join("\n\n")
    .trim();
}

function getManualKnowledgeDraftSections(draft: ManualKnowledgeDraft): ManualKnowledgeSectionPayload[] {
  return knowledgeCategoryOptions
    .map((category) => ({
      category,
      title: draft.title || category,
      content: getManualKnowledgeDraftCategoryContent(draft, category),
    }))
    .filter((section) => section.content.length >= 10);
}

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

type BrowserNotificationPermission = "default" | "granted" | "denied" | "unsupported";

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

type PricingPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  status: "active" | "hidden";
  features: string[];
  cta: string;
};

type PricingResponse = {
  plans?: PricingPlan[];
  error?: string;
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

type BookingSheetRoute = {
  id: string;
  name: string;
  bookingType: string;
  sheetUrl: string;
  worksheetName: string;
  enabled: boolean;
  confirmedOnly: boolean;
  lastSync: string;
};

type BookingIntegrationSettings = {
  syncEnabled: boolean;
  routes: BookingSheetRoute[];
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
  bookingIntegrations: BookingIntegrationSettings;
  api: ApiSettings;
  security: SecuritySettings;
  brand: BrandSettings;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, tab: "dashboard" },
  { label: "Conversations", icon: MessageSquare, tab: "inbox" },
  { label: "Posts & Stories", icon: Heart, tab: "instagram-content" },
  { label: "Leads", icon: Target, tab: "opportunities" },
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

const settingsMenuItems: SettingsMenuItem[] = [
  { id: "account", label: "Account", detail: "Profile, plan and billing", icon: User },
  { id: "instagram", label: "Instagram", detail: "Connect & manage", icon: MessageSquare },
  { id: "integrations", label: "Integrations", detail: "Booking sheets & exports", icon: Database },
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
  notifications: defaultNotificationSettings,
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
  bookingIntegrations: {
    syncEnabled: true,
    routes: [
      {
        id: "cricket-ground",
        name: "Cricket ground bookings",
        bookingType: "Cricket ground booking",
        sheetUrl: "",
        worksheetName: "Cricket Confirmed",
        enabled: true,
        confirmedOnly: true,
        lastSync: "Not synced yet",
      },
      {
        id: "padel-ground",
        name: "Padel ground bookings",
        bookingType: "Padel ground booking",
        sheetUrl: "",
        worksheetName: "Padel Confirmed",
        enabled: true,
        confirmedOnly: true,
        lastSync: "Not synced yet",
      },
      {
        id: "all-confirmed",
        name: "All confirmed bookings",
        bookingType: "All confirmed bookings",
        sheetUrl: "",
        worksheetName: "Confirmed Bookings",
        enabled: false,
        confirmedOnly: true,
        lastSync: "Not synced yet",
      },
    ],
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

function mergeBookingSheetRoutes(stored?: Partial<BookingSheetRoute>[]) {
  if (!Array.isArray(stored)) {
    return defaultSettingsState.bookingIntegrations.routes;
  }

  const defaultIds = new Set(defaultSettingsState.bookingIntegrations.routes.map((route) => route.id));
  const mergedDefaults = defaultSettingsState.bookingIntegrations.routes.map((route) => ({
    ...route,
    ...(stored.find((storedRoute) => storedRoute?.id === route.id) || {}),
  }));
  const customRoutes = stored
    .filter((route): route is Partial<BookingSheetRoute> & { id: string } => Boolean(route?.id && !defaultIds.has(route.id)))
    .map((route) => ({
      id: route.id,
      name: route.name || "Custom booking sheet",
      bookingType: route.bookingType || "Custom booking type",
      sheetUrl: route.sheetUrl || "",
      worksheetName: route.worksheetName || "Confirmed Bookings",
      enabled: route.enabled !== false,
      confirmedOnly: route.confirmedOnly !== false,
      lastSync: route.lastSync || "Not synced yet",
    }));

  return [...mergedDefaults, ...customRoutes];
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
    notifications: normalizeNotificationSettings(storedValue.notifications),
    team: Array.isArray(storedValue.team) && storedValue.team.length > 0 ? storedValue.team : defaultSettingsState.team,
    billing: {
      ...defaultSettingsState.billing,
      ...storedValue.billing,
    },
    bookingIntegrations: {
      ...defaultSettingsState.bookingIntegrations,
      ...storedValue.bookingIntegrations,
      routes: mergeBookingSheetRoutes(storedValue.bookingIntegrations?.routes),
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
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[14px] border border-[#e0e4ef] bg-white/95 p-1.5 shadow-[0_18px_60px_rgba(20,28,53,0.18)] backdrop-blur sm:grid-cols-9 lg:hidden">
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

const superAdminTablePageSize = 10;

type AdminDateRangePreset = "7d" | "30d" | "90d";

const adminDateRangeOptions: { value: AdminDateRangePreset; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

type SuperAdminConnectedAccountApiRow = {
  id: string;
  name: string;
  detail: string;
  plan: string;
  instagram: string;
  lastActive: string;
  conversations?: string;
  messages: string;
  opportunities?: string;
  revenue: string;
  status: string;
  statusTone: SuperAdminTableRow["statusTone"];
  createdAt?: string | null;
  lastActiveAt?: string | null;
  accountStatus?: "active" | "trial" | "inactive" | "cancelled";
  owner?: string;
  revenueAmount?: number;
  opportunityCount?: number;
  riskLevel?: "High" | "Medium" | "Low";
  riskSignal?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  invoiceId?: string;
  billingDate?: string | null;
  refundAmount?: number;
  refundReason?: string;
  refundStatus?: string;
  source?: "creator" | "instagram";
};

type SuperAdminConnectedAccountsResponse = {
  metrics?: {
    totalConnected: number;
    healthyTokens: number;
    expiredTokens: number;
    disconnected: number;
    reconnectRequired: number;
    automationReady: number;
    creatorAccounts: number;
    totalMessages: number;
    totalConversations?: number;
    totalOpportunities?: number;
    activeCreators?: number;
    trialAccounts?: number;
    paidAccounts?: number;
    mrr?: number;
    arr?: number;
    newSignups?: number;
    statusBreakdown?: {
      active: number;
      trial: number;
      inactive: number;
      cancelled: number;
    };
    signupSeries?: number[];
    mrrSeries?: number[];
    platformHealth?: {
      label: string;
      status: string;
      tone: "green" | "amber" | "red" | "purple";
    }[];
  };
  rows?: SuperAdminConnectedAccountApiRow[];
  health?: {
    reconnectRequired: number;
    automationReady: number;
  };
  error?: string;
};

type SuperAdminPlatformResponse = {
  metrics?: {
    instagramAccounts: number;
    messagesStored: number;
    messagesToday: number;
    latestWebhookAt?: number | null;
    databaseLatencyMs: number;
    databaseHealthy: boolean;
    metaConfigured: boolean;
    webhookConfigured: boolean;
    openAiConfigured: boolean;
    emailConfigured: boolean;
    paymentConfigured: boolean;
    healthyServices: number;
    warningServices: number;
    pendingJobs: number;
    processedToday: number;
    retries: number;
    failedJobs: number;
    manualReview: number;
  };
  services?: {
    name: string;
    detail: string;
    status: string;
    tone: SuperAdminTableRow["statusTone"];
    latency: string;
    config: string;
    incidents: string;
    owner: string;
  }[];
  queues?: {
    name: string;
    detail: string;
    queue: string;
    pending: string;
    oldest: string;
    retries: string;
    worker: string;
    status: string;
    tone: SuperAdminTableRow["statusTone"];
  }[];
  error?: string;
};

type SuperAdminAiTone = SuperAdminTableRow["statusTone"];

type SuperAdminAiUsageRow = {
  name: string;
  detail: string;
  messages: number;
  replies: number;
  opportunities: number;
  escalations: number;
  health: string;
  status: string;
  tone: SuperAdminAiTone;
};

type SuperAdminAiCostRow = {
  name: string;
  detail: string;
  spend: number;
  tokens: number;
  replies: number;
  costPerReply: number;
  trend: string;
  status: string;
  tone: SuperAdminAiTone;
};

type SuperAdminAiEscalationRow = {
  name: string;
  detail: string;
  reason: string;
  count: number;
  avgTime: string;
  owner: string;
  trend: string;
  status: string;
  tone: SuperAdminAiTone;
};

type SuperAdminAiResponse = {
  metrics?: {
    creators: number;
    configuredCreators: number;
    autoSendCreators: number;
    totalMessages: number;
    messagesToday: number;
    aiReadyMessages: number;
    opportunitySignals: number;
    handoffSignals: number;
    urgentSignals: number;
    humanRequestedSignals: number;
    trackedReplies: number;
    trackedSpend: number;
    trackedTokens: number;
    estimatedTokens: number;
    grossMargin: number;
    replyLogsStored: boolean;
    spendLogsStored: boolean;
    messagesTableAvailable: boolean;
    messagesTableError?: string;
    workflows: {
      startConversation: number;
      answerQuestions: number;
      qualifyLeads: number;
      moveToCta: number;
    };
  };
  usage?: SuperAdminAiUsageRow[];
  costs?: SuperAdminAiCostRow[];
  escalations?: SuperAdminAiEscalationRow[];
  error?: string;
};

type SuperAdminSupportTone = SuperAdminTableRow["statusTone"];

type SuperAdminSupportTicketRow = {
  id: string;
  name: string;
  detail: string;
  priority: string;
  topic: string;
  age: string;
  assignee: string;
  sla: string;
  status: string;
  tone: SuperAdminSupportTone;
};

type SuperAdminSupportIssueRow = {
  id: string;
  name: string;
  detail: string;
  category: string;
  impact: string;
  age: string;
  owner: string;
  nextStep: string;
  status: string;
  tone: SuperAdminSupportTone;
};

type SuperAdminSupportResponse = {
  metrics?: {
    openTickets: number;
    inProgressTickets: number;
    resolvedToday: number;
    satisfaction: string;
    creatorIssues: number;
    productIssues: number;
    onboardingIssues: number;
    resolvedIssuesToday: number;
    supportSignals: number;
    messageRows: number;
    ticketTableAvailable: boolean;
    ticketTableName: string;
    ticketTableError: string;
    issueTableAvailable: boolean;
    issueTableName: string;
    issueTableError: string;
    messagesTableAvailable: boolean;
    messagesTableError: string;
    avgResponse: string;
    firstResponse: string;
    platformBlockers: number;
    successFollowUp: number;
  };
  tickets?: SuperAdminSupportTicketRow[];
  issues?: SuperAdminSupportIssueRow[];
  error?: string;
};

async function readDashboardJsonResponse<T extends { error?: string }>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const body = await response.text().catch(() => "");
    const lowerBody = body.toLowerCase();
    const redirectedToLogin = response.redirected || response.url.includes("/login") || lowerBody.includes("<!doctype");

    throw new Error(redirectedToLogin ? "Your session expired. Please sign in again." : fallbackMessage);
  }

  const payload = (await response.json()) as T;

  if (!response.ok || payload.error) {
    throw new Error(payload.error || fallbackMessage);
  }

  return payload;
}

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
  profile: {
    title: "Superadmin Profile",
    subtitle: "Update your profile details, login email, and Cloudinary profile image.",
  },
  settings: {
    title: "Settings",
    subtitle: "Superadmin controls, workspace preferences, and platform defaults.",
  },
};

const statusToneClasses = {
  green: "bg-[#e8f8ed] text-[#0a9b3f]",
  amber: "bg-[#fff4df] text-[#c07800]",
  red: "bg-[#fff0f3] text-[#df405b]",
  purple: "bg-[#f0edff] text-[#4b3cff]",
};

const superAdminDetailConfigs: Record<Exclude<SuperAdminPage, "overview" | "profile" | "settings">, SuperAdminDetailConfig> = {
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
      <span className="rounded-[5px] bg-[#5b38ff] px-2.5 py-1 text-[10px] font-extrabold text-white">Superadmin</span>
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
    <aside className="sticky top-0 hidden h-screen min-h-screen w-[260px] shrink-0 flex-col overflow-hidden bg-[#071022] px-4 py-5 text-white lg:flex">
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
        <button
          type="button"
          onClick={() => onChangePage("profile")}
          className={`flex h-[58px] w-full items-center gap-3 rounded-[10px] px-3 text-left transition ${
            activePage === "profile" ? "bg-[#5b38ff] shadow-[0_16px_35px_rgba(91,56,255,0.28)]" : "bg-white/6 hover:bg-white/10"
          }`}
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
              {initials || "SA"}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-extrabold text-white">{profile.name || "Super Admin"}</span>
            <span className="block truncate text-[11px] font-semibold text-[#9faac0]">Super Admin</span>
          </span>
          <ChevronRight size={15} className="text-[#9faac0]" strokeWidth={2.4} />
        </button>

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

function SuperAdminHeader({
  page,
  dateRangePreset,
  isAutoRefreshOn,
  exportStatus,
  onDateRangeChange,
  onAutoRefreshChange,
  onExport,
}: {
  page: SuperAdminPage;
  dateRangePreset: AdminDateRangePreset;
  isAutoRefreshOn: boolean;
  exportStatus?: string;
  onDateRangeChange: (preset: AdminDateRangePreset) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onExport: () => void;
}) {
  const meta = superAdminPageMeta[page];
  const dateRangeLabel = getAdminDateRangeLabel(dateRangePreset);

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
        <label className="relative flex h-11 cursor-pointer items-center gap-3 rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)]">
          <span>{dateRangeLabel}</span>
          <CalendarDays size={16} strokeWidth={2.3} />
          <select
            aria-label="Dashboard date range"
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
        <label className="relative flex h-11 cursor-pointer items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)]">
          <span className={`h-2.5 w-2.5 rounded-full ${isAutoRefreshOn ? "bg-[#13a84f]" : "bg-[#98a2b3]"}`} />
          Auto refresh: {isAutoRefreshOn ? "On" : "Off"}
          <ChevronDown size={14} strokeWidth={2.4} />
          <select
            aria-label="Auto refresh"
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
          onClick={onExport}
          className="flex h-11 items-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)]"
        >
          <Download size={15} strokeWidth={2.4} />
          {exportStatus || "Export"}
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

function AdminLineChart({ bars = false, values }: { bars?: boolean; values?: number[] }) {
  if (bars) {
    const chartValues = values?.length ? values : [14, 34, 11, 28, 16, 38, 19, 26, 51, 18, 13, 45, 24, 31, 55, 20, 36, 27, 48, 62];
    const maxValue = Math.max(...chartValues, 1);

    return (
      <div className="flex h-[190px] items-end gap-2 rounded-[8px] bg-[#fbfbff] px-4 pb-5 pt-3">
        {chartValues.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="flex-1 rounded-t-[5px] bg-gradient-to-t from-[#5b38ff] to-[#9a89ff]"
            style={{ height: `${Math.max(8, (value / maxValue) * 160)}px` }}
          />
        ))}
      </div>
    );
  }

  const chartValues = values?.length ? values : [102000, 112000, 118000, 124000, 138000, 156000, 174000, 188000, 198000, 216928];
  const maxValue = Math.max(...chartValues, 1);
  const minValue = Math.min(...chartValues);
  const range = Math.max(1, maxValue - minValue);
  const width = 640;
  const height = 230;
  const points = chartValues.map((value, index) => {
    const x = chartValues.length === 1 ? width / 2 : 24 + (index / (chartValues.length - 1)) * (width - 48);
    const y = height - 35 - ((value - minValue) / range) * 155;
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1]?.x.toFixed(1) || width - 24} 220 L ${points[0]?.x.toFixed(1) || 24} 220 Z`;

  return (
    <div className="relative h-[230px] rounded-[8px] bg-[#fbfbff]">
      <svg viewBox="0 0 640 230" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="adminMrrFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5b38ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#5b38ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#adminMrrFill)" />
        <path d={path} fill="none" stroke="#5b38ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" fill="#5b38ff" />
        ))}
      </svg>
    </div>
  );
}

function AdminDonut({
  label,
  value,
  segments,
}: {
  label: string;
  value: string;
  segments?: { value: number; color: string }[];
}) {
  const total = segments?.reduce((sum, segment) => sum + segment.value, 0) || 0;
  let cursor = 0;
  const background = total > 0 && segments?.length
    ? `conic-gradient(${segments
        .map((segment) => {
          const start = cursor;
          const end = cursor + (segment.value / total) * 100;
          cursor = end;
          return `${segment.color} ${start}% ${end}%`;
        })
        .join(", ")})`
    : "conic-gradient(#e9edf5 0 100%)";

  return (
    <div className="flex items-center justify-center py-4">
      <div
        className="relative flex h-[154px] w-[154px] items-center justify-center rounded-full"
        style={{ background }}
      >
        <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-white">
          <span className="text-[24px] font-extrabold text-black">{value}</span>
          <span className="text-[11px] font-semibold text-[#687089]">{label}</span>
        </div>
      </div>
    </div>
  );
}

function formatAdminNumber(value?: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatAdminCurrency(value?: number, compact = false) {
  if (compact && value && value >= 1000000) {
    return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  }

  return `$${formatAdminNumber(value || 0)}`;
}

function formatAdminMoneyPrecise(value?: number, decimals = 2) {
  const amount = value || 0;

  if (amount === 0) {
    return "$0";
  }

  return `$${amount.toFixed(decimals)}`;
}

function formatAdminTrackedSpend(value?: number) {
  const amount = value || 0;

  if (amount > 0 && amount < 0.01) {
    return formatAdminMoneyPrecise(amount, 4);
  }

  return amount > 0 ? formatAdminMoneyPrecise(amount) : "$0";
}

function formatAdminTokenVolume(value?: number) {
  const tokens = value || 0;

  if (tokens >= 1000000000) {
    return `${(tokens / 1000000000).toFixed(1)}B`;
  }

  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(tokens >= 10000000 ? 0 : 1)}M`;
  }

  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(tokens >= 10000 ? 0 : 1)}K`;
  }

  return formatAdminNumber(tokens);
}

function getAdminRangeOption(preset: AdminDateRangePreset) {
  return adminDateRangeOptions.find((option) => option.value === preset) || adminDateRangeOptions[0];
}

function getAdminDateRangeLabel(preset: AdminDateRangePreset = "7d") {
  const range = getAdminRangeOption(preset);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (range.days - 1));

  return `${startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getAdminRangeLabel(preset: AdminDateRangePreset) {
  return getAdminRangeOption(preset).label;
}

function formatAdminPercent(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

function getPlatformHealthToneClass(tone: "green" | "amber" | "red" | "purple") {
  if (tone === "green") {
    return "text-[#13a84f]";
  }

  if (tone === "red") {
    return "text-[#df405b]";
  }

  if (tone === "purple") {
    return "text-[#4b3cff]";
  }

  return "text-[#c07800]";
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

function SuperAdminOverviewPage({
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
            <button
              type="button"
              onClick={() => onNavigate("support-issues")}
              className="relative flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.035)] sm:h-[52px] sm:w-[52px]"
              aria-label="Superadmin notifications"
            >
              <Bell size={20} strokeWidth={2.3} />
              {summary.notificationCount > 0 ? <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#4b3cff]" /> : null}
            </button>
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

function SuperAdminPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, page * pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((pageNumber) => {
    if (totalPages <= 5) {
      return true;
    }

    return pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1;
  });

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] font-bold text-[#46506a]">
        Showing {formatAdminNumber(startItem)}-{formatAdminNumber(endItem)} of {formatAdminNumber(totalItems)} records
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold text-[#30384d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Previous
        </button>
        {pageNumbers.map((pageNumber, index) => {
          const previousPageNumber = pageNumbers[index - 1];
          const hasGap = typeof previousPageNumber === "number" && pageNumber - previousPageNumber > 1;

          return (
            <span key={pageNumber} className="flex items-center gap-2">
              {hasGap ? <span className="text-[12px] font-extrabold text-[#8a92a6]">...</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={`flex h-9 min-w-9 items-center justify-center rounded-[8px] px-3 text-[12px] font-extrabold ${
                  pageNumber === page
                    ? "bg-[#3044ff] text-white shadow-[0_12px_28px_rgba(48,68,255,0.22)]"
                    : "border border-[#e0e4ef] bg-white text-[#30384d]"
                }`}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold text-[#30384d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
          <ChevronRight size={14} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

function SuperAdminTable({ config }: { config: SuperAdminDetailConfig }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(config.rows.length / superAdminTablePageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * superAdminTablePageSize;
  const visibleRows = config.rows.slice(startIndex, startIndex + superAdminTablePageSize);

  return (
    <div>
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
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${row.name}-${startIndex + rowIndex}`} className="border-b border-[#edf0f6] last:border-b-0">
                <td className="py-4">
                  <p className="font-extrabold text-black">{row.name}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#687089]">{row.detail}</p>
                </td>
                {row.values.map((value, index) => (
                  <td key={`${row.name}-${startIndex + rowIndex}-${index}`} className="py-4 font-bold text-[#30384d]">{value}</td>
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
      <SuperAdminPagination
        page={safePage}
        totalItems={config.rows.length}
        pageSize={superAdminTablePageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

function SuperAdminConnectedAccountsPage({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchConnectedAccounts = useCallback(async () => {
    const response = await fetch("/api/admin/connected-accounts", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(response, "Could not load connected accounts");
  }, []);

  const loadConnectedAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchConnectedAccounts();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load connected accounts");
    } finally {
      setIsLoading(false);
    }
  }, [fetchConnectedAccounts]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialConnectedAccounts() {
      try {
        const nextData = await fetchConnectedAccounts();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load connected accounts");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialConnectedAccounts();

    return () => {
      isMounted = false;
    };
  }, [fetchConnectedAccounts, refreshKey]);

  const metrics = data?.metrics;
  const rows = data?.rows || [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (!normalizedQuery) {
      return true;
    }

    return [row.name, row.detail, row.plan, row.instagram, row.status]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const numberFormatter = new Intl.NumberFormat("en-US");
  const metricCards: SuperAdminMetric[] = [
    {
      label: "Total connected",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.totalConnected || 0),
      detail: "Instagram accounts",
      change: `${numberFormatter.format(metrics?.creatorAccounts || 0)} creator accounts`,
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: Globe2,
    },
    {
      label: "Healthy tokens",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.healthyTokens || 0),
      detail: "Ready for automation",
      change: `${numberFormatter.format(metrics?.automationReady || 0)} automation ready`,
      tone: "bg-[#eafaf0] text-[#13a84f]",
      icon: Check,
    },
    {
      label: "Expired tokens",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.expiredTokens || 0),
      detail: "Need reconnect",
      change: `${numberFormatter.format(metrics?.reconnectRequired || 0)} total issues`,
      tone: "bg-[#fff4df] text-[#c07800]",
      icon: Clock,
    },
    {
      label: "Disconnected",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.disconnected || 0),
      detail: "No active Instagram link",
      change: `${numberFormatter.format(metrics?.totalMessages || 0)} tracked messages`,
      tone: "bg-[#fff0f3] text-[#df405b]",
      icon: TriangleAlert,
    },
  ];
  const tableConfig: SuperAdminDetailConfig = {
    metrics: [],
    columns: ["Plan", "Instagram", "Last active", "Messages", "Revenue"],
    rows: filteredRows.map((row) => ({
      name: row.name,
      detail: row.detail,
      values: [row.plan, row.instagram, row.lastActive, row.messages, row.revenue],
      status: row.status,
      statusTone: row.statusTone,
    })),
    insightTitle: "Account health",
    insightItems: [],
  };
  const reconnectRequired = data?.health?.reconnectRequired || 0;
  const automationReady = data?.health?.automationReady || 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-black">Connected Accounts activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">
                Real creator accounts and Instagram token status from Supabase.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadConnectedAccounts()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : tableConfig.rows.length > 0 ? (
            <SuperAdminTable config={tableConfig} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">
                {isLoading ? "Loading real accounts..." : "No connected creator accounts found yet."}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading
                  ? "Checking Supabase Auth and Instagram token records."
                  : "Connect Instagram or create creator accounts to populate this table."}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">Account health</h2>
          <div className="mt-4 space-y-3">
            {[
              {
                label: "Reconnect required",
                value: numberFormatter.format(reconnectRequired),
                detail: "Expired, invalid, or missing Instagram tokens",
                tone: "bg-[#fff4df] text-[#c07800]",
                icon: RefreshCw,
              },
              {
                label: "Automation ready",
                value: numberFormatter.format(automationReady),
                detail: "Accounts with healthy token state",
                tone: "bg-[#eafaf0] text-[#13a84f]",
                icon: Check,
              },
            ].map((item) => {
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

function formatAdminDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAdminRowNumber(value?: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTrialSignal(row: SuperAdminConnectedAccountApiRow) {
  const messages = getAdminRowNumber(row.messages);
  const opportunities = getAdminRowNumber(row.opportunities);

  if (opportunities > 0) {
    return "Opportunity signals";
  }

  if (messages > 0) {
    return "Message activity";
  }

  if (row.instagram === "Connected") {
    return "Connected";
  }

  return "Setup pending";
}

function getChurnStatus(row: SuperAdminConnectedAccountApiRow) {
  if (row.riskLevel === "High") {
    return { label: "At risk", tone: "red" as const };
  }

  if (row.riskLevel === "Medium") {
    return { label: "Watch", tone: "amber" as const };
  }

  return { label: "Monitor", tone: "purple" as const };
}

function buildCreatorLifecycleConfig(
  page: "creators-trials" | "creators-churn",
  data: SuperAdminConnectedAccountsResponse | null,
  isLoading: boolean,
  query: string
) {
  const metrics = data?.metrics;
  const creatorRows = (data?.rows || []).filter((row) => row.source !== "instagram");
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (row: SuperAdminConnectedAccountApiRow) => {
    if (!normalizedQuery) {
      return true;
    }

    return [row.name, row.detail, row.plan, row.instagram, row.status, row.riskSignal, row.owner]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  };

  if (page === "creators-trials") {
    const trialRows = creatorRows
      .filter((row) => row.accountStatus === "trial" || row.plan.toLowerCase().includes("trial"))
      .filter(matchesQuery);
    const allTrialRows = creatorRows.filter((row) => row.accountStatus === "trial" || row.plan.toLowerCase().includes("trial"));
    const conversionReady = allTrialRows.filter((row) => row.instagram === "Connected" && (getAdminRowNumber(row.messages) > 0 || getAdminRowNumber(row.opportunities) > 0)).length;
    const needsActivation = allTrialRows.filter((row) => row.instagram !== "Connected" || getAdminRowNumber(row.messages) === 0).length;
    const expiringThisWeek = allTrialRows.filter((row) => {
      if (!row.createdAt) {
        return false;
      }

      const ageDays = (Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= 23 && ageDays <= 30;
    }).length;
    const trialPipeline = allTrialRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);

    return {
      config: {
        metrics: [
          { label: "Trial accounts", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.trialAccounts), detail: "Currently evaluating", change: `${formatAdminPercent(metrics?.trialAccounts || 0, metrics?.creatorAccounts || 0)} of creators`, tone: "bg-[#fff6e8] text-[#d98613]", icon: User },
          { label: "Conversion ready", value: isLoading && !metrics ? "..." : formatAdminNumber(conversionReady), detail: "High engagement trials", change: `${formatAdminNumber(conversionReady)} ready`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Target },
          { label: "Expiring this week", value: isLoading && !metrics ? "..." : formatAdminNumber(expiringThisWeek), detail: "Need outreach", change: "Based on signup age", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
          { label: "Trial pipeline", value: isLoading && !metrics ? "..." : formatAdminCurrency(trialPipeline, true), detail: "Potential MRR", change: "From metadata", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
        ],
        columns: ["Start", "Plan target", "Messages", "Signals", "Owner"],
        rows: trialRows.map((row) => {
          const ready = row.instagram === "Connected" && (getAdminRowNumber(row.messages) > 0 || getAdminRowNumber(row.opportunities) > 0);

          return {
            name: row.name,
            detail: row.detail,
            values: [formatAdminDate(row.createdAt), row.plan, row.messages, getTrialSignal(row), row.owner || "Success"],
            status: ready ? "Ready" : "Trial",
            statusTone: ready ? "green" as const : "amber" as const,
          };
        }),
        insightTitle: "Trial actions",
        insightItems: [
          { label: "Needs activation", value: formatAdminNumber(needsActivation), detail: "Trials with low first-week usage", tone: "bg-[#fff4df] text-[#c07800]", icon: Play },
          { label: "Upgrade nudges", value: formatAdminNumber(conversionReady), detail: "Trials ready for payment follow-up", tone: "bg-[#eafaf0] text-[#13a84f]", icon: ArrowRight },
        ],
      },
      emptyText: "No real trial accounts found.",
    };
  }

  const allRiskRows = creatorRows.filter((row) => row.riskSignal && row.riskSignal !== "Healthy");
  const riskRows = allRiskRows.filter(matchesQuery);
  const lowUsage = allRiskRows.filter((row) => row.riskSignal?.toLowerCase().includes("low") || row.riskSignal?.toLowerCase().includes("no activity")).length;
  const failedPayment = allRiskRows.filter((row) => row.riskSignal?.toLowerCase().includes("failed")).length;
  const recovered = creatorRows.filter((row) => row.accountStatus === "active" && row.riskSignal === "Healthy").length;
  const revenueAtRisk = allRiskRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);

  return {
    config: {
      metrics: [
        { label: "At-risk creators", value: isLoading && !metrics ? "..." : formatAdminNumber(allRiskRows.length), detail: "Usage or billing risk", change: "Real signals", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        { label: "Low usage", value: isLoading && !metrics ? "..." : formatAdminNumber(lowUsage), detail: "No activity in 7 days", change: "Needs review", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
        { label: "Failed payment", value: isLoading && !metrics ? "..." : formatAdminNumber(failedPayment), detail: "Card action needed", change: formatAdminCurrency(allRiskRows.filter((row) => row.riskSignal?.toLowerCase().includes("failed")).reduce((sum, row) => sum + (row.revenueAmount || 0), 0)), tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
        { label: "Recovered", value: isLoading && !metrics ? "..." : formatAdminNumber(recovered), detail: "Healthy active creators", change: "No risk signal", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
      ],
      columns: ["Risk", "Plan", "MRR", "Last signal", "Owner"],
      rows: riskRows.map((row) => {
        const status = getChurnStatus(row);

        return {
          name: row.name,
          detail: row.detail,
          values: [row.riskLevel || "Low", row.plan, formatAdminCurrency(row.revenueAmount), row.riskSignal || "Healthy", row.owner || "Success"],
          status: status.label,
          statusTone: status.tone,
        };
      }),
      insightTitle: "Retention queue",
      insightItems: [
        { label: "Save playbooks", value: formatAdminNumber(allRiskRows.length), detail: "Accounts queued for retention outreach", tone: "bg-[#f0edff] text-[#4b3cff]", icon: BriefcaseBusiness },
        { label: "Revenue at risk", value: formatAdminCurrency(revenueAtRisk, true), detail: "MRR attached to current risk signals", tone: "bg-[#fff0f3] text-[#df405b]", icon: DollarSign },
      ],
    },
    emptyText: "No real churn-risk accounts found.",
  };
}

type RevenueAdminPage = "revenue-subscriptions" | "revenue-payments" | "revenue-refunds";

function getCreatorAdminRows(data: SuperAdminConnectedAccountsResponse | null) {
  return (data?.rows || []).filter((row) => row.source !== "instagram");
}

function getNormalizedStatus(value?: string) {
  return (value || "").trim().toLowerCase();
}

function formatAdminStatus(value?: string) {
  const normalized = getNormalizedStatus(value);

  if (!normalized) {
    return "Unpaid";
  }

  return normalized
    .split(/[\s_-]+/)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function isPaidAdminRow(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);
  return (row.revenueAmount || 0) > 0 || status === "paid" || status === "active";
}

function isFailedPaymentRow(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);
  return status.includes("failed") || status.includes("past_due") || row.riskSignal?.toLowerCase().includes("failed payment");
}

function isPendingPaymentRow(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);
  return status.includes("pending") || status.includes("processing");
}

function getPaymentTone(row: SuperAdminConnectedAccountApiRow): SuperAdminTableRow["statusTone"] {
  if (isFailedPaymentRow(row)) {
    return "red";
  }

  if (isPendingPaymentRow(row)) {
    return "amber";
  }

  if (isPaidAdminRow(row)) {
    return "green";
  }

  return "purple";
}

function getPaymentStatus(row: SuperAdminConnectedAccountApiRow) {
  if (isFailedPaymentRow(row)) {
    return "Failed";
  }

  if (isPendingPaymentRow(row)) {
    return "Processing";
  }

  if (isPaidAdminRow(row)) {
    return "Paid";
  }

  return formatAdminStatus(row.paymentStatus);
}

function getRetryLabel(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);

  if (status.includes("retry")) {
    return formatAdminStatus(row.paymentStatus);
  }

  if (isFailedPaymentRow(row)) {
    return "Needs retry";
  }

  return "None";
}

function getRefundRows(rows: SuperAdminConnectedAccountApiRow[]) {
  return rows.filter((row) => (row.refundAmount || 0) > 0 || Boolean(row.refundReason || row.refundStatus));
}

function isResolvedRefund(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.refundStatus);
  return status.includes("resolved") || status.includes("saved");
}

function isOpenRefund(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.refundStatus);
  return status.includes("open") || status.includes("review") || status.includes("dispute");
}

function getRefundTone(row: SuperAdminConnectedAccountApiRow): SuperAdminTableRow["statusTone"] {
  if (isResolvedRefund(row)) {
    return "green";
  }

  if (isOpenRefund(row)) {
    return "red";
  }

  return "amber";
}

function getPlanGroupKey(plan: string) {
  const normalized = plan.trim().toLowerCase();

  if (normalized.includes("founder")) return "Founder Plan";
  if (normalized.includes("pro")) return "Pro Plan";
  if (normalized.includes("starter")) return "Starter Plan";
  if (normalized.includes("trial")) return "Trial pool";

  return plan.trim() || "Creator";
}

function buildRevenueConfig(
  page: RevenueAdminPage,
  data: SuperAdminConnectedAccountsResponse | null,
  isLoading: boolean,
  query: string
) {
  const metrics = data?.metrics;
  const creatorRows = getCreatorAdminRows(data);
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);
  const paidRows = creatorRows.filter(isPaidAdminRow);
  const failedRows = creatorRows.filter(isFailedPaymentRow);
  const pendingRows = creatorRows.filter(isPendingPaymentRow);
  const totalMrr = paidRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);
  const churnedRows = creatorRows.filter((row) => row.accountStatus === "inactive" || row.accountStatus === "cancelled");
  const churnRate = creatorRows.length > 0 ? `${((churnedRows.length / creatorRows.length) * 100).toFixed(1)}%` : "0%";

  if (page === "revenue-subscriptions") {
    const groupedPlans = new Map<string, { name: string; count: number; mrr: number; active: number; trial: boolean }>();

    creatorRows.forEach((row) => {
      const name = getPlanGroupKey(row.plan);
      const current = groupedPlans.get(name) || {
        name,
        count: 0,
        mrr: 0,
        active: 0,
        trial: name.toLowerCase().includes("trial"),
      };

      current.count += 1;
      current.mrr += row.revenueAmount || 0;

      if (row.accountStatus === "active") {
        current.active += 1;
      }

      groupedPlans.set(name, current);
    });

    const planRows = Array.from(groupedPlans.values())
      .sort((first, second) => second.mrr - first.mrr || second.count - first.count)
      .filter((group) => matchesQuery([group.name, String(group.count), formatAdminCurrency(group.mrr)]));
    const paidGroupCounts = paidRows.reduce<Record<string, number>>((counts, row) => {
      const name = getPlanGroupKey(row.plan);
      counts[name] = (counts[name] || 0) + 1;
      return counts;
    }, {});
    const paidInsightItems = Object.entries(paidGroupCounts).sort((first, second) => second[1] - first[1]);

    return {
      config: {
        metrics: [
          { label: "MRR", value: isLoading && !metrics ? "..." : formatAdminCurrency(metrics?.mrr || totalMrr), detail: "Monthly recurring revenue", change: "From billing metadata", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
          { label: "ARR", value: isLoading && !metrics ? "..." : formatAdminCurrency(metrics?.arr || totalMrr * 12, true), detail: "Annual recurring revenue", change: "Annualized from MRR", tone: "bg-[#f0edff] text-[#4b3cff]", icon: CircleDollarSign },
          { label: "Paid accounts", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.paidAccounts || paidRows.length), detail: "Active subscriptions", change: `${formatAdminPercent(paidRows.length, creatorRows.length)} of creators`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
          { label: "Churn rate", value: isLoading && !metrics ? "..." : churnRate, detail: "Inactive or cancelled", change: `${formatAdminNumber(churnedRows.length)} accounts`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
        ],
        columns: ["Plan", "MRR", "Accounts", "Growth", "Retention"],
        rows: planRows.map((group) => ({
          name: group.name,
          detail: group.trial ? "Not billed yet" : `${formatAdminCurrency(group.count > 0 ? group.mrr / group.count : 0)} average MRR`,
          values: [
            group.name.replace(" Plan", ""),
            formatAdminCurrency(group.mrr),
            formatAdminNumber(group.count),
            "Live",
            group.trial ? "Pending" : formatAdminPercent(group.active, group.count),
          ],
          status: group.trial ? "Pipeline" : group.mrr > 0 ? "Strong" : "Monitor",
          statusTone: group.trial ? "purple" as const : group.mrr > 0 ? "green" as const : "amber" as const,
        })),
        insightTitle: "Revenue mix",
        insightItems: (paidInsightItems.length > 0
          ? paidInsightItems.slice(0, 2).map(([name, count]) => ({
              label: `${name.replace(" Plan", "")} share`,
              value: formatAdminPercent(count, paidRows.length),
              detail: "Of paid accounts",
              tone: name.toLowerCase().includes("pro") ? "bg-[#eaf4ff] text-[#246bff]" : "bg-[#f0edff] text-[#4b3cff]",
              icon: name.toLowerCase().includes("founder") ? Crown : Sparkles,
            }))
          : planRows.slice(0, 2).map((group) => ({
              label: `${group.name.replace(" Plan", "")} share`,
              value: formatAdminPercent(group.count, creatorRows.length),
              detail: "Of creators",
              tone: group.name.toLowerCase().includes("pro") ? "bg-[#eaf4ff] text-[#246bff]" : "bg-[#f0edff] text-[#4b3cff]",
              icon: group.name.toLowerCase().includes("founder") ? Crown : Sparkles,
            }))),
      },
      emptyText: "No real subscription records found.",
    };
  }

  if (page === "revenue-payments") {
    const paymentRows = creatorRows
      .filter((row) => isPaidAdminRow(row) || isFailedPaymentRow(row) || isPendingPaymentRow(row))
      .filter((row) => matchesQuery([row.name, row.detail, row.invoiceId || "", row.paymentStatus || "", row.paymentMethod || ""]));
    const recoveredRows = creatorRows.filter((row) => getNormalizedStatus(row.paymentStatus).includes("recover"));
    const processingAmount = pendingRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);
    const settledCount = paidRows.length;
    const settlementTotal = paidRows.length + failedRows.length + pendingRows.length;

    return {
      config: {
        metrics: [
          { label: "Successful charges", value: isLoading && !metrics ? "..." : formatAdminNumber(paidRows.length), detail: "Current paid users", change: formatAdminCurrency(totalMrr), tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Failed payments", value: isLoading && !metrics ? "..." : formatAdminNumber(failedRows.length), detail: "Needs retry", change: formatAdminCurrency(failedRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0)), tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
          { label: "Processing", value: isLoading && !metrics ? "..." : formatAdminCurrency(processingAmount), detail: "Pending settlement", change: `${formatAdminNumber(pendingRows.length)} accounts`, tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
          { label: "Recovered revenue", value: isLoading && !metrics ? "..." : formatAdminCurrency(recoveredRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0)), detail: "Dunning wins", change: `${formatAdminNumber(recoveredRows.length)} recovered`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
        ],
        columns: ["Amount", "Method", "Date", "Retry", "Owner"],
        rows: paymentRows.map((row) => ({
          name: row.name,
          detail: row.invoiceId ? `Invoice ${row.invoiceId}` : row.detail,
          values: [
            formatAdminCurrency(row.revenueAmount),
            row.paymentMethod || "Unknown",
            formatAdminDate(row.billingDate || row.createdAt),
            getRetryLabel(row),
            row.owner || "Billing",
          ],
          status: getPaymentStatus(row),
          statusTone: getPaymentTone(row),
        })),
        insightTitle: "Payment ops",
        insightItems: [
          { label: "Retry queue", value: formatAdminNumber(failedRows.length), detail: "Failed invoices in retry workflow", tone: "bg-[#fff0f3] text-[#df405b]", icon: RefreshCw },
          { label: "Settlement health", value: formatAdminPercent(settledCount, settlementTotal), detail: "Charges settled successfully", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Shield },
        ],
      },
      emptyText: "No real payment records found.",
    };
  }

  const refundRows = getRefundRows(creatorRows);
  const visibleRefundRows = refundRows.filter((row) =>
    matchesQuery([row.name, row.detail, row.refundReason || "", row.refundStatus || "", row.plan])
  );
  const refundTotal = refundRows.reduce((sum, row) => sum + (row.refundAmount || 0), 0);
  const savedRefunds = refundRows.filter(isResolvedRefund).reduce((sum, row) => sum + (row.refundAmount || 0), 0);
  const openRefunds = refundRows.filter(isOpenRefund);
  const reasonCounts = refundRows.reduce<Record<string, number>>((counts, row) => {
    const reason = row.refundReason || "Unspecified";
    counts[reason] = (counts[reason] || 0) + 1;
    return counts;
  }, {});
  const reasonItems = Object.entries(reasonCounts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 2);

  return {
    config: {
      metrics: [
        { label: "Refunds", value: isLoading && !metrics ? "..." : formatAdminCurrency(refundTotal), detail: "Recorded in metadata", change: `${formatAdminNumber(refundRows.length)} accounts`, tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
        { label: "Refund rate", value: isLoading && !metrics ? "..." : formatAdminPercent(refundTotal, metrics?.mrr || totalMrr), detail: "Of paid revenue", change: "Live metadata", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
        { label: "Open disputes", value: isLoading && !metrics ? "..." : formatAdminNumber(openRefunds.length), detail: "Needs evidence", change: "Review queue", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        { label: "Saved refunds", value: isLoading && !metrics ? "..." : formatAdminCurrency(savedRefunds), detail: "Resolved by support", change: `${formatAdminNumber(refundRows.filter(isResolvedRefund).length)} saved`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
      ],
      columns: ["Amount", "Reason", "Date", "Plan", "Owner"],
      rows: visibleRefundRows.map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [
          formatAdminCurrency(row.refundAmount),
          row.refundReason || "Unspecified",
          formatAdminDate(row.billingDate || row.createdAt),
          row.plan,
          row.owner || "Support",
        ],
        status: row.refundStatus ? formatAdminStatus(row.refundStatus) : "Open",
        statusTone: getRefundTone(row),
      })),
      insightTitle: "Refund reasons",
      insightItems: (reasonItems.length > 0 ? reasonItems : [["No refunds", 0] as [string, number]]).map(([label, value], index) => ({
        label,
        value: formatAdminPercent(value, Math.max(1, refundRows.length)),
        detail: index === 0 ? "Most common reason" : "Secondary reason",
        tone: index === 0 ? "bg-[#fff4df] text-[#c07800]" : "bg-[#f0edff] text-[#4b3cff]",
        icon: index === 0 ? CreditCard : SlidersHorizontal,
      })),
    },
    emptyText: "No real refund records found.",
  };
}

function SuperAdminPricingSection() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPricing() {
      try {
        const response = await fetch("/api/pricing", {
          cache: "no-store",
        });
        const data = (await response.json()) as PricingResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error || "Could not load pricing");
        }

        if (isMounted) {
          setPlans(data.plans || []);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Could not load pricing");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPricing();

    return () => {
      isMounted = false;
    };
  }, []);

  function updatePlan(planId: string, partial: Partial<PricingPlan>) {
    setPlans((current) => current.map((plan) => (plan.id === planId ? { ...plan, ...partial } : plan)));
  }

  async function savePricing() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/pricing", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plans }),
      });
      const data = (await response.json()) as PricingResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not save pricing");
      }

      setPlans(data.plans || plans);
      setMessage("Pricing saved. New purchases will use these prices.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save pricing");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-extrabold text-black">Pricing plans</h2>
          <p className="mt-1 text-[11px] font-semibold text-[#687089]">
            Prices here power creator checkout and admin revenue totals after purchase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void savePricing()}
          disabled={isSaving || isLoading}
          className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <Check size={14} strokeWidth={2.6} />}
          Save pricing
        </button>
      </div>

      {message && <p className="mt-3 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{message}</p>}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {(isLoading && plans.length === 0 ? Array.from({ length: 3 }) : plans).map((planValue, index) => {
          const plan = planValue as PricingPlan | undefined;

          if (!plan) {
            return (
              <div key={index} className="h-[210px] animate-pulse rounded-[9px] border border-[#edf0f6] bg-[#f6f7fb]" />
            );
          }

          return (
            <article key={plan.id} className="rounded-[9px] border border-[#edf0f6] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <input
                    value={plan.name}
                    onChange={(event) => updatePlan(plan.id, { name: event.target.value })}
                    className="w-full rounded-[7px] border border-transparent bg-transparent px-1 text-[14px] font-extrabold text-black outline-none focus:border-[#dfe4ee]"
                  />
                  <input
                    value={plan.description}
                    onChange={(event) => updatePlan(plan.id, { description: event.target.value })}
                    className="mt-1 w-full rounded-[7px] border border-transparent bg-transparent px-1 text-[11px] font-semibold text-[#687089] outline-none focus:border-[#dfe4ee]"
                  />
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${plan.status === "active" ? "bg-[#e8f8ed] text-[#0a9b3f]" : "bg-[#f6f7fb] text-[#687089]"}`}>
                  {plan.status}
                </span>
              </div>
              <label className="mt-4 block">
                <span className="text-[10px] font-extrabold uppercase text-[#687089]">Monthly price</span>
                <div className="mt-2 flex h-10 items-center rounded-[8px] border border-[#dfe4ee] px-3">
                  <span className="text-[13px] font-extrabold text-[#687089]">$</span>
                  <input
                    value={plan.monthlyPrice}
                    type="number"
                    min={0}
                    onChange={(event) => updatePlan(plan.id, { monthlyPrice: Math.max(0, Number(event.target.value) || 0) })}
                    className="h-full min-w-0 flex-1 bg-transparent px-2 text-[13px] font-extrabold text-black outline-none"
                  />
                  <span className="text-[11px] font-semibold text-[#687089]">/mo</span>
                </div>
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <SettingsSelect
                  ariaLabel={`${plan.name} status`}
                  value={plan.status}
                  options={["active", "hidden"]}
                  onChange={(value) => updatePlan(plan.id, { status: value === "hidden" ? "hidden" : "active" })}
                />
                <p className="text-[10px] font-semibold text-[#687089]">
                  {plan.features.length} features
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SuperAdminRevenuePage({ page, refreshKey = 0 }: { page: RevenueAdminPage; refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchRevenueData = useCallback(async () => {
    const response = await fetch("/api/admin/connected-accounts", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(response, "Could not load revenue data");
  }, []);

  const loadRevenueData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchRevenueData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load revenue data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchRevenueData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialRevenueData() {
      try {
        const nextData = await fetchRevenueData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load revenue data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialRevenueData();

    return () => {
      isMounted = false;
    };
  }, [fetchRevenueData, refreshKey]);

  const { config, emptyText } = buildRevenueConfig(page, data, isLoading, query);

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
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">Live billing values from Supabase user metadata.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadRevenueData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real revenue data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking Supabase billing metadata." : "Use the Billing pricing cards to create real plan metadata."}
              </p>
            </div>
          )}
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

      {page === "revenue-subscriptions" && <SuperAdminPricingSection />}
    </div>
  );
}

type PlatformAdminPage = "platform-instagram" | "platform-api" | "platform-queue";

function getInstagramTokenLabel(row: SuperAdminConnectedAccountApiRow) {
  if (row.instagram !== "Connected") {
    return "Disconnected";
  }

  if (row.statusTone === "green") {
    return "Healthy";
  }

  return "Reconnect";
}

function getInstagramWebhookLabel(row: SuperAdminConnectedAccountApiRow, webhookConfigured?: boolean) {
  if (!webhookConfigured) {
    return "Not configured";
  }

  if (row.instagram !== "Connected") {
    return "Paused";
  }

  return row.statusTone === "green" ? "Live" : "Reconnect";
}

function buildPlatformConfig({
  page,
  connectedData,
  platformData,
  isLoading,
  query,
}: {
  page: PlatformAdminPage;
  connectedData: SuperAdminConnectedAccountsResponse | null;
  platformData: SuperAdminPlatformResponse | null;
  isLoading: boolean;
  query: string;
}) {
  const connectedMetrics = connectedData?.metrics;
  const platformMetrics = platformData?.metrics;
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);

  if (page === "platform-instagram") {
    const rows = (connectedData?.rows || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.instagram, row.status, row.owner || ""]))
      .map((row) => {
        const token = getInstagramTokenLabel(row);
        const webhook = getInstagramWebhookLabel(row, platformMetrics?.webhookConfigured);
        const statusTone = token === "Healthy" ? "green" as const : token === "Disconnected" ? "red" as const : "amber" as const;

        return {
          name: row.name,
          detail: row.detail,
          values: [token, row.messages, webhook, row.lastActive, row.owner || "Platform"],
          status: token === "Healthy" ? "Healthy" : token === "Disconnected" ? "Issue" : "Reconnect",
          statusTone,
        };
      });
    const totalAccounts = connectedMetrics?.totalConnected || platformMetrics?.instagramAccounts || 0;
    const healthyTokens = connectedMetrics?.healthyTokens || 0;
    const needsAction = (connectedMetrics?.expiredTokens || 0) + (connectedMetrics?.disconnected || 0);

    return {
      config: {
        metrics: [
          { label: "Instagram accounts", value: isLoading && !connectedMetrics ? "..." : formatAdminNumber(totalAccounts), detail: "Connected total", change: `${formatAdminPercent(healthyTokens, Math.max(1, totalAccounts))} healthy`, tone: "bg-[#f0edff] text-[#4b3cff]", icon: Globe2 },
          { label: "Webhook messages", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.messagesToday), detail: "Stored today", change: `${formatAdminNumber(platformMetrics?.messagesStored)} total stored`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Code2 },
          { label: "Expired tokens", value: isLoading && !connectedMetrics ? "..." : formatAdminNumber(connectedMetrics?.expiredTokens), detail: "Reconnect required", change: `${formatAdminPercent(connectedMetrics?.expiredTokens || 0, Math.max(1, totalAccounts))} of accounts`, tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
          { label: "Disconnected", value: isLoading && !connectedMetrics ? "..." : formatAdminNumber(connectedMetrics?.disconnected), detail: "No active channel", change: `${formatAdminPercent(connectedMetrics?.disconnected || 0, Math.max(1, totalAccounts))} of creators`, tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        ],
        columns: ["Token", "Messages", "Webhook", "Last sync", "Owner"],
        rows,
        insightTitle: "Instagram status",
        insightItems: [
          { label: "Healthy", value: formatAdminNumber(healthyTokens), detail: "Accounts ready for automation", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Needs action", value: formatAdminNumber(needsAction), detail: "Expired or disconnected tokens", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        ],
      },
      emptyText: "No real Instagram account records found.",
    };
  }

  if (page === "platform-api") {
    const serviceRows = (platformData?.services || []).filter((service) =>
      matchesQuery([service.name, service.detail, service.status, service.config, service.owner])
    );
    const topServices = serviceRows.slice(0, 4);

    return {
      config: {
        metrics: topServices.map((service) => ({
          label: service.name,
          value: isLoading && !platformData ? "..." : service.status,
          detail: service.config,
          change: service.latency,
          tone: statusToneClasses[service.tone].replace("bg-", "bg-"),
          icon:
            service.name === "Instagram API"
              ? Globe2
              : service.name === "OpenAI API"
                ? BrainCircuit
                : service.name === "Database"
                  ? Database
                  : service.name === "Webhook endpoint"
                    ? Code2
                    : CircleHelp,
        })),
        columns: ["Status", "Latency", "Config", "Incidents", "Owner"],
        rows: serviceRows.map((service) => ({
          name: service.name,
          detail: service.detail,
          values: [service.status, service.latency, service.config, service.incidents, service.owner],
          status: service.status,
          statusTone: service.tone,
        })),
        insightTitle: "Service health",
        insightItems: [
          { label: "Healthy services", value: formatAdminNumber(platformMetrics?.healthyServices), detail: "Configured and ready", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Warnings", value: formatAdminNumber(platformMetrics?.warningServices), detail: "Missing config or attention needed", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        ],
      },
      emptyText: "No platform service records found.",
    };
  }

  const queueRows = (platformData?.queues || []).filter((queue) =>
    matchesQuery([queue.name, queue.detail, queue.queue, queue.worker, queue.status])
  );

  return {
    config: {
      metrics: [
        { label: "Pending jobs", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.pendingJobs), detail: "Queued work", change: "Actual queue state", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
        { label: "Processed today", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.processedToday), detail: "Webhook messages stored", change: `${formatAdminNumber(platformMetrics?.messagesStored)} total`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
        { label: "Retries", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.retries), detail: "Automatic retry", change: "No retry table", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
        { label: "Failed jobs", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.failedJobs), detail: "Needs operator", change: `${formatAdminNumber(platformMetrics?.manualReview)} warnings`, tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
      ],
      columns: ["Queue", "Pending", "Oldest", "Retries", "Worker"],
      rows: queueRows.map((queue) => ({
        name: queue.name,
        detail: queue.detail,
        values: [queue.queue, queue.pending, queue.oldest, queue.retries, queue.worker],
        status: queue.status,
        statusTone: queue.tone,
      })),
      insightTitle: "Queue operations",
      insightItems: [
        { label: "Stored today", value: formatAdminNumber(platformMetrics?.processedToday), detail: "Messages saved by webhook", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
        { label: "Manual review", value: formatAdminNumber(platformMetrics?.manualReview), detail: "Configured warnings and queue issues", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
      ],
    },
    emptyText: "No queue records found.",
  };
}

function SuperAdminPlatformPage({ page, refreshKey = 0 }: { page: PlatformAdminPage; refreshKey?: number }) {
  const [connectedData, setConnectedData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [platformData, setPlatformData] = useState<SuperAdminPlatformResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchPlatformData = useCallback(async () => {
    const [connectedResponse, platformResponse] = await Promise.all([
      fetch("/api/admin/connected-accounts", { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch("/api/admin/platform", { cache: "no-store", headers: { Accept: "application/json" } }),
    ]);
    const connectedPayload = await readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(connectedResponse, "Could not load Instagram account data");
    const platformPayload = await readDashboardJsonResponse<SuperAdminPlatformResponse>(platformResponse, "Could not load platform data");

    return { connectedPayload, platformPayload };
  }, []);

  const loadPlatformData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchPlatformData();
      setConnectedData(nextData.connectedPayload);
      setPlatformData(nextData.platformPayload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load platform data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchPlatformData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPlatformData() {
      try {
        const nextData = await fetchPlatformData();

        if (isMounted) {
          setConnectedData(nextData.connectedPayload);
          setPlatformData(nextData.platformPayload);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load platform data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPlatformData();

    return () => {
      isMounted = false;
    };
  }, [fetchPlatformData, refreshKey]);

  const { config, emptyText } = buildPlatformConfig({ page, connectedData, platformData, isLoading, query });

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
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">
                Real Supabase records, environment config, and webhook storage state.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadPlatformData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real platform data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking Supabase and environment state." : "No demo rows are shown on this page."}
              </p>
            </div>
          )}
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

type AiAdminPage = "ai-usage" | "ai-costs" | "ai-escalations";

function buildAiConfig({
  page,
  data,
  isLoading,
  query,
}: {
  page: AiAdminPage;
  data: SuperAdminAiResponse | null;
  isLoading: boolean;
  query: string;
}) {
  const metrics = data?.metrics;
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);
  const totalMessages = metrics?.totalMessages || 0;
  const aiReadyMessages = metrics?.aiReadyMessages || 0;
  const trackedSpend = metrics?.trackedSpend || 0;
  const trackedReplies = metrics?.trackedReplies || 0;
  const trackedTokens = metrics?.trackedTokens || 0;
  const estimatedTokens = metrics?.estimatedTokens || 0;
  const effectiveTokens = trackedTokens > 0 ? trackedTokens : estimatedTokens;
  const costPerReply = trackedReplies > 0 ? trackedSpend / trackedReplies : 0;
  const spendDetail = metrics?.spendLogsStored ? "Tracked metadata" : "No spend log stored";
  const tokenDetail = trackedTokens > 0 ? "Tracked token metadata" : "Estimated from messages";

  if (page === "ai-usage") {
    const rows = (data?.usage || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.status, row.health]))
      .map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [
          formatAdminNumber(row.messages),
          row.replies > 0 ? formatAdminNumber(row.replies) : "Not tracked",
          formatAdminNumber(row.opportunities),
          formatAdminNumber(row.escalations),
          row.health,
        ],
        status: row.status,
        statusTone: row.tone,
      }));

    return {
      config: {
        metrics: [
          { label: "Messages processed", value: isLoading && !metrics ? "..." : formatAdminNumber(totalMessages), detail: "Stored webhook messages", change: `${formatAdminNumber(metrics?.messagesToday)} today`, tone: "bg-[#f0edff] text-[#4b3cff]", icon: Bot },
          { label: "AI-ready chats", value: isLoading && !metrics ? "..." : formatAdminNumber(aiReadyMessages), detail: "Without handoff keywords", change: `${formatAdminPercent(aiReadyMessages, totalMessages)} of stored`, tone: "bg-[#f0edff] text-[#4b3cff]", icon: Sparkles },
          { label: "Opportunities found", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.opportunitySignals), detail: "Buying signal keywords", change: "Live message scan", tone: "bg-[#fff6e8] text-[#d98613]", icon: Target },
          { label: "Escalations", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.handoffSignals), detail: "Human handoff signals", change: `${formatAdminNumber(metrics?.urgentSignals)} urgent`, tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        ],
        columns: ["Messages", "AI replies", "Opportunities", "Escalations", "Health"],
        rows,
        insightTitle: "Automation coverage",
        insightItems: [
          { label: "AI-ready chats", value: formatAdminPercent(aiReadyMessages, totalMessages), detail: "Stored messages without handoff keywords", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Auto-send creators", value: formatAdminNumber(metrics?.autoSendCreators), detail: "Creators with automatic AI replies enabled", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Sparkles },
          { label: "Configured creators", value: formatAdminNumber(metrics?.configuredCreators), detail: "Creators with an OpenAI key saved", tone: "bg-[#eaf4ff] text-[#246bff]", icon: BrainCircuit },
        ],
      },
      emptyText: "No real AI usage records found.",
    };
  }

  if (page === "ai-costs") {
    const rows = (data?.costs || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.status, row.trend]))
      .map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [
          row.spend > 0 ? formatAdminMoneyPrecise(row.spend) : "$0",
          row.tokens > 0 ? formatAdminTokenVolume(row.tokens) : "No logs",
          row.replies > 0 ? formatAdminNumber(row.replies) : "0",
          row.costPerReply > 0 ? formatAdminMoneyPrecise(row.costPerReply, 3) : "Not tracked",
          row.trend,
        ],
        status: row.status,
        statusTone: row.tone,
      }));

    return {
      config: {
        metrics: [
          { label: "AI spend", value: isLoading && !metrics ? "..." : formatAdminTrackedSpend(trackedSpend), detail: spendDetail, change: metrics?.spendLogsStored ? "Actual metadata" : "Add spend logging", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
          { label: "Cost per reply", value: isLoading && !metrics ? "..." : costPerReply > 0 ? formatAdminMoneyPrecise(costPerReply, 3) : "Not tracked", detail: "Requires reply and spend logs", change: trackedReplies > 0 ? `${formatAdminNumber(trackedReplies)} replies` : "No reply log", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
          { label: "Token volume", value: isLoading && !metrics ? "..." : formatAdminTokenVolume(effectiveTokens), detail: tokenDetail, change: trackedTokens > 0 ? "Actual metadata" : "Estimated", tone: "bg-[#eaf4ff] text-[#246bff]", icon: BrainCircuit },
          { label: "Gross margin", value: isLoading && !metrics ? "..." : metrics?.grossMargin ? `${metrics.grossMargin.toFixed(1)}%` : "No revenue", detail: "After tracked AI costs", change: trackedSpend > 0 ? "Actual spend" : "No cost log", tone: "bg-[#eafaf0] text-[#13a84f]", icon: CircleDollarSign },
        ],
        columns: ["Spend", "Tokens", "Replies", "Cost/reply", "Trend"],
        rows,
        insightTitle: "Cost controls",
        insightItems: [
          { label: "Usage logs", value: metrics?.spendLogsStored ? "Stored" : "Missing", detail: "Persist spend and token usage after OpenAI calls", tone: metrics?.spendLogsStored ? "bg-[#eafaf0] text-[#13a84f]" : "bg-[#fff4df] text-[#c07800]", icon: Database },
          { label: "Estimated tokens", value: formatAdminTokenVolume(estimatedTokens), detail: "Approximation from stored message text", tone: "bg-[#f0edff] text-[#4b3cff]", icon: BrainCircuit },
        ],
      },
      emptyText: "No real AI cost records found.",
    };
  }

  const rows = (data?.escalations || [])
    .filter((row) => matchesQuery([row.name, row.detail, row.reason, row.owner, row.status]))
    .map((row) => ({
      name: row.name,
      detail: row.detail,
      values: [row.reason, formatAdminNumber(row.count), row.avgTime, row.owner, row.trend],
      status: row.status,
      statusTone: row.tone,
    }));

  return {
    config: {
      metrics: [
        { label: "Escalations", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.handoffSignals), detail: "Stored handoff signals", change: "Live keyword scan", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        { label: "Urgent", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.urgentSignals), detail: "High-priority handoffs", change: "Urgent keywords", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
        { label: "Avg handoff time", value: "Not tracked", detail: "Needs event timestamps", change: "Add handoff logs", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
        { label: "Resolved", value: "Not tracked", detail: "No resolution log stored", change: "Add status tracking", tone: "bg-[#fff4df] text-[#c07800]", icon: Check },
      ],
      columns: ["Reason", "Count", "Avg time", "Owner", "Trend"],
      rows,
      insightTitle: "Handoff signals",
      insightItems: [
        { label: "Needs tuning", value: formatAdminNumber(metrics?.handoffSignals), detail: "Messages matching handoff keywords", tone: "bg-[#fff4df] text-[#c07800]", icon: SlidersHorizontal },
        { label: "Human load", value: formatAdminNumber(metrics?.humanRequestedSignals), detail: "Customer asks for a person or agent", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
      ],
    },
    emptyText: "No real AI escalation records found.",
  };
}

function SuperAdminAiPage({ page, refreshKey = 0 }: { page: AiAdminPage; refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminAiResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchAiData = useCallback(async () => {
    const response = await fetch("/api/admin/ai", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminAiResponse>(response, "Could not load AI admin data");
  }, []);

  const loadAiData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchAiData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load AI admin data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAiData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialAiData() {
      try {
        const nextData = await fetchAiData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load AI admin data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialAiData();

    return () => {
      isMounted = false;
    };
  }, [fetchAiData, refreshKey]);

  const { config, emptyText } = buildAiConfig({ page, data, isLoading, query });
  const tableWarning = data?.metrics?.messagesTableAvailable === false ? data.metrics.messagesTableError : "";

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
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">
                Real creator AI settings, stored messages, and saved usage metadata.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadAiData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : tableWarning ? (
            <div className="rounded-[8px] border border-[#ffe0a3] bg-[#fffaf0] p-4 text-[12px] font-bold text-[#c07800]">
              Messages table is not available: {tableWarning}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real AI data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking AI metadata and stored messages." : "No demo rows are shown on this page."}
              </p>
            </div>
          )}
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

type SupportAdminPage = "support-tickets" | "support-issues";

function buildSupportConfig({
  page,
  data,
  isLoading,
  query,
}: {
  page: SupportAdminPage;
  data: SuperAdminSupportResponse | null;
  isLoading: boolean;
  query: string;
}) {
  const metrics = data?.metrics;
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);

  if (page === "support-tickets") {
    const rows = (data?.tickets || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.priority, row.topic, row.assignee, row.status]))
      .map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [row.priority, row.topic, row.age, row.assignee, row.sla],
        status: row.status,
        statusTone: row.tone,
      }));

    return {
      config: {
        metrics: [
          { label: "Open tickets", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.openTickets), detail: metrics?.ticketTableAvailable ? `From ${metrics.ticketTableName}` : "Open support signals", change: `${formatAdminNumber(metrics?.supportSignals)} message signals`, tone: "bg-[#fff0f3] text-[#df405b]", icon: Mail },
          { label: "In progress", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.inProgressTickets), detail: "Review or watch status", change: metrics?.avgResponse || "Not tracked", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
          { label: "Resolved today", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.resolvedToday), detail: "Closed ticket records", change: metrics?.ticketTableAvailable ? "Actual tickets" : "No ticket table", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Satisfaction", value: isLoading && !metrics ? "..." : metrics?.satisfaction || "Not tracked", detail: "Latest support score", change: metrics?.ticketTableAvailable ? "Ticket metadata" : "No CSAT log", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Star },
        ],
        columns: ["Priority", "Topic", "Age", "Assignee", "SLA"],
        rows,
        insightTitle: "Support summary",
        insightItems: [
          { label: "Avg response", value: metrics?.avgResponse || "Not tracked", detail: metrics?.ticketTableAvailable ? "Across ticket records" : "No response-time field stored", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
          { label: "First response", value: metrics?.firstResponse || "Not tracked", detail: metrics?.ticketTableAvailable ? "Median first support reply" : "No first-response field stored", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Send },
          { label: "Message rows", value: formatAdminNumber(metrics?.messageRows), detail: "Stored Instagram message records", tone: "bg-[#f0edff] text-[#4b3cff]", icon: MessageSquare },
        ],
      },
      emptyText: "No real support ticket records or support message signals found.",
      sourceNote: metrics?.ticketTableAvailable
        ? `Showing real records from ${metrics.ticketTableName}.`
        : "No support ticket table was found, so this page is showing real support signals from stored Instagram messages.",
    };
  }

  const rows = (data?.issues || [])
    .filter((row) => matchesQuery([row.name, row.detail, row.category, row.impact, row.owner, row.status]))
    .map((row) => ({
      name: row.name,
      detail: row.detail,
      values: [row.category, row.impact, row.age, row.owner, row.nextStep],
      status: row.status,
      statusTone: row.tone,
    }));

  return {
    config: {
      metrics: [
        { label: "Creator issues", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.creatorIssues), detail: metrics?.issueTableAvailable ? `From ${metrics.issueTableName}` : "Derived from creator state", change: `${formatAdminNumber(metrics?.supportSignals)} support signals`, tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        { label: "Product issues", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.productIssues), detail: "Platform or AI blockers", change: `${formatAdminNumber(metrics?.platformBlockers)} platform blockers`, tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
        { label: "Onboarding issues", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.onboardingIssues), detail: "Setup help needed", change: "Real config state", tone: "bg-[#fff4df] text-[#c07800]", icon: GraduationCap },
        { label: "Resolved today", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.resolvedIssuesToday), detail: "Closed issue records", change: metrics?.issueTableAvailable ? "Actual issues" : "No issue table", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      ],
      columns: ["Category", "Impact", "Age", "Owner", "Next step"],
      rows,
      insightTitle: "Issue themes",
      insightItems: [
        { label: "Platform blockers", value: formatAdminNumber(metrics?.platformBlockers), detail: "Platform or AI follow-up needed", tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
        { label: "Success follow-up", value: formatAdminNumber(metrics?.successFollowUp), detail: "Support, billing, or creator-success issues", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
      ],
    },
    emptyText: "No real creator issue records found.",
    sourceNote: metrics?.issueTableAvailable
      ? `Showing real records from ${metrics.issueTableName}.`
      : "No creator issue table was found, so this page is showing real creator metadata and platform setup issues.",
  };
}

function SuperAdminSupportPage({ page, refreshKey = 0 }: { page: SupportAdminPage; refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminSupportResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSupportData = useCallback(async () => {
    const response = await fetch("/api/admin/support", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminSupportResponse>(response, "Could not load support admin data");
  }, []);

  const loadSupportData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchSupportData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load support admin data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSupportData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSupportData() {
      try {
        const nextData = await fetchSupportData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load support admin data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialSupportData();

    return () => {
      isMounted = false;
    };
  }, [fetchSupportData, refreshKey]);

  const { config, emptyText, sourceNote } = buildSupportConfig({ page, data, isLoading, query });
  const tableWarning =
    data?.metrics?.messagesTableAvailable === false
      ? data.metrics.messagesTableError
      : page === "support-tickets" && data?.metrics?.ticketTableAvailable === false && !data.metrics.supportSignals
        ? data.metrics.ticketTableError
        : page === "support-issues" && data?.metrics?.issueTableAvailable === false && !config.rows.length
          ? data.metrics.issueTableError
          : "";

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
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">{sourceNote}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadSupportData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : tableWarning ? (
            <div className="rounded-[8px] border border-[#ffe0a3] bg-[#fffaf0] p-4 text-[12px] font-bold text-[#c07800]">
              {tableWarning}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real support data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking support tables, messages, and creator metadata." : "No demo rows are shown on this page."}
              </p>
            </div>
          )}
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

function SuperAdminCreatorLifecyclePage({
  page,
  refreshKey = 0,
}: {
  page: "creators-trials" | "creators-churn";
  refreshKey?: number;
}) {
  const [data, setData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchLifecycleData = useCallback(async () => {
    const response = await fetch("/api/admin/connected-accounts", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(response, "Could not load creator data");
  }, []);

  const loadLifecycleData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchLifecycleData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load creator data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchLifecycleData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialLifecycleData() {
      try {
        const nextData = await fetchLifecycleData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load creator data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialLifecycleData();

    return () => {
      isMounted = false;
    };
  }, [fetchLifecycleData, refreshKey]);

  const { config, emptyText } = buildCreatorLifecycleConfig(page, data, isLoading, query);

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
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">Real creator accounts from Supabase Auth and Instagram activity.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadLifecycleData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real creator data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking Supabase Auth, metadata, and Instagram activity." : "No sample records are shown on this page."}
              </p>
            </div>
          )}
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

function SuperAdminDetailPage({
  page,
  refreshKey = 0,
}: {
  page: Exclude<SuperAdminPage, "overview" | "profile" | "settings">;
  refreshKey?: number;
}) {
  if (page === "creators-connected") {
    return <SuperAdminConnectedAccountsPage refreshKey={refreshKey} />;
  }

  if (page === "creators-trials" || page === "creators-churn") {
    return <SuperAdminCreatorLifecyclePage page={page} refreshKey={refreshKey} />;
  }

  if (page === "revenue-subscriptions" || page === "revenue-payments" || page === "revenue-refunds") {
    return <SuperAdminRevenuePage page={page} refreshKey={refreshKey} />;
  }

  if (page === "platform-instagram" || page === "platform-api" || page === "platform-queue") {
    return <SuperAdminPlatformPage page={page} refreshKey={refreshKey} />;
  }

  if (page === "ai-usage" || page === "ai-costs" || page === "ai-escalations") {
    return <SuperAdminAiPage page={page} refreshKey={refreshKey} />;
  }

  if (page === "support-tickets" || page === "support-issues") {
    return <SuperAdminSupportPage page={page} refreshKey={refreshKey} />;
  }

  const fallbackPage = page as keyof typeof superAdminDetailConfigs;
  const config = superAdminDetailConfigs[fallbackPage];

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
            <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[fallbackPage].title} activity</h2>
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

function SuperAdminProfilePage({
  profile,
  onProfileChange,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
}) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <SettingsAccountCard profile={profile} onProfileChange={onProfileChange} defaultEditing />

      <aside className="space-y-4">
        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[17px] font-extrabold text-black">Profile preview</h2>
          <div className="mt-5 flex items-center gap-4">
            {profile.avatarUrl ? (
              <span
                aria-label={profile.name}
                role="img"
                className="h-16 w-16 shrink-0 rounded-full bg-cover bg-center shadow-[0_16px_34px_rgba(20,28,53,0.08)]"
                style={{ backgroundImage: `url(${profile.avatarUrl})` }}
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[16px] font-extrabold text-white shadow-[0_16px_34px_rgba(124,58,237,0.18)]">
                {initials || "SA"}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[16px] font-extrabold text-black">{profile.name || "Super Admin"}</p>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#596175]">{profile.email}</p>
              <span className="mt-2 inline-flex rounded-full bg-[#f0edff] px-2.5 py-1 text-[10px] font-extrabold text-[#4b3cff]">
                Superadmin
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#f0edff] text-[#4b3cff]">
            <UploadCloud size={20} strokeWidth={2.4} />
          </span>
          <h2 className="mt-4 text-[17px] font-extrabold text-black">Cloudinary uploads</h2>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
            Profile images are resized to a square WebP before upload, then saved as Cloudinary URLs in your Supabase profile metadata.
          </p>
        </section>

        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#eafaf0] text-[#13a84f]">
            <Shield size={20} strokeWidth={2.4} />
          </span>
          <h2 className="mt-4 text-[17px] font-extrabold text-black">Superadmin access</h2>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
            This profile controls the superadmin sidebar identity and dashboard account details.
          </p>
        </section>
      </aside>
    </div>
  );
}

function SuperAdminSettingsPage({ profile, refreshKey = 0 }: { profile: AccountProfile; refreshKey?: number }) {
  const [platformData, setPlatformData] = useState<SuperAdminPlatformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPlatformStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/platform", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await readDashboardJsonResponse<SuperAdminPlatformResponse>(response, "Could not load platform settings");

      setPlatformData(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load platform settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPlatformStatus() {
      try {
        const response = await fetch("/api/admin/platform", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = await readDashboardJsonResponse<SuperAdminPlatformResponse>(response, "Could not load platform settings");

        if (isMounted) {
          setPlatformData(payload);
          setErrorMessage("");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load platform settings");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPlatformStatus();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const metrics = platformData?.metrics;
  const workspaceFields = [
    ["Workspace name", "TractionFlo"],
    ["Admin email", profile.email],
    ["Default timezone", profile.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone],
    ["Language", profile.language || "English"],
    ["Billing currency", profile.currency || "USD ($)"],
    ["Access level", profile.isSuperAdmin ? "Super Admin" : profile.role || "Admin"],
  ];
  const integrationStatusItems = [
    {
      title: "Meta ecosystem",
      detail: isLoading && !metrics ? "Checking Facebook and Instagram config" : `${formatAdminNumber(metrics?.instagramAccounts)} Instagram accounts`,
      connected: Boolean(metrics?.metaConfigured && metrics?.webhookConfigured),
      icon: Globe2,
    },
    {
      title: "OpenAI API",
      detail: "AI replies and qualification",
      connected: Boolean(metrics?.openAiConfigured),
      icon: BrainCircuit,
    },
    {
      title: "Email service",
      detail: "Operational notifications",
      connected: Boolean(metrics?.emailConfigured),
      icon: Mail,
    },
    {
      title: "Stripe payments",
      detail: "Checkout and subscription billing",
      connected: Boolean(metrics?.paymentConfigured),
      icon: CreditCard,
    },
    {
      title: "Database",
      detail: isLoading && !metrics ? "Checking Supabase" : `${metrics?.databaseLatencyMs || 0}ms latest check`,
      connected: Boolean(metrics?.databaseHealthy),
      icon: Database,
    },
    {
      title: "Webhook endpoint",
      detail: "Meta callback verification",
      connected: Boolean(metrics?.webhookConfigured),
      icon: Code2,
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
        <h2 className="text-[17px] font-extrabold text-black">Workspace settings</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {workspaceFields.map(([label, value]) => (
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
          onClick={() => void loadPlatformStatus()}
          disabled={isLoading}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[13px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)]"
        >
          <RefreshCw size={16} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
          Refresh settings status
        </button>
        {errorMessage && (
          <div className="mt-4 rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-3 text-[12px] font-bold text-[#df405b]">
            {errorMessage}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        {integrationStatusItems.map((item) => {
          const Icon = item.icon;
          const tone = isLoading && !metrics
            ? "bg-[#f0edff] text-[#4b3cff]"
            : item.connected
              ? "bg-[#eafaf0] text-[#13a84f]"
              : "bg-[#fff4df] text-[#c07800]";
          const status = isLoading && !metrics ? "Checking" : item.connected ? "Connected" : "Not configured";

          return (
            <article key={item.title} className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
                  <Icon size={18} strokeWidth={2.35} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-extrabold text-black">{item.title}</h3>
                  <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#596175]">{item.detail}</p>
                </div>
              </div>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.connected ? statusToneClasses.green : isLoading && !metrics ? statusToneClasses.purple : statusToneClasses.amber}`}>
                {status}
              </span>
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

function SuperAdminDashboard({
  profile,
  onProfileChange,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
}) {
  const [activePage, setActivePage] = useState<SuperAdminPage>("overview");
  const [dateRangePreset, setDateRangePreset] = useState<AdminDateRangePreset>("7d");
  const [isAutoRefreshOn, setIsAutoRefreshOn] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportStatus, setExportStatus] = useState("");

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

  function handleDateRangeChange(preset: AdminDateRangePreset) {
    setDateRangePreset(preset);
    setRefreshKey((current) => current + 1);
  }

  function handleExport() {
    if (typeof document === "undefined") {
      return;
    }

    const pageTitle = superAdminPageMeta[activePage].title;
    const content = document.querySelector("[data-superadmin-content='true']");
    const tableRows = Array.from(content?.querySelectorAll("table tr") || []).map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() || "")
    );
    const rows = tableRows.length > 0
      ? tableRows
      : [
          ["Page", pageTitle],
          ["Date range", getAdminDateRangeLabel(dateRangePreset)],
          ["Exported", new Date().toISOString()],
        ];
    const csv = rows
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `tractionflo-${activePage}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setExportStatus("Downloaded");
    window.setTimeout(() => setExportStatus(""), 1800);
  }

  useEffect(() => {
    if (!isAutoRefreshOn) {
      return;
    }

    const interval = window.setInterval(() => {
      setRefreshKey((current) => current + 1);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isAutoRefreshOn]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f8f9fd] font-sans text-black">
      <SuperAdminSidebar activePage={activePage} onChangePage={handlePageChange} profile={profile} />

      <main className={`h-dvh flex-1 overflow-y-auto ${activePage === "overview" ? "bg-[#fdfdff]" : "px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-8 xl:px-9"}`}>
        {activePage === "overview" ? (
          <SuperAdminOverviewPage
            refreshKey={refreshKey}
            profile={profile}
            dateRangePreset={dateRangePreset}
            onDateRangeChange={handleDateRangeChange}
            onNavigate={handlePageChange}
          />
        ) : (
          <div className="mx-auto max-w-[1440px]">
            <SuperAdminHeader
              page={activePage}
              dateRangePreset={dateRangePreset}
              isAutoRefreshOn={isAutoRefreshOn}
              exportStatus={exportStatus}
              onDateRangeChange={handleDateRangeChange}
              onAutoRefreshChange={setIsAutoRefreshOn}
              onExport={handleExport}
            />

            <div className="mt-6" data-superadmin-content="true">
              {activePage === "profile" ? (
                <SuperAdminProfilePage profile={profile} onProfileChange={onProfileChange} />
              ) : activePage === "settings" ? (
                <SuperAdminSettingsPage profile={profile} refreshKey={refreshKey} />
              ) : (
                <SuperAdminDetailPage page={activePage} refreshKey={refreshKey} />
              )}
            </div>
          </div>
        )}
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

          <OpportunityReviewButton tone={tone.action}>{opportunity.action}</OpportunityReviewButton>
        </div>
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

function OpportunitiesPage({ summary, isLoading, error }: { summary: CreatorLiveSummary; isLoading: boolean; error: string }) {
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
            <button
              type="button"
              className="flex h-11 min-w-0 items-center justify-between rounded-[9px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:h-12 sm:w-[252px] sm:px-5 sm:text-[13px]"
            >
              <span className="min-w-0 truncate">{summary.dateRangeLabel}</span>
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
            {summary.opportunityTabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = index === 0;
              return (
                <button
                  key={tab.label}
                  type="button"
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

        {summary.opportunityCards.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.opportunityCards.map((opportunity) => (
              <OpportunityPageCardView key={`${opportunity.name}-${opportunity.badge}-${opportunity.time}`} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <section className="mt-5 rounded-[12px] border border-dashed border-[#d7deeb] bg-white p-8 text-center shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            <Target className="mx-auto text-[#3044ff]" size={28} strokeWidth={2.35} />
            <h2 className="mt-3 text-[15px] font-extrabold text-black">No qualified leads yet</h2>
            <p className="mx-auto mt-2 max-w-[440px] text-[12px] font-medium leading-relaxed text-[#596175]">
              TractionFlo is reading real Instagram conversations. Pricing, buying, booking, partnership, or repeated engagement signals will appear here as leads.
            </p>
          </section>
        )}

        <footer className="relative mt-4 flex items-center justify-center pb-2">
          <p className="text-[12px] font-medium text-[#596175]">
            Showing {summary.opportunityCards.length > 0 ? `1 to ${summary.opportunityCards.length}` : "0"} of {formatCreatorInteger(summary.opportunityCount)} leads
          </p>
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

function EscalationTabs({ tabs }: { tabs: EscalationTab[] }) {
  return (
    <div className="-mx-4 mt-8 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="grid w-max grid-flow-col auto-cols-max lg:grid-cols-[88px_142px_162px_178px_180px_160px]">
        {tabs.map((tab, index) => {
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

function EscalationDetailPanel({ escalation, rows }: { escalation?: EscalationItem; rows: EscalationDetailRow[] }) {
  if (!escalation) {
    return (
      <aside className="rounded-[13px] border border-dashed border-[#d7deeb] bg-white p-5 text-center shadow-[0_22px_60px_rgba(20,28,53,0.025)] xl:sticky xl:top-6">
        <TriangleAlert className="mx-auto text-[#3044ff]" size={28} strokeWidth={2.35} />
        <h2 className="mt-3 text-[15px] font-extrabold text-black">No escalation selected</h2>
        <p className="mx-auto mt-2 max-w-[260px] text-[12px] font-medium leading-relaxed text-[#596175]">
          Real refund, issue, support, or human handoff keywords will show details here.
        </p>
      </aside>
    );
  }

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
          Thanks for reaching out. I&apos;m going to take a closer look at this conversation and help you directly.
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

function EscalationsPage({ summary, isLoading, error }: { summary: CreatorLiveSummary; isLoading: boolean; error: string }) {
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

        <EscalationTabs tabs={summary.escalationTabs} />

        {(isLoading || error) && (
          <div className="mt-4 rounded-[10px] border border-[#edf0f6] bg-white px-4 py-3 text-[12px] font-semibold text-[#46506a] shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            {isLoading ? "Loading real Instagram conversations..." : error}
          </div>
        )}

        <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            {summary.escalations.length > 0 ? (
              summary.escalations.map((escalation) => (
                <EscalationCard key={`${escalation.handle}-${escalation.badge}-${escalation.time}`} escalation={escalation} />
              ))
            ) : (
              <section className="rounded-[13px] border border-dashed border-[#d7deeb] bg-white p-8 text-center shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
                <TriangleAlert className="mx-auto text-[#3044ff]" size={28} strokeWidth={2.35} />
                <h2 className="mt-3 text-[15px] font-extrabold text-black">No escalation signals yet</h2>
                <p className="mx-auto mt-2 max-w-[430px] text-[12px] font-medium leading-relaxed text-[#596175]">
                  Refunds, complaints, support issues, or human handoff requests from real Instagram messages will appear here.
                </p>
              </section>
            )}
            <p className="pt-2 text-center text-[13px] font-medium text-[#46506a]">
              Showing {summary.escalations.length > 0 ? `1 to ${summary.escalations.length}` : "0"} of {formatCreatorInteger(summary.escalationCount)} escalations
            </p>
          </section>

          <EscalationDetailPanel escalation={summary.escalations[0]} rows={summary.escalationDetailRows} />
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
  showStateLabel = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  showStateLabel?: boolean;
}) {
  const stateLabel = checked ? "Active" : "Inactive";

  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#3044ff]/15 ${
        showStateLabel ? "h-7 w-[106px]" : "h-[22px] w-10"
      } ${checked ? "bg-[#3044ff] shadow-[0_10px_18px_rgba(48,68,255,0.22)]" : "bg-[#dfe4f1]"} ${
        showStateLabel && !checked ? "hover:bg-[#d5dbea]" : ""
      }`}
    >
      {showStateLabel ? (
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] font-extrabold leading-none ${
            checked ? "left-3 text-white" : "right-2.5 text-[#536079]"
          }`}
        >
          {stateLabel}
        </span>
      ) : null}
      <span
        className={`absolute rounded-full bg-white transition ${
          showStateLabel
            ? `top-1/2 h-5 w-5 -translate-y-1/2 ${checked ? "right-1" : "left-1"}`
            : `top-0.5 h-[18px] w-[18px] ${checked ? "right-0.5" : "left-0.5"}`
        }`}
      />
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

async function uploadProfileImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 8MB.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/auth/profile/image", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as {
    url?: string;
    originalBytes?: number;
    compressedBytes?: number;
    error?: string;
  };

  if (!response.ok || payload.error || !payload.url) {
    throw new Error(payload.error || "Could not upload image");
  }

  return {
    ...payload,
    url: payload.url,
  };
}

function SettingsAccountCard({
  profile,
  onProfileChange,
  defaultEditing = false,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
  defaultEditing?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(defaultEditing);
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
    setImageUploadMessage("Compressing and uploading image...");

    try {
      const upload = await uploadProfileImage(file);

      updateDraft("avatarUrl", upload.url);
      const savedBytes = Math.max(0, (upload.originalBytes || 0) - (upload.compressedBytes || 0));
      setImageUploadMessage(savedBytes > 0 ? "Image compressed, uploaded, and ready to save." : "Image uploaded and ready to save.");
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
  const [savedMessage, setSavedMessage] = useState("");
  const [pushPermission, setPushPermission] = useState<BrowserNotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });

  useEffect(() => {
    if (!savedMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSavedMessage(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  const activeCount = notifications.filter((notification) => notification.enabled).length;
  const emailSetting = notifications.find((notification) => notification.id === "email");
  const pushSetting = notifications.find((notification) => notification.id === "push");

  function updateNotification(id: string, partial: Partial<NotificationSetting>) {
    onChange(
      notifications.map((notification) => {
        if (notification.id !== id) {
          return notification;
        }

        const nextNotification = { ...notification, ...partial };

        if (partial.enabled === false) {
          return { ...nextNotification, value: "Off" };
        }

        if (partial.enabled === true && nextNotification.value === "Off") {
          return { ...nextNotification, value: getDefaultNotificationValue(id) };
        }

        return nextNotification;
      })
    );
    setSavedMessage("Saved automatically");
  }

  async function requestPushPermission(nextValue = getDefaultNotificationValue("push")) {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    updateNotification("push", {
      enabled: permission === "granted",
      value: permission === "granted" ? nextValue : "Off",
    });
  }

  function handleToggle(id: string, checked: boolean) {
    if (id === "push" && checked && pushPermission !== "granted") {
      void requestPushPermission();
      return;
    }

    updateNotification(id, { enabled: checked });
  }

  function handleSelect(id: string, value: string) {
    if (id === "push" && value !== "Off" && pushPermission !== "granted") {
      void requestPushPermission(value);
      return;
    }

    updateNotification(id, { value, enabled: value !== "Off" });
  }

  async function sendTestNotification() {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      await requestPushPermission();
    }

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not send test notification");
      }

      setSavedMessage("Realtime test sent");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send test notification";
      setSavedMessage(message);
    }
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={17} strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">Notifications</h2>
          </div>
          <p className="mt-3 text-[11px] font-medium text-[#46506a]">Choose how and when you are notified.</p>
        </div>
        <span className="inline-flex h-8 items-center rounded-[8px] bg-[#f0edff] px-3 text-[11px] font-extrabold text-[#3044ff]">
          {activeCount} active
        </span>
      </div>

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
                  <SettingsToggle
                    ariaLabel={`${item.label} notifications ${item.enabled ? "active" : "inactive"}`}
                    checked={item.enabled}
                    onChange={(checked) => handleToggle(item.id, checked)}
                    showStateLabel
                  />
                </div>
                <SettingsSelect
                  ariaLabel={`${item.label} delivery`}
                  value={item.value}
                  options={getNotificationOptions(item.id)}
                  onChange={(value) => handleSelect(item.id, value)}
                  className="mt-2 w-full"
                />
                {item.id === "push" && pushPermission === "denied" ? (
                  <p className="mt-2 text-[11px] font-semibold text-[#df405b]">
                    Push notifications are blocked in this browser. Enable them in browser site settings.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 rounded-[10px] border border-[#e7eaf2] bg-[#fbfcff] p-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#697083]">Email</p>
          <p className="mt-1 text-[12px] font-bold text-black">{emailSetting?.enabled ? emailSetting.value : "Off"}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#697083]">Push access</p>
          <p className="mt-1 text-[12px] font-bold text-black">{formatBrowserNotificationPermission(pushPermission)}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#697083]">Escalations</p>
          <p className="mt-1 text-[12px] font-bold text-black">
            {notifications.find((notification) => notification.id === "escalation")?.enabled ? "Instant alerts" : "Off"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-[11px] font-extrabold ${savedMessage ? "text-[#13a84f]" : "text-[#697083]"}`}>
          {savedMessage || "Changes are saved to your account."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={sendTestNotification}
            disabled={pushSetting?.enabled === false}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bell size={14} strokeWidth={2.4} />
            Test push
          </button>
          <button
            type="button"
            onClick={() => {
              if (onManage) {
                onManage();
                return;
              }

              setSavedMessage("You are managing notifications now");
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(48,68,255,0.18)]"
          >
            Manage notifications
            <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
}

function formatBrowserNotificationPermission(permission: BrowserNotificationPermission) {
  if (permission === "granted") {
    return "Allowed";
  }

  if (permission === "denied") {
    return "Blocked";
  }

  if (permission === "unsupported") {
    return "Unsupported";
  }

  return "Not requested";
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
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [isPricingLoading, setIsPricingLoading] = useState(true);
  const [buyingPlanId, setBuyingPlanId] = useState("");
  const activePricingPlans = pricingPlans.filter((plan) => plan.status === "active");
  const planOptions = activePricingPlans.length > 0 ? activePricingPlans.map((plan) => plan.name) : ["Starter Plan", "Pro Plan", "Scale Plan"];
  const invoices = [
    ["INV-2026-06", "June 2026", billing.price.split(" / ")[0] || "$0", billing.status],
    ["INV-2026-05", "May 2026", billing.price.split(" / ")[0] || "$0", billing.status],
    ["INV-2026-04", "April 2026", billing.price.split(" / ")[0] || "$0", billing.status],
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadPricingPlans() {
      try {
        const response = await fetch("/api/pricing", {
          cache: "no-store",
        });
        const data = (await response.json()) as PricingResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error || "Could not load pricing plans");
        }

        if (isMounted) {
          setPricingPlans(data.plans || []);
        }
      } catch (error) {
        if (isMounted) {
          setBillingMessage(error instanceof Error ? error.message : "Could not load pricing plans");
        }
      } finally {
        if (isMounted) {
          setIsPricingLoading(false);
        }
      }
    }

    void loadPricingPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  async function activatePlan(plan: PricingPlan) {
    setBuyingPlanId(plan.id);
    setBillingMessage("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = (await response.json()) as { billing?: Partial<BillingSettings>; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not activate plan");
      }

      onChange({
        ...billing,
        plan: data.billing?.plan || plan.name,
        status: data.billing?.status || "Active",
        price: data.billing?.price || `$${plan.monthlyPrice} / month`,
        nextBillingDate: data.billing?.nextBillingDate || billing.nextBillingDate,
        invoiceEmail: data.billing?.invoiceEmail || billing.invoiceEmail,
      });
      setBillingMessage(`${plan.name} activated. Superadmin revenue pages will update after refresh.`);
    } catch (error) {
      setBillingMessage(error instanceof Error ? error.message : "Could not activate plan");
    } finally {
      setBuyingPlanId("");
    }
  }

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
              options={planOptions}
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

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-extrabold text-black">Pricing</h3>
            <p className="mt-1 text-[11px] font-medium text-[#46506a]">
              Pick a plan to update your subscription and admin revenue in real time.
            </p>
          </div>
          {isPricingLoading && (
            <span className="flex items-center gap-2 text-[11px] font-bold text-[#687089]">
              <RefreshCw size={13} strokeWidth={2.4} className="animate-spin text-[#3044ff]" />
              Loading prices
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(isPricingLoading && activePricingPlans.length === 0 ? Array.from({ length: 3 }) : activePricingPlans).map((planValue, index) => {
            const plan = planValue as PricingPlan | undefined;

            if (!plan) {
              return <div key={index} className="h-[230px] animate-pulse rounded-[10px] border border-[#edf0f6] bg-[#f6f7fb]" />;
            }

            const isCurrentPlan = billing.plan === plan.name;
            const isBuying = buyingPlanId === plan.id;

            return (
              <article
                key={plan.id}
                className={`rounded-[10px] border p-4 ${
                  isCurrentPlan ? "border-[#cfd7ff] bg-[#f6f7ff]" : "border-[#edf0f6] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[14px] font-extrabold text-black">{plan.name}</h4>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#46506a]">{plan.description}</p>
                  </div>
                  {isCurrentPlan && <span className="rounded-[8px] bg-[#e7f8ed] px-2 py-1 text-[10px] font-extrabold text-[#0a9b3f]">Current</span>}
                </div>
                <p className="mt-4 text-[26px] font-extrabold text-black">
                  ${plan.monthlyPrice}
                  <span className="text-[12px] font-semibold text-[#687089]"> / month</span>
                </p>
                <ul className="mt-3 space-y-2">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-[11px] font-semibold text-[#46506a]">
                      <Check size={13} strokeWidth={2.6} className="text-[#0a9b3f]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void activatePlan(plan)}
                  disabled={isBuying || isCurrentPlan}
                  className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] px-4 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60 ${
                    isCurrentPlan ? "bg-[#edf0f6] text-[#46506a]" : "bg-[#3044ff] text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)]"
                  }`}
                >
                  {isBuying ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <ShoppingCart size={14} strokeWidth={2.4} />}
                  {isCurrentPlan ? "Current plan" : plan.cta || "Buy plan"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const bookingSheetTypeOptions = [
  "Cricket ground booking",
  "Padel ground booking",
  "All confirmed bookings",
  "Custom booking type",
];

function hasUsableSheetLink(value: string) {
  return Boolean(getSheetDestinationUrl(value));
}

function getSheetDestinationUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^(docs\.google\.com|drive\.google\.com|script\.google\.com|script\.googleusercontent\.com|1drv\.ms|onedrive\.live\.com|office\.com)/i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  const googleSheetIdMatch = trimmedValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const googleSheetId = googleSheetIdMatch?.[1] || (/^[a-zA-Z0-9-_]{20,}$/.test(trimmedValue) ? trimmedValue : "");

  if (googleSheetId) {
    return `https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`;
  }

  return "";
}

function SettingsBookingIntegrationsSection({
  integrations,
  onChange,
}: {
  integrations: BookingIntegrationSettings;
  onChange: (integrations: BookingIntegrationSettings) => void;
}) {
  const [message, setMessage] = useState("");
  const [testingRouteId, setTestingRouteId] = useState("");
  const connectedRoutes = integrations.routes.filter((route) => route.enabled && hasUsableSheetLink(route.sheetUrl)).length;
  const activeRoutes = integrations.routes.filter((route) => route.enabled).length;

  function updateRoute(id: string, partial: Partial<BookingSheetRoute>) {
    onChange({
      ...integrations,
      routes: integrations.routes.map((route) => (route.id === id ? { ...route, ...partial } : route)),
    });
  }

  function addRoute() {
    const id = `booking-sheet-${Date.now()}`;

    onChange({
      ...integrations,
      routes: [
        ...integrations.routes,
        {
          id,
          name: "Custom booking sheet",
          bookingType: "Custom booking type",
          sheetUrl: "",
          worksheetName: "Confirmed Bookings",
          enabled: true,
          confirmedOnly: true,
          lastSync: "Not synced yet",
        },
      ],
    });
    setMessage("New booking sheet route added.");
  }

  function removeRoute(id: string) {
    onChange({
      ...integrations,
      routes: integrations.routes.filter((route) => route.id !== id),
    });
    setMessage("Booking sheet route removed.");
  }

  function copyRouteLink(route: BookingSheetRoute) {
    const destinationUrl = getSheetDestinationUrl(route.sheetUrl);

    if (!destinationUrl) {
      setMessage("Add a Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link before copying.");
      return;
    }

    void navigator.clipboard?.writeText(destinationUrl);
    setMessage(`${route.name} link copied.`);
  }

  function openRoute(route: BookingSheetRoute) {
    const destinationUrl = getSheetDestinationUrl(route.sheetUrl);

    if (!destinationUrl) {
      setMessage("Add a valid Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link first.");
      return;
    }

    window.open(destinationUrl, "_blank", "noopener,noreferrer");
  }

  async function testRoute(route: BookingSheetRoute) {
    if (!getSheetDestinationUrl(route.sheetUrl)) {
      setMessage("Add a valid Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link before testing this route.");
      return;
    }

    setTestingRouteId(route.id);
    setMessage(`Testing ${route.name}...`);

    try {
      const response = await fetch("/api/integrations/booking-sheets/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ route }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string; lastSync?: string };

      if (!response.ok) {
        setMessage(payload.error || "Could not test this booking route.");
        return;
      }

      updateRoute(route.id, { lastSync: payload.lastSync || "Route tested just now" });
      setMessage(payload.message || `${route.name} passed the route test.`);
    } catch {
      setMessage("Could not reach the route test API. Check that the dev server is running.");
    } finally {
      setTestingRouteId("");
    }
  }

  function getRouteStatus(route: BookingSheetRoute) {
    if (!route.enabled) {
      return { label: "Paused", className: "bg-[#edf0f6] text-[#687089]" };
    }

    if (!hasUsableSheetLink(route.sheetUrl)) {
      return { label: "Needs link", className: "bg-[#fff3e6] text-[#c77800]" };
    }

    return { label: "Ready", className: "bg-[#e7f8ed] text-[#0a9b3f]" };
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader
        section="integrations"
        action={
          <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
            {connectedRoutes} connected
          </span>
        }
      />

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold text-black">Confirmed booking sheets</h3>
            <p className="mt-1 max-w-[760px] text-[12px] font-medium leading-relaxed text-[#46506a]">
              Add Google Sheet or Excel web links for booking exports. Confirmed cricket and padel bookings can be routed into separate tabs or separate sheets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-[8px] bg-[#f6f7fb] px-3 py-1.5 text-[11px] font-extrabold text-[#46506a]">
              {activeRoutes} active routes
            </span>
            <SettingsToggle
              ariaLabel="Toggle confirmed booking sheet sync"
              checked={integrations.syncEnabled}
              onChange={(syncEnabled) => onChange({ ...integrations, syncEnabled })}
              showStateLabel
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {integrations.routes.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#d7deeb] bg-[#fbfbff] p-5 text-center">
              <FileText className="mx-auto text-[#3044ff]" size={24} strokeWidth={2.35} />
              <p className="mt-2 text-[12px] font-extrabold text-black">No booking sheet routes yet</p>
              <p className="mt-1 text-[11px] font-medium text-[#46506a]">Add a route for cricket, padel, or all confirmed bookings.</p>
            </div>
          ) : (
            integrations.routes.map((route) => {
              const status = getRouteStatus(route);
              const canRemove = !["cricket-ground", "padel-ground", "all-confirmed"].includes(route.id);
              const isTesting = testingRouteId === route.id;

              return (
                <div key={route.id} className="rounded-[10px] border border-[#edf0f6] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#3044ff]">
                        <FileText size={18} strokeWidth={2.35} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-extrabold text-black">{route.name}</p>
                        <p className="mt-1 text-[11px] font-medium text-[#46506a]">{route.bookingType} to {route.worksheetName || "sheet tab"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${status.className}`}>{status.label}</span>
                      <SettingsToggle
                        ariaLabel={`Toggle ${route.name}`}
                        checked={route.enabled}
                        onChange={(enabled) => updateRoute(route.id, { enabled })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Route name</span>
                      <input
                        value={route.name}
                        onChange={(event) => updateRoute(route.id, { name: event.target.value })}
                        className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Booking filter</span>
                      <SettingsSelect
                        ariaLabel={`${route.name} booking filter`}
                        value={route.bookingType}
                        options={bookingSheetTypeOptions}
                        onChange={(bookingType) => updateRoute(route.id, { bookingType })}
                        className="mt-2 w-full"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Excel or Google Sheet link</span>
                      <input
                        value={route.sheetUrl}
                        onChange={(event) => updateRoute(route.id, { sheetUrl: event.target.value })}
                        placeholder="Paste Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link"
                        className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Sheet tab name</span>
                      <input
                        value={route.worksheetName}
                        onChange={(event) => updateRoute(route.id, { worksheetName: event.target.value })}
                        className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <SettingsToggle
                        ariaLabel={`${route.name} confirmed only`}
                        checked={route.confirmedOnly}
                        onChange={(confirmedOnly) => updateRoute(route.id, { confirmedOnly })}
                      />
                      <div>
                        <p className="text-[12px] font-extrabold text-black">Confirmed bookings only</p>
                        <p className="text-[11px] font-medium text-[#687089]">{route.lastSync}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyRouteLink(route)}
                        className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black"
                      >
                        <Copy size={14} strokeWidth={2.35} />
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => openRoute(route)}
                        className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black"
                      >
                        <ExternalLink size={14} strokeWidth={2.35} />
                        Open sheet
                      </button>
                      <button
                        type="button"
                        onClick={() => void testRoute(route)}
                        disabled={isTesting}
                        className="flex h-9 items-center gap-2 rounded-[8px] bg-[#0d1118] px-3 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65"
                      >
                        <RefreshCw size={14} strokeWidth={2.35} className={isTesting ? "animate-spin" : ""} />
                        {isTesting ? "Testing..." : "Test route"}
                      </button>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => removeRoute(route.id)}
                          className="flex h-9 items-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-3 text-[11px] font-extrabold text-[#df405b]"
                        >
                          <X size={14} strokeWidth={2.35} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-semibold text-[#46506a]">
            Columns expected: customer, phone, booking type, date, time, ground or court, payment status, confirmed at, source conversation.
          </p>
          <button
            type="button"
            onClick={addRoute}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.22)]"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add sheet route
          </button>
        </div>

        {message && <p className="mt-4 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{message}</p>}
      </section>

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-extrabold text-black">Routing preview</h3>
            <p className="mt-1 text-[11px] font-medium text-[#46506a]">
              When a booking is confirmed, it should match one of these filters before being written to the configured sheet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMessage("Booking integrations saved on this device.")}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
          >
            <Check size={15} strokeWidth={2.5} />
            Save integrations
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="text-[10px] font-extrabold uppercase text-[#687089]">
              <tr className="border-b border-[#edf0f6]">
                <th className="py-3 pr-4">Booking filter</th>
                <th className="py-3 pr-4">Destination</th>
                <th className="py-3 pr-4">Rule</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f6]">
              {integrations.routes.map((route) => {
                const status = getRouteStatus(route);

                return (
                  <tr key={route.id}>
                    <td className="py-3 pr-4 font-extrabold text-black">{route.bookingType}</td>
                    <td className="py-3 pr-4 font-semibold text-[#46506a]">
                      {route.sheetUrl ? route.worksheetName || "Selected sheet" : "No sheet link added"}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[#46506a]">
                      {route.confirmedOnly ? "Save confirmed bookings only" : "Save every matched booking"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${status.className}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  const hasChangedNotificationsRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(settingsStateStorageKey, JSON.stringify(settingsState));
    dispatchNotificationPreferencesChanged(settingsState.notifications);
  }, [settingsState]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotificationPreferences() {
      try {
        const response = await fetch("/api/notifications/preferences", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { notifications?: unknown };
        const notifications = normalizeNotificationSettings(payload.notifications);

        if (isMounted && !hasChangedNotificationsRef.current) {
          setSettingsState((current) => ({
            ...current,
            notifications,
          }));
        }
      } catch (error) {
        console.error("Notification preferences load error:", error);
      }
    }

    void loadNotificationPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

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

  function handleNotificationsChange(notifications: NotificationSetting[]) {
    const normalizedNotifications = normalizeNotificationSettings(notifications);
    hasChangedNotificationsRef.current = true;
    updateSettingsState("notifications", normalizedNotifications);

    void fetch("/api/notifications/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notifications: normalizedNotifications }),
    }).catch((error) => {
      console.error("Notification preferences save error:", error);
    });
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

    if (activeSection === "integrations") {
      return (
        <SettingsBookingIntegrationsSection
          integrations={settingsState.bookingIntegrations}
          onChange={(bookingIntegrations) => updateSettingsState("bookingIntegrations", bookingIntegrations)}
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
          <SettingsNotificationsCard notifications={settingsState.notifications} onChange={handleNotificationsChange} />
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
          <SettingsNotificationsCard notifications={settingsState.notifications} onChange={handleNotificationsChange} onManage={() => setActiveSection("notifications")} />
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

function formatKnowledgeInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatKnowledgeBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatKnowledgeUpdated(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Just now";
  }

  return formatInstagramRelativeTime(value);
}

function getKnowledgeSourceIcon(source: KnowledgeSourceSummary) {
  if (source.categories.includes("FAQs")) {
    return CircleHelp;
  }

  if (source.categories.includes("Pricing")) {
    return DollarSign;
  }

  if (source.categories.includes("Products")) {
    return Box;
  }

  if (source.categories.includes("Business Information")) {
    return BriefcaseBusiness;
  }

  if (source.categories.includes("Services")) {
    return Sparkles;
  }

  return FileText;
}

function mapKnowledgeSourceSummary(source: KnowledgeSourceSummary): KnowledgeSource {
  const isPdf = source.kind === "pdf";
  const isManual = source.kind === "manual";
  const activeStatus = source.active ? "Ready" : "Inactive";
  const answerCount = source.directAnswerCount || 0;

  return {
    id: source.id,
    title: source.title,
    subtitle: `${formatKnowledgeInteger(source.wordCount)} words • ${formatKnowledgeInteger(source.chunkCount)} chunks${answerCount > 0 ? ` • ${formatKnowledgeInteger(answerCount)} answer${answerCount === 1 ? "" : "s"}` : ""} • ${formatKnowledgeBytes(source.fileSize)}`,
    type: isPdf ? "PDF" : isManual ? "Manual" : "TXT",
    kind: source.kind,
    fileName: source.fileName,
    mimeType: source.mimeType,
    fileSize: source.fileSize,
    characterCount: source.characterCount,
    sourceMode: isManual ? "manual" : "auto",
    sourceModeLabel: isManual ? "Manual entry" : "Auto scanned",
    status: activeStatus,
    statusTone: source.active ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#eff1f6] text-[#596175]",
    updated: formatKnowledgeUpdated(source.updatedAt),
    tone: isPdf ? "bg-[#fff0f3] text-[#df405b]" : isManual ? "bg-[#f0edff] text-[#4b3cff]" : "bg-[#eef4ff] text-[#246bff]",
    typeTone: isPdf ? "bg-[#fff0f3] text-[#df405b]" : isManual ? "bg-[#f0edff] text-[#4b3cff]" : "bg-[#eef4ff] text-[#246bff]",
    icon: getKnowledgeSourceIcon(source),
    directAnswerCount: answerCount,
    active: source.active,
    wordCount: source.wordCount,
    chunkCount: source.chunkCount,
    categories: source.categories,
  };
}

function buildKnowledgeTabsFromSources(sources: KnowledgeSourceSummary[]): KnowledgeTab[] {
  return [
    { label: "All Sources", count: formatKnowledgeInteger(sources.length), icon: Bot },
    { label: "FAQs", count: formatKnowledgeInteger(sources.filter((source) => source.directAnswerCount > 0 || source.categories.includes("FAQs")).length), icon: CircleHelp },
    { label: "Products", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Products")).length), icon: Box },
    { label: "Services", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Services")).length), icon: Sparkles },
    { label: "Pricing", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Pricing")).length), icon: DollarSign },
    { label: "Business Info", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Business Information")).length), icon: BriefcaseBusiness },
    { label: "PDFs", count: formatKnowledgeInteger(sources.filter((source) => source.kind === "pdf").length), icon: FileText },
  ];
}

function isKnowledgeSourceInTab(source: KnowledgeSource, tab: KnowledgeTabLabel) {
  switch (tab) {
    case "All Sources":
      return true;
    case "FAQs":
      return source.directAnswerCount > 0 || source.categories.includes("FAQs");
    case "Products":
      return source.categories.includes("Products");
    case "Services":
      return source.categories.includes("Services");
    case "Pricing":
      return source.categories.includes("Pricing");
    case "Business Info":
      return source.categories.includes("Business Information");
    case "PDFs":
      return source.kind === "pdf";
    default:
      return true;
  }
}

function isKnowledgeSectionTab(tab: KnowledgeTabLabel) {
  return tab !== "All Sources" && tab !== "PDFs";
}

function getKnowledgeSectionDisplayLabel(tab: KnowledgeTabLabel) {
  return tab === "Business Info" ? "Business information" : tab;
}

function getKnowledgeSectionRowIcon(tab: KnowledgeTabLabel): LucideIcon {
  switch (tab) {
    case "FAQs":
      return CircleHelp;
    case "Products":
      return Box;
    case "Services":
      return Sparkles;
    case "Pricing":
      return DollarSign;
    case "Business Info":
      return BriefcaseBusiness;
    default:
      return BookOpen;
  }
}

function buildKnowledgeInsightsFromSources(sources: KnowledgeSourceSummary[], fallback: KnowledgeInsight[]) {
  if (sources.length === 0) {
    return fallback;
  }

  const activeSources = sources.filter((source) => source.active);
  const totalChunks = activeSources.reduce((sum, source) => sum + source.chunkCount, 0);
  const directAnswers = activeSources.reduce((sum, source) => sum + source.directAnswerCount, 0);

  return [
    {
      title: "Saved retrieval",
      detail: `${formatKnowledgeInteger(totalChunks)} searchable chunks available`,
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: Database,
    },
    {
      title: "Direct answers",
      detail: `${formatKnowledgeInteger(directAnswers)} FAQ answers can skip OpenAI`,
      tone: "bg-[#eafaf0] text-[#13a84f]",
      icon: Check,
    },
    {
      title: "Active sources",
      detail: `${formatKnowledgeInteger(activeSources.length)} sources enabled for AI replies`,
      tone: "bg-[#eef4ff] text-[#246bff]",
      icon: BookOpen,
    },
  ];
}

function buildKnowledgeUpdatesFromSources(sources: KnowledgeSourceSummary[]): KnowledgeUpdate[] {
  return sources.slice(0, 4).map((source) => ({
    title: `${source.title} indexed`,
    detail: `${formatKnowledgeInteger(source.chunkCount)} searchable chunks saved`,
    time: formatKnowledgeUpdated(source.updatedAt),
    tone: source.kind === "pdf" ? "bg-[#fff0f3] text-[#df405b]" : "bg-[#eef4ff] text-[#246bff]",
    icon: source.kind === "pdf" ? FileText : Database,
  }));
}

function KnowledgeTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: KnowledgeTab[];
  activeTab: KnowledgeTabLabel;
  onTabChange: (tab: KnowledgeTabLabel) => void;
}) {
  return (
    <div className="-mx-4 mt-8 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="grid w-max grid-flow-col auto-cols-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.label === activeTab;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onTabChange(tab.label)}
              aria-pressed={isActive}
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

const manualKnowledgePlaceholders: Record<string, string> = {
  FAQs: "Question: What is included?\nAnswer: Include the exact answer customers should receive.\n\nQuestion: How do I book?\nAnswer: Explain the booking steps.",
  Products:
    "Product name:\nDescription:\nSizes or variants:\nBest for:\nPrice or price range:\nAvailability:\nHow to order:\nCare or usage notes:",
  Services:
    "Service name:\nWhat is included:\nWho it is for:\nAvailability:\nHow to book:\nDelivery or fulfillment time:\nNext step:",
  Pricing:
    "Plan or package:\nPrice:\nWhat is included:\nPayment methods:\nDeposit or advance payment:\nDelivery charges:\nRefund or exchange note:",
  "Business Information":
    "Business name:\nLocation:\nOpening hours:\nContact number:\nInstagram or website link:\nDelivery cities:\nBrand tone:\nImportant notes:",
};

const knowledgeSectionHeadingMap: Record<string, string[]> = {
  Products: ["Product Categories", "Product name:"],
  Services: ["Services", "Service name:", "Ordering, Delivery, and Exchanges"],
  Pricing: ["Pricing and Bundles", "Pricing", "Plan or package:"],
  "Business Information": ["Business Overview", "Business Information", "Business Info", "Business name:", "Lead Qualification Rules"],
};

const knowledgeSectionBreakHeadings = Array.from(new Set([
  ...Object.values(knowledgeSectionHeadingMap).flat(),
  "Sizing Guidance",
  "Fabric and Care",
  "Materials and Finish Guidance",
  "Care Instructions",
  "Sizing and Fit",
  "Pricing, Packaging, and Delivery",
  "Returns and Exchanges",
  "Direct FAQ Answers",
]));

type KnowledgeSourceSection = {
  category: string;
  content: string;
  qaPairs: KnowledgeQaPair[];
  available: boolean;
};

function escapeKnowledgeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeKnowledgeSectionText(value: string) {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getKnowledgeDetailText(source: KnowledgeSourceDetail) {
  return [...source.chunks]
    .sort((a, b) => a.order - b.order)
    .map((chunk) => chunk.text)
    .join("\n\n")
    .trim();
}

function getKnowledgeMarkerMatches(text: string) {
  const categories = knowledgeCategoryOptions.map(escapeKnowledgeRegExp).join("|");
  const markerPattern = new RegExp(`(?:^|\\n)(?:Manual update:[^\\n]*\\n)?Category:\\s*(${categories})\\s*(?:\\nTitle:[^\\n]*)?\\n*`, "gi");
  const matches: { category: string; start: number; end: number }[] = [];
  let match = markerPattern.exec(text);

  while (match) {
    matches.push({
      category: match[1],
      start: match.index,
      end: markerPattern.lastIndex,
    });
    match = markerPattern.exec(text);
  }

  return matches;
}

function extractMarkedKnowledgeCategoryContent(text: string, category: string) {
  const matches = getKnowledgeMarkerMatches(text);

  if (matches.length === 0) {
    return "";
  }

  return matches
    .map((match, index) => {
      const nextMatch = matches[index + 1];

      return {
        category: match.category,
        content: text.slice(match.end, nextMatch?.start ?? text.length),
      };
    })
    .filter((block) => block.category === category)
    .map((block) => normalizeKnowledgeSectionText(block.content))
    .filter(Boolean)
    .join("\n\n");
}

function getKnowledgeHeadingCategory(line: string) {
  const normalizedLine = line.trim().replace(/\s+/g, " ").toLowerCase();

  if (!normalizedLine || /^faq\s*\d*$/i.test(normalizedLine) || normalizedLine.startsWith("question:") || normalizedLine.startsWith("answer:")) {
    return "";
  }

  for (const [category, headings] of Object.entries(knowledgeSectionHeadingMap)) {
    if (
      headings.some((heading) => {
        const normalizedHeading = heading.trim().replace(/\s+/g, " ").toLowerCase();
        return normalizedLine === normalizedHeading || normalizedLine.startsWith(normalizedHeading);
      })
    ) {
      return category;
    }
  }

  return "";
}

function isKnowledgeSectionBreakLine(line: string) {
  const normalizedLine = line.trim().replace(/\s+/g, " ").toLowerCase();

  if (!normalizedLine || /^faq\s*\d*$/i.test(normalizedLine) || normalizedLine.startsWith("question:") || normalizedLine.startsWith("answer:")) {
    return true;
  }

  return knowledgeSectionBreakHeadings.some((heading) => {
    const normalizedHeading = heading.trim().replace(/\s+/g, " ").toLowerCase();
    return normalizedLine === normalizedHeading || normalizedLine.startsWith(normalizedHeading);
  });
}

function extractHeadingKnowledgeCategoryContent(text: string, category: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headingCategory = getKnowledgeHeadingCategory(lines[index]);

    if (!headingCategory) {
      continue;
    }

    const blockLines = [lines[index]];
    let cursor = index + 1;

    while (cursor < lines.length && !isKnowledgeSectionBreakLine(lines[cursor])) {
      blockLines.push(lines[cursor]);
      cursor += 1;
    }

    if (headingCategory === category) {
      blocks.push(blockLines.join("\n"));
    }

    index = cursor - 1;
  }

  return blocks.map(normalizeKnowledgeSectionText).filter(Boolean).join("\n\n");
}

function extractKnowledgeCategoryContent(source: KnowledgeSourceDetail, category: string) {
  if (category === "FAQs") {
    return "";
  }

  const text = getKnowledgeDetailText(source);
  const markedContent = extractMarkedKnowledgeCategoryContent(text, category);

  if (markedContent) {
    return markedContent;
  }

  return extractHeadingKnowledgeCategoryContent(text, category);
}

function buildKnowledgeSourceSections(source: KnowledgeSourceDetail): KnowledgeSourceSection[] {
  return knowledgeCategoryOptions.map((category) => {
    const qaPairs = category === "FAQs" ? source.qaPairs : [];
    const content = extractKnowledgeCategoryContent(source, category);

    return {
      category,
      content,
      qaPairs,
      available: qaPairs.length > 0 || Boolean(content) || source.categories.includes(category),
    };
  });
}

function getKnowledgeSectionTabId(category: string): KnowledgeViewTab {
  switch (category) {
    case "FAQs":
      return "section:FAQs";
    case "Products":
      return "section:Products";
    case "Services":
      return "section:Services";
    case "Pricing":
      return "section:Pricing";
    case "Business Information":
      return "section:Business Information";
    default:
      return "section:Business Information";
  }
}

function getKnowledgeViewSectionCategory(tab: KnowledgeViewTab) {
  switch (tab) {
    case "section:FAQs":
      return "FAQs";
    case "section:Products":
      return "Products";
    case "section:Services":
      return "Services";
    case "section:Pricing":
      return "Pricing";
    case "section:Business Information":
      return "Business Information";
    default:
      return "";
  }
}

function getKnowledgeSectionTabLabel(section: KnowledgeSourceSection) {
  const label = section.category === "Business Information" ? "Business Info" : section.category;

  if (section.category === "FAQs") {
    return `${label} (${section.qaPairs.length})`;
  }

  return label;
}

function createManualKnowledgeDraftFromDetail(source: KnowledgeSourceDetail): ManualKnowledgeDraft {
  const categoryContent = getEmptyManualCategoryContent();
  const sourceSections = buildKnowledgeSourceSections(source);
  const faqPairs = source.qaPairs.length > 0
    ? source.qaPairs.map((pair) => ({
        id: pair.id,
        question: pair.question,
        answer: pair.answer,
      }))
    : [createManualFaqPair()];

  sourceSections.forEach((section) => {
    if (section.category !== "FAQs") {
      categoryContent[section.category] = section.content;
    }
  });

  return {
    title: source.title,
    category: "FAQs",
    content: "",
    faqPairs,
    categoryContent,
    categoryFaqPairs: {
      FAQs: faqPairs,
    },
  };
}

function KnowledgeManualSourceForm({
  draft,
  isSaving,
  isLoadingSourceDetail,
  sourceContext,
  onClose,
  onChange,
  onSave,
}: {
  draft: ManualKnowledgeDraft;
  isSaving: boolean;
  isLoadingSourceDetail: boolean;
  sourceContext?: KnowledgeSource | null;
  onClose?: () => void;
  onChange: (draft: ManualKnowledgeDraft) => void;
  onSave: () => void;
}) {
  const categoryPlaceholder = manualKnowledgePlaceholders[draft.category] || manualKnowledgePlaceholders["Business Information"];
  const isFaqCategory = draft.category === "FAQs";
  const savedSections = sourceContext ? getManualKnowledgeDraftSections(draft) : [];
  const compiledContent = sourceContext
    ? savedSections.map((section) => section.content).join("\n\n").trim()
    : getManualKnowledgeDraftContent(draft);
  const activeFaqPairs = getManualDraftCategoryFaqPairs(draft);
  const activeContent = getManualDraftCategoryContent(draft);

  function updateFaqPair(pairId: string, patch: Partial<ManualFaqPair>) {
    onChange(setManualDraftCategoryFaqPairs(
      draft,
      draft.category,
      activeFaqPairs.map((pair) => (pair.id === pairId ? { ...pair, ...patch } : pair))
    ));
  }

  function addFaqPair() {
    onChange(setManualDraftCategoryFaqPairs(draft, draft.category, [...activeFaqPairs, createManualFaqPair()]));
  }

  function removeFaqPair(pairId: string) {
    onChange(setManualDraftCategoryFaqPairs(draft, draft.category, activeFaqPairs.filter((pair) => pair.id !== pairId)));
  }

  return (
    <section className="rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_18px_45px_rgba(20,28,53,0.025)]">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-black">
            <PencilLine size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            {sourceContext ? "Edit source knowledge" : "Add knowledge manually"}
          </h2>
          <p className="mt-1 max-w-[660px] text-[12px] font-semibold leading-relaxed text-[#596175]">
            {sourceContext
              ? "Review or paste into any tab, then save all filled sections into this source at once."
              : "Add FAQs, products, services, pricing, or business information. Active manual sources are used by chat, inbox, and Instagram comment answers."}
          </p>
          {sourceContext ? (
            <p className="mt-2 inline-flex rounded-[7px] bg-[#f0edff] px-2.5 py-1 text-[11px] font-extrabold text-[#3044ff]">
              {isLoadingSourceDetail ? "Loading existing sections..." : `Updating existing source: ${sourceContext.title}`}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-4 text-[12px] font-extrabold text-[#31394f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={15} strokeWidth={2.35} />
              Close
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isLoadingSourceDetail || compiledContent.length < 10}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={15} className="animate-spin" strokeWidth={2.35} /> : <Check size={15} strokeWidth={2.35} />}
            {isSaving ? "Saving..." : sourceContext ? `Save ${savedSections.length || "all"} section${savedSections.length === 1 ? "" : "s"}` : "Save manual source"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-2">
          {knowledgeCategoryOptions.map((category) => {
            const isActive = draft.category === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChange(switchManualKnowledgeDraftCategory(draft, category))}
                className={`flex h-9 w-full items-center justify-between rounded-[8px] border px-3 text-left text-[12px] font-extrabold transition ${
                  isActive ? "border-[#3044ff] bg-[#f0edff] text-[#3044ff]" : "border-[#e2e6f0] bg-white text-[#31394f] hover:border-[#cbd2e2]"
                }`}
              >
                <span>{category}</span>
                {isActive ? <Check size={14} strokeWidth={2.45} /> : null}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <input
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            placeholder={`${draft.category} title`}
            className="h-10 w-full rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
          />
          {isFaqCategory ? (
            <div className="space-y-3">
              {activeFaqPairs.map((pair, index) => (
                <div key={pair.id} className="rounded-[10px] border border-[#dfe4ef] bg-[#fbfcff] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">
                      FAQ {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFaqPair(pair.id)}
                      disabled={activeFaqPairs.length === 1 && !pair.question.trim() && !pair.answer.trim()}
                      className="flex h-7 items-center justify-center gap-1 rounded-[7px] border border-[#ffd1dc] bg-white px-2 text-[10px] font-extrabold text-[#df405b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X size={12} strokeWidth={2.4} />
                      Remove
                    </button>
                  </div>
                  <input
                    value={pair.question}
                    onChange={(event) => updateFaqPair(pair.id, { question: event.target.value })}
                    placeholder="Question"
                    className="h-10 w-full rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                  />
                  <textarea
                    value={pair.answer}
                    onChange={(event) => updateFaqPair(pair.id, { answer: event.target.value })}
                    placeholder="Answer"
                    className="mt-2 min-h-[96px] w-full resize-y rounded-[8px] border border-[#dfe4ef] bg-white px-3 py-3 text-[12px] font-semibold leading-relaxed text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addFaqPair}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#3044ff] bg-white px-3 text-[12px] font-extrabold text-[#3044ff] transition hover:bg-[#f5f7ff]"
              >
                <Plus size={15} strokeWidth={2.35} />
                Add more FAQ
              </button>
              <p className="text-[11px] font-semibold leading-relaxed text-[#596175]">
                Each question and answer is saved as a direct answer, so matching customer questions can be answered from knowledge immediately.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={activeContent}
                onChange={(event) => onChange(setManualDraftCategoryContent(draft, draft.category, event.target.value))}
                placeholder={categoryPlaceholder}
                className="min-h-[190px] w-full resize-y rounded-[10px] border border-[#dfe4ef] bg-white px-3 py-3 text-[12px] font-semibold leading-relaxed text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
              <p className="text-[11px] font-semibold leading-relaxed text-[#596175]">
                Other categories can be plain text, lists, or pasted notes.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function KnowledgeManualSourceModal({
  draft,
  isSaving,
  isLoadingSourceDetail,
  sourceContext,
  onChange,
  onClose,
  onSave,
}: {
  draft: ManualKnowledgeDraft;
  isSaving: boolean;
  isLoadingSourceDetail: boolean;
  sourceContext: KnowledgeSource | null;
  onChange: (draft: ManualKnowledgeDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/32 px-4 py-5 backdrop-blur-sm">
      <button type="button" aria-label="Close manual knowledge modal" className="absolute inset-0 cursor-default" onClick={isSaving ? undefined : onClose} />
      <div className="relative max-h-[90vh] w-[min(1040px,100%)] overflow-y-auto rounded-[14px] bg-white p-3 shadow-[0_32px_90px_rgba(12,18,38,0.24)]">
        <KnowledgeManualSourceForm
          draft={draft}
          isSaving={isSaving}
          isLoadingSourceDetail={isLoadingSourceDetail}
          sourceContext={sourceContext}
          onChange={onChange}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
}

function KnowledgeSourceViewModal({
  source,
  isLoading,
  error,
  activeTab,
  onTabChange,
  onClose,
  onDeleteAnswer,
  deletingSourceId,
  deletingAnswerId,
}: {
  source: KnowledgeSourceDetail | null;
  isLoading: boolean;
  error: string;
  activeTab: KnowledgeViewTab;
  onTabChange: (tab: KnowledgeViewTab) => void;
  onClose: () => void;
  onDeleteAnswer: (sourceId: string, qaPairId: string) => void;
  deletingSourceId: string;
  deletingAnswerId: string;
}) {
  const sourceSections = source ? buildKnowledgeSourceSections(source) : [];
  const activeSectionCategory = getKnowledgeViewSectionCategory(activeTab);
  const activeSection = activeSectionCategory
    ? sourceSections.find((section) => section.category === activeSectionCategory) || null
    : null;
  const tabs: { id: KnowledgeViewTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    ...sourceSections.map((section) => ({
      id: getKnowledgeSectionTabId(section.category),
      label: getKnowledgeSectionTabLabel(section),
    })),
    { id: "text", label: `PDF text (${source?.chunks.length || 0})` },
    { id: "details", label: "Details" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/32 px-4 py-5 backdrop-blur-sm">
      <button type="button" aria-label="Close source view" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative flex max-h-[90vh] w-[min(980px,100%)] flex-col overflow-hidden rounded-[14px] border border-[#e1e5ef] bg-white shadow-[0_32px_90px_rgba(12,18,38,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf0f6] p-5">
          <div>
            <h2 className="text-[20px] font-extrabold leading-tight text-black">{source?.title || "Knowledge source"}</h2>
            <p className="mt-1 text-[12px] font-semibold text-[#596175]">
              {isLoading ? "Loading indexed source data..." : source ? `${source.fileName || source.title} • ${formatKnowledgeBytes(source.fileSize)}` : "Source details"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#dfe4ef] bg-white text-black"
              aria-label="Close source view"
            >
              <X size={18} strokeWidth={2.35} />
            </button>
          </div>
        </div>

        <div className="border-b border-[#edf0f6] px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`h-9 rounded-[8px] px-3 text-[12px] font-extrabold transition ${
                  activeTab === tab.id ? "bg-[#3044ff] text-white" : "border border-[#dfe4ef] bg-white text-[#46506a] hover:bg-[#f8f9fc]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[360px] overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex h-[260px] items-center justify-center gap-3 rounded-[12px] bg-[#f8f9fc] text-[13px] font-extrabold text-[#46506a]">
              <RefreshCw size={18} className="animate-spin text-[#3044ff]" strokeWidth={2.35} />
              Loading source...
            </div>
          ) : error ? (
            <div className="rounded-[10px] border border-[#ffd1dc] bg-[#fff7f9] px-4 py-3 text-[12px] font-extrabold text-[#df405b]">{error}</div>
          ) : source ? (
            <>
              {activeTab === "overview" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Type", source.kind.toUpperCase()],
                    ["Status", source.active ? "Active" : "Inactive"],
                    ["Words", formatKnowledgeInteger(source.wordCount)],
                    ["Characters", formatKnowledgeInteger(source.characterCount)],
                    ["Chunks", formatKnowledgeInteger(source.chunkCount)],
                    ["Direct answers", formatKnowledgeInteger(source.qaPairs.length || source.directAnswerCount)],
                    ["File size", formatKnowledgeBytes(source.fileSize)],
                    ["Created", formatKnowledgeUpdated(source.createdAt)],
                    ["Updated", formatKnowledgeUpdated(source.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[10px] border border-[#edf0f6] bg-[#fbfcff] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#697083]">{label}</p>
                      <p className="mt-1 text-[13px] font-extrabold text-black">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeSectionCategory ? (
                <div className="space-y-3">
                  {activeSection?.category === "FAQs" ? (
                    activeSection.qaPairs.length === 0 ? (
                      <p className="rounded-[10px] bg-[#f8f9fc] px-4 py-5 text-[12px] font-semibold text-[#596175]">No direct FAQ answers were extracted from this source.</p>
                    ) : (
                      activeSection.qaPairs.map((pair, index) => (
                        <article key={pair.id} className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#697083]">FAQ {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => onDeleteAnswer(source.id, pair.id)}
                              disabled={Boolean(deletingSourceId) || Boolean(deletingAnswerId)}
                              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[8px] border border-[#ffd1dc] bg-[#fff7f9] px-3 text-[11px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f4] disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Delete FAQ ${index + 1}`}
                            >
                              {deletingAnswerId === pair.id ? <RefreshCw size={13} className="animate-spin" strokeWidth={2.35} /> : <Trash2 size={13} strokeWidth={2.35} />}
                              Delete
                            </button>
                          </div>
                          <h3 className="mt-2 text-[13px] font-extrabold text-black">{pair.question}</h3>
                          <p className="mt-2 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#31394f]">{pair.answer}</p>
                        </article>
                      ))
                    )
                  ) : activeSection?.content ? (
                    <article className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-[13px] font-extrabold text-black">{activeSection.category}</h3>
                        <span className="rounded-[7px] bg-[#f0edff] px-2.5 py-1 text-[10px] font-extrabold text-[#3044ff]">Section text</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#31394f]">{activeSection.content}</p>
                    </article>
                  ) : (
                    <p className="rounded-[10px] bg-[#f8f9fc] px-4 py-5 text-[12px] font-semibold text-[#596175]">
                      No {activeSectionCategory === "Business Information" ? "business info" : activeSectionCategory.toLowerCase()} section text was found in this source.
                    </p>
                  )}
                </div>
              ) : null}

              {activeTab === "text" ? (
                <div className="space-y-3">
                  {source.chunks.length === 0 ? (
                    <p className="rounded-[10px] bg-[#f8f9fc] px-4 py-5 text-[12px] font-semibold text-[#596175]">No searchable text chunks were found.</p>
                  ) : (
                    source.chunks.map((chunk) => (
                      <article key={chunk.id} className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#697083]">Chunk {chunk.order + 1}</p>
                        <p className="mt-2 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#31394f]">{chunk.text}</p>
                      </article>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === "details" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                    <h3 className="text-[13px] font-extrabold text-black">Categories</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {source.categories.length > 0 ? (
                        source.categories.map((category) => (
                          <span key={category} className="rounded-[7px] bg-[#f0edff] px-2.5 py-1 text-[11px] font-extrabold text-[#3044ff]">
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] font-semibold text-[#596175]">No categories detected.</span>
                      )}
                    </div>
                  </section>
                  <section className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                    <h3 className="text-[13px] font-extrabold text-black">File details</h3>
                    <dl className="mt-3 space-y-2 text-[12px]">
                      {[
                        ["File name", source.fileName || source.title],
                        ["MIME type", source.mimeType || "text/plain"],
                        ["Source ID", source.id],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                          <dt className="font-extrabold text-[#46506a]">{label}</dt>
                          <dd className="min-w-0 break-words font-semibold text-black">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function KnowledgeSourceRows({
  sources,
  totalSourceCount,
  activeTab,
  pdfSources,
  selectedPdfId,
  onPdfSelectionChange,
  onUploadClick,
  onDropFiles,
  onActiveChange,
  onView,
  onAddManual,
  onDelete,
  deletingSourceId,
  isUploading,
  uploadMessage,
}: {
  sources: KnowledgeSource[];
  totalSourceCount: number;
  activeTab: KnowledgeTabLabel;
  pdfSources: KnowledgeSource[];
  selectedPdfId: string;
  onPdfSelectionChange: (sourceId: string) => void;
  onUploadClick: () => void;
  onDropFiles: (files: FileList | null) => void;
  onActiveChange: (sourceId: string, active: boolean) => void;
  onView: (sourceId: string) => void;
  onAddManual: (source: KnowledgeSource) => void;
  onDelete: (sourceId: string) => void;
  deletingSourceId: string;
  isUploading: boolean;
  uploadMessage: string;
}) {
  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    onDropFiles(event.dataTransfer.files);
  }
  const selectedPdf = pdfSources.find((source) => source.id === selectedPdfId) || null;
  const isFilteredView = activeTab !== "All Sources";
  const tabSourceTitle =
    activeTab === "FAQs"
      ? "FAQ sources"
      : activeTab === "PDFs"
        ? "PDF sources"
        : activeTab === "Business Info"
          ? "Business info sources"
          : `${activeTab} sources`;
  const emptyTitle = isFilteredView ? `No ${tabSourceTitle.toLowerCase()} found` : "No saved knowledge sources yet";
  const emptyDetail = isFilteredView
    ? "Switch to All Sources or add a matching knowledge source."
    : "Add FAQs, products, services, pricing, business information, or PDFs to train the AI.";
  const sectionTitle = selectedPdf
    ? selectedPdf.title
    : isFilteredView
      ? tabSourceTitle
      : "Saved knowledge sources";
  const sectionDetail = isFilteredView
    ? `Showing ${formatKnowledgeInteger(sources.length)} of ${formatKnowledgeInteger(totalSourceCount)} saved source${totalSourceCount === 1 ? "" : "s"}.`
    : "PDF/TXT and manual sources are listed here. Active sources are available to AI replies.";

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 rounded-[10px] border border-[#e7eaf2] bg-white p-3 shadow-[0_18px_45px_rgba(20,28,53,0.025)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-extrabold text-black">{sectionTitle}</h2>
          <p className="mt-1 text-[11px] font-medium text-[#596175]">
            {sectionDetail}
          </p>
        </div>
        {activeTab === "PDFs" && pdfSources.length > 1 ? (
          <label className="flex h-9 min-w-[220px] items-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[11px] font-extrabold text-[#31394f]">
            <span className="shrink-0 text-[#596175]">PDF</span>
            <select
              value={selectedPdfId}
              onChange={(event) => onPdfSelectionChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[12px] font-extrabold text-black outline-none"
            >
              <option value="all">All PDFs</option>
              {pdfSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="overflow-x-auto overflow-y-hidden rounded-[12px] border border-[#e7eaf2] bg-white shadow-[0_18px_45px_rgba(20,28,53,0.025)]">
        <div className="hidden min-w-[1180px] grid-cols-[minmax(260px,1fr)_82px_120px_150px_120px_360px] border-b border-[#edf0f6] bg-[#fbfcff] px-4 py-3 text-[11px] font-semibold text-[#46506a] md:grid">
          <span>Source</span>
          <span>Type</span>
          <span>Status</span>
          <span>Active</span>
          <span>Last updated</span>
          <span>Actions</span>
        </div>

        {sources.length === 0 ? (
          <div className="border border-dashed border-[#d7deeb] px-5 py-10 text-center">
            <BookOpen className="mx-auto text-[#3044ff]" size={30} strokeWidth={2.35} />
            <h2 className="mt-3 text-[15px] font-extrabold text-black">{emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-[480px] text-[12px] font-medium leading-relaxed text-[#596175]">
              {emptyDetail}
            </p>
          </div>
        ) : (
          <div className="min-w-[1180px] divide-y divide-[#edf0f6]">
            {sources.map((source) => {
              const isSectionRow = isKnowledgeSectionTab(activeTab);
              const Icon = isSectionRow ? getKnowledgeSectionRowIcon(activeTab) : source.icon;
              const sectionLabel = getKnowledgeSectionDisplayLabel(activeTab);
              const displayTitle = isSectionRow ? `${sectionLabel} section` : source.title;
              const displaySubtitle = isSectionRow
                ? `From ${source.title} • ${source.subtitle}`
                : source.subtitle;
              const displayTone = isSectionRow ? "bg-[#f0edff] text-[#4b3cff]" : source.tone;
              const displayType = isSectionRow ? "SECTION" : source.type;
              const displayTypeTone = isSectionRow ? "bg-[#f0edff] text-[#4b3cff]" : source.typeTone;
              const displayModeLabel = isSectionRow ? `${sectionLabel} knowledge` : source.sourceModeLabel;
              const displayModeTone = isSectionRow
                ? "bg-[#f0edff] text-[#4b3cff]"
                : source.sourceMode === "auto"
                  ? "bg-[#eef4ff] text-[#246bff]"
                  : "bg-[#f0edff] text-[#4b3cff]";

              return (
	                <article
	                  key={source.id}
	                  className="grid gap-3 px-4 py-4 transition hover:bg-[#fbfcff] md:grid-cols-[minmax(260px,1fr)_82px_120px_150px_120px_360px] md:items-center"
	                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] ${displayTone}`}>
                      <Icon size={21} strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-extrabold text-black">{displayTitle}</span>
                      <span className="mt-1 block truncate text-[12px] font-medium text-[#46506a]">{displaySubtitle}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex h-6 items-center rounded-[7px] px-2 text-[10px] font-extrabold ${displayModeTone}`}>
                          {displayModeLabel}
                        </span>
                        {source.directAnswerCount > 0 ? (
                          <span className="inline-flex h-6 items-center rounded-[7px] bg-[#eafaf0] px-2 text-[10px] font-extrabold text-[#0a9b3f]">
                            {formatKnowledgeInteger(source.directAnswerCount)} answer{source.directAnswerCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Type</span>
                    <span className={`inline-flex h-6 items-center rounded-[7px] px-2.5 text-[11px] font-bold ${displayTypeTone}`}>
                      {displayType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Status</span>
                    <span className={`inline-flex h-6 items-center gap-2 rounded-[7px] px-2.5 text-[11px] font-bold ${source.statusTone}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {source.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Active</span>
                    <SettingsToggle
                      ariaLabel={`${source.title} knowledge source ${source.active ? "active" : "inactive"}`}
                      checked={source.active}
                      onChange={(checked) => onActiveChange(source.id, checked)}
                      showStateLabel
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Last updated</span>
                    <p className="whitespace-pre-line text-right text-[12px] font-medium leading-[1.35] text-[#46506a] md:text-left">
                      {source.updated}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Actions</span>
                    <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
                      <button
                        type="button"
                        onClick={() => onView(source.id)}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[11px] font-extrabold text-[#31394f] transition hover:bg-[#f8f9fc]"
                      >
                        <Eye size={13} strokeWidth={2.35} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddManual(source)}
                        disabled={isUploading}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#d7d5ff] bg-[#f5f3ff] px-3 text-[11px] font-extrabold text-[#3044ff] transition hover:bg-[#efedff] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PencilLine size={13} strokeWidth={2.35} />
                        Edit sections
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(source.id)}
                        disabled={isUploading || deletingSourceId === source.id}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#ffd1dc] bg-[#fff7f9] px-3 text-[11px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f4] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingSourceId === source.id ? (
                          <RefreshCw size={13} className="animate-spin" strokeWidth={2.35} />
                        ) : (
                          <Trash2 size={13} strokeWidth={2.35} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-[10px] border border-[#e7eaf2] bg-white p-3 shadow-[0_18px_45px_rgba(20,28,53,0.025)]">
        <div>
          <div>
            <h3 className="text-[13px] font-extrabold text-black">Auto scan upload</h3>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#596175]">
              Upload a PDF or TXT file and TractionFlo will scan it into searchable chunks and direct answers.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onUploadClick}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        disabled={isUploading}
        className="mt-3 flex h-[78px] w-full items-center justify-center gap-3 rounded-[10px] border border-dashed border-[#d7deeb] bg-white text-center shadow-[0_18px_45px_rgba(20,28,53,0.025)] transition hover:border-[#3044ff] hover:bg-[#fbfcff] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isUploading ? <RefreshCw size={18} className="animate-spin text-[#3044ff]" strokeWidth={2.2} /> : <UploadCloud size={18} className="text-[#31394f]" strokeWidth={2.2} />}
        <span>
          <span className="block text-[14px] font-semibold text-black">
            {isUploading ? "Indexing knowledge..." : <>Drag and drop PDFs/TXT here&nbsp; or&nbsp; <span className="font-extrabold text-[#3044ff]">browse</span></>}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-[#46506a]">{uploadMessage || "PDF or TXT up to 50MB"}</span>
        </span>
      </button>
    </section>
  );
}

function TrainingStatusCard({ percent, sourceCount }: { percent: number; sourceCount: number }) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const trainedDegrees = Math.round((clampedPercent / 100) * 360);

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
        <div
          className="relative mx-auto flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full sm:mx-0"
          style={{
            background: `conic-gradient(#3044ff 0deg ${trainedDegrees}deg, #eef0fb ${trainedDegrees}deg 360deg)`,
          }}
        >
          <div className="absolute inset-[8px] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-[20px] font-extrabold leading-none text-black">{clampedPercent}%</span>
            <span className="mt-1.5 text-[10px] font-semibold text-[#596175]">Trained</span>
          </div>
        </div>
        <p className="text-[14px] font-medium leading-[1.55] text-black">
          {sourceCount > 0
            ? "Your AI has saved knowledge sources available."
            : "No saved knowledge sources are connected yet."}
        </p>
      </div>

      <div className="mt-5 space-y-4 border-t border-[#edf0f6] pt-4">
        {[
          ["Sources synced", `${sourceCount} / ${sourceCount}`, sourceCount > 0 ? "text-[#0a9b3f]" : "text-[#596175]"],
          ["Up to date", String(sourceCount), sourceCount > 0 ? "text-[#0a9b3f]" : "text-[#596175]"],
          ["Needs review", "0", "text-[#596175]"],
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

function KnowledgeInsightsCard({ insights }: { insights: KnowledgeInsight[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-black">
        <BarChart3 size={15} strokeWidth={2.35} />
        Knowledge Insights
      </h2>

      <div className="mt-4 space-y-3">
        {insights.map((insight) => {
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

function KnowledgeUpdatesCard({ updates }: { updates: KnowledgeUpdate[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-extrabold text-black">Recent updates</h2>
        <button type="button" className="text-[12px] font-extrabold text-[#3044ff]">View all</button>
      </div>

      <div className="mt-4 space-y-4">
        {updates.length === 0 ? (
          <p className="rounded-[9px] bg-[#f8f9fc] px-3 py-4 text-[12px] font-medium leading-relaxed text-[#596175]">
            No real knowledge updates have been recorded yet.
          </p>
        ) : updates.map((update) => {
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

function KnowledgeBasePage({ summary, isLoading, error }: { summary: CreatorLiveSummary; isLoading: boolean; error: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSourceSummary[]>([]);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(true);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const [isSavingManualKnowledge, setIsSavingManualKnowledge] = useState(false);
  const [deletingKnowledgeSourceId, setDeletingKnowledgeSourceId] = useState("");
  const [deletingKnowledgeAnswerId, setDeletingKnowledgeAnswerId] = useState("");
  const [knowledgeError, setKnowledgeError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isManualKnowledgeModalOpen, setIsManualKnowledgeModalOpen] = useState(false);
  const [isLoadingManualKnowledgeDetail, setIsLoadingManualKnowledgeDetail] = useState(false);
  const [manualKnowledgeSourceContext, setManualKnowledgeSourceContext] = useState<KnowledgeSource | null>(null);
  const [viewingKnowledgeSourceId, setViewingKnowledgeSourceId] = useState("");
  const [viewingKnowledgeSource, setViewingKnowledgeSource] = useState<KnowledgeSourceDetail | null>(null);
  const [knowledgeViewError, setKnowledgeViewError] = useState("");
  const [knowledgeViewTab, setKnowledgeViewTab] = useState<KnowledgeViewTab>("overview");
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<KnowledgeTabLabel>("All Sources");
  const [selectedKnowledgePdfId, setSelectedKnowledgePdfId] = useState("all");
  const [manualKnowledgeDraft, setManualKnowledgeDraft] = useState<ManualKnowledgeDraft>(() => createManualKnowledgeDraft());

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledgeSources() {
      try {
        const response = await fetch("/api/knowledge/sources", { cache: "no-store" });
        const payload = (await response.json()) as KnowledgeSourcesResponse;

        if (!response.ok || payload.error) {
          throw new Error(payload.error || "Could not load knowledge sources");
        }

        if (isMounted) {
          setKnowledgeSources(payload.sources || []);
          setKnowledgeError("");
        }
      } catch (loadError) {
        if (isMounted) {
          setKnowledgeError(loadError instanceof Error ? loadError.message : "Could not load knowledge sources");
        }
      } finally {
        if (isMounted) {
          setIsKnowledgeLoading(false);
        }
      }
    }

    void loadKnowledgeSources();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetManualKnowledgeDraft(source?: KnowledgeSource | null) {
    setManualKnowledgeDraft(createManualKnowledgeDraft(source));
  }

  async function openManualKnowledgeModal(source?: KnowledgeSource | null) {
    const nextSource = source || null;

    setManualKnowledgeSourceContext(nextSource);
    resetManualKnowledgeDraft(nextSource);
    setIsManualKnowledgeModalOpen(true);
    setIsLoadingManualKnowledgeDetail(Boolean(nextSource?.id));

    if (!nextSource?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge/sources/${nextSource.id}`, { cache: "no-store" });
      const payload = (await response.json()) as KnowledgeSourceDetailResponse;

      if (!response.ok || payload.error || !payload.detail) {
        throw new Error(payload.error || "Could not load source sections");
      }

      setManualKnowledgeDraft(createManualKnowledgeDraftFromDetail(payload.detail));
      setKnowledgeError("");
    } catch (detailError) {
      const message = detailError instanceof Error ? detailError.message : "Could not load source sections";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setIsLoadingManualKnowledgeDetail(false);
    }
  }

  function closeManualKnowledgeModal() {
    if (isSavingManualKnowledge) {
      return;
    }

    setIsManualKnowledgeModalOpen(false);
    setIsLoadingManualKnowledgeDetail(false);
    setManualKnowledgeSourceContext(null);
  }

  function changeKnowledgeTab(tab: KnowledgeTabLabel) {
    setActiveKnowledgeTab(tab);
    setSelectedKnowledgePdfId("all");
  }

  async function openKnowledgeSourceView(sourceId: string) {
    setViewingKnowledgeSourceId(sourceId);
    setViewingKnowledgeSource(null);
    setKnowledgeViewError("");
    setKnowledgeViewTab("overview");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, { cache: "no-store" });
      const payload = (await response.json()) as KnowledgeSourceDetailResponse;

      if (!response.ok || payload.error || !payload.detail) {
        throw new Error(payload.error || "Could not load knowledge source");
      }

      setViewingKnowledgeSource(payload.detail);
    } catch (viewError) {
      setKnowledgeViewError(viewError instanceof Error ? viewError.message : "Could not load knowledge source");
    }
  }

  function closeKnowledgeSourceView() {
    setViewingKnowledgeSourceId("");
    setViewingKnowledgeSource(null);
    setKnowledgeViewError("");
  }

  async function uploadKnowledgeFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file || isUploadingKnowledge) {
      return;
    }

    setIsUploadingKnowledge(true);
    setKnowledgeError("");
    setUploadMessage(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assignment", knowledgeSources.length === 0 ? "default" : "auto");

      const response = await fetch("/api/knowledge/sources", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not upload knowledge source");
      }

      console.log("Knowledge upload assistant id:", {
        assistantId: payload.assistantId || payload.assistant_id || "",
        assistant_id: payload.assistant_id || payload.assistantId || "",
        sourceId: payload.source?.id || "",
        fileName: file.name,
      });

      setKnowledgeSources(payload.sources || []);
      setUploadMessage(`${file.name} indexed and ready.`);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Could not upload knowledge source";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setIsUploadingKnowledge(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function saveManualKnowledgeSource() {
    const isAppendingToSource = Boolean(manualKnowledgeSourceContext?.id);
    const manualSections = isAppendingToSource ? getManualKnowledgeDraftSections(manualKnowledgeDraft) : [];
    const manualContent = isAppendingToSource
      ? manualSections.map((section) => section.content).join("\n\n").trim()
      : getManualKnowledgeDraftContent(manualKnowledgeDraft);

    if (isSavingManualKnowledge || isLoadingManualKnowledgeDetail || manualContent.length < 10) {
      return;
    }

    const endpoint = isAppendingToSource
      ? `/api/knowledge/sources/${manualKnowledgeSourceContext?.id}`
      : "/api/knowledge/sources";

    setIsSavingManualKnowledge(true);
    setKnowledgeError("");
    setUploadMessage(
      isAppendingToSource
        ? `Saving ${manualSections.length} section${manualSections.length === 1 ? "" : "s"} to ${manualKnowledgeSourceContext?.title}...`
        : `Saving ${manualKnowledgeDraft.category} knowledge...`
    );

    try {
      const response = await fetch(endpoint, {
        method: isAppendingToSource ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: manualKnowledgeDraft.title,
          category: manualKnowledgeDraft.category,
          content: isAppendingToSource ? undefined : manualContent,
          sections: isAppendingToSource ? manualSections : undefined,
          replaceCategory: isAppendingToSource,
          assignment: knowledgeSources.length === 0 ? "default" : "auto",
        }),
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse;

      if (!response.ok || payload.error) {
        throw new Error(
          payload.error || (isAppendingToSource ? "Could not add knowledge to this source" : "Could not save manual knowledge source")
        );
      }

      setKnowledgeSources(payload.sources || []);
      setUploadMessage(
        isAppendingToSource
          ? `${manualSections.length} section${manualSections.length === 1 ? "" : "s"} saved to ${manualKnowledgeSourceContext?.title}.`
          : `${manualKnowledgeDraft.title || manualKnowledgeDraft.category} saved and ready for AI replies.`
      );
      setManualKnowledgeDraft((current) => ({
        ...createManualKnowledgeDraft(),
        title: current.title && isAppendingToSource ? current.title : "",
      }));
      setIsManualKnowledgeModalOpen(false);
      setIsLoadingManualKnowledgeDetail(false);
      setManualKnowledgeSourceContext(null);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : isAppendingToSource
          ? "Could not add knowledge to this source"
          : "Could not save manual knowledge source";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setIsSavingManualKnowledge(false);
    }
  }

  async function updateKnowledgeSource(sourceId: string, partial: { active?: boolean; assignment?: KnowledgeAssignmentValue }) {
    setKnowledgeError("");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(partial),
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not update knowledge source");
      }

      setKnowledgeSources(payload.sources || []);
      setUploadMessage("Knowledge source updated.");
    } catch (updateError) {
      setKnowledgeError(updateError instanceof Error ? updateError.message : "Could not update knowledge source");
    }
  }

  async function deleteKnowledgeSource(sourceId: string) {
    if (deletingKnowledgeSourceId) {
      return;
    }

    const source = knowledgeSources.find((item) => item.id === sourceId) || (viewingKnowledgeSource?.id === sourceId ? viewingKnowledgeSource : null);
    const shouldDelete = window.confirm(`Delete ${source?.title || "this knowledge source"}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingKnowledgeSourceId(sourceId);
    setKnowledgeError("");
    setUploadMessage("");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse & { deleted?: boolean };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not delete knowledge source");
      }

      setKnowledgeSources((currentSources) => currentSources.filter((item) => item.id !== sourceId));
      if (viewingKnowledgeSourceId === sourceId) {
        closeKnowledgeSourceView();
      }
      setUploadMessage(`${source?.title || "Knowledge source"} deleted.`);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Could not delete knowledge source";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setDeletingKnowledgeSourceId("");
    }
  }

  async function deleteKnowledgeAnswer(sourceId: string, qaPairId: string) {
    if (deletingKnowledgeAnswerId) {
      return;
    }

    const answer = viewingKnowledgeSource?.id === sourceId
      ? viewingKnowledgeSource.qaPairs.find((pair) => pair.id === qaPairId)
      : null;
    const shouldDelete = window.confirm(`Delete this answer section${answer?.question ? `: ${answer.question.slice(0, 80)}` : ""}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingKnowledgeAnswerId(qaPairId);
    setKnowledgeError("");
    setKnowledgeViewError("");
    setUploadMessage("");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deleteQaPairId: qaPairId }),
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse & KnowledgeSourceDetailResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not delete answer section");
      }

      if (payload.sources) {
        setKnowledgeSources(payload.sources);
      }

      if (payload.detail) {
        setViewingKnowledgeSource(payload.detail);
      } else {
        setViewingKnowledgeSource((current) =>
          current?.id === sourceId
            ? {
                ...current,
                qaPairs: current.qaPairs.filter((pair) => pair.id !== qaPairId),
                directAnswerCount: Math.max(0, current.directAnswerCount - 1),
                updatedAt: new Date().toISOString(),
              }
            : current
        );
      }

      setUploadMessage("Answer section deleted.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Could not delete answer section";
      setKnowledgeViewError(message);
      setKnowledgeError(message);
    } finally {
      setDeletingKnowledgeAnswerId("");
    }
  }

  const sourceRows = knowledgeSources.map(mapKnowledgeSourceSummary);
  const pdfSourceRows = sourceRows.filter((source) => source.kind === "pdf");
  const effectiveSelectedKnowledgePdfId =
    selectedKnowledgePdfId !== "all" && pdfSourceRows.some((source) => source.id === selectedKnowledgePdfId)
      ? selectedKnowledgePdfId
      : "all";
  const tabFilteredSourceRows = sourceRows.filter((source) => isKnowledgeSourceInTab(source, activeKnowledgeTab));
  const filteredSourceRows =
    activeKnowledgeTab === "PDFs" && effectiveSelectedKnowledgePdfId !== "all"
      ? tabFilteredSourceRows.filter((source) => source.id === effectiveSelectedKnowledgePdfId)
      : tabFilteredSourceRows;
  const knowledgeTabs = isKnowledgeLoading && knowledgeSources.length === 0 ? summary.knowledgeTabs : buildKnowledgeTabsFromSources(knowledgeSources);
  const knowledgeInsights = buildKnowledgeInsightsFromSources(knowledgeSources, summary.knowledgeInsights);
  const knowledgeUpdates = buildKnowledgeUpdatesFromSources(knowledgeSources);
  const activeKnowledgeCount = knowledgeSources.filter((source) => source.active).length;
  const trainingPercent = knowledgeSources.length > 0 ? Math.round((activeKnowledgeCount / knowledgeSources.length) * 100) : 0;
  const visibleStatusMessage = isLoading
    ? "Loading real workspace data..."
    : isKnowledgeLoading
      ? "Loading saved knowledge sources..."
      : error || knowledgeError;

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
              onClick={() => void openManualKnowledgeModal()}
              disabled={isUploadingKnowledge || isSavingManualKnowledge}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.2)] sm:w-[124px]"
            >
              {isUploadingKnowledge || isSavingManualKnowledge ? <RefreshCw size={16} className="animate-spin" strokeWidth={2.4} /> : <Plus size={16} strokeWidth={2.4} />}
              <span className="hidden sm:inline">{isUploadingKnowledge || isSavingManualKnowledge ? "Adding" : "Add source"}</span>
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(event) => void uploadKnowledgeFiles(event.target.files)}
        />

        <KnowledgeTabs tabs={knowledgeTabs} activeTab={activeKnowledgeTab} onTabChange={changeKnowledgeTab} />

        {visibleStatusMessage && (
          <div className="mt-4 rounded-[10px] border border-[#edf0f6] bg-white px-4 py-3 text-[12px] font-semibold text-[#46506a] shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            {visibleStatusMessage}
          </div>
        )}

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_344px]">
          <div>
            <KnowledgeSourceRows
              sources={filteredSourceRows}
              totalSourceCount={sourceRows.length}
              activeTab={activeKnowledgeTab}
              pdfSources={pdfSourceRows}
              selectedPdfId={effectiveSelectedKnowledgePdfId}
              onPdfSelectionChange={setSelectedKnowledgePdfId}
              onUploadClick={() => fileInputRef.current?.click()}
              onDropFiles={(files) => void uploadKnowledgeFiles(files)}
              onActiveChange={(sourceId, active) => void updateKnowledgeSource(sourceId, { active })}
              onView={(sourceId) => void openKnowledgeSourceView(sourceId)}
              onAddManual={(source) => void openManualKnowledgeModal(source)}
              onDelete={(sourceId) => void deleteKnowledgeSource(sourceId)}
              deletingSourceId={deletingKnowledgeSourceId}
              isUploading={isUploadingKnowledge}
              uploadMessage={uploadMessage}
            />
          </div>

          <aside className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <TrainingStatusCard percent={trainingPercent} sourceCount={knowledgeSources.length} />
            <KnowledgeInsightsCard insights={knowledgeInsights} />
            <KnowledgeUpdatesCard updates={knowledgeUpdates} />
          </aside>
        </div>

        {isManualKnowledgeModalOpen ? (
          <KnowledgeManualSourceModal
            draft={manualKnowledgeDraft}
            isSaving={isSavingManualKnowledge}
            isLoadingSourceDetail={isLoadingManualKnowledgeDetail}
            sourceContext={manualKnowledgeSourceContext}
            onChange={setManualKnowledgeDraft}
            onClose={closeManualKnowledgeModal}
            onSave={() => void saveManualKnowledgeSource()}
          />
        ) : null}

        {viewingKnowledgeSourceId ? (
          <KnowledgeSourceViewModal
            source={viewingKnowledgeSource}
            isLoading={!viewingKnowledgeSource && !knowledgeViewError}
            error={knowledgeViewError}
            activeTab={knowledgeViewTab}
            onTabChange={setKnowledgeViewTab}
            onClose={closeKnowledgeSourceView}
            onDeleteAnswer={(sourceId, qaPairId) => void deleteKnowledgeAnswer(sourceId, qaPairId)}
            deletingSourceId={deletingKnowledgeSourceId}
            deletingAnswerId={deletingKnowledgeAnswerId}
          />
        ) : null}
      </div>
    </main>
  );
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

function AudienceGrowthChart({ totalAudience }: { totalAudience: number }) {
  const xLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  const maxValue = Math.max(totalAudience, 1);
  const yLabels = [maxValue, Math.round(maxValue * 0.66), Math.round(maxValue * 0.33), 0];
  const points = [60, 162, 263, 365, 467, 568, 640].map((x) => ({ x, y: totalAudience > 0 ? 82 : 198 }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");

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

          {yLabels.map((label, index) => (
            <text key={label} x="16" y={32 + index * 58} fill="#46506a" fontSize="12" fontWeight="600">
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
          <circle cx={points[6].x} cy={points[6].y} r="9" fill="#edeaff" filter="url(#audienceDotGlow)" />
          <circle cx={points[6].x} cy={points[6].y} r="5.5" fill="#4b3cff" />
          <circle cx={points[6].x} cy={points[6].y} r="3" fill="#ffffff" />

          {xLabels.map((label, index) => (
            <text key={label} x={60 + index * 97} y="232" textAnchor="middle" fill="#46506a" fontSize="12" fontWeight="600">
              {label}
            </text>
          ))}
        </svg>

        <div className="pointer-events-none absolute right-8 top-[126px] hidden h-[58px] w-[94px] rounded-[8px] bg-white px-3 py-2.5 shadow-[0_24px_60px_rgba(82,67,210,0.16)] xl:block">
          <p className="text-[10px] font-semibold text-black">Current</p>
          <p className="mt-1 text-[15px] font-extrabold leading-none text-[#4b3cff]">{formatCreatorInteger(totalAudience)}</p>
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

function TopAudienceCard({ people }: { people: AudienceProfile[] }) {
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

        {people.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#d7deeb] bg-white p-6 text-center">
            <Users className="mx-auto text-[#3044ff]" size={26} strokeWidth={2.35} />
            <p className="mt-3 text-[12px] font-semibold text-[#596175]">No real audience members loaded yet.</p>
          </div>
        ) : people.map((person, index) => (
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

      {people.length > 0 ? (
        <button type="button" className="mx-auto mt-4 flex items-center gap-3 text-[12px] font-extrabold text-[#3044ff]">
          View all audience
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      ) : null}
    </section>
  );
}

function AudienceSegmentsCard({ segments }: { segments: AudienceSegment[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-black">Audience segments</h2>
        <button type="button" className="text-[12px] font-extrabold text-[#3044ff]">View all</button>
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

      <button type="button" className="mx-auto mt-4 flex items-center gap-3 text-[12px] font-extrabold text-[#3044ff]">
        View all segments
        <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </section>
  );
}

function AudiencePage({ summary, isLoading, error }: { summary: CreatorLiveSummary; isLoading: boolean; error: string }) {
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
              {summary.dateRangeLabel}
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
                {formatCreatorInteger(summary.escalationCount)}
              </span>
            </button>
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
            <AudienceGrowthChart totalAudience={summary.totalConversationCount} />
          </div>
          <AudienceSourceCard sources={summary.audienceSources} totalAudience={summary.totalConversationCount} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(390px,0.98fr)]">
          <TopAudienceCard people={summary.topAudience} />
          <AudienceSegmentsCard segments={summary.audienceSegments} />
        </div>
      </div>
    </main>
  );
}

const creatorBuyerKeywords = ["price", "pricing", "cost", "package", "payment", "pay", "buy", "purchase", "order", "book", "call", "interested", "program", "course", "coaching", "subscription"];
const creatorPartnershipKeywords = ["partner", "partnership", "collab", "collaboration", "sponsor", "sponsored", "brand", "affiliate"];
const creatorCommunityKeywords = ["community", "share", "recommend", "refer", "follower", "audience"];
const creatorEscalationKeywords = ["refund", "cancel", "complaint", "issue", "problem", "support", "angry", "human", "agent", "not working", "failed", "chargeback"];
const creatorGoalKeywords = ["need", "want", "looking", "suggest", "recommend", "help", "fit", "size", "wide", "comfortable", "wedding", "birthday", "event", "service", "coaching", "course", "outfit"];
const creatorBudgetKeywords = ["budget", "price", "pricing", "cost", "rate", "package", "payment", "pay", "expensive", "cheap", "$", "rs", "pkr"];
const creatorTimelineKeywords = ["today", "tomorrow", "tonight", "urgent", "asap", "soon", "this week", "weekend", "date", "when", "event", "wedding", "birthday", "book", "appointment", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const creatorBuyingIntentKeywords = ["buy", "purchase", "order", "book", "checkout", "available", "availability", "interested", "send", "confirm", "reserve"];

function formatCreatorInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value || 0));
}

function formatCreatorMoney(value: number) {
  return `$${formatCreatorInteger(Math.max(0, Math.round(value)))}`;
}

function formatCreatorPercent(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function clampCreatorScore(value: number) {
  return Math.max(0, Math.min(99, Math.round(value)));
}

function truncateCreatorText(value: string, maxLength = 116) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function getCreatorMessageText(message: InstagramSettingsMessage) {
  return `${message.text || ""} ${message.attachments?.map((attachment) => attachment.name || attachment.type).join(" ") || ""}`.toLowerCase();
}

function getCreatorConversationText(conversation: InstagramSettingsConversation) {
  return conversation.messages
    .filter((message) => message.from === "user")
    .map((message) => getCreatorMessageText(message))
    .join(" ");
}

function countCreatorKeywordHits(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
}

function hasCreatorKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasCreatorTimelineSignal(text: string) {
  return hasCreatorKeyword(text, creatorTimelineKeywords) || /\b\d{1,2}(?::\d{2})?\s?(am|pm)?\b/i.test(text);
}

function getCreatorLeadStage(score: number, missingCount: number) {
  if (score >= 82 && missingCount <= 1) {
    return "Ready for CTA";
  }

  if (score >= 70) {
    return "Qualified";
  }

  if (score >= 55) {
    return "Warm";
  }

  return "New";
}

function getCreatorLeadUrgency(score: number, text: string): "High" | "Medium" | "Low" {
  if (score >= 82 || hasCreatorKeyword(text, ["urgent", "asap", "today", "tomorrow", "tonight", "confirm", "available"])) {
    return "High";
  }

  if (score >= 65 || hasCreatorTimelineSignal(text)) {
    return "Medium";
  }

  return "Low";
}

function getCreatorLeadQualification({
  text,
  badge,
  subtitle,
  score,
  buyerHits,
  partnershipHits,
  communityHits,
  inboundCount,
}: {
  text: string;
  badge: string;
  subtitle: string;
  score: number;
  buyerHits: number;
  partnershipHits: number;
  communityHits: number;
  inboundCount: number;
}) {
  const hasGoal = hasCreatorKeyword(text, creatorGoalKeywords);
  const hasBudget = hasCreatorKeyword(text, creatorBudgetKeywords);
  const hasTimeline = hasCreatorTimelineSignal(text);
  const hasBuyingIntent = buyerHits > 0 || hasCreatorKeyword(text, creatorBuyingIntentKeywords);
  const missing = [
    !hasGoal ? "goal or product need" : "",
    !hasBudget ? "budget or price range" : "",
    !hasTimeline ? "purchase timeline" : "",
    !hasBuyingIntent && badge !== "PARTNERSHIP" ? "buying intent" : "",
  ].filter(Boolean);
  const stage = getCreatorLeadStage(score, missing.length);
  const urgency = getCreatorLeadUrgency(score, text);
  const signals = [
    buyerHits > 0 ? "Buying or booking language" : "",
    partnershipHits > 0 ? "Partnership/collaboration language" : "",
    communityHits > 0 ? "Community or referral signal" : "",
    hasGoal ? "Goal or need mentioned" : "",
    hasBudget ? "Budget/pricing mentioned" : "",
    hasTimeline ? "Timeline/date mentioned" : "",
    inboundCount >= 3 ? "Multiple inbound messages" : "",
  ].filter(Boolean).slice(0, 5);
  const recommendedAction =
    badge === "PARTNERSHIP"
      ? "Ask for campaign scope, budget, deliverables, and timeline."
      : missing.length > 0
        ? `Ask for ${missing.slice(0, 2).join(" and ")}.`
        : stage === "Ready for CTA"
          ? "Send the booking, checkout, or pricing next step."
          : "Answer the latest question and move the lead toward a clear CTA.";

  return {
    stage,
    urgency,
    intent: subtitle,
    interestLevel: score >= 82 ? "Very high" : score >= 70 ? "High" : score >= 55 ? "Medium" : "Low",
    qualificationFacts: [
      { label: "Interest", value: score >= 70 ? "Strong" : "Warming" },
      { label: "Goal", value: hasGoal ? "Captured" : "Missing" },
      { label: "Budget", value: hasBudget ? "Mentioned" : "Missing" },
      { label: "Timeline", value: hasTimeline ? "Mentioned" : "Missing" },
      { label: "Buying intent", value: hasBuyingIntent ? "Detected" : badge === "PARTNERSHIP" ? "Partner lead" : "Missing" },
    ],
    signals,
    missing,
    recommendedAction,
  };
}

function getCreatorMessageTime(message: InstagramSettingsMessage) {
  return new Date(message.time).getTime();
}

function getCreatorConversationTime(conversation: InstagramSettingsConversation) {
  const latestMessageTime = conversation.messages
    .map((message) => getCreatorMessageTime(message))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return latestMessageTime || (conversation.updated_time ? new Date(conversation.updated_time).getTime() : 0);
}

function getCreatorSortedMessages(conversation: InstagramSettingsConversation) {
  return [...conversation.messages].sort((a, b) => getCreatorMessageTime(b) - getCreatorMessageTime(a));
}

function getCreatorLastMessage(conversation: InstagramSettingsConversation) {
  return getCreatorSortedMessages(conversation)[0];
}

function getCreatorLastInboundMessage(conversation: InstagramSettingsConversation) {
  return getCreatorSortedMessages(conversation).find((message) => message.from === "user");
}

function getCreatorParticipantName(conversation: InstagramSettingsConversation) {
  return getConversationLabel(conversation);
}

function getCreatorParticipantHandle(conversation: InstagramSettingsConversation) {
  if (conversation.participant.username) {
    return `@${conversation.participant.username}`;
  }

  if (conversation.participant.name) {
    return conversation.participant.name;
  }

  return `ID ${conversation.participant.id.slice(-6)}`;
}

function getCreatorAvatarNumber(conversation: InstagramSettingsConversation, index = 0) {
  const seed = `${conversation.id}${conversation.participant.id}${index}`;
  const total = seed.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return (total % 65) + 1;
}

function getCreatorAvatarUrl(conversation: InstagramSettingsConversation, index = 0) {
  return conversation.participant.profile_pic || `https://i.pravatar.cc/96?img=${getCreatorAvatarNumber(conversation, index)}`;
}

function getCreatorConversationPreview(conversation: InstagramSettingsConversation) {
  return formatInstagramMessagePreview(getCreatorLastInboundMessage(conversation) || getCreatorLastMessage(conversation));
}

function classifyCreatorOpportunity(conversation: InstagramSettingsConversation) {
  const text = getCreatorConversationText(conversation);
  const inboundCount = conversation.messages.filter((message) => message.from === "user").length;
  const buyerHits = countCreatorKeywordHits(text, creatorBuyerKeywords);
  const partnershipHits = countCreatorKeywordHits(text, creatorPartnershipKeywords);
  const communityHits = countCreatorKeywordHits(text, creatorCommunityKeywords);
  const escalationHits = countCreatorKeywordHits(text, creatorEscalationKeywords);

  if (escalationHits > 0 && buyerHits + partnershipHits + communityHits === 0) {
    return null;
  }

  if (partnershipHits > 0) {
    const badge = "PARTNERSHIP";
    const subtitle = "Partnership inquiry";
    const score = clampCreatorScore(72 + partnershipHits * 8 + inboundCount * 2);

    return {
      badge,
      subtitle,
      tone: "purple" as const,
      icon: Handshake,
      value: 5000 + partnershipHits * 250,
      score,
      ...getCreatorLeadQualification({ text, badge, subtitle, score, buyerHits, partnershipHits, communityHits, inboundCount }),
    };
  }

  if (buyerHits > 0) {
    const badge = "HIGH INTENT";
    const subtitle = "Buying intent";
    const score = clampCreatorScore(64 + buyerHits * 7 + inboundCount * 3);

    return {
      badge,
      subtitle,
      tone: "green" as const,
      icon: ShoppingCart,
      value: 1800 + buyerHits * 300,
      score,
      ...getCreatorLeadQualification({ text, badge, subtitle, score, buyerHits, partnershipHits, communityHits, inboundCount }),
    };
  }

  if (communityHits > 0) {
    const badge = "COMMUNITY";
    const subtitle = "Community signal";
    const score = clampCreatorScore(58 + communityHits * 6 + inboundCount * 3);

    return {
      badge,
      subtitle,
      tone: "orange" as const,
      icon: Users,
      value: 900 + communityHits * 150,
      score,
      ...getCreatorLeadQualification({ text, badge, subtitle, score, buyerHits, partnershipHits, communityHits, inboundCount }),
    };
  }

  if (inboundCount >= 3) {
    const badge = "ENGAGED";
    const subtitle = "Engaged conversation";
    const score = clampCreatorScore(54 + inboundCount * 5);

    return {
      badge,
      subtitle,
      tone: "blue" as const,
      icon: Sparkles,
      value: 750 + inboundCount * 100,
      score,
      ...getCreatorLeadQualification({ text, badge, subtitle, score, buyerHits, partnershipHits, communityHits, inboundCount }),
    };
  }

  return null;
}

function classifyCreatorEscalation(conversation: InstagramSettingsConversation) {
  const text = getCreatorConversationText(conversation);

  if (!hasCreatorKeyword(text, creatorEscalationKeywords)) {
    return null;
  }

  if (hasCreatorKeyword(text, ["refund", "chargeback", "cancel"])) {
    return {
      badge: "Refund Request",
      badgeTone: "bg-[#fff0f3] text-[#df405b]",
      borderTone: "border-[#ffc7d0]",
      glowTone: "bg-[#fffafa]",
      dotTone: "bg-[#df405b]",
      icon: TriangleAlert,
      risk: "High",
    };
  }

  if (hasCreatorKeyword(text, ["human", "agent", "support"])) {
    return {
      badge: "Human Requested",
      badgeTone: "bg-[#f0edff] text-[#6d3cff]",
      borderTone: "border-[#d7ccff]",
      glowTone: "bg-[#fcfbff]",
      dotTone: "bg-[#6d3cff]",
      icon: Users,
      risk: "Medium",
    };
  }

  return {
    badge: "Issue",
    badgeTone: "bg-[#fff3e6] text-[#ff850d]",
    borderTone: "border-[#ffe0ba]",
    glowTone: "bg-[#fffdf9]",
    dotTone: "bg-[#ff850d]",
    icon: CircleHelp,
    risk: "Medium",
  };
}

function buildCreatorLiveSummary(
  conversations: InstagramSettingsConversation[],
  totalConversationCount?: number,
  instagramAccount?: ConnectedInstagramAccount | null,
): CreatorLiveSummary {
  const totalCount = typeof totalConversationCount === "number" ? totalConversationCount : conversations.length;
  const sortedConversations = [...conversations].sort((a, b) => getCreatorConversationTime(b) - getCreatorConversationTime(a));
  const allMessages = conversations.flatMap((conversation) => conversation.messages);
  const inboundMessages = allMessages.filter((message) => message.from === "user");
  const outboundMessages = allMessages.filter((message) => message.from === "me");
  const engagedConversations = conversations.filter((conversation) => conversation.messages.some((message) => message.from === "user"));

  const opportunityRecords = sortedConversations
    .map((conversation) => ({ conversation, opportunity: classifyCreatorOpportunity(conversation) }))
    .filter((record): record is { conversation: InstagramSettingsConversation; opportunity: NonNullable<ReturnType<typeof classifyCreatorOpportunity>> } => Boolean(record.opportunity));
  const escalationRecords = sortedConversations
    .map((conversation) => ({ conversation, escalation: classifyCreatorEscalation(conversation) }))
    .filter((record): record is { conversation: InstagramSettingsConversation; escalation: NonNullable<ReturnType<typeof classifyCreatorEscalation>> } => Boolean(record.escalation));
  const estimatedRevenue = opportunityRecords.reduce((total, record) => total + record.opportunity.value, 0);
  const buyerCount = opportunityRecords.filter((record) => record.opportunity.badge === "HIGH INTENT").length;
  const partnershipCount = opportunityRecords.filter((record) => record.opportunity.badge === "PARTNERSHIP").length;
  const superfanCount = opportunityRecords.filter((record) => record.opportunity.badge === "ENGAGED").length;
  const communityCount = opportunityRecords.filter((record) => record.opportunity.badge === "COMMUNITY").length;

  const opportunityCards: OpportunityPageCard[] = opportunityRecords.map(({ conversation, opportunity }) => {
    const preview = getCreatorConversationPreview(conversation);
    const score = opportunity.score;

    return {
      name: getCreatorParticipantName(conversation),
      subtitle: opportunity.subtitle,
      detail: preview === "No messages" ? "Real conversation loaded from Instagram. No user message text is available yet." : truncateCreatorText(preview),
      badge: opportunity.badge,
      time: formatInstagramRelativeTime(getCreatorLastMessage(conversation)?.time || conversation.updated_time),
      tone: opportunity.tone,
      icon: opportunity.icon,
      value: `${formatCreatorMoney(opportunity.value)} est.`,
      scoreLabel: "Lead Score",
      score: `${score}/100`,
      progress: `${score}%`,
      action: "Review",
      verified: Boolean(conversation.participant.username),
      avatars: [getCreatorAvatarNumber(conversation), getCreatorAvatarNumber(conversation, 1), getCreatorAvatarNumber(conversation, 2)],
      stage: opportunity.stage,
      urgency: opportunity.urgency,
      intent: opportunity.intent,
      interestLevel: opportunity.interestLevel,
      qualificationFacts: opportunity.qualificationFacts,
      signals: opportunity.signals,
      missing: opportunity.missing,
      recommendedAction: opportunity.recommendedAction,
    };
  });

  const dashboardOpportunities: Opportunity[] = opportunityCards.slice(0, 4).map((card) => ({
    title: card.subtitle,
    eyebrow: card.badge,
    body: [card.name, card.detail],
    value: card.value,
    action: card.action,
    tone: card.tone === "green" ? "blue" : card.tone === "blue" ? "purple" : card.tone,
    icon: card.icon,
  }));

  const escalations: EscalationItem[] = escalationRecords.map(({ conversation, escalation }) => {
    const preview = getCreatorConversationPreview(conversation);
    const messageCount = conversation.messages.length;

    return {
      name: getCreatorParticipantName(conversation),
      handle: getCreatorParticipantHandle(conversation),
      avatar: getCreatorAvatarUrl(conversation),
      channel: "instagram",
      time: formatInstagramRelativeTime(getCreatorLastMessage(conversation)?.time || conversation.updated_time),
      badge: escalation.badge,
      badgeTone: escalation.badgeTone,
      title: `${escalation.badge} detected`,
      detail: preview === "No messages" ? "Escalation keywords were detected in this Instagram conversation." : truncateCreatorText(preview, 150),
      meta: [`Risk: ${escalation.risk}`, `${formatCreatorInteger(messageCount)} messages`],
      metaTone: `first:${escalation.badgeTone} bg-[#eff1f6] text-[#31394f]`,
      borderTone: escalation.borderTone,
      glowTone: escalation.glowTone,
      dotTone: escalation.dotTone,
      icon: escalation.icon,
    };
  });

  const topAudience = sortedConversations.slice(0, 6).map((conversation) => {
    const inboundCount = conversation.messages.filter((message) => message.from === "user").length;
    const opportunity = classifyCreatorOpportunity(conversation);
    const escalation = classifyCreatorEscalation(conversation);
    const engagement = clampCreatorScore(35 + conversation.messages.length * 6 + inboundCount * 5 + (opportunity ? 12 : 0));

    return {
      name: getCreatorParticipantName(conversation),
      handle: getCreatorParticipantHandle(conversation),
      avatar: getCreatorAvatarNumber(conversation),
      engagement: String(engagement),
      active: formatInstagramRelativeTime(getCreatorLastMessage(conversation)?.time || conversation.updated_time),
      tag: escalation ? "Needs attention" : opportunity ? "High intent" : inboundCount > 1 ? "Engaged" : "Contact",
      tagTone: escalation
        ? "bg-[#fff0f3] text-[#df405b]"
        : opportunity
          ? "bg-[#e7f8ed] text-[#0a9b3f]"
          : "bg-[#eff1f6] text-[#596175]",
    };
  });

  const dashboardPipeline: PipelineStep[] = [
    {
      label: "Conversations",
      value: formatCreatorInteger(totalCount),
      detail: `${formatCreatorInteger(engagedConversations.length)}\nwith messages`,
      tone: "text-[#4b3cff] bg-[#f0edff]",
      icon: MessageSquare,
    },
    {
      label: "Inbound",
      value: formatCreatorInteger(inboundMessages.length),
      detail: `${formatCreatorPercent(inboundMessages.length, Math.max(1, allMessages.length))}\nof messages`,
      tone: "text-[#246bff] bg-[#eef4ff]",
      icon: Users,
    },
    {
      label: "Qualified",
      value: formatCreatorInteger(opportunityRecords.length),
      detail: `${formatCreatorPercent(opportunityRecords.length, Math.max(1, totalCount))}\nof chats`,
      tone: "text-[#13b95f] bg-[#eafaf0]",
      icon: Sparkles,
    },
    {
      label: "Escalations",
      value: formatCreatorInteger(escalationRecords.length),
      detail: `${formatCreatorPercent(escalationRecords.length, Math.max(1, totalCount))}\nneed handoff`,
      tone: "text-[#ff850d] bg-[#fff3e6]",
      icon: TriangleAlert,
    },
    {
      label: "Est. value",
      value: formatCreatorMoney(estimatedRevenue),
      detail: "based on\nreal intent",
      tone: "text-[#df405b] bg-[#fff0f3]",
      icon: Crown,
    },
  ];

  const recentActivity: RecentActivityItem[] = sortedConversations.slice(0, 4).map((conversation) => {
    const opportunity = classifyCreatorOpportunity(conversation);
    const escalation = classifyCreatorEscalation(conversation);
    const preview = getCreatorConversationPreview(conversation);

    return {
      title: escalation ? "Escalation signal received" : opportunity ? "Lead signal received" : "Conversation updated",
      subtitle: `${getCreatorParticipantName(conversation)}: ${truncateCreatorText(preview, 72)}`,
      time: formatInstagramRelativeTime(getCreatorLastMessage(conversation)?.time || conversation.updated_time),
      icon: escalation ? TriangleAlert : opportunity ? opportunity.icon : MessageSquare,
      tone: escalation ? "text-[#df405b] bg-[#fff0f3]" : opportunity ? "text-[#4b3cff] bg-[#f0edff]" : "text-[#246bff] bg-[#eef4ff]",
      meta: opportunity ? `${formatCreatorMoney(opportunity.value)} est.` : undefined,
    };
  });

  const audienceMetrics: AudienceMetric[] = [
    { label: "Total Audience", value: formatCreatorInteger(totalCount), change: "from Instagram", tone: "purple", icon: Users },
    { label: "Engaged Audience", value: formatCreatorInteger(engagedConversations.length), change: "messaged you", tone: "green", icon: Sparkles },
      { label: "Leads", value: formatCreatorInteger(opportunityRecords.length), change: "intent detected", tone: "blue", icon: User },
    { label: "Customers", value: formatCreatorInteger(buyerCount), change: "buying keywords", tone: "violet", icon: ShoppingCart },
    { label: "Partners", value: formatCreatorInteger(partnershipCount), change: "partnership keywords", tone: "orange", icon: Handshake },
  ];

  const audienceSources: AudienceSource[] = [
    {
      label: "Instagram",
      percent: formatCreatorPercent(totalCount, Math.max(1, totalCount)),
      count: formatCreatorInteger(totalCount),
      color: "#3f3cff",
    },
  ];

  const audienceSegments: AudienceSegment[] = [
    {
      label: "High Intent Leads",
      detail: "Pricing, booking, buying, or program intent",
      count: formatCreatorInteger(buyerCount),
      change: `${formatCreatorPercent(buyerCount, Math.max(1, totalCount))}`,
      tone: "bg-[#eafaf0] text-[#13a84f]",
      icon: User,
    },
    {
      label: "Warm Leads",
      detail: "Active Instagram conversations without escalation",
      count: formatCreatorInteger(Math.max(0, engagedConversations.length - escalationRecords.length)),
      change: `${formatCreatorPercent(Math.max(0, engagedConversations.length - escalationRecords.length), Math.max(1, totalCount))}`,
      tone: "bg-[#eef4ff] text-[#246bff]",
      icon: Flame,
    },
    {
      label: "Engaged Followers",
      detail: "Conversations with two or more inbound messages",
      count: formatCreatorInteger(conversations.filter((conversation) => conversation.messages.filter((message) => message.from === "user").length >= 2).length),
      change: "real chats",
      tone: "bg-[#f0edff] text-[#6d3cff]",
      icon: Heart,
    },
    {
      label: "Partnership Signals",
      detail: "Brand, collaboration, sponsor, or affiliate keywords",
      count: formatCreatorInteger(partnershipCount),
      change: `${formatCreatorPercent(partnershipCount, Math.max(1, totalCount))}`,
      tone: "bg-[#fff3e6] text-[#ff850d]",
      icon: Handshake,
    },
    {
      label: "Needs Attention",
      detail: "Refund, issue, support, or human handoff keywords",
      count: formatCreatorInteger(escalationRecords.length),
      change: `${formatCreatorPercent(escalationRecords.length, Math.max(1, totalCount))}`,
      tone: "bg-[#fff0f3] text-[#df405b]",
      icon: TriangleAlert,
      negative: escalationRecords.length > 0,
    },
  ];

  const knowledgeTabs: KnowledgeTab[] = [
    { label: "All Sources", count: "0", icon: Bot },
    { label: "FAQs", count: "0", icon: CircleHelp },
    { label: "Products", count: "0", icon: Box },
    { label: "Services", count: "0", icon: Sparkles },
    { label: "Pricing", count: "0", icon: DollarSign },
    { label: "Business Info", count: "0", icon: BriefcaseBusiness },
    { label: "PDFs", count: "0", icon: FileText },
  ];

  const knowledgeInsights: KnowledgeInsight[] = [
    {
      title: "Instagram context",
      detail: `${formatCreatorInteger(inboundMessages.length)} real inbound messages available`,
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: MessageSquare,
    },
    {
      title: "Saved sources missing",
      detail: "No persisted knowledge sources found yet",
      tone: "bg-[#fff3e6] text-[#ff850d]",
      icon: Box,
    },
    {
      title: "Reply examples",
      detail: `${formatCreatorInteger(outboundMessages.length)} creator replies can guide tone`,
      tone: "bg-[#eef4ff] text-[#246bff]",
      icon: Bot,
    },
  ];

  const escalationTabs: EscalationTab[] = [
    { label: "All", count: formatCreatorInteger(escalations.length), tone: "text-[#3044ff] bg-[#eef0ff]", icon: Sparkles },
    { label: "Refunds", count: formatCreatorInteger(escalations.filter((item) => item.badge === "Refund Request").length), tone: "text-[#df405b] bg-[#fff0f3]", icon: Shield },
    { label: "Complaints", count: formatCreatorInteger(escalations.filter((item) => item.badge === "Issue").length), tone: "text-[#ff850d] bg-[#fff3e6]", icon: Sparkles },
    { label: "Human", count: formatCreatorInteger(escalations.filter((item) => item.badge === "Human Requested").length), tone: "text-[#7a35ff] bg-[#f0edff]", icon: Users },
    { label: "Brand Deals", count: formatCreatorInteger(partnershipCount), tone: "text-[#0a9b3f] bg-[#eafaf0]", icon: BriefcaseBusiness },
    { label: "VIP Leads", count: formatCreatorInteger(0), tone: "text-[#3044ff] bg-[#eef4ff]", icon: Star },
  ];

  const firstEscalation = escalations[0];
  const escalationDetailRows: EscalationDetailRow[] = firstEscalation
    ? [
        { label: "Escalation type", value: firstEscalation.badge, icon: TriangleAlert, valueTone: firstEscalation.badgeTone },
        { label: "Conversation", value: firstEscalation.handle, icon: MessageSquare },
        { label: "Messages", value: firstEscalation.meta[1] || "0 messages", icon: MessageSquare },
        { label: "Escalated", value: firstEscalation.time, icon: Clock },
        { label: "Risk level", value: firstEscalation.meta[0]?.replace("Risk: ", "") || "Medium", icon: TriangleAlert, valueTone: "bg-[#fff0f3] text-[#df405b]" },
      ]
    : [];

  return {
    instagramAccount: instagramAccount || null,
    hasInstagramConnection: Boolean(instagramAccount) || conversations.length > 0,
    conversations: sortedConversations,
    totalConversationCount: totalCount,
    totalMessageCount: allMessages.length,
    inboundMessageCount: inboundMessages.length,
    outboundMessageCount: outboundMessages.length,
    dateRangeLabel: getAdminDateRangeLabel(),
    estimatedRevenue,
    opportunityCount: opportunityRecords.length,
    escalationCount: escalationRecords.length,
    dashboardOpportunities,
    dashboardPipeline,
    recentActivity,
    opportunityTabs: [
      { label: "Qualified Leads", count: formatCreatorInteger(opportunityRecords.length), icon: Users },
      { label: "High Intent", count: formatCreatorInteger(buyerCount), icon: ShoppingCart },
      { label: "Warm Leads", count: formatCreatorInteger(superfanCount), icon: Flame },
      { label: "Partner Leads", count: formatCreatorInteger(partnershipCount), icon: Handshake },
      { label: "Community Leads", count: formatCreatorInteger(communityCount), icon: User },
    ],
    opportunityMetrics: [
      { label: "Leads Generated", value: formatCreatorInteger(opportunityRecords.length), change: "from Instagram DMs", icon: Users },
      { label: "High Intent Leads", value: formatCreatorInteger(buyerCount), change: "buying or booking intent", icon: ShoppingCart },
      { label: "Estimated Revenue", value: formatCreatorMoney(estimatedRevenue), change: "from detected intent", icon: CircleDollarSign },
      { label: "Lead Rate", value: formatCreatorPercent(opportunityRecords.length, Math.max(1, totalCount)), change: "of conversations", icon: ChartPie },
    ],
    opportunityCards,
    audienceMetrics,
    audienceSources,
    topAudience,
    audienceSegments,
    knowledgeTabs,
    knowledgeSources: [],
    knowledgeInsights,
    knowledgeUpdates: [],
    knowledgeTrainingPercent: 0,
    escalations,
    escalationTabs,
    escalationDetailRows,
  };
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
      label: "Lead signals",
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
        label: "Lead signals",
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

function getCreatorDashboardStatus(conversation: InstagramSettingsConversation): Pick<SuperAdminTableRow, "status" | "statusTone"> {
  const opportunity = classifyCreatorOpportunity(conversation);
  const escalation = classifyCreatorEscalation(conversation);
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
  return {
    metrics: [],
    columns: ["Instagram", "Last active", "Messages", "Leads", "Revenue found"],
    rows: summary.conversations.slice(0, 8).map((conversation) => {
      const opportunity = classifyCreatorOpportunity(conversation);
      const status = getCreatorDashboardStatus(conversation);
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

function formatCreatorCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCreatorDashboardExport(profile: AccountProfile, summary: CreatorLiveSummary) {
  const rows = [
    ["Metric", "Value"],
    ["Workspace", profile.name || "TractionFlo workspace"],
    ["Instagram account", summary.instagramAccount ? formatInstagramDisplayName(summary.instagramAccount) : "Not connected"],
    ["Conversations", formatCreatorInteger(summary.totalConversationCount)],
    ["Messages processed", formatCreatorInteger(summary.totalMessageCount)],
    ["Inbound messages", formatCreatorInteger(summary.inboundMessageCount)],
    ["AI replies", formatCreatorInteger(summary.outboundMessageCount)],
    ["Leads", formatCreatorInteger(summary.opportunityCount)],
    ["Estimated revenue", formatCreatorMoney(summary.estimatedRevenue)],
    ["Escalations", formatCreatorInteger(summary.escalationCount)],
  ];
  const csv = rows.map((row) => row.map(formatCreatorCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `tractionflo-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DashboardOverview({
  profile,
  summary,
  isLoading,
  error,
  onChangeTab,
}: {
  profile: AccountProfile;
  summary: CreatorLiveSummary;
  isLoading: boolean;
  error: string;
  onChangeTab: (tab: DashboardTab) => void;
}) {
  const activeContacts = summary.conversations.filter((conversation) => conversation.messages.some((message) => message.from === "user")).length;
  const replyRate = formatCreatorPercent(summary.outboundMessageCount, Math.max(1, summary.inboundMessageCount));
  const isInstagramSetupMissing = error.toLowerCase().includes("no instagram account connected");
  const connectedAccountCount = summary.hasInstagramConnection ? 1 : 0;
  const tableConfig = buildCreatorConversationTableConfig(summary);
  const revenueSeries = buildCreatorGrowthSeries(summary.estimatedRevenue || summary.opportunityCount * 1000);
  const activitySeries = buildCreatorDailyActivitySeries(summary.conversations);
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
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-7 lg:py-5 xl:px-10">
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

          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_180px_140px] xl:w-auto xl:grid-cols-[260px_190px_140px]">
            <button
              type="button"
              className="flex h-12 min-w-0 items-center justify-between rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)]"
            >
              <span className="min-w-0 truncate">{summary.dateRangeLabel}</span>
              <CalendarDays size={16} strokeWidth={2.4} />
            </button>
            <label className="relative flex h-12 cursor-pointer items-center justify-between rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)]">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#13a84f]" />
                Auto refresh: On
              </span>
              <ChevronDown size={14} strokeWidth={2.4} />
              <select aria-label="Auto refresh status" defaultValue="on" className="absolute inset-0 cursor-pointer opacity-0">
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
              <button type="button" onClick={() => onChangeTab("opportunities")} className="flex h-8 items-center gap-2 rounded-[7px] border border-[#e0e4ef] px-3 text-[11px] font-bold text-black">
                Last 30 days
                <ChevronDown size={13} />
              </button>
            </div>
            <AdminLineChart values={isLoading ? Array.from({ length: 10 }, () => 0) : revenueSeries} />
          </article>

          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-extrabold text-black">New Messages</h2>
                <p className="mt-2 text-[22px] font-extrabold leading-none text-black">{formatCreatorInteger(summary.inboundMessageCount)}</p>
              </div>
              <button type="button" onClick={() => onChangeTab("inbox")} className="flex h-8 items-center gap-2 rounded-[7px] border border-[#e0e4ef] px-3 text-[11px] font-bold text-black">
                Last 30 days
                <ChevronDown size={13} />
              </button>
            </div>
            <AdminLineChart bars values={isLoading ? Array.from({ length: 20 }, () => 0) : activitySeries} />
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
              <button type="button" onClick={() => onChangeTab("settings")} className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
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
              <button type="button" onClick={() => onChangeTab("inbox")} className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
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
                <button type="button" onClick={() => onChangeTab("settings")} className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
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
                <button type="button" onClick={() => onChangeTab("analytics")} className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
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
              <button type="button" onClick={() => onChangeTab("opportunities")} className="flex h-8 items-center gap-2 rounded-[7px] border border-[#e0e4ef] px-3 text-[11px] font-bold text-black">
                This week
                <ChevronDown size={13} />
              </button>
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
              <AdminLineChart values={revenueSeries} />
            </div>
          </article>

          <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-black">Lead Breakdown</h2>
              <button type="button" onClick={() => onChangeTab("opportunities")} className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
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
              <button type="button" onClick={() => onChangeTab("escalations")} className="text-[11px] font-extrabold text-[#4b3cff]">View all</button>
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
  const [isLoadingCreatorData, setIsLoadingCreatorData] = useState(true);
  const [creatorDataError, setCreatorDataError] = useState("");
  const hasLoadedAccountProfileRef = useRef(false);
  const creatorSummary = buildCreatorLiveSummary(
    creatorConversationResponse.conversations || [],
    creatorConversationResponse.conversation_count,
    creatorConversationResponse.account,
  );

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

    async function loadCreatorConversations() {
      try {
        const response = await fetch("/api/instagram/conversations", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data: InstagramConversationsResponse = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok || (data.error && data.error !== "No Instagram account connected")) {
          throw new Error(data.error || "Could not load Instagram conversations");
        }

        setCreatorConversationResponse(data);
        setCreatorDataError(data.error || "");
      } catch (error) {
        if (isMounted) {
          setCreatorConversationResponse({ conversations: [], conversation_count: 0 });
          setCreatorDataError(error instanceof Error ? error.message : "Could not load Instagram conversations");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCreatorData(false);
        }
      }
    }

    const handleWindowFocus = () => void loadCreatorConversations();
    const timeout = window.setTimeout(() => void loadCreatorConversations(), 0);
    const interval = window.setInterval(() => void loadCreatorConversations(), 30000);

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
          opportunities: creatorSummary.opportunityCount,
          escalations: creatorSummary.escalationCount,
        }}
      />

      {!canOpenDashboardTab(accountProfile, activeTab) ? (
        <RestrictedPage />
      ) : activeTab === "dashboard" ? (
        <DashboardOverview
          profile={accountProfile}
          summary={creatorSummary}
          isLoading={isLoadingCreatorData}
          error={creatorDataError}
          onChangeTab={handleTabChange}
        />
      ) : activeTab === "opportunities" ? (
        <OpportunitiesPage summary={creatorSummary} isLoading={isLoadingCreatorData} error={creatorDataError} />
      ) : activeTab === "instagram-content" ? (
        <InstagramContentPage />
      ) : activeTab === "audience" ? (
        <AudiencePage summary={creatorSummary} isLoading={isLoadingCreatorData} error={creatorDataError} />
      ) : activeTab === "knowledge" ? (
        <KnowledgeBasePage summary={creatorSummary} isLoading={isLoadingCreatorData} error={creatorDataError} />
      ) : activeTab === "escalations" ? (
        <EscalationsPage summary={creatorSummary} isLoading={isLoadingCreatorData} error={creatorDataError} />
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
