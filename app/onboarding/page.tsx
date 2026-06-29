"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  DollarSign,
  FileText,
  Flame,
  Camera,
  Link2,
  Lock,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  User,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type RawMessage = {
  text?: string;
  from?: "me" | "user" | "note";
  attachments?: unknown[];
  catalogItems?: unknown[];
  time?: string;
  reply_to?: {
    story?: {
      id?: string;
      url?: string;
    };
  };
};

type RawConversation = {
  id: string;
  participant: {
    id?: string;
    name?: string;
    username?: string;
    profile_pic?: string;
  };
  updated_time?: string;
  messages: RawMessage[];
};

type CommerceOrder = {
  status?: string;
  paymentStatus?: string;
  amount?: number | string | null;
  priceText?: string | null;
  currency?: string | null;
};

type CatalogItem = {
  title: string;
  priceText: string;
  priceAmount: number | null;
  currency: string;
  description: string;
  permalink: string;
  tags: string[];
};

type OutcomeProvider = {
  outcomeType: string;
  enabled: boolean;
  provider: string;
  actionUrl: string;
  cta: string;
  webhookUrl?: string;
  apiEndpoint?: string;
};

type EscalationRule = {
  id: string;
  label: string;
  enabled: boolean;
  action?: string;
  priority?: string;
};

type KnowledgeSource = {
  title: string;
  category: string;
  summary: string;
};

type Opportunity = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  badge: "Hot Lead" | "Warm Lead" | "Needs Reply";
  score: number;
  missed: boolean;
  estimatedValue: number;
  reasons: string[];
};

type ConversionAction = {
  label: string;
  detail: string;
  configured: boolean;
  href: string;
  icon: LucideIcon;
};

type MissingItem = {
  label: string;
  detail: string;
  complete: boolean;
};

type PermissionItem = {
  label: string;
  detail: string;
  enabled: boolean;
  icon: LucideIcon;
};

type OnboardingData = {
  isLoading: boolean;
  error: string;
  connected: boolean;
  lastUpdated: string;
  accountName: string;
  username: string;
  avatarUrl: string;
  accountType: string;
  followers: number;
  following: number;
  mediaCount: number;
  postsCount: number;
  storiesCount: number;
  totalPostComments: number;
  conversationCount: number;
  messageCount: number;
  userMessageCount: number;
  businessReplyCount: number;
  storyReplyCount: number;
  hotLeads: number;
  interestedProspects: number;
  missedConversations: number;
  potentialRevenue: number;
  revenueCurrency: string;
  revenueBasis: string;
  paidRevenue: number;
  paidOrderCount: number;
  averageValue: number;
  opportunities: Opportunity[];
  businessName: string;
  niche: string;
  description: string;
  offers: CatalogItem[];
  catalogCount: number;
  knowledgeCount: number;
  businessGoal: string;
  conversionActions: ConversionAction[];
  escalationRules: EscalationRule[];
  permissions: PermissionItem[];
  missingItems: MissingItem[];
  behavior: {
    tone: string;
    responseLength: string;
    followUp: string;
  };
  knowledgeScore: number;
  reviewActions: string[];
  allowedPages: string[];
};

const emptyData: OnboardingData = {
  isLoading: true,
  error: "",
  connected: false,
  lastUpdated: "",
  accountName: "",
  username: "",
  avatarUrl: "",
  accountType: "",
  followers: 0,
  following: 0,
  mediaCount: 0,
  postsCount: 0,
  storiesCount: 0,
  totalPostComments: 0,
  conversationCount: 0,
  messageCount: 0,
  userMessageCount: 0,
  businessReplyCount: 0,
  storyReplyCount: 0,
  hotLeads: 0,
  interestedProspects: 0,
  missedConversations: 0,
  potentialRevenue: 0,
  revenueCurrency: "USD",
  revenueBasis: "",
  paidRevenue: 0,
  paidOrderCount: 0,
  averageValue: 0,
  opportunities: [],
  businessName: "",
  niche: "",
  description: "",
  offers: [],
  catalogCount: 0,
  knowledgeCount: 0,
  businessGoal: "Book calls / appointments",
  conversionActions: [],
  escalationRules: [],
  permissions: [],
  missingItems: [],
  behavior: {
    tone: "Professional",
    responseLength: "Medium",
    followUp: "Balanced",
  },
  knowledgeScore: 0,
  reviewActions: [],
  allowedPages: [],
};

const discoveryRows = [
  { label: "Instagram Profile", icon: Camera },
  { label: "Recent Posts & Reels", icon: FileText },
  { label: "Comments & DMs", icon: MessageCircle },
  { label: "Story Replies", icon: Send },
  { label: "Business Knowledge", icon: BookOpen },
  { label: "Analyzing Opportunities", icon: Target },
];

const goalOptions = [
  ["Book calls / appointments", "Get more calls on your calendar"],
  ["Sell products", "Drive product sales"],
  ["Applications", "Get more applications"],
  ["Grow waitlist", "Build your waitlist"],
  ["Newsletter / community", "Grow your audience"],
];

