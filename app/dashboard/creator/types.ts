import type { LucideIcon } from "lucide-react";
import type { PagePermissionId } from "@/lib/agent-permissions";
import type { EscalationRuleSetting } from "@/lib/conversation-escalation";
import type { KnowledgeQaPair, KnowledgeSourceChunk, KnowledgeSourceSummary } from "@/lib/knowledge-base";

export type DashboardTab =
  | "dashboard"
  | "inbox"
  | "instagram-content"
  | "opportunities"
  | "ros"
  | "audience"
  | "knowledge"
  | "escalations"
  | "analytics"
  | "settings";

export type ConnectedInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  connectedAt?: string;
};

export type AccountProfile = {
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

export type AccountProfileResponse = {
  profile?: AccountProfile;
  pendingEmail?: string;
  error?: string;
};

export type InstagramSettingsMessage = {
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

export type InstagramSettingsConversation = {
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

export type InstagramConversationsResponse = {
  conversations?: InstagramSettingsConversation[];
  conversation_count?: number;
  ig_user_id?: string;
  account?: ConnectedInstagramAccount | null;
  error?: string;
};

export type NavigationCounts = Partial<Record<DashboardTab, number | null>>;

export type NavItem = {
  label: string;
  count?: string;
  icon: LucideIcon;
  tab?: DashboardTab;
};

export type Opportunity = {
  id?: string;
  conversationId?: string;
  title: string;
  eyebrow: string;
  body: string[];
  value?: string;
  action: string;
  tone: "purple" | "blue" | "orange" | "red";
  icon: LucideIcon;
};

export type PipelineStep = {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
};

export type OpportunityPageCard = {
  id: string;
  conversationId: string;
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
  classification?: "Cold" | "Warm" | "Hot";
  urgency?: "High" | "Medium" | "Low";
  intent?: string;
  interestLevel?: string;
  qualificationFacts?: { label: string; value: string }[];
  signals?: string[];
  missing?: string[];
  recommendedAction?: string;
};

export type AudienceMetric = {
  label: string;
  value: string;
  change: string;
  tone: "purple" | "green" | "blue" | "violet" | "orange";
  icon: LucideIcon;
};

export type AudienceSource = {
  label: string;
  percent: string;
  count: string;
  color: string;
};

export type AudienceProfile = {
  name: string;
  handle: string;
  avatarUrl: string;
  engagement: string;
  active: string;
  tag: string;
  tagTone: string;
};

export type AudienceSegment = {
  label: string;
  detail: string;
  count: string;
  change: string;
  tone: string;
  icon: LucideIcon;
  negative?: boolean;
};

export type LeadCategoryFilter = "all" | "hot" | "warm" | "cold" | "partner" | "community";
export type LeadUrgencyFilter = "all" | "High" | "Medium" | "Low";
export type AudienceSegmentFilter = "all" | "high-intent" | "engaged" | "needs-attention" | "contacts";

export type RecentActivityItem = {
  title: string;
  subtitle: string;
  time: string;
  icon: LucideIcon;
  tone: string;
  meta?: string;
};

export type CommerceOrderStatus = "pending_confirmation" | "confirmed" | "paid" | "cancelled";
export type CommercePaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed";

export type CommerceOrder = {
  id: string;
  userId: string;
  conversationId: string;
  instagramSenderId: string;
  instagramUsername: string;
  productId: string;
  sourceMediaId: string;
  productTitle: string;
  productDescription: string;
  productImageUrl: string;
  productPermalink: string;
  priceText: string;
  amount: number | null;
  currency: string;
  status: CommerceOrderStatus;
  paymentStatus: CommercePaymentStatus;
  paymentMethod: string;
  confirmationText: string;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string;
  paidAt: string;
};

export type CommerceOrdersResponse = {
  orders?: CommerceOrder[];
  tableReady?: boolean;
  error?: string;
};

export type KnowledgeTabLabel =
  | "All Sources"
  | "FAQs"
  | "Products"
  | "Services"
  | "Pricing"
  | "Business Info"
  | "PDFs";

export type KnowledgeTab = {
  label: KnowledgeTabLabel;
  count: string;
  icon: LucideIcon;
};

export type KnowledgeSource = {
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

export type KnowledgeInsight = {
  title: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
};

export type KnowledgeUpdate = {
  title: string;
  detail: string;
  time: string;
  tone: string;
  icon: LucideIcon;
};

export type KnowledgeSourcesResponse = {
  assistantId?: string;
  assistant_id?: string;
  source?: KnowledgeSourceSummary;
  sources?: KnowledgeSourceSummary[];
  error?: string;
};

export type KnowledgeSourceDetail = KnowledgeSourceSummary & {
  chunks: KnowledgeSourceChunk[];
  qaPairs: KnowledgeQaPair[];
};

export type KnowledgeSourceDetailResponse = {
  source?: KnowledgeSourceSummary;
  detail?: KnowledgeSourceDetail;
  error?: string;
};

export type KnowledgeViewTab =
  | "overview"
  | "section:FAQs"
  | "section:Products"
  | "section:Services"
  | "section:Pricing"
  | "section:Business Information"
  | "text"
  | "details";

export type ManualFaqPair = {
  id: string;
  question: string;
  answer: string;
};

export type ManualKnowledgeDraft = {
  title: string;
  category: string;
  content: string;
  faqPairs: ManualFaqPair[];
  categoryContent: Record<string, string>;
  categoryFaqPairs: Record<string, ManualFaqPair[]>;
};

export type ManualKnowledgeSectionPayload = {
  category: string;
  content: string;
  title: string;
};

export type KnowledgeAssignmentValue = KnowledgeSourceSummary["assignment"];

export type EscalationTab = {
  id: string;
  label: string;
  count: string;
  tone: string;
  icon: LucideIcon;
};

export type EscalationItem = {
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

export type EscalationDetailRow = {
  label: string;
  value: string;
  icon: LucideIcon;
  valueTone?: string;
};

export type CreatorLiveSummary = {
  instagramAccount: ConnectedInstagramAccount | null;
  hasInstagramConnection: boolean;
  conversations: InstagramSettingsConversation[];
  totalConversationCount: number;
  totalMessageCount: number;
  inboundMessageCount: number;
  outboundMessageCount: number;
  dateRangeLabel: string;
  estimatedRevenue: number;
  estimatedPipelineRevenue: number;
  confirmedRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  revenueMode: "estimated" | "confirmed" | "paid";
  orders: CommerceOrder[];
  orderCount: number;
  pendingOrderCount: number;
  confirmedOrderCount: number;
  paidOrderCount: number;
  commerceTableReady: boolean;
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
