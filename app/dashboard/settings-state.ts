import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BrainCircuit,
  CalendarDays,
  Code2,
  CreditCard,
  Crown,
  Database,
  Flame,
  Handshake,
  Mail,
  MessageSquare,
  Palette,
  Shield,
  Sparkles,
  Star,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import {
  defaultAiBehaviorSettings,
  defaultAiIntegrationSettings,
  type AiBehaviorSettings,
  type AiIntegrationSettings,
  type AiWorkflowSetting,
} from "@/lib/ai-integration";
import {
  defaultEscalationRuleSettings,
  normalizeEscalationRuleSettings,
  type EscalationRuleSetting,
} from "@/lib/conversation-escalation";
import {
  defaultNotificationSettings,
  normalizeNotificationSettings,
  settingsStateStorageKey,
  type NotificationSetting,
} from "@/lib/notification-preferences";
import {
  defaultQuickReplies,
  defaultSavedReplies,
  defaultWelcomeMessage,
  normalizeQuickReplies,
  normalizeSavedReplies,
  normalizeWelcomeMessage,
  type QuickReplySetting,
  type SavedReplySetting,
  type WelcomeMessageSetting,
} from "@/lib/quick-replies";
import {
  getDefaultRevenueOutcomeProviderSettings,
  normalizeRevenueOutcomeProviderSettings,
  type RevenueOutcomeProviderSettings,
} from "@/lib/revenue-outcome-providers";

export { settingsStateStorageKey };

export type SettingsSection =
  | "account"
  | "instagram"
  | "integrations"
  | "ai-integration"
  | "agents"
  | "permissions"
  | "escalations"
  | "notifications"
  | "quick-replies"
  | "billing"
  | "api"
  | "security"
  | "brand";

export type SettingsMenuItem = {
  id: SettingsSection;
  label: string;
  detail: string;
  icon: LucideIcon;
};

export type AiSettings = AiBehaviorSettings;

export type BrowserNotificationPermission = "default" | "granted" | "denied" | "unsupported";

export type BillingSettings = {
  plan: string;
  status: string;
  price: string;
  nextBillingDate: string;
  seats: number;
  invoiceEmail: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  status: "active" | "hidden";
  features: string[];
  cta: string;
};

export type PricingResponse = {
  plans?: PricingPlan[];
  error?: string;
};

export type ApiEventSetting = {
  id: string;
  label: string;
  enabled: boolean;
};

export type ApiSettings = {
  webhookUrl: string;
  signingSecret: string;
  events: ApiEventSetting[];
};

export type BookingSheetRoute = {
  id: string;
  name: string;
  bookingType: string;
  sheetUrl: string;
  worksheetName: string;
  enabled: boolean;
  confirmedOnly: boolean;
  lastSync: string;
};

export type BookingIntegrationSettings = {
  syncEnabled: boolean;
  routes: BookingSheetRoute[];
};

export type SecuritySettings = {
  twoFactor: boolean;
  loginAlerts: boolean;
  sessionTimeout: string;
  trustedDevices: boolean;
};

export type BrandSettings = {
  brandName: string;
  primaryColor: string;
  voice: string;
  replySignature: string;
  blockedWords: string;
};

export type AppSettingsState = {
  ai: AiSettings;
  aiIntegration: AiIntegrationSettings;
  rules: EscalationRuleSetting[];
  notifications: NotificationSetting[];
  quickReplies: QuickReplySetting[];
  savedReplies: SavedReplySetting[];
  welcomeMessage: WelcomeMessageSetting;
  billing: BillingSettings;
  bookingIntegrations: BookingIntegrationSettings;
  revenueOutcomeProviders: RevenueOutcomeProviderSettings;
  api: ApiSettings;
  security: SecuritySettings;
  brand: BrandSettings;
};