const behaviorColumns = [
  {
    title: "Tone of Voice",
    options: [
      ["Professional", "Clear and confident"],
      ["Friendly", "Warm and approachable"],
      ["Casual", "Relaxed and casual"],
      ["Luxury / Premium", "High-end and exclusive"],
    ],
  },
  {
    title: "Response Length",
    options: [
      ["Short", "Concise answers"],
      ["Medium", "Balanced responses"],
      ["Detailed", "In-depth explanations"],
    ],
  },
  {
    title: "Follow-up Style",
    options: [
      ["Aggressive", "Proactively close more"],
      ["Balanced", "Smart and natural follow-up"],
      ["Soft", "Gentle follow-up"],
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getNumber(value: unknown, fallback = 0) {
  const valueNumber = typeof value === "string" ? Number(value.replace(/[$,\s]/g, "")) : Number(value);
  return Number.isFinite(valueNumber) ? Math.max(0, valueNumber) : fallback;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 10000 ? "compact" : "standard" }).format(value);
}

function formatCurrency(value: number, currency = "USD") {
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatLastUpdated(value: string) {
  if (!value) {
    return "Live scan pending";
  }

  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return "Live data loaded";
  }

  return `Updated ${new Date(parsed).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function normalizeCommerceOrders(value: unknown): CommerceOrder[] {
  const root = isRecord(value) ? value : {};
  const orders = Array.isArray(root.orders) ? root.orders : [];

  return orders.filter(isRecord).map((order) => ({
    status: getString(order.status),
    paymentStatus: getString(order.paymentStatus),
    amount: typeof order.amount === "number" || typeof order.amount === "string" ? order.amount : null,
    priceText: typeof order.priceText === "string" ? order.priceText : null,
    currency: typeof order.currency === "string" ? order.currency : null,
  }));
}

function getCommerceOrderAmount(order: CommerceOrder) {
  const directAmount = getNumber(order.amount);

  if (directAmount > 0) {
    return directAmount;
  }

  return getNumber(order.priceText);
}

function isPaidCommerceOrder(order: CommerceOrder) {
  return order.status === "paid" || order.paymentStatus === "paid";
}

function normalizeCatalog(value: unknown): CatalogItem[] {
  const root = isRecord(value) ? value : {};
  const catalog = Array.isArray(root.catalog) ? root.catalog : [];

  return catalog.filter(isRecord).map((item) => ({
    title: getString(item.title, "Untitled offer"),
    priceText: getString(item.priceText),
    priceAmount: typeof item.priceAmount === "number" && Number.isFinite(item.priceAmount) ? item.priceAmount : null,
    currency: getString(item.currency, "USD").toUpperCase(),
    description: getString(item.description),
    permalink: getString(item.permalink),
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => getString(tag)).filter(Boolean).slice(0, 6) : [],
  }));
}

function normalizeKnowledgeSources(value: unknown): KnowledgeSource[] {
  const root = isRecord(value) ? value : {};
  const sources = Array.isArray(root.sources) ? root.sources : [];

  return sources.filter(isRecord).map((source) => ({
    title: getString(source.title) || getString(source.fileName) || "Knowledge source",
    category: getString(source.category) || getString(source.kind),
    summary: getString(source.summary) || getString(source.description),
  }));
}

function normalizeOutcomeProviders(value: unknown): OutcomeProvider[] {
  const root = isRecord(value) ? value : {};
  const outcomeProviders = isRecord(root.outcomeProviders) ? root.outcomeProviders : {};
  const providers = Array.isArray(outcomeProviders.providers) ? outcomeProviders.providers : [];

  return providers.filter(isRecord).map((provider) => ({
    outcomeType: getString(provider.outcomeType),
    enabled: provider.enabled === true,
    provider: getString(provider.provider),
    actionUrl: getString(provider.actionUrl),
    cta: getString(provider.cta),
    webhookUrl: getString(provider.webhookUrl),
    apiEndpoint: getString(provider.apiEndpoint),
  }));
}

function normalizeEscalationRules(value: unknown): EscalationRule[] {
  const root = isRecord(value) ? value : {};
  const rules = Array.isArray(root.rules) ? root.rules : [];

  return rules.filter(isRecord).map((rule) => ({
    id: getString(rule.id),
    label: getString(rule.label, "Custom rule"),
    enabled: rule.enabled === true,
    action: getString(rule.action),
    priority: getString(rule.priority),
  }));
}

function normalizeConversations(value: unknown): RawConversation[] {
  const root = isRecord(value) ? value : {};
  const conversations = Array.isArray(root.conversations) ? root.conversations : [];

  return conversations.filter(isRecord).map((conversation, index) => {
    const participant = isRecord(conversation.participant) ? conversation.participant : {};
    const messages = Array.isArray(conversation.messages)
      ? conversation.messages.filter(isRecord).map((message) => {
          const replyTo = isRecord(message.reply_to) ? message.reply_to : {};
          const story = isRecord(replyTo.story) ? replyTo.story : undefined;

          return {
            text: getString(message.text),
            from: message.from === "me" ? "me" : message.from === "note" ? "note" : "user",
            attachments: Array.isArray(message.attachments) ? message.attachments : [],
            catalogItems: Array.isArray(message.catalogItems) ? message.catalogItems : [],
            time: getString(message.time),
            reply_to: story
              ? {
                  story: {
                    id: getString(story.id),
                    url: getString(story.url),
                  },
                }
              : undefined,
          } satisfies RawMessage;
        })
      : [];

    return {
      id: getString(conversation.id, `conversation-${index}`),
      participant: {
        id: getString(participant.id),
        name: getString(participant.name),
        username: getString(participant.username),
        profile_pic: getString(participant.profile_pic),
      },
      updated_time: getString(conversation.updated_time),
      messages,
    };
  });
}

function getProfileImageUrl(...accounts: Record<string, unknown>[]) {
  for (const account of accounts) {
    const profileImage =
      getString(account.profilePictureUrl) ||
      getString(account.profile_picture_url) ||
      getString(account.profilePic) ||
      getString(account.profile_pic) ||
      getString(account.avatarUrl) ||
      getString(account.avatar_url);

    if (profileImage.startsWith("https://")) {
      return profileImage;
    }
  }

  return "";
}

function getFirstMediaImageUrl(content: Record<string, unknown>) {
  const mediaItems = [
    ...(Array.isArray(content.posts) ? content.posts : []),
    ...(Array.isArray(content.stories) ? content.stories : []),
  ];

  for (const item of mediaItems) {
    if (!isRecord(item)) {
      continue;
    }

    const imageUrl = getString(item.mediaUrl) || getString(item.media_url) || getString(item.thumbnailUrl) || getString(item.thumbnail_url);

    if (imageUrl.startsWith("https://")) {
      return imageUrl;
    }
  }

  return "";
}

function hasIntent(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function getLatestMessageTime(messages: RawMessage[], from?: RawMessage["from"]) {
  const times = messages
    .filter((message) => !from || message.from === from)
    .map((message) => (message.time ? Date.parse(message.time) : Number.NaN))
    .filter(Number.isFinite);

  return times.length ? Math.max(...times) : 0;
}

function isMissedConversation(conversation: RawConversation) {
  const latestUserTime = getLatestMessageTime(conversation.messages, "user");
  const latestBusinessTime = getLatestMessageTime(conversation.messages, "me");

  if (!latestUserTime) {
    return false;
  }

  return !latestBusinessTime || latestUserTime > latestBusinessTime;
}

function getConversationScore(conversation: RawConversation) {
  const text = conversation.messages.map((message) => message.text || "").join("\n");
  const userMessageCount = conversation.messages.filter((message) => message.from === "user").length;
  let score = userMessageCount * 8 + conversation.messages.length * 2;

  if (hasIntent(text, /price|pricing|cost|rate|package|quote|budget|payment|checkout|invoice/i)) score += 28;
  if (hasIntent(text, /book|booking|call|appointment|availability|schedule|slot|reserve/i)) score += 24;
  if (hasIntent(text, /buy|purchase|order|confirm|ready|interested|available/i)) score += 22;
  if (hasIntent(text, /partner|partnership|collab|sponsor|brand deal|campaign/i)) score += 16;
  if (isMissedConversation(conversation)) score += 12;

  return Math.min(100, Math.max(0, score));
}

function getOpportunityReasons(conversation: RawConversation) {
  const text = conversation.messages.map((message) => message.text || "").join("\n");
  const reasons: string[] = [];
  const userMessageCount = conversation.messages.filter((message) => message.from === "user").length;

  if (hasIntent(text, /price|pricing|cost|rate|package|quote|budget|payment|checkout|invoice/i)) {
    reasons.push("Asked about pricing or payment");
  }

  if (hasIntent(text, /book|booking|call|appointment|availability|schedule|slot|reserve/i)) {
    reasons.push("Asked about booking or availability");
  }

  if (hasIntent(text, /buy|purchase|order|confirm|ready|interested|available/i)) {
    reasons.push("Showed purchase intent");
  }

  if (hasIntent(text, /partner|partnership|collab|sponsor|brand deal|campaign/i)) {
    reasons.push("Mentioned partnership or collaboration");
  }

  if (conversation.messages.some((message) => message.reply_to?.story)) {
    reasons.push("Replied to a story");
  }

  if (isMissedConversation(conversation)) {
    reasons.push("No business reply after latest message");
  }

  if (userMessageCount >= 3) {
    reasons.push(`Sent ${userMessageCount} messages`);
  }

  return reasons.length ? reasons.slice(0, 4) : ["Recent real Instagram conversation"];
}

function buildOpportunities(conversations: RawConversation[], averageValue: number) {
  return conversations
    .map((conversation) => {
      const score = getConversationScore(conversation);
      const participantName =
        getString(conversation.participant.name) ||
        getString(conversation.participant.username) ||
        (conversation.participant.id ? `Instagram user ${conversation.participant.id.slice(-6)}` : "Instagram user");
      const missed = isMissedConversation(conversation);

      return {
        id: conversation.id,
        name: participantName,
        username: getString(conversation.participant.username),
        avatarUrl: getString(conversation.participant.profile_pic),
        badge: missed ? "Needs Reply" : score >= 70 ? "Hot Lead" : "Warm Lead",
        score,
        missed,
        estimatedValue: averageValue > 0 ? Math.round(averageValue) : 0,
        reasons: getOpportunityReasons(conversation),
      } satisfies Opportunity;
    })
    .filter((opportunity) => opportunity.score > 0)
    .sort((first, second) => {
      if (first.missed !== second.missed) {
        return first.missed ? -1 : 1;
      }

      return second.score - first.score;
    })
    .slice(0, 6);
}

function deriveNiche(posts: unknown[], catalog: CatalogItem[], accountType: string) {
  const text = [
    ...posts.filter(isRecord).map((post) => getString(post.caption)),
    ...catalog.map((item) => `${item.title} ${item.description} ${item.tags.join(" ")}`),
  ]
    .join(" ")
    .toLowerCase();

  if (/coach|coaching|course|training|mentor|consult|masterclass|program/.test(text)) return "Coaching / education";
  if (/jewel|necklace|dress|clothing|shoe|shop|collection|stock|order|size/.test(text)) return "Product sales";
  if (/book|booking|appointment|call|calendar|slot|padel|cricket|ground|court/.test(text)) return "Bookings / appointments";
  if (/fitness|gym|workout|nutrition|wellness|yoga/.test(text)) return "Fitness / wellness";
  if (/restaurant|food|cafe|bakery|menu|delivery/.test(text)) return "Food / hospitality";
  if (accountType) return `${accountType.toLowerCase()} Instagram account`;

  return "Not detected yet";
}

function deriveDescription(posts: unknown[], catalog: CatalogItem[]) {
  const offerDescription = catalog.map((item) => item.description).find(Boolean);

  if (offerDescription) {
    return truncate(offerDescription, 150);
  }

  const latestCaption = posts.filter(isRecord).map((post) => getString(post.caption)).find(Boolean);

  if (latestCaption) {
    return truncate(latestCaption, 150);
  }

  return "Not detected from connected Instagram data yet.";
}

function hasKnowledgeMatch(sources: KnowledgeSource[], pattern: RegExp) {
  return sources.some((source) => pattern.test(`${source.title} ${source.category} ${source.summary}`));
}

function isProviderConfigured(provider?: OutcomeProvider) {
  return Boolean(provider?.enabled && (provider.actionUrl || provider.webhookUrl || provider.apiEndpoint || provider.outcomeType === "purchase_product"));
}

function getProvider(providers: OutcomeProvider[], outcomeType: string) {
  return providers.find((provider) => provider.outcomeType === outcomeType);
}

function buildConversionActions(providers: OutcomeProvider[], catalog: CatalogItem[]) {
  const bookCall = getProvider(providers, "book_call");
  const purchase = getProvider(providers, "purchase_product");
  const application = getProvider(providers, "start_trial");
  const newsletter = getProvider(providers, "join_newsletter");

  return [
    {
      label: "Book a Call",
      detail: bookCall?.actionUrl || "No booking link connected",
      configured: isProviderConfigured(bookCall),
      href: bookCall?.actionUrl || "",
      icon: Calendar,
    },
    {
      label: "Purchase / Checkout",
      detail: catalog.length > 0 ? `${catalog.length} catalog offer${catalog.length === 1 ? "" : "s"} detected` : "No priced catalog offer detected",
      configured: Boolean(isProviderConfigured(purchase) && catalog.length > 0),
      href: purchase?.actionUrl || "",
      icon: ShoppingCart,
    },
    {
      label: "Apply / Enroll",
      detail: application?.actionUrl || "No application link connected",
      configured: isProviderConfigured(application),
      href: application?.actionUrl || "",
      icon: FileText,
    },
    {
      label: "Free Resource / Lead Magnet",
      detail: newsletter?.actionUrl || "No signup link connected",
      configured: isProviderConfigured(newsletter),
      href: newsletter?.actionUrl || "",
      icon: Link2,
    },
  ] satisfies ConversionAction[];
}

function getBusinessGoal(actions: ConversionAction[], hotLeads: number, catalogCount: number) {
  if (actions.find((action) => action.label === "Book a Call")?.configured || hotLeads > 0) {
    return "Book calls / appointments";
  }

  if (actions.find((action) => action.label === "Purchase / Checkout")?.configured || catalogCount > 0) {
    return "Sell products";
  }

  if (actions.find((action) => action.label === "Free Resource / Lead Magnet")?.configured) {
    return "Newsletter / community";
  }

  return "Book calls / appointments";
}

function buildPermissions(connected: boolean, allowedPages: string[], conversationCount: number) {
  const hasInbox = connected && (allowedPages.length === 0 || allowedPages.includes("inbox"));
  const hasContent = connected && (allowedPages.length === 0 || allowedPages.includes("instagram-content"));

  return [
    {
      label: "Reply to DMs",
      detail: conversationCount > 0 ? `${conversationCount} thread${conversationCount === 1 ? "" : "s"} available` : "Respond to new DMs",
      enabled: hasInbox,
      icon: User,
    },
    {
      label: "Reply to Story Replies",
      detail: "Engage with story replies",
      enabled: hasInbox,
      icon: MessageCircle,
    },
    {
      label: "Reply to Comments",
      detail: "Engage from comments",
      enabled: hasContent,
      icon: MessageCircle,
    },
    {
      label: "Follow Up Leads",
      detail: "Send follow-ups",
      enabled: hasInbox,
      icon: Send,
    },
  ] satisfies PermissionItem[];
}

function getKnowledgeScore({
  connected,
  conversationCount,
  catalogCount,
  configuredActions,
  knowledgeCount,
  enabledRules,
}: {
  connected: boolean;
  conversationCount: number;
  catalogCount: number;
  configuredActions: number;
  knowledgeCount: number;
  enabledRules: number;
}) {
  const score =
    (connected ? 24 : 0) +
    Math.min(18, conversationCount * 3) +
    Math.min(20, catalogCount * 5) +
    Math.min(14, configuredActions * 4) +
    Math.min(16, knowledgeCount * 5) +
    Math.min(8, enabledRules * 3);

  return Math.max(0, Math.min(100, score));
}

function buildReviewActions(actions: ConversionAction[], rules: EscalationRule[], permissions: PermissionItem[]) {
  const canBook = actions.some((action) => action.label === "Book a Call" && action.configured);
  const canSell = actions.some((action) => action.label === "Purchase / Checkout" && action.configured);
  const canReply = permissions.some((permission) => permission.label === "Reply to DMs" && permission.enabled);
  const canEscalate = rules.some((rule) => rule.enabled);

  return [
    canReply ? "Answer questions" : "Connect DMs",
    "Qualify leads",
    "Follow up",
    canEscalate ? "Handle objections" : "Add escalation rules",
    canBook ? "Book calls" : "Add booking link",
    canEscalate ? "Escalate hot leads" : "Review hot leads",
    canSell ? "Generate sales" : "Add checkout/catalog",
  ];
}

function buildOnboardingData({
  statusPayload,
  contentPayload,
  conversationsPayload,
  ordersPayload,
  catalogPayload,
  profilePayload,
  escalationPayload,
  outcomeProvidersPayload,
  knowledgePayload,
}: {
  statusPayload: unknown;
  contentPayload: unknown;
  conversationsPayload: unknown;
  ordersPayload: unknown;
  catalogPayload: unknown;
  profilePayload: unknown;
  escalationPayload: unknown;
  outcomeProvidersPayload: unknown;
  knowledgePayload: unknown;
}): OnboardingData {
  const status = isRecord(statusPayload) ? statusPayload : {};
  const content = isRecord(contentPayload) ? contentPayload : {};
  const conversationsRoot = isRecord(conversationsPayload) ? conversationsPayload : {};
  const profileRoot = isRecord(profilePayload) ? profilePayload : {};
  const profile = isRecord(profileRoot.profile) ? profileRoot.profile : {};
  const statusAccount = isRecord(status.account) ? status.account : {};
  const contentAccount = isRecord(content.account) ? content.account : {};
  const conversationsAccount = isRecord(conversationsRoot.account) ? conversationsRoot.account : {};
  const posts = Array.isArray(content.posts) ? content.posts : [];
  const stories = Array.isArray(content.stories) ? content.stories : [];
  const conversations = normalizeConversations(conversationsPayload);
  const orders = normalizeCommerceOrders(ordersPayload);
  const paidOrders = orders.filter(isPaidCommerceOrder);
  const catalog = normalizeCatalog(catalogPayload);
  const knowledgeSources = normalizeKnowledgeSources(knowledgePayload);
  const outcomeProviders = normalizeOutcomeProviders(outcomeProvidersPayload);
  const escalationRules = normalizeEscalationRules(escalationPayload);
  const connected = Boolean(status.connected || contentAccount.id || conversationsRoot.ig_user_id);
  const username =
    getString(contentAccount.username) ||
    getString(statusAccount.username) ||
    getString(conversationsAccount.username);
  const accountName =
    getString(contentAccount.name) ||
    getString(statusAccount.name) ||
    getString(conversationsAccount.name) ||
    username;
  const avatarUrl =
    getProfileImageUrl(contentAccount, statusAccount, conversationsAccount) ||
    getFirstMediaImageUrl(content);
  const messageGroups = conversations.flatMap((conversation) => conversation.messages);
  const userMessages = messageGroups.filter((message) => message.from === "user");
  const businessReplies = messageGroups.filter((message) => message.from === "me");
  const hotLeads = conversations.filter((conversation) => getConversationScore(conversation) >= 55).length;
  const interestedProspects = conversations.filter((conversation) => conversation.messages.some((message) => message.from === "user")).length;
  const missedConversations = conversations.filter(isMissedConversation).length;
  const totalPostComments = posts.filter(isRecord).reduce((sum, post) => sum + getNumber(post.commentsCount ?? post.comments_count), 0);
  const paidRevenue = paidOrders.reduce((sum, order) => sum + getCommerceOrderAmount(order), 0);
  const paidCurrency = paidOrders.map((order) => getString(order.currency).toUpperCase()).find(Boolean);
  const catalogCurrency = catalog.map((item) => item.currency).find(Boolean);
  const catalogPrices = catalog.map((item) => item.priceAmount || getNumber(item.priceText)).filter((amount) => amount > 0);
  const averagePaidOrder = paidOrders.length > 0 ? paidRevenue / paidOrders.length : 0;
  const averageCatalogPrice = catalogPrices.length > 0 ? catalogPrices.reduce((sum, price) => sum + price, 0) / catalogPrices.length : 0;
  const averageValue = averagePaidOrder || averageCatalogPrice;
  const revenueBasis = averagePaidOrder ? "Based on paid Instagram orders" : averageCatalogPrice ? "Based on detected catalog pricing" : "";
  const potentialRevenue = averageValue > 0 ? Math.round(averageValue * Math.max(missedConversations, hotLeads)) : 0;
  const conversionActions = buildConversionActions(outcomeProviders, catalog);
  const configuredActions = conversionActions.filter((action) => action.configured).length;
  const allowedPages = Array.isArray(profile.allowedPages)
    ? profile.allowedPages.map((page) => getString(page)).filter(Boolean)
    : [];
  const permissions = buildPermissions(connected, allowedPages, conversations.length);
  const enabledRuleCount = escalationRules.filter((rule) => rule.enabled).length;
  const knowledgeScore = getKnowledgeScore({
    connected,
    conversationCount: conversations.length,
    catalogCount: catalog.length,
    configuredActions,
    knowledgeCount: knowledgeSources.length,
    enabledRules: enabledRuleCount,
  });
  const missingItems = [
    {
      label: "Pricing Information",
      detail: averageValue > 0 ? "Pricing detected" : "Add pricing details",
      complete: averageValue > 0,
    },
    {
      label: "Refund Policy",
      detail: hasKnowledgeMatch(knowledgeSources, /refund|return|cancel/i) ? "Policy found" : "Add your refund policy",
      complete: hasKnowledgeMatch(knowledgeSources, /refund|return|cancel/i),
    },
    {
      label: "Shipping Policy",
      detail: hasKnowledgeMatch(knowledgeSources, /shipping|delivery|ship/i) ? "Policy found" : "Add shipping details",
      complete: hasKnowledgeMatch(knowledgeSources, /shipping|delivery|ship/i),
    },
    {
      label: "Guarantee / Warranty",
      detail: hasKnowledgeMatch(knowledgeSources, /guarantee|warranty/i) ? "Policy found" : "Add your guarantee",
      complete: hasKnowledgeMatch(knowledgeSources, /guarantee|warranty/i),
    },
  ];

  return {
    isLoading: false,
    error:
      getString(status.error) ||
      getString(content.error) ||
      getString(conversationsRoot.error),
    connected,
    lastUpdated: new Date().toISOString(),
    accountName,
    username,
    avatarUrl,
    accountType: getString(contentAccount.accountType),
    followers: getNumber(contentAccount.followersCount),
    following: getNumber(contentAccount.followingCount),
    mediaCount: Math.max(getNumber(contentAccount.mediaCount), posts.length + stories.length),
    postsCount: posts.length,
    storiesCount: stories.length,
    totalPostComments,
    conversationCount: getNumber(conversationsRoot.conversation_count, conversations.length),
    messageCount: messageGroups.length,
    userMessageCount: userMessages.length,
    businessReplyCount: businessReplies.length,
    storyReplyCount: messageGroups.filter((message) => message.reply_to?.story).length,
    hotLeads,
    interestedProspects,
    missedConversations,
    potentialRevenue,
    revenueCurrency: paidCurrency || catalogCurrency || "USD",
    revenueBasis,
    paidRevenue,
    paidOrderCount: paidOrders.length,
    averageValue,
    opportunities: buildOpportunities(conversations, averageValue),
    businessName: accountName || getString(profile.name),
    niche: deriveNiche(posts, catalog, getString(contentAccount.accountType)),
    description: deriveDescription(posts, catalog),
    offers: catalog.slice(0, 4),
    catalogCount: catalog.length,
    knowledgeCount: knowledgeSources.length,
    businessGoal: getBusinessGoal(conversionActions, hotLeads, catalog.length),
    conversionActions,
    escalationRules,
    permissions,
    missingItems,
    behavior: {
      tone: "Professional",
      responseLength: "Medium",
      followUp: "Balanced",
    },
    knowledgeScore,
    reviewActions: buildReviewActions(conversionActions, escalationRules, permissions),
    allowedPages,
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  return response.json().catch(() => ({})) as Promise<unknown>;
}

function StepTitle({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-[13px] font-extrabold text-white">
        {number}
      </span>
      <div className="min-w-0">
        <h2 className="text-[18px] font-extrabold leading-tight text-black">{title}</h2>
        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#667085]">{subtitle}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-[8px] border border-[#e8ebf2] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function InstagramLogoBox() {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-[0_12px_28px_rgba(238,42,123,0.22)]">
      <Camera size={36} strokeWidth={2.2} />
    </span>
  );
}

function Avatar({ src, name, size = "h-14 w-14" }: { src?: string; name: string; size?: string }) {
  if (src) {
    return (
      <span
        aria-label={name}
        role="img"
        className={`${size} shrink-0 rounded-full bg-[#eef2f7] bg-cover bg-center`}
        style={{ backgroundImage: `url(${src})` }}
      />
    );
  }

  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#eef2f7] text-[14px] font-extrabold text-[#344054]`}>
      {name.trim().slice(0, 1).toUpperCase() || <User size={18} />}
    </span>
  );
}

