import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Box,
  BriefcaseBusiness,
  ChartPie,
  CircleDollarSign,
  CircleHelp,
  Clock,
  Crown,
  DollarSign,
  FileText,
  Flame,
  Handshake,
  Heart,
  MessageSquare,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Target,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import {
  defaultEscalationRuleSettings,
  normalizeEscalationRuleSettings,
  type EscalationRuleSetting,
} from "@/lib/conversation-escalation";

type ConnectedInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  connectedAt?: string;
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

type AdminDateRangePreset = "7d" | "30d" | "90d";

type Opportunity = {
  id?: string;
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
  id: string;
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

type KnowledgeSource = never;

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

type CreatorEscalationClassification = Pick<
  EscalationItem,
  | "category"
  | "riskLevel"
  | "badge"
  | "badgeTone"
  | "borderTone"
  | "glowTone"
  | "dotTone"
  | "icon"
  | "recommendedAction"
> & {
  risk: EscalationItem["riskLevel"];
  summary: string;
  evidence?: string;
};

type EscalationDetailRow = {
  label: string;
  value: string;
  icon: LucideIcon;
  valueTone?: string;
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
  escalationRules: EscalationRuleSetting[];
};

const adminDateRangeOptions: { value: AdminDateRangePreset; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

function getAdminRangeOption(preset: AdminDateRangePreset) {
  return adminDateRangeOptions.find((option) => option.value === preset) || adminDateRangeOptions[0];
}

function getAdminDateRangeLabel(preset: AdminDateRangePreset = "7d") {
  const range = getAdminRangeOption(preset);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (range.days - 1));

  return startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + " - " + endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getAdminDateRangeWindow(preset: AdminDateRangePreset = "7d") {
  const range = getAdminRangeOption(preset);
  const endDate = new Date();
  const startDate = new Date(endDate);

  startDate.setDate(endDate.getDate() - (range.days - 1));
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return {
    startTime: startDate.getTime(),
    endTime: endDate.getTime(),
  };
}

function formatInstagramRelativeTime(value?: string) {
  if (!value) {
    return "No activity";
  }

  const diff = Date.now() - new Date(value).getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
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

function getConversationLabel(conversation: InstagramSettingsConversation) {
  return (
    conversation.participant.username ||
    conversation.participant.name ||
    "Instagram user " + conversation.participant.id.slice(-6)
  );
}

function getInstagramProfileUrl(username?: string) {
  return username ? "https://www.instagram.com/" + username + "/" : "";
}

const creatorBuyerKeywords = ["price", "pricing", "cost", "package", "payment", "pay", "buy", "purchase", "order", "book", "call", "interested", "program", "course", "coaching", "subscription"];
const creatorPartnershipKeywords = ["partner", "partnership", "collab", "collaboration", "sponsor", "sponsored", "brand", "affiliate"];
const creatorCommunityKeywords = ["community", "share", "recommend", "refer", "follower", "audience"];
const creatorRefundEscalationKeywords = ["refund", "return", "chargeback", "cancel", "cancellation", "money back", "give my money", "reverse payment"];
const creatorComplaintEscalationKeywords = ["complaint", "angry", "upset", "disappointed", "bad service", "terrible", "poor quality", "not happy", "rude", "unacceptable"];
const creatorProductIssueEscalationKeywords = ["damaged", "damage", "broken", "defect", "defective", "faulty", "wrong size", "wrong product", "wrong item", "wrong order", "missing", "too small", "too big", "doesn't fit", "doesnt fit", "not fit", "not fitting"];
const creatorHumanEscalationKeywords = ["human", "agent", "support", "representative", "manager", "team member", "real person", "talk to someone", "speak to someone"];
const creatorCustomBulkEscalationKeywords = ["custom", "customize", "customise", "personalized", "personalised", "bulk", "wholesale", "large order", "big order", "corporate order", "bridal event", "company order", "group order"];
const creatorComplexEscalationKeywords = ["complex", "not in your knowledge", "not listed", "not sure", "medical", "injury", "injured", "pain", "orthopedic", "orthopaedic", "allergy", "sensitive issue"];
const creatorVipLeadEscalationKeywords = ["ready to buy", "want to buy", "want to order", "place order", "confirm order", "send payment", "payment link", "checkout", "buy now", "book now", "reserve it", "reserve this"];
const creatorUrgentOrderEscalationKeywords = ["urgent", "asap", "today", "tonight", "tomorrow", "rush", "immediately", "same day"];
const creatorEscalationKeywords = [
  ...creatorRefundEscalationKeywords,
  ...creatorComplaintEscalationKeywords,
  ...creatorProductIssueEscalationKeywords,
  ...creatorHumanEscalationKeywords,
  ...creatorCustomBulkEscalationKeywords,
  ...creatorComplexEscalationKeywords,
  ...creatorVipLeadEscalationKeywords,
  ...creatorUrgentOrderEscalationKeywords,
  ...creatorPartnershipKeywords,
];
const creatorGoalKeywords = ["need", "want", "looking", "suggest", "recommend", "help", "fit", "size", "wide", "comfortable", "wedding", "birthday", "event", "service", "coaching", "course", "outfit"];
const creatorBudgetKeywords = ["budget", "price", "pricing", "cost", "rate", "package", "payment", "pay", "expensive", "cheap", "$", "rs", "pkr"];
const creatorTimelineKeywords = ["today", "tomorrow", "tonight", "urgent", "asap", "soon", "this week", "weekend", "date", "when", "event", "wedding", "birthday", "book", "appointment", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const creatorBuyingIntentKeywords = ["buy", "purchase", "order", "book", "checkout", "available", "availability", "interested", "send", "confirm", "reserve"];

export function formatCreatorInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value || 0));
}

export function formatCreatorMoney(value: number) {
  return `$${formatCreatorInteger(Math.max(0, Math.round(value)))}`;
}

export function formatCreatorPercent(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function clampCreatorScore(value: number) {
  return Math.max(0, Math.min(99, Math.round(value)));
}

export function truncateCreatorText(value: string, maxLength = 116) {
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

function getCreatorLatestInboundText(conversation: InstagramSettingsConversation) {
  const latestMessage = getCreatorLastInboundMessage(conversation);
  return latestMessage ? getCreatorMessageText(latestMessage) : "";
}

function countCreatorKeywordHits(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
}

function hasCreatorKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasCreatorQuantityEscalationSignal(text: string) {
  return /\b(?:[2-9]\d|1\d{2,}|[1-9]\d{3,})\s?(pairs?|pieces?|pcs|shoes?|shirts?|t\s?-?\s?shirts?|tees?|hoodies?|units?|sets?|boxes?|cartons?|orders?|items?|products?)\b/i.test(text);
}

function hasCreatorUrgentOrderSignal(text: string) {
  return (
    hasCreatorKeyword(text, creatorUrgentOrderEscalationKeywords) &&
    /\b(order|buy|purchase|book|reserve|need|required|want|confirm|available|delivery|deliver)\b/i.test(text)
  );
}

function hasCreatorHighValueAmountSignal(text: string) {
  return /\b(?:\$|rs\.?|pkr|usd)\s?[1-9]\d{3,}\b|\b[1-9]\d{3,}\s?(?:usd|pkr|rs)\b/i.test(text);
}

function hasCreatorVipLeadEscalationSignal(text: string, buyerHits: number, inboundCount: number) {
  return (
    hasCreatorKeyword(text, creatorVipLeadEscalationKeywords) ||
    hasCreatorHighValueAmountSignal(text) ||
    (buyerHits >= 2 && inboundCount >= 2 && hasCreatorKeyword(text, ["confirm", "available", "availability", "today", "tomorrow", "urgent", "payment", "checkout"]))
  );
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

export function getCreatorConversationTime(conversation: InstagramSettingsConversation) {
  const latestMessageTime = conversation.messages
    .map((message) => getCreatorMessageTime(message))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return latestMessageTime || (conversation.updated_time ? new Date(conversation.updated_time).getTime() : 0);
}

function getCreatorConversationsForDateRange(
  conversations: InstagramSettingsConversation[],
  dateRangePreset: AdminDateRangePreset
) {
  const { startTime, endTime } = getAdminDateRangeWindow(dateRangePreset);

  return conversations.flatMap((conversation) => {
    const messages = conversation.messages.filter((message) => {
      const messageTime = getCreatorMessageTime(message);
      return Number.isFinite(messageTime) && messageTime >= startTime && messageTime <= endTime;
    });
    const updatedTime = conversation.updated_time ? new Date(conversation.updated_time).getTime() : 0;
    const isUpdatedInRange = Number.isFinite(updatedTime) && updatedTime >= startTime && updatedTime <= endTime;

    if (messages.length === 0 && !isUpdatedInRange) {
      return [];
    }

    return [{ ...conversation, messages }];
  });
}

function getCreatorSortedMessages(conversation: InstagramSettingsConversation) {
  return [...conversation.messages].sort((a, b) => getCreatorMessageTime(b) - getCreatorMessageTime(a));
}

export function getCreatorLastMessage(conversation: InstagramSettingsConversation) {
  return getCreatorSortedMessages(conversation)[0];
}

function getCreatorLastInboundMessage(conversation: InstagramSettingsConversation) {
  return getCreatorSortedMessages(conversation).find((message) => message.from === "user");
}

export function getCreatorParticipantName(conversation: InstagramSettingsConversation) {
  return getConversationLabel(conversation);
}

export function getCreatorParticipantHandle(conversation: InstagramSettingsConversation) {
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

export function getCreatorAvatarUrl(conversation: InstagramSettingsConversation, index = 0) {
  return conversation.participant.profile_pic || `https://i.pravatar.cc/96?img=${getCreatorAvatarNumber(conversation, index)}`;
}

export function getCreatorConversationPreview(conversation: InstagramSettingsConversation) {
  return formatInstagramMessagePreview(getCreatorLastInboundMessage(conversation) || getCreatorLastMessage(conversation));
}

function getCreatorEscalationEvidence(
  conversation: InstagramSettingsConversation,
  matcher: (text: string) => boolean,
  fallbackText = ""
) {
  const matchingMessage = getCreatorSortedMessages(conversation).find(
    (message) => message.from === "user" && matcher(getCreatorMessageText(message))
  );
  const evidence = matchingMessage ? formatInstagramMessagePreview(matchingMessage) : fallbackText;

  return evidence ? truncateCreatorText(evidence, 110) : "";
}

function isCreatorEscalationRuleEnabled(rules: EscalationRuleSetting[], ruleId: string) {
  const rule = normalizeEscalationRuleSettings(rules).find((item) => item.id === ruleId);
  return !rule || (rule.enabled && rule.action !== "Monitor only");
}

export function classifyCreatorOpportunity(conversation: InstagramSettingsConversation, rules: EscalationRuleSetting[] = defaultEscalationRuleSettings) {
  const text = getCreatorConversationText(conversation);
  const inboundCount = conversation.messages.filter((message) => message.from === "user").length;
  const buyerHits = countCreatorKeywordHits(text, creatorBuyerKeywords);
  const partnershipHits = countCreatorKeywordHits(text, creatorPartnershipKeywords);
  const communityHits = countCreatorKeywordHits(text, creatorCommunityKeywords);
  const escalation = classifyCreatorEscalation(conversation, rules);

  if (escalation && !["vip_lead", "brand_deal", "custom_bulk", "urgent_order"].includes(escalation.category)) {
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

  return null;
}

export function classifyCreatorEscalations(
  conversation: InstagramSettingsConversation,
  rules: EscalationRuleSetting[] = defaultEscalationRuleSettings
): CreatorEscalationClassification[] {
  const latestText = getCreatorLatestInboundText(conversation);
  const conversationText = getCreatorConversationText(conversation);
  const inboundCount = conversation.messages.filter((message) => message.from === "user").length;
  const activeRules = normalizeEscalationRuleSettings(rules);
  const evidenceFor = (matcher: (text: string) => boolean) => getCreatorEscalationEvidence(conversation, matcher);
  const buildEscalation = (text: string): CreatorEscalationClassification[] => {
    const buyerHits = countCreatorKeywordHits(text, creatorBuyerKeywords);
    const partnershipHits = countCreatorKeywordHits(text, creatorPartnershipKeywords);
    const hasRefundSignal = hasCreatorKeyword(text, creatorRefundEscalationKeywords);
    const hasProductIssueSignal = hasCreatorKeyword(text, creatorProductIssueEscalationKeywords);
    const hasComplaintSignal = hasCreatorKeyword(text, creatorComplaintEscalationKeywords);
    const hasBulkSignal = hasCreatorKeyword(text, creatorCustomBulkEscalationKeywords) || hasCreatorQuantityEscalationSignal(text);
    const hasUrgentSignal = hasCreatorUrgentOrderSignal(text);
    const hasVipSignal = hasCreatorVipLeadEscalationSignal(text, buyerHits, inboundCount);
    const hasHumanSignal = hasCreatorKeyword(text, creatorHumanEscalationKeywords);
    const hasComplexSignal = hasCreatorKeyword(text, creatorComplexEscalationKeywords);
    const hasKnownSignal =
      hasRefundSignal ||
      hasProductIssueSignal ||
      hasComplaintSignal ||
      hasBulkSignal ||
      hasUrgentSignal ||
      partnershipHits > 0 ||
      hasVipSignal ||
      hasHumanSignal ||
      hasComplexSignal;

    if (
      !hasCreatorKeyword(text, creatorEscalationKeywords) &&
      !hasBulkSignal &&
      !hasUrgentSignal &&
      !hasVipSignal
    ) {
      return [];
    }

    const escalations: CreatorEscalationClassification[] = [];

    if (hasRefundSignal && isCreatorEscalationRuleEnabled(activeRules, "refunds")) {
      escalations.push({
        category: "refund",
        badge: "Refund Request",
        badgeTone: "bg-[#fff0f3] text-[#df405b]",
        borderTone: "border-[#ffc7d0]",
        glowTone: "bg-[#fffafa]",
        dotTone: "bg-[#df405b]",
        icon: TriangleAlert,
        risk: "High",
        riskLevel: "High",
        summary: "Customer asked about a refund, return, cancellation, chargeback, or money-back help.",
        evidence: evidenceFor((messageText) => hasCreatorKeyword(messageText, creatorRefundEscalationKeywords)),
        recommendedAction: "Pause AI, review the order/payment details, and let the creator handle the refund or cancellation decision directly.",
      });
    }

    if (hasProductIssueSignal && isCreatorEscalationRuleEnabled(activeRules, "complaints")) {
      escalations.push({
        category: "product_issue",
        badge: "Product Issue",
        badgeTone: "bg-[#fff0f3] text-[#df405b]",
        borderTone: "border-[#ffc7d0]",
        glowTone: "bg-[#fffafa]",
        dotTone: "bg-[#df405b]",
        icon: Box,
        risk: "High",
        riskLevel: "High",
        summary: "Customer mentioned a damaged, wrong, missing, or size-related product issue.",
        evidence: evidenceFor((messageText) => hasCreatorKeyword(messageText, creatorProductIssueEscalationKeywords)),
        recommendedAction: "Take over and ask for order number, clear photos, product code, delivery date, and whether the issue is damage, wrong item, or wrong size.",
      });
    }

    if (hasComplaintSignal && isCreatorEscalationRuleEnabled(activeRules, "complaints")) {
      escalations.push({
        category: "complaint",
        badge: "Complaint",
        badgeTone: "bg-[#fff3e6] text-[#ff850d]",
        borderTone: "border-[#ffe0ba]",
        glowTone: "bg-[#fffdf9]",
        dotTone: "bg-[#ff850d]",
        icon: TriangleAlert,
        risk: "High",
        riskLevel: "High",
        summary: "Customer expressed dissatisfaction, complaint language, or poor-service feedback.",
        evidence: evidenceFor((messageText) => hasCreatorKeyword(messageText, creatorComplaintEscalationKeywords)),
        recommendedAction: "Take over with an apology, acknowledge the complaint, collect the order/context, and resolve it manually.",
      });
    }

    if (hasBulkSignal && isCreatorEscalationRuleEnabled(activeRules, "bulk_orders")) {
      escalations.push({
        category: "custom_bulk",
        badge: hasUrgentSignal ? "Urgent Bulk Order" : "Custom/Bulk Order",
        badgeTone: "bg-[#eef4ff] text-[#3044ff]",
        borderTone: "border-[#cad6ff]",
        glowTone: "bg-[#fbfcff]",
        dotTone: "bg-[#3044ff]",
        icon: Crown,
        risk: "High",
        riskLevel: "High",
        summary: "Customer asked about a bulk, wholesale, custom, or large-quantity order.",
        evidence: evidenceFor(
          (messageText) =>
            hasCreatorKeyword(messageText, creatorCustomBulkEscalationKeywords) ||
            hasCreatorQuantityEscalationSignal(messageText)
        ),
        recommendedAction: "Take over to confirm quantity, customization details, deadline, stock, pricing, advance payment, and delivery feasibility.",
      });
    }

    if (hasUrgentSignal && isCreatorEscalationRuleEnabled(activeRules, "urgent_orders")) {
      escalations.push({
        category: "urgent_order",
        badge: "Urgent Order",
        badgeTone: "bg-[#eef4ff] text-[#3044ff]",
        borderTone: "border-[#cad6ff]",
        glowTone: "bg-[#fbfcff]",
        dotTone: "bg-[#3044ff]",
        icon: Crown,
        risk: "High",
        riskLevel: "High",
        summary: "Customer needs an urgent or time-sensitive order.",
        evidence: evidenceFor((messageText) => hasCreatorUrgentOrderSignal(messageText)),
        recommendedAction: "Take over immediately to confirm availability, delivery feasibility, payment timing, and next steps.",
      });
    }

    if (partnershipHits > 0 && isCreatorEscalationRuleEnabled(activeRules, "partnerships")) {
      escalations.push({
        category: "brand_deal",
        badge: "Brand Deal",
        badgeTone: "bg-[#eafaf0] text-[#0a9b3f]",
        borderTone: "border-[#bdeacb]",
        glowTone: "bg-[#fbfffc]",
        dotTone: "bg-[#13a84f]",
        icon: BriefcaseBusiness,
        risk: "Medium",
        riskLevel: "Medium",
        summary: "Customer asked about partnership, collaboration, sponsor, affiliate, or brand deal work.",
        evidence: evidenceFor((messageText) => countCreatorKeywordHits(messageText, creatorPartnershipKeywords) > 0),
        recommendedAction: "Take over and ask for campaign scope, brand details, budget, deliverables, timeline, and contact information.",
      });
    }

    if (hasVipSignal && isCreatorEscalationRuleEnabled(activeRules, "vip")) {
      escalations.push({
        category: "vip_lead",
        badge: "High-Ticket Lead",
        badgeTone: "bg-[#eef4ff] text-[#3044ff]",
        borderTone: "border-[#cad6ff]",
        glowTone: "bg-[#fbfcff]",
        dotTone: "bg-[#3044ff]",
        icon: Star,
        risk: "High",
        riskLevel: "High",
        summary: "Customer appears ready to buy, book, pay, or discuss a high-value order.",
        evidence: evidenceFor((messageText) =>
          hasCreatorVipLeadEscalationSignal(messageText, countCreatorKeywordHits(messageText, creatorBuyerKeywords), inboundCount)
        ),
        recommendedAction: "Take over or review immediately. The customer appears ready to buy, book, or receive a payment/checkout link.",
      });
    }

    if (hasHumanSignal && isCreatorEscalationRuleEnabled(activeRules, "human_handoff")) {
      escalations.push({
        category: "human",
        badge: "Human Requested",
        badgeTone: "bg-[#f0edff] text-[#6d3cff]",
        borderTone: "border-[#d7ccff]",
        glowTone: "bg-[#fcfbff]",
        dotTone: "bg-[#6d3cff]",
        icon: Users,
        risk: "Medium",
        riskLevel: "Medium",
        summary: "Customer asked to speak with a human, agent, representative, manager, or support team.",
        evidence: evidenceFor((messageText) => hasCreatorKeyword(messageText, creatorHumanEscalationKeywords)),
        recommendedAction: "Let the creator take over because the customer explicitly asked for human help.",
      });
    }

    if (hasComplexSignal && isCreatorEscalationRuleEnabled(activeRules, "human_handoff")) {
      escalations.push({
        category: "complex",
        badge: "Complex Question",
        badgeTone: "bg-[#fff3e6] text-[#ff850d]",
        borderTone: "border-[#ffe0ba]",
        glowTone: "bg-[#fffdf9]",
        dotTone: "bg-[#ff850d]",
        icon: CircleHelp,
        risk: "Medium",
        riskLevel: "Medium",
        summary: "Customer asked a complex or sensitive question that should be reviewed by a human.",
        evidence: evidenceFor((messageText) => hasCreatorKeyword(messageText, creatorComplexEscalationKeywords)),
        recommendedAction: "Take over because the request is sensitive or not safely answerable from the saved knowledge base.",
      });
    }

    if (escalations.length > 0 || hasKnownSignal || !isCreatorEscalationRuleEnabled(activeRules, "human_handoff")) {
      return escalations;
    }

    return [
      {
        category: "issue",
        badge: "Needs Human Review",
        badgeTone: "bg-[#fff3e6] text-[#ff850d]",
        borderTone: "border-[#ffe0ba]",
        glowTone: "bg-[#fffdf9]",
        dotTone: "bg-[#ff850d]",
        icon: CircleHelp,
        risk: "Medium",
        riskLevel: "Medium",
        summary: "Conversation contains a human-attention signal that does not fit a more specific category.",
        evidence: evidenceFor(
          (messageText) =>
            hasCreatorKeyword(messageText, creatorEscalationKeywords) ||
            hasCreatorQuantityEscalationSignal(messageText)
        ),
        recommendedAction: "Take over or review before AI continues. This conversation contains a human-attention signal.",
      },
    ];
  };

  const latestEscalations = buildEscalation(latestText);
  const conversationEscalations = buildEscalation(conversationText);
  const seenCategories = new Set<string>();

  return [...latestEscalations, ...conversationEscalations].filter((escalation) => {
    if (seenCategories.has(escalation.category)) {
      return false;
    }

    seenCategories.add(escalation.category);
    return true;
  });
}

export function classifyCreatorEscalation(
  conversation: InstagramSettingsConversation,
  rules: EscalationRuleSetting[] = defaultEscalationRuleSettings
) {
  return classifyCreatorEscalations(conversation, rules)[0] || null;
}

export function buildCreatorLiveSummary(
  conversations: InstagramSettingsConversation[],
  _totalConversationCount?: number,
  instagramAccount?: ConnectedInstagramAccount | null,
  dateRangePreset: AdminDateRangePreset = "7d",
  rules: EscalationRuleSetting[] = defaultEscalationRuleSettings,
): CreatorLiveSummary {
  const escalationRules = normalizeEscalationRuleSettings(rules);
  const dateRangeConversations = getCreatorConversationsForDateRange(conversations, dateRangePreset);
  const totalCount = dateRangeConversations.length;
  const sortedConversations = [...dateRangeConversations].sort((a, b) => getCreatorConversationTime(b) - getCreatorConversationTime(a));
  const allMessages = dateRangeConversations.flatMap((conversation) => conversation.messages);
  const inboundMessages = allMessages.filter((message) => message.from === "user");
  const outboundMessages = allMessages.filter((message) => message.from === "me");
  const engagedConversations = dateRangeConversations.filter((conversation) => conversation.messages.some((message) => message.from === "user"));

  const opportunityRecords = sortedConversations
    .map((conversation) => ({ conversation, opportunity: classifyCreatorOpportunity(conversation, escalationRules) }))
    .filter((record): record is { conversation: InstagramSettingsConversation; opportunity: NonNullable<ReturnType<typeof classifyCreatorOpportunity>> } => Boolean(record.opportunity));
  const escalationRecords = sortedConversations.flatMap((conversation) =>
    classifyCreatorEscalations(conversation, escalationRules).map((escalation) => ({
      conversation,
      escalation,
    }))
  );
  const escalatedConversationCount = new Set(escalationRecords.map((record) => record.conversation.id)).size;
  const estimatedRevenue = opportunityRecords.reduce((total, record) => total + record.opportunity.value, 0);
  const buyerCount = opportunityRecords.filter((record) => record.opportunity.badge === "HIGH INTENT").length;
  const partnershipCount = opportunityRecords.filter((record) => record.opportunity.badge === "PARTNERSHIP").length;
  const warmLeadCount = opportunityRecords.filter((record) => record.opportunity.stage === "Warm").length;
  const communityCount = opportunityRecords.filter((record) => record.opportunity.badge === "COMMUNITY").length;

  const opportunityCards: OpportunityPageCard[] = opportunityRecords.map(({ conversation, opportunity }) => {
    const preview = getCreatorConversationPreview(conversation);
    const score = opportunity.score;

    return {
      id: conversation.id,
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
    id: card.id,
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
    const evidenceDetail = escalation.evidence ? ` Message: "${escalation.evidence}"` : "";

    return {
      id: `${conversation.id}-${escalation.category}`,
      conversationId: conversation.id,
      name: getCreatorParticipantName(conversation),
      handle: getCreatorParticipantHandle(conversation),
      profileUrl: getInstagramProfileUrl(conversation.participant.username),
      avatar: getCreatorAvatarUrl(conversation),
      channel: "instagram",
      time: formatInstagramRelativeTime(getCreatorLastMessage(conversation)?.time || conversation.updated_time),
      category: escalation.category,
      riskLevel: escalation.riskLevel,
      badge: escalation.badge,
      badgeTone: escalation.badgeTone,
      title: `${escalation.badge} detected`,
      detail:
        (escalation.summary || evidenceDetail)
          ? `${escalation.summary}${evidenceDetail}`
          : preview === "No messages"
            ? "Escalation keywords were detected in this Instagram conversation."
            : truncateCreatorText(preview, 150),
      recommendedAction: escalation.recommendedAction,
      meta: [`Risk: ${escalation.riskLevel}`, "Needs creator takeover"],
      metaTone: `first:${escalation.badgeTone} bg-[#eff1f6] text-[#31394f]`,
      borderTone: escalation.borderTone,
      glowTone: escalation.glowTone,
      dotTone: escalation.dotTone,
      icon: escalation.icon,
    };
  });

  const topAudience = sortedConversations.slice(0, 6).map((conversation) => {
    const inboundCount = conversation.messages.filter((message) => message.from === "user").length;
    const opportunity = classifyCreatorOpportunity(conversation, escalationRules);
    const escalation = classifyCreatorEscalation(conversation, escalationRules);
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
      detail: `${formatCreatorPercent(escalatedConversationCount, Math.max(1, totalCount))}\nof chats`,
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
    const opportunity = classifyCreatorOpportunity(conversation, escalationRules);
    const escalation = classifyCreatorEscalation(conversation, escalationRules);
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
      count: formatCreatorInteger(Math.max(0, engagedConversations.length - escalatedConversationCount)),
      change: `${formatCreatorPercent(Math.max(0, engagedConversations.length - escalatedConversationCount), Math.max(1, totalCount))}`,
      tone: "bg-[#eef4ff] text-[#246bff]",
      icon: Flame,
    },
    {
      label: "Engaged Followers",
      detail: "Conversations with two or more inbound messages",
      count: formatCreatorInteger(dateRangeConversations.filter((conversation) => conversation.messages.filter((message) => message.from === "user").length >= 2).length),
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
      detail: "Refunds, complaints, damaged orders, brand deals, urgent orders, VIP leads, custom requests, or human handoffs",
      count: formatCreatorInteger(escalationRecords.length),
      change: `${formatCreatorPercent(escalatedConversationCount, Math.max(1, totalCount))}`,
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
    { id: "all", label: "All", count: formatCreatorInteger(escalations.length), tone: "text-[#3044ff] bg-[#eef0ff]", icon: Sparkles },
    { id: "refunds", label: "Refunds", count: formatCreatorInteger(escalations.filter((item) => item.category === "refund").length), tone: "text-[#df405b] bg-[#fff0f3]", icon: Shield },
    { id: "complaints", label: "Complaints", count: formatCreatorInteger(escalations.filter((item) => ["complaint", "product_issue", "issue"].includes(item.category)).length), tone: "text-[#ff850d] bg-[#fff3e6]", icon: Sparkles },
    { id: "human", label: "Human", count: formatCreatorInteger(escalations.filter((item) => ["human", "complex"].includes(item.category)).length), tone: "text-[#7a35ff] bg-[#f0edff]", icon: Users },
    { id: "brand_deals", label: "Brand Deals", count: formatCreatorInteger(escalations.filter((item) => item.category === "brand_deal").length), tone: "text-[#0a9b3f] bg-[#eafaf0]", icon: BriefcaseBusiness },
    { id: "orders", label: "Orders", count: formatCreatorInteger(escalations.filter((item) => ["custom_bulk", "urgent_order"].includes(item.category)).length), tone: "text-[#3044ff] bg-[#eef4ff]", icon: Flame },
    { id: "vip_leads", label: "VIP Leads", count: formatCreatorInteger(escalations.filter((item) => item.category === "vip_lead").length), tone: "text-[#3044ff] bg-[#eef4ff]", icon: Star },
  ];

  const firstEscalation = escalations[0];
  const escalationDetailRows: EscalationDetailRow[] = firstEscalation
    ? [
        { label: "Escalation type", value: firstEscalation.badge, icon: TriangleAlert, valueTone: firstEscalation.badgeTone },
        { label: "Conversation", value: firstEscalation.handle, icon: MessageSquare },
        { label: "Escalated", value: firstEscalation.time, icon: Clock },
        { label: "Risk level", value: firstEscalation.riskLevel, icon: TriangleAlert, valueTone: firstEscalation.riskLevel === "High" ? "bg-[#fff0f3] text-[#df405b]" : "bg-[#fff3e6] text-[#ff850d]" },
        { label: "Required action", value: "Creator takeover", icon: Users, valueTone: "bg-[#f0edff] text-[#6d3cff]" },
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
    dateRangeLabel: getAdminDateRangeLabel(dateRangePreset),
    estimatedRevenue,
    opportunityCount: opportunityRecords.length,
    escalationCount: escalationRecords.length,
    dashboardOpportunities,
    dashboardPipeline,
    recentActivity,
    opportunityTabs: [
      { label: "Qualified Leads", count: formatCreatorInteger(opportunityRecords.length), icon: Users },
      { label: "High Intent", count: formatCreatorInteger(buyerCount), icon: ShoppingCart },
      { label: "Warm Leads", count: formatCreatorInteger(warmLeadCount), icon: Flame },
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
    escalationRules,
  };
}

export function formatAnalyticsInteger(value: number) {
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

function isAnalyticsQuestionMessage(message: InstagramSettingsMessage) {
  const text = getAnalyticsMessageText(message);

  return (
    text.includes("?") ||
    /\b(what|how|when|where|why|can|could|would|do|does|is|are|price|pricing|cost|available|availability|details|size|delivery|refund|return|book|order)\b/.test(text)
  );
}

function hasAnalyticsConversionSignal(conversation: InstagramSettingsConversation) {
  const text = getCreatorConversationText(conversation);

  return /\b(booked|booking confirmed|call booked|appointment booked|payment link|checkout|paid|payment successful|order confirmed|purchase confirmed|joined|subscribed|application submitted|invoice sent|deposit paid|advance paid)\b/.test(text);
}

function hasAnalyticsSalesSignal(conversation: InstagramSettingsConversation) {
  const text = getCreatorConversationText(conversation);

  return /\b(paid|payment successful|payment link|checkout|invoice|order confirmed|purchase confirmed|deposit|advance|send payment|confirm order|place order|buy now|ready to buy)\b/.test(text);
}

export function buildAnalyticsSummary(
  conversations: InstagramSettingsConversation[],
  totalConversationCount?: number,
  rules: EscalationRuleSetting[] = defaultEscalationRuleSettings
): AnalyticsSummary {
  const now = Date.now();
  const escalationRules = normalizeEscalationRuleSettings(rules);
  const totalLoaded = conversations.length;
  const totalCount = typeof totalConversationCount === "number" ? totalConversationCount : totalLoaded;
  const allMessages = conversations.flatMap((conversation) => conversation.messages);
  const userMessages = allMessages.filter((message) => message.from === "user");
  const creatorMessages = allMessages.filter((message) => message.from === "me");
  const mediaMessages = allMessages.filter((message) => (message.attachments || []).length > 0);
  const startedConversations = conversations.filter((conversation) => conversation.messages.some((message) => message.from === "user"));
  const opportunityRecords = conversations
    .map((conversation) => ({ conversation, opportunity: classifyCreatorOpportunity(conversation, escalationRules) }))
    .filter((record): record is { conversation: InstagramSettingsConversation; opportunity: NonNullable<ReturnType<typeof classifyCreatorOpportunity>> } => Boolean(record.opportunity));
  const escalationRecords = conversations
    .map((conversation) => ({ conversation, escalation: classifyCreatorEscalation(conversation, escalationRules) }))
    .filter((record): record is { conversation: InstagramSettingsConversation; escalation: NonNullable<ReturnType<typeof classifyCreatorEscalation>> } => Boolean(record.escalation));
  const convertedFollowers = conversations.filter(hasAnalyticsConversionSignal);
  const salesRecords = opportunityRecords.filter(({ conversation, opportunity }) => opportunity.badge === "HIGH INTENT" || hasAnalyticsSalesSignal(conversation));
  const salesGenerated = salesRecords.reduce((total, record) => total + record.opportunity.value, 0);
  const responseTimes: number[] = [];
  let questionsAsked = 0;
  let questionsAnswered = 0;

  conversations.forEach((conversation) => {
    const chronologicalMessages = [...conversation.messages]
      .filter((message) => Number.isFinite(getAnalyticsMessageTime(message)))
      .sort((a, b) => getAnalyticsMessageTime(a) - getAnalyticsMessageTime(b));

    chronologicalMessages.forEach((message, index) => {
      if (message.from !== "user") {
        return;
      }

      const isQuestion = isAnalyticsQuestionMessage(message);
      const nextCreatorMessage = chronologicalMessages
        .slice(index + 1)
        .find((candidate) => candidate.from === "me" && getAnalyticsMessageTime(candidate) > getAnalyticsMessageTime(message));

      if (nextCreatorMessage) {
        responseTimes.push(getAnalyticsMessageTime(nextCreatorMessage) - getAnalyticsMessageTime(message));
      }

      if (isQuestion) {
        questionsAsked += 1;

        if (nextCreatorMessage) {
          questionsAnswered += 1;
        }
      }
    });
  });

  const averageResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((total, value) => total + value, 0) / responseTimes.length
      : 0;
  const replyCoverage = getAnalyticsReplyRate(userMessages.length, creatorMessages.length);
  const answerCoverage = questionsAsked > 0 ? (questionsAnswered / questionsAsked) * 100 : 0;
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
      label: "Lead qualification",
      value: formatAnalyticsInteger(opportunityRecords.length),
      detail: `${formatAnalyticsPercent(replyCoverage)} reply coverage`,
      tone: "bg-[#eef4ff] text-[#246bff]",
      icon: Target,
    },
    {
      label: "Conversion actions",
      value: formatAnalyticsInteger(convertedFollowers.length),
      detail: "Booking, payment, checkout, or community CTA",
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: CircleDollarSign,
    },
    {
      label: "Human escalation",
      value: formatAnalyticsInteger(escalationRecords.length),
      detail: "Refunds, complaints, partnerships, VIP, or human help",
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
      const opportunity = classifyCreatorOpportunity(conversation, escalationRules);
      const escalation = classifyCreatorEscalation(conversation, escalationRules);
      const converted = hasAnalyticsConversionSignal(conversation);

      return {
        label: getConversationLabel(conversation),
        source: "Instagram",
        conversations: `${formatAnalyticsInteger(conversation.messages.length)} msgs`,
        conversion: formatAnalyticsPercent(getAnalyticsReplyRate(inbound, outbound)),
        lastActive: formatInstagramRelativeTime(lastMessage?.time || conversation.updated_time),
        status: noMessages ? "No messages" : escalation ? "Escalated" : converted ? "Converted" : opportunity ? "Lead" : needsReply ? "Needs reply" : "Handled",
        statusTone: noMessages
          ? "bg-[#f3f4f8] text-[#596175]"
          : escalation
            ? "bg-[#fff0f3] text-[#df405b]"
            : converted
              ? "bg-[#e7f8ed] text-[#0a9b3f]"
              : opportunity
                ? "bg-[#eef4ff] text-[#3044ff]"
                : needsReply
                  ? "bg-[#fff3e6] text-[#ff850d]"
                  : "bg-[#e7f8ed] text-[#0a9b3f]",
      };
    });

  return {
    metrics: [
      {
        label: "Conversations started",
        value: formatAnalyticsInteger(startedConversations.length),
        change: `${formatAnalyticsInteger(totalLoaded)} loaded`,
        detail: "Instagram chats",
        tone: "bg-[#f0edff] text-[#4b3cff]",
        icon: MessageSquare,
      },
      {
        label: "Questions answered",
        value: formatAnalyticsInteger(questionsAnswered),
        change: `${formatAnalyticsPercent(answerCoverage)} answered`,
        detail: `${formatAnalyticsInteger(questionsAsked)} questions, ${formatAnalyticsDuration(averageResponseTime)} avg`,
        tone: "bg-[#eafaf0] text-[#13a84f]",
        icon: Bot,
      },
      {
        label: "Followers converted",
        value: formatAnalyticsInteger(convertedFollowers.length),
        change: formatAnalyticsPercent(startedConversations.length > 0 ? (convertedFollowers.length / startedConversations.length) * 100 : 0),
        detail: "booking/payment CTA",
        tone: "bg-[#eef4ff] text-[#246bff]",
        icon: Users,
      },
      {
        label: "Leads generated",
        value: formatAnalyticsInteger(opportunityRecords.length),
        change: `${formatAnalyticsInteger(activeToday)} active today`,
        detail: "qualified intent",
        tone: "bg-[#fff3e6] text-[#ff850d]",
        icon: Target,
      },
      {
        label: "Sales generated",
        value: formatCreatorMoney(salesGenerated),
        change: `${formatAnalyticsInteger(salesRecords.length)} sales signals`,
        detail: "estimated value",
        tone: "bg-[#eafaf0] text-[#0a9b3f]",
        icon: CircleDollarSign,
      },
      {
        label: "Escalations",
        value: formatAnalyticsInteger(escalationRecords.length),
        change: `${formatAnalyticsPercent(startedConversations.length > 0 ? (escalationRecords.length / startedConversations.length) * 100 : 0)} of chats`,
        detail: "need human review",
        tone: "bg-[#fff0f3] text-[#df405b]",
        icon: TriangleAlert,
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

