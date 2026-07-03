import type { LucideIcon } from "lucide-react";
import type { PagePermissionId } from "@/lib/agent-permissions";
import type { SuperAdminTableRow } from "../admin/shared";

export type SuperAdminPage =
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
  | "ai-integration"
  | "ai-usage"
  | "ai-costs"
  | "ai-escalations"
  | "support-tickets"
  | "support-issues"
  | "profile"
  | "settings";

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

export type Opportunity = {
  id?: string;
  conversationId?: string;
  title: string;
  eyebrow: string;
  body: string[];
  value?: string;
  action: string;
  tone: "blue" | "orange" | "red";
  icon: LucideIcon;
};

export type PipelineStep = {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
};

export type RecentActivityItem = {
  title: string;
  subtitle: string;
  time: string;
  icon: LucideIcon;
  tone: string;
  meta?: string;
};

export type SuperAdminConnectedAccountApiRow = {
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

export type SuperAdminConnectedAccountsResponse = {
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
      tone: "green" | "amber" | "red";
    }[];
  };
  rows?: SuperAdminConnectedAccountApiRow[];
  health?: {
    reconnectRequired: number;
    automationReady: number;
  };
  error?: string;
};

export type SuperAdminPlatformResponse = {
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

export type SuperAdminAiTone = SuperAdminTableRow["statusTone"];

export type SuperAdminAiUsageRow = {
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

export type SuperAdminAiCostRow = {
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

export type SuperAdminAiEscalationRow = {
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

export type SuperAdminAiResponse = {
  metrics?: {
    creators: number;
    configuredCreators: number;
    autoSendCreators: number;
    platformKeyConfigured: boolean;
    platformAiSource: string;
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

export type SuperAdminSupportTone = SuperAdminTableRow["statusTone"];

export type SuperAdminSupportTicketRow = {
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

export type SuperAdminSupportIssueRow = {
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

export type SuperAdminSupportResponse = {
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


export type RevenueAdminPage = "revenue-subscriptions" | "revenue-payments" | "revenue-refunds";
export type PlatformAdminPage = "platform-instagram" | "platform-api" | "platform-queue";
export type AiAdminPage = "ai-usage" | "ai-costs" | "ai-escalations";
export type SupportAdminPage = "support-tickets" | "support-issues";