function StatusText({ status }: { status: "Completed" | "In Progress" | "Waiting" | "Limited" }) {
  const classes = {
    Completed: "text-[#159947]",
    "In Progress": "text-[#667085]",
    Waiting: "text-[#98a2b3]",
    Limited: "text-[#c27803]",
  };

  return <span className={`text-[12px] font-extrabold ${classes[status]}`}>{status}</span>;
}

function TogglePill({ enabled }: { enabled: boolean }) {
  return (
    <span className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-[#2ea44f]" : "bg-[#d0d5dd]"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} />
    </span>
  );
}

function IconCheck({ className = "text-[#2ea44f]" }: { className?: string }) {
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10 ${className}`}>
      <Check size={13} strokeWidth={3} />
    </span>
  );
}

function MetricCell({
  icon: Icon,
  value,
  label,
  detail,
  tone,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="min-h-[126px] p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-[8px] ${tone}`}>
          <Icon size={20} strokeWidth={2.4} />
        </span>
        <p className="text-[30px] font-extrabold leading-none text-black">{value}</p>
      </div>
      <p className="mt-4 text-[13px] font-extrabold text-black">{label}</p>
      <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#667085]">{detail}</p>
    </div>
  );
}

function ConnectInstagramCard({
  data,
  onConnect,
}: {
  data: OnboardingData;
  onConnect: () => void;
}) {
  return (
    <Card>
      <StepTitle number={1} title="Connect Instagram" subtitle="Secure and easy connection" />
      <div className="flex items-center gap-4 border-b border-[#eef1f5] pb-5">
        {data.connected && data.avatarUrl ? <Avatar src={data.avatarUrl} name={data.accountName || data.username} size="h-16 w-16" /> : <InstagramLogoBox />}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-black">{data.username ? `@${data.username}` : data.connected ? "Connected account" : "Instagram not connected"}</p>
          <p className="mt-1 truncate text-[13px] font-extrabold text-[#344054]">{data.accountName || "Connect your business account"}</p>
          <p className="mt-1 text-[12px] font-semibold text-[#667085]">{data.accountType || (data.connected ? "Instagram business account" : "Required for live data")}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {[
          ["Business account connected", data.connected],
          ["We only read data", true],
          ["No posting or DMs without permission", true],
          ["Live metrics from Instagram", data.connected],
          ["Cancel anytime", true],
        ].map(([label, done]) => (
          <div key={String(label)} className="flex items-center gap-3 text-[13px] font-extrabold text-[#344054]">
            {done ? <IconCheck /> : <Circle size={18} className="text-[#98a2b3]" />}
            <span>{label}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onConnect}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 text-[14px] font-extrabold text-white shadow-[0_16px_34px_rgba(0,0,0,0.16)] transition hover:bg-[#1f2937]"
      >
        <Camera size={18} strokeWidth={2.4} />
        {data.connected ? "Connect Another Instagram" : "Connect Instagram"}
      </button>

      <p className="mt-7 flex items-center justify-center gap-2 text-[12px] font-semibold text-[#667085]">
        <Clock size={16} strokeWidth={2.3} />
        Takes less than 30 seconds
      </p>
    </Card>
  );
}

function DiscoveryCard({ data }: { data: OnboardingData }) {
  const statuses: Record<string, "Completed" | "In Progress" | "Waiting" | "Limited"> = {
    "Instagram Profile": data.isLoading ? "In Progress" : data.connected ? "Completed" : "Waiting",
    "Recent Posts & Reels": data.isLoading ? "In Progress" : data.mediaCount > 0 ? "Completed" : data.connected ? "Limited" : "Waiting",
    "Comments & DMs": data.isLoading ? "In Progress" : data.conversationCount > 0 || data.totalPostComments > 0 ? "Completed" : data.connected ? "Limited" : "Waiting",
    "Story Replies": data.isLoading ? "In Progress" : data.storyReplyCount > 0 ? "Completed" : data.connected ? "Limited" : "Waiting",
    "Business Knowledge": data.isLoading ? "In Progress" : data.knowledgeCount > 0 || data.catalogCount > 0 ? "Completed" : data.connected ? "Limited" : "Waiting",
    "Analyzing Opportunities": data.isLoading ? "In Progress" : data.connected ? "Completed" : "Waiting",
  };

  return (
    <Card>
      <StepTitle number={2} title="AI Discovery in Progress" subtitle="We're analyzing your Instagram and business data" />
      <p className="text-[14px] font-extrabold text-black">{data.isLoading ? "Scanning your digital presence..." : "Latest live scan"}</p>
      <div className="mt-6 space-y-5">
        {discoveryRows.map((row) => {
          const Icon = row.icon;

          return (
            <div key={row.label} className="flex items-center gap-3">
              <Icon size={18} className="shrink-0 text-[#667085]" strokeWidth={2.3} />
              <span className="min-w-0 flex-1 text-[13px] font-extrabold text-[#344054]">{row.label}</span>
              <StatusText status={statuses[row.label]} />
            </div>
          );
        })}
      </div>
      <div className="mt-8 rounded-[8px] bg-[#f8fafc] px-4 py-4 text-center text-[12px] font-semibold text-[#667085]">
        {data.isLoading ? "Usually takes 30-60 seconds" : formatLastUpdated(data.lastUpdated)}
      </div>
    </Card>
  );
}

function ReportCard({ data }: { data: OnboardingData }) {
  return (
    <Card>
      <StepTitle number={3} title="Your Opportunity Report" subtitle="Here's what we found for you" />
      <div className="grid grid-cols-2 divide-x divide-y divide-[#eef1f5] overflow-hidden rounded-[8px] border border-[#eef1f5]">
        <MetricCell
          icon={Flame}
          value={formatCompactNumber(data.hotLeads)}
          label="Hot Leads"
          detail="High intent prospects"
          tone="bg-[#fff4e6] text-[#ff7a00]"
        />
        <MetricCell
          icon={Users}
          value={formatCompactNumber(data.interestedProspects)}
          label="Interested Prospects"
          detail="Engaged and showing interest"
          tone="bg-[#f2f4f7] text-black"
        />
        <MetricCell
          icon={MessageCircle}
          value={formatCompactNumber(data.missedConversations)}
          label="Missed Conversations"
          detail="Latest customer message needs reply"
          tone="bg-[#fff1ed] text-[#f04438]"
        />
        <MetricCell
          icon={DollarSign}
          value={formatCurrency(data.potentialRevenue, data.revenueCurrency)}
          label="Potential Revenue"
          detail={data.revenueBasis || "Needs paid order or catalog pricing"}
          tone="bg-[#eafaf0] text-[#159947]"
        />
      </div>

      <div className="mt-6 rounded-[8px] bg-[#fff8eb] p-4">
        <div className="flex gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#f79009]" strokeWidth={2.4} />
          <p className="text-[13px] font-extrabold leading-relaxed text-[#344054]">
            {data.potentialRevenue > 0
              ? `You could be losing ${formatCurrency(data.potentialRevenue, data.revenueCurrency)} in potential revenue.`
              : "Add pricing or paid-order data to calculate potential revenue."}
            <span className="mt-3 block font-semibold">
              Turn on your AI Sales Agent to capture qualified opportunities from these live conversations.
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
}

function OpportunitiesCard({ data }: { data: OnboardingData }) {
  const visible = data.opportunities.slice(0, 2);

  return (
    <Card>
      <StepTitle number={4} title="Top Missed Opportunities" subtitle="Examples of high value prospects" />
      {visible.length > 0 ? (
        <div className="divide-y divide-[#eef1f5]">
          {visible.map((opportunity) => (
            <article key={opportunity.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start gap-4">
                <Avatar src={opportunity.avatarUrl} name={opportunity.name} size="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[14px] font-extrabold text-black">{opportunity.name}</h3>
                    <span
                      className={`shrink-0 rounded-[8px] px-2 py-1 text-[10px] font-extrabold ${
                        opportunity.badge === "Hot Lead"
                          ? "bg-[#fff1ed] text-[#d92d20]"
                          : opportunity.badge === "Needs Reply"
                            ? "bg-[#fff8eb] text-[#b54708]"
                            : "bg-[#f2f4f7] text-[#475467]"
                      }`}
                    >
                      {opportunity.badge}
                    </span>
                  </div>
                  {opportunity.username ? <p className="mt-1 text-[11px] font-semibold text-[#667085]">@{opportunity.username}</p> : null}
                  <ul className="mt-3 space-y-2">
                    {opportunity.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2 text-[12px] font-semibold leading-relaxed text-[#344054]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-right text-[11px] font-semibold text-[#667085]">Est. Value</p>
                  <p className="text-right text-[18px] font-extrabold text-[#159947]">
                    {opportunity.estimatedValue > 0 ? formatCurrency(opportunity.estimatedValue, data.revenueCurrency) : "Needs pricing"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-[#d0d5dd] p-5 text-center">
          <MessageCircle className="mx-auto text-[#98a2b3]" size={26} strokeWidth={2.2} />
          <p className="mt-3 text-[13px] font-extrabold text-black">No missed opportunities yet</p>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#667085]">
            Real opportunities will appear here after Instagram conversations or stored webhook messages are available.
          </p>
        </div>
      )}
      <a
        href="/opportunities"
        className="mt-5 flex items-center justify-between border-t border-[#eef1f5] pt-4 text-[14px] font-extrabold text-black"
      >
        View all {data.opportunities.length.toLocaleString()} detected opportunities
        <ArrowRight size={17} strokeWidth={2.5} />
      </a>
    </Card>
  );
}

function UnlockCard({ data, onFinish }: { data: OnboardingData; onFinish: () => void }) {
  const items = [
    `${formatCompactNumber(data.hotLeads)} hot leads`,
    `${formatCompactNumber(data.interestedProspects)} interested prospects`,
    `${formatCompactNumber(data.missedConversations)} missed conversations`,
    data.potentialRevenue > 0 ? `${formatCurrency(data.potentialRevenue, data.revenueCurrency)} potential revenue` : "Pricing data needed",
  ];

  return (
    <section className="rounded-[8px] bg-[#050505] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
      <h2 className="text-[28px] font-extrabold leading-tight">
        Unlock Your
        <span className="block bg-gradient-to-r from-[#ff7a00] to-[#e83e8c] bg-clip-text text-transparent">AI Sales Agent</span>
      </h2>
      <p className="mt-5 text-[14px] font-semibold leading-relaxed text-[#e5e7eb]">
        Activate to automatically engage, qualify and convert these live opportunities 24/7.
      </p>

      <div className="my-8 flex justify-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute inset-6 rounded-full bg-[#ff7a00]/20 blur-xl" />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white text-black shadow-[0_20px_60px_rgba(255,122,0,0.2)]">
            <Bot size={58} strokeWidth={2.2} />
          </span>
          <Sparkles size={18} className="absolute right-0 top-8 text-[#ffd166]" />
          <Sparkles size={14} className="absolute bottom-5 left-1 text-[#f472b6]" />
        </div>
      </div>

      <p className="text-[13px] font-extrabold text-white">You&apos;ll unlock:</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <p key={item} className="flex items-center gap-2 text-[13px] font-semibold text-[#f2f4f7]">
            <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />
            {item}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#ff7a00] to-[#e83e8c] px-4 text-[14px] font-extrabold text-white shadow-[0_18px_38px_rgba(232,62,140,0.28)] transition hover:brightness-105"
      >
        Activate AI Sales Agent
        <ArrowRight size={17} strokeWidth={2.5} />
      </button>
      <p className="mt-4 text-center text-[12px] font-semibold text-[#d0d5dd]">30-day money back guarantee</p>
    </section>
  );
}

function VerifyBusinessCard({ data }: { data: OnboardingData }) {
  return (
    <Card>
      <StepTitle number={5} title="Verify Your Business" subtitle="Review what we found" />
      <div className="space-y-5">
        <InfoBlock label="Business Name" value={data.businessName || "Not detected yet"} />
        <InfoBlock label="Niche" value={data.niche} />
        <InfoBlock label="Description" value={data.description} />
        <div>
          <p className="text-[11px] font-semibold text-[#667085]">Offers Found</p>
          <p className="mt-2 text-[13px] font-extrabold text-black">
            {data.catalogCount} offer{data.catalogCount === 1 ? "" : "s"} detected
          </p>
          <div className="mt-3 space-y-3">
            {data.offers.length > 0 ? (
              data.offers.slice(0, 3).map((offer) => (
                <p key={`${offer.title}-${offer.priceText}`} className="flex items-center gap-2 text-[12px] font-extrabold text-[#344054]">
                  <IconCheck />
                  <span className="truncate">{offer.title}</span>
                </p>
              ))
            ) : (
              <p className="text-[12px] font-semibold leading-relaxed text-[#667085]">No offers detected from Instagram content yet.</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <a href="/settings" className="flex h-11 items-center justify-center rounded-[8px] bg-black px-4 text-[13px] font-extrabold text-white">
          Looks Good
        </a>
        <a href="/settings" className="flex h-11 items-center justify-center rounded-[8px] border border-[#d0d5dd] px-4 text-[13px] font-extrabold text-black">
          Edit
        </a>
      </div>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[#667085]">{label}</p>
      <p className="mt-2 text-[13px] font-extrabold leading-relaxed text-black">{value}</p>
    </div>
  );
}

function GoalCard({ data }: { data: OnboardingData }) {
  return (
    <Card>
      <StepTitle number={6} title="Business Goal" subtitle="What should your AI optimize for?" />
      <div className="divide-y divide-[#eef1f5]">
        {goalOptions.map(([label, detail]) => {
          const selected = label === data.businessGoal;

          return (
            <div key={label} className="flex items-start gap-3 py-4 first:pt-0">
              <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-black" : "border-[#98a2b3]"}`}>
                {selected ? <span className="h-2.5 w-2.5 rounded-full bg-black" /> : null}
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-black">{label}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#667085]">{detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      <NextButton target="conversion-actions" />
    </Card>
  );
}

function ConversionActionsCard({ data }: { data: OnboardingData }) {
  return (
    <Card id="conversion-actions">
      <StepTitle number={7} title="Conversion Actions" subtitle="Add links to convert leads" />
      <div className="divide-y divide-[#eef1f5]">
        {data.conversionActions.map((action) => {
          const Icon = action.icon;

          return (
            <div key={action.label} className="flex items-center gap-3 py-4 first:pt-0">
              <Icon size={18} className="shrink-0 text-[#475467]" strokeWidth={2.3} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-black">{action.label}</p>
                <p className="mt-1 truncate text-[11px] font-semibold text-[#667085]">{action.detail}</p>
              </div>
              {action.configured ? <Check size={19} className="text-[#2ea44f]" strokeWidth={3} /> : <a href="/settings" className="text-[12px] font-extrabold text-[#344054]">Add</a>}
            </div>
          );
        })}
      </div>
      <a href="/settings" className="mt-4 flex items-center gap-2 text-[13px] font-extrabold text-black">
        <Plus size={16} strokeWidth={2.5} />
        Add Another Action
      </a>
      <NextButton target="escalation-rules" />
    </Card>
  );
}

function EscalationRulesCard({ data }: { data: OnboardingData }) {
  const visibleRules = data.escalationRules.length
    ? data.escalationRules
    : [{ id: "no-rules", label: "No saved escalation rules", enabled: false, action: "Add rules in settings" }];

  return (
    <Card id="escalation-rules">
      <StepTitle number={8} title="Escalation Rules" subtitle="When should we notify you?" />
      <p className="mb-3 text-[12px] font-semibold text-[#667085]">Notify me for:</p>
      <div className="space-y-4">
        {visibleRules.slice(0, 4).map((rule, index) => (
          <div key={`${rule.id}-${index}`} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#fff1ed] text-[#f04438]">
              {index === 0 ? <Flame size={18} /> : <MessageCircle size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold text-black">{rule.label}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-[#667085]">{rule.action || rule.priority || "Escalate for review"}</p>
            </div>
            <TogglePill enabled={rule.enabled} />
          </div>
        ))}
        <a href="/settings" className="flex items-center gap-3 pt-1">
          <Circle size={18} className="text-[#667085]" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-black">Other custom</p>
            <p className="mt-1 text-[11px] font-semibold text-[#667085]">Add custom keywords</p>
          </div>
          <ChevronRight size={18} className="text-black" strokeWidth={2.4} />
        </a>
      </div>
      <NextButton target="ai-permissions" />
    </Card>
  );
}

function PermissionsCard({ data }: { data: OnboardingData }) {
  return (
    <Card id="ai-permissions">
      <StepTitle number={9} title="AI Permissions" subtitle="Where can your AI engage?" />
      <div className="space-y-5">
        {data.permissions.map((permission) => {
          const Icon = permission.icon;

          return (
            <div key={permission.label} className="flex items-center gap-3">
              <Icon size={18} className="shrink-0 text-[#475467]" strokeWidth={2.3} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-black">{permission.label}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#667085]">{permission.detail}</p>
              </div>
              <TogglePill enabled={permission.enabled} />
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-[8px] bg-[#fff8eb] p-4 text-[12px] font-semibold leading-relaxed text-[#344054]">
        Your AI will only engage based on your business rules and knowledge.
      </div>
      <NextButton target="missing-info" />
    </Card>
  );
}

function MissingInfoCard({ data }: { data: OnboardingData }) {
  const missingCount = data.missingItems.filter((item) => !item.complete).length;

  return (
    <Card id="missing-info">
      <StepTitle number={10} title="Missing Information" subtitle="Help us fill the gaps" />
      <div className="mb-5 rounded-[8px] bg-[#fff8eb] p-4 text-center text-[12px] font-extrabold leading-relaxed text-[#344054]">
        {missingCount > 0 ? `We need ${missingCount} more detail${missingCount === 1 ? "" : "s"} to make your AI stronger.` : "Your required business details are covered."}
      </div>
      <div className="space-y-5">
        {data.missingItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <FileText size={18} className="shrink-0 text-[#667085]" strokeWidth={2.3} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-black">{item.label}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#667085]">{item.detail}</p>
            </div>
            {item.complete ? <Check size={18} className="text-[#2ea44f]" strokeWidth={3} /> : <a href="/knowledge-base" className="text-[12px] font-extrabold text-[#175cd3]">Add</a>}
          </div>
        ))}
      </div>
      <a href="/dashboard" className="mt-6 block text-center text-[12px] font-extrabold text-[#344054]">
        I&apos;ll add this later
      </a>
      <NextButton target="agent-behavior" />
    </Card>
  );
}

function NextButton({ target }: { target: string }) {
  return (
    <button
      type="button"
      onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#eef1f5] bg-white text-[13px] font-extrabold text-black transition hover:bg-[#f8fafc]"
    >
      Next
      <ArrowRight size={16} strokeWidth={2.5} />
    </button>
  );
}

function BehaviorCard({ data }: { data: OnboardingData }) {
  const selected = [data.behavior.tone, data.behavior.responseLength, data.behavior.followUp];

  return (
    <Card id="agent-behavior" className="lg:col-span-2">
      <StepTitle number={11} title="Agent Behavior" subtitle="How should your AI communicate?" />
      <div className="grid gap-4 md:grid-cols-3">
        {behaviorColumns.map((column, columnIndex) => (
          <div key={column.title} className="border-r border-[#eef1f5] pr-4 last:border-r-0 last:pr-0">
            <p className="mb-3 text-[12px] font-extrabold text-black">{column.title}</p>
            <div className="space-y-3">
              {column.options.map(([label, detail]) => {
                const active = selected[columnIndex] === label;

                return (
                  <div key={label} className={`flex gap-3 rounded-[8px] p-3 ${active ? "bg-[#f5f5f5]" : ""}`}>
                    <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-black" : "border-[#98a2b3]"}`}>
                      {active ? <span className="h-2.5 w-2.5 rounded-full bg-black" /> : null}
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold text-black">{label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#667085]">{detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <NextButton target="review-confirm" />
    </Card>
  );
}

function DonutScore({ score }: { score: number }) {
  return (
    <div
      className="mx-auto flex h-36 w-36 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(#2ea44f 0 ${score}%, #eef1f5 ${score}% 100%)` }}
    >
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
        <p className="text-[32px] font-extrabold leading-none text-black">{score}%</p>
        <p className="mt-2 text-[11px] font-extrabold text-[#2ea44f]">{score >= 85 ? "Excellent" : score >= 60 ? "Good" : "Needs data"}</p>
      </div>
    </div>
  );
}

function ReviewCard({ data, onFinish }: { data: OnboardingData; onFinish: () => void }) {
  return (
    <Card id="review-confirm">
      <StepTitle number={12} title="Review & Confirm" subtitle="Review everything before we build your agent" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="text-center">
          <p className="mb-5 text-[12px] font-extrabold text-black">Business Knowledge Score</p>
          <DonutScore score={data.knowledgeScore} />
          <p className="mt-5 text-[13px] font-extrabold text-black">{data.knowledgeScore >= 60 ? "Your AI is almost ready." : "Add more business data when ready."}</p>
        </div>
        <div>
          <p className="mb-4 text-[12px] font-extrabold text-black">What Your AI Will Do</p>
          <div className="space-y-3">
            {data.reviewActions.map((action) => (
              <p key={action} className="flex items-center gap-3 text-[13px] font-semibold text-[#344054]">
                <IconCheck />
                {action}
              </p>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onFinish}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 text-[14px] font-extrabold text-white shadow-[0_16px_34px_rgba(0,0,0,0.16)] transition hover:bg-[#1f2937]"
      >
        <Camera size={18} strokeWidth={2.4} />
        Build My AI Sales Agent
        <Sparkles size={17} strokeWidth={2.4} />
      </button>
    </Card>
  );
}

function ReadyCard({ onFinish }: { onFinish: () => void }) {
  return (
    <section className="rounded-[8px] bg-[#050505] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.2)] md:p-8">
      <div className="grid gap-6 md:grid-cols-[1fr_170px]">
        <div>
          <h2 className="text-[25px] font-extrabold leading-tight">Your AI Sales Agent is Ready!</h2>
          <p className="mt-4 text-[13px] font-semibold leading-relaxed text-[#e5e7eb]">
            Your agent is live and ready to engage, qualify and convert leads from your connected Instagram data.
          </p>
          <div className="mt-6 space-y-4">
            {[
              "AI is ready for new conversations",
              "Leads can be qualified automatically",
              "You'll be notified for high-value opportunities",
              "All conversations stay in your inbox",
            ].map((item) => (
              <p key={item} className="flex items-center gap-3 text-[13px] font-semibold text-[#f2f4f7]">
                <IconCheck className="text-[#2ea44f]" />
                {item}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="mt-8 flex h-12 min-w-[240px] items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#ff7a00] to-[#e83e8c] px-5 text-[14px] font-extrabold text-white shadow-[0_18px_38px_rgba(232,62,140,0.28)]"
          >
            Go to Dashboard
            <ArrowRight size={17} strokeWidth={2.5} />
          </button>
          <a href="/conversations" className="mt-5 inline-flex text-[13px] font-extrabold text-white/80">
            View Inbox
          </a>
        </div>
        <div className="flex items-center justify-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="absolute inset-8 rounded-full bg-[#ff7a00]/20 blur-xl" />
            <span className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white text-black">
              <Bot size={58} strokeWidth={2.2} />
            </span>
            <Sparkles size={18} className="absolute right-0 top-8 text-[#ffd166]" />
            <Sparkles size={14} className="absolute bottom-4 left-4 text-[#f472b6]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatHappensNext() {
  const items = [
    ["New comment or DM arrives", Users],
    ["AI starts conversation", Bot],
    ["AI qualifies the lead", Target],
    ["AI handles objections", Bell],
    ["AI books call or makes sale", Calendar],
    ["You close and grow revenue", DollarSign],
  ] satisfies [string, LucideIcon][];

  return (
    <section className="rounded-[8px] border border-[#e8ebf2] bg-white p-5">
      <div className="grid gap-5 lg:grid-cols-[180px_1fr] lg:items-center">
        <div>
          <h2 className="text-[18px] font-extrabold text-black">What Happens Next?</h2>
          <p className="mt-2 text-[12px] font-semibold text-[#667085]">Here&apos;s what your AI will do</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {items.map(([label, Icon], index) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#f2f4f7] text-black">
                <Icon size={19} strokeWidth={2.4} />
              </span>
              <p className="text-[12px] font-extrabold leading-tight text-black">{label}</p>
              {index < items.length - 1 ? <ArrowRight className="hidden shrink-0 text-[#98a2b3] xl:block" size={16} /> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SafetyRow() {
  const items = [
    ["100% Safe & Secure", "We only read data. We never post or message without permission.", ShieldCheck],
    ["Your Data is Private", "Your data is encrypted and never shared.", Lock],
    ["Cancel Anytime", "No commitments. Cancel at any time.", Zap],
    ["30-Day Guarantee", "Love it or get a full refund.", Clock],
  ] satisfies [string, string, LucideIcon][];

  return (
    <section className="grid gap-4 rounded-[8px] border border-[#e8ebf2] bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
      {items.map(([title, detail, Icon]) => (
        <div key={title} className="flex gap-4 border-[#eef1f5] xl:border-r xl:pr-4 xl:last:border-r-0">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#eef1f5] text-black">
            <Icon size={26} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[14px] font-extrabold text-black">{title}</p>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#667085]">{detail}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(emptyData);
  const [refreshing, setRefreshing] = useState(false);

  const loadOnboardingData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      const scanParams = new URLSearchParams({ scan: "1" });
      const [
        statusResult,
        contentResult,
        conversationsResult,
        ordersResult,
        catalogResult,
        profileResult,
        escalationResult,
        outcomeProvidersResult,
        knowledgeResult,
      ] = await Promise.allSettled([
        fetchJson("/api/auth/instagram/status"),
        fetchJson(`/api/instagram/content?${scanParams.toString()}`),
        fetchJson(`/api/instagram/conversations?${scanParams.toString()}`),
        fetchJson("/api/commerce/orders"),
        fetchJson("/api/instagram/catalog"),
        fetchJson("/api/auth/profile"),
        fetchJson("/api/escalation-rules"),
        fetchJson("/api/revenue/outcome-providers"),
        fetchJson("/api/knowledge/sources"),
      ]);

      setData(
        buildOnboardingData({
          statusPayload: statusResult.status === "fulfilled" ? statusResult.value : {},
          contentPayload: contentResult.status === "fulfilled" ? contentResult.value : {},
          conversationsPayload: conversationsResult.status === "fulfilled" ? conversationsResult.value : {},
          ordersPayload: ordersResult.status === "fulfilled" ? ordersResult.value : {},
          catalogPayload: catalogResult.status === "fulfilled" ? catalogResult.value : {},
          profilePayload: profileResult.status === "fulfilled" ? profileResult.value : {},
          escalationPayload: escalationResult.status === "fulfilled" ? escalationResult.value : {},
          outcomeProvidersPayload: outcomeProvidersResult.status === "fulfilled" ? outcomeProvidersResult.value : {},
          knowledgePayload: knowledgeResult.status === "fulfilled" ? knowledgeResult.value : {},
        }),
      );
    } catch (error) {
      setData({
        ...emptyData,
        isLoading: false,
        error: error instanceof Error ? error.message : "Could not load onboarding data",
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadOnboardingData(), 0);
    const interval = window.setInterval(() => void loadOnboardingData(), 30000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadOnboardingData]);

  const phaseOneSummary = useMemo(() => {
    if (!data.connected) {
      return "Connect Instagram to see live opportunities";
    }

    return `${formatCompactNumber(data.conversationCount)} conversations scanned`;
  }, [data.connected, data.conversationCount]);

  async function finishOnboarding() {
    window.localStorage.setItem("tractionflo_onboarding_completed", "true");

    try {
      await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
    } catch {
      // Local completion still lets the user continue if the network request fails.
    }

    router.push("/dashboard");
  }

  function connectInstagram() {
    window.location.href = "/api/auth/instagram?next=/onboarding";
  }

  return (
    <main className="min-h-screen bg-[#fbfbfc] px-4 py-5 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-black text-[12px] font-extrabold text-white">TF</span>
            <span className="text-[20px] font-extrabold text-black">TractionFlo</span>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <span className="inline-flex h-9 items-center justify-center rounded-[8px] bg-gradient-to-r from-[#ff7a00] to-[#e83e8c] px-5 text-[12px] font-extrabold uppercase text-white">
              Phase 1: Discovery
            </span>
            <div className="flex flex-wrap gap-3 text-[12px] font-extrabold text-black">
              <span>100% free</span>
              <span>No commitment</span>
              <span>{phaseOneSummary}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadOnboardingData(true)}
            disabled={refreshing}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-4 text-[12px] font-extrabold text-black transition hover:bg-[#f8fafc] disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} strokeWidth={2.4} />
            Refresh live data
          </button>
        </header>

        {data.error && data.connected ? (
          <div className="rounded-[8px] border border-[#fedf89] bg-[#fffbeb] p-4 text-[13px] font-semibold text-[#7a4b00]">
            Some Instagram data was limited by API permissions: {data.error}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.05fr_1.05fr_1.12fr_1.25fr_0.95fr]">
          <ConnectInstagramCard data={data} onConnect={connectInstagram} />
          <DiscoveryCard data={data} />
          <ReportCard data={data} />
          <OpportunitiesCard data={data} />
          <UnlockCard data={data} onFinish={() => void finishOnboarding()} />
        </section>

        <div className="flex flex-col gap-3 border-t border-[#e8ebf2] pt-7 md:flex-row md:items-center md:justify-center">
          <span className="inline-flex h-10 items-center justify-center rounded-[8px] bg-black px-6 text-[14px] font-extrabold uppercase text-white">
            Phase 2: AI Sales Agent Setup
          </span>
          <p className="text-center text-[12px] font-extrabold text-black md:text-left">
            One-time setup <span className="mx-2 text-[#98a2b3]">|</span> We build the best AI sales agent for your business
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <VerifyBusinessCard data={data} />
          <GoalCard data={data} />
          <ConversionActionsCard data={data} />
          <EscalationRulesCard data={data} />
          <PermissionsCard data={data} />
          <MissingInfoCard data={data} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.8fr_1.15fr]">
          <BehaviorCard data={data} />
          <ReviewCard data={data} onFinish={() => void finishOnboarding()} />
          <ReadyCard onFinish={() => void finishOnboarding()} />
        </section>

        <WhatHappensNext />
        <SafetyRow />

        <footer className="pb-3 text-center text-[12px] font-semibold text-[#667085]">
          Live onboarding data refreshes every 30 seconds while this page is open.
        </footer>
      </div>
    </main>
  );
}