export const settingsMenuItems: SettingsMenuItem[] = [
  { id: "account", label: "Account", detail: "Profile, plan and billing", icon: User },
  { id: "instagram", label: "Instagram", detail: "Connect & manage", icon: MessageSquare },
  { id: "integrations", label: "Integrations", detail: "Booking sheets & exports", icon: Database },
  { id: "ai-integration", label: "AI Integration", detail: "OpenAI key & automations", icon: BrainCircuit },
  { id: "agents", label: "Agents", detail: "Human escalation team", icon: Users },
  { id: "permissions", label: "Permissions", detail: "Pages and assignments", icon: Shield },
  { id: "escalations", label: "Escalation Rules", detail: "When to escalate", icon: TriangleAlert },
  { id: "notifications", label: "Notifications", detail: "Alerts & preferences", icon: Bell },
  { id: "quick-replies", label: "Quick Replies", detail: "Inbox reply tabs", icon: MessageSquare },
  { id: "billing", label: "Billing", detail: "Subscription & invoices", icon: CreditCard },
  { id: "api", label: "API & Webhooks", detail: "Developers", icon: Code2 },
  { id: "security", label: "Security", detail: "Password & access", icon: Shield },
  { id: "brand", label: "Brand Settings", detail: "Your brand & voice", icon: Palette },
];

export const defaultSettingsState: AppSettingsState = {
  ai: {
    ...defaultAiBehaviorSettings,
  },
  aiIntegration: defaultAiIntegrationSettings,
  rules: defaultEscalationRuleSettings,
  notifications: defaultNotificationSettings,
  quickReplies: defaultQuickReplies,
  savedReplies: defaultSavedReplies,
  welcomeMessage: defaultWelcomeMessage,
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
  revenueOutcomeProviders: getDefaultRevenueOutcomeProviderSettings(),
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

export const ruleVisuals: Record<string, { icon: LucideIcon; tone: string }> = {
  refunds: { icon: TriangleAlert, tone: "bg-[#fff0f3] text-[#df405b]" },
  complaints: { icon: Sparkles, tone: "bg-[#fff3e6] text-[#ff850d]" },
  partnerships: { icon: Handshake, tone: "bg-[#f0edff] text-[#6d3cff]" },
  vip: { icon: Star, tone: "bg-[#eef4ff] text-[#3044ff]" },
  bulk_orders: { icon: Crown, tone: "bg-[#eef4ff] text-[#3044ff]" },
  urgent_orders: { icon: Flame, tone: "bg-[#fff3e6] text-[#ff850d]" },
  human_handoff: { icon: Users, tone: "bg-[#f0edff] text-[#6d3cff]" },
};

export const notificationVisuals: Record<string, { icon: LucideIcon }> = {
  email: { icon: Mail },
  push: { icon: Bell },
  digest: { icon: CalendarDays },
  escalation: { icon: TriangleAlert },
};

export function getVisibleSettingsMenuItems(profile: { isAgent: boolean }) {
  if (!profile.isAgent) {
    return settingsMenuItems;
  }

  const agentSections: SettingsSection[] = ["account", "notifications", "security", "brand"];
  return settingsMenuItems.filter((item) => agentSections.includes(item.id));
}

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
    rules: normalizeEscalationRuleSettings(storedValue.rules),
    notifications: normalizeNotificationSettings(storedValue.notifications),
    quickReplies: normalizeQuickReplies(storedValue.quickReplies),
    savedReplies: normalizeSavedReplies(storedValue.savedReplies),
    welcomeMessage: normalizeWelcomeMessage(storedValue.welcomeMessage),
    billing: {
      ...defaultSettingsState.billing,
      ...storedValue.billing,
    },
    bookingIntegrations: {
      ...defaultSettingsState.bookingIntegrations,
      ...storedValue.bookingIntegrations,
      routes: mergeBookingSheetRoutes(storedValue.bookingIntegrations?.routes),
    },
    revenueOutcomeProviders: normalizeRevenueOutcomeProviderSettings(storedValue.revenueOutcomeProviders),
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

export function readStoredSettingsState() {
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
