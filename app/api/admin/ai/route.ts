import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getEnabledWorkflowMap } from "@/lib/ai-integration";
import { getUserPermissionProfile } from "@/lib/agent-permissions";
import { resolvePlatformAiConfig } from "@/lib/platform-ai-config";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type AiAdminTone = "green" | "amber" | "red";

type StoredMessageRow = {
  text?: string | null;
  timestamp?: number | string | null;
};

const opportunityKeywords = ["price", "pricing", "buy", "book", "call", "interested", "checkout", "package", "program"];
const handoffKeywords = ["refund", "cancel", "angry", "human", "agent", "support", "issue", "problem", "complaint"];
const urgentKeywords = ["urgent", "asap", "angry", "refund", "fraud", "cancel"];
const humanKeywords = ["human", "agent", "person", "support"];

function getMetadata(user: User) {
  return (user.user_metadata || {}) as Record<string, unknown>;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function getMetadataNumber(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.replace(/[$,\s]/g, ""));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function isSuperAdminUser(user: User) {
  const metadata = getMetadata(user);
  const role = getMetadataString(metadata, "role").toLowerCase();
  const accountRole = getMetadataString(metadata, "account_role").toLowerCase();

  return (
    metadata.is_superadmin === true ||
    role === "superadmin" ||
    role === "super admin" ||
    accountRole === "superadmin" ||
    user.email?.toLowerCase() === "tractionflo@gmail.com"
  );
}

function isCreatorUser(user: User) {
  const metadata = getMetadata(user);
  const permissions = getUserPermissionProfile(metadata);
  return !permissions.isAgent && !isSuperAdminUser(user);
}

async function listAllUsers(supabase: SupabaseClient) {
  const users: User[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    users.push(...(data.users || []));

    if (!data.users || data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function includesAnyKeyword(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function getMessageTimestamp(value: StoredMessageRow["timestamp"]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    const dateValue = new Date(value).getTime();
    return Number.isFinite(dateValue) ? dateValue : 0;
  }

  return 0;
}

function getEstimatedTokens(messages: StoredMessageRow[]) {
  return messages.reduce((sum, message) => {
    const text = message.text || "";
    return sum + Math.max(0, Math.ceil(text.length / 4));
  }, 0);
}

function getBucketStatus(count: number, configuredCreators: number) {
  if (configuredCreators <= 0) {
    return { status: "Setup needed", tone: "amber" as const, health: "Missing key" };
  }

  if (count > 0) {
    return { status: "Live", tone: "green" as const, health: "Active" };
  }

  return { status: "Ready", tone: "amber" as const, health: "No signals" };
}

async function getStoredMessages(supabase: SupabaseClient) {
  const { data, error, count } = await supabase
    .from("messages")
    .select("text,timestamp", { count: "exact" })
    .order("timestamp", { ascending: false })
    .limit(1000);

  if (error) {
    return {
      messages: [] as StoredMessageRow[],
      totalCount: 0,
      tableAvailable: false,
      error: error.message,
    };
  }

  return {
    messages: (data || []) as StoredMessageRow[],
    totalCount: count || 0,
    tableAvailable: true,
    error: "",
  };
}

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSuperAdminUser(user)) {
      return NextResponse.json({ error: "Only superadmins can view AI admin data." }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const [users, storedMessageResult, platformConfig] = await Promise.all([
      listAllUsers(supabase),
      getStoredMessages(supabase),
      resolvePlatformAiConfig(supabase),
    ]);
    const creators = users.filter(isCreatorUser);
    const platformKeyConfigured = Boolean(platformConfig.apiKey);
    const configuredCreators = platformKeyConfigured ? creators.length : 0;
    const autoSendCreators = platformKeyConfigured && platformConfig.integration.autoSend ? creators.length : 0;
    const enabledMap = getEnabledWorkflowMap(platformConfig.integration.workflows);
    const workflowCounts = (Object.keys(enabledMap) as (keyof typeof enabledMap)[]).reduce(
      (counts, key) => ({
        ...counts,
        [key]: enabledMap[key] && platformKeyConfigured ? creators.length : 0,
      }),
      { startConversation: 0, answerQuestions: 0, qualifyLeads: 0, moveToCta: 0 }
    );
    const messages = storedMessageResult.messages;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const messagesToday = messages.filter((message) => getMessageTimestamp(message.timestamp) >= startOfDay.getTime()).length;
    const opportunityMessages = messages.filter((message) => includesAnyKeyword(message.text || "", opportunityKeywords));
    const handoffMessages = messages.filter((message) => includesAnyKeyword(message.text || "", handoffKeywords));
    const urgentMessages = messages.filter((message) => includesAnyKeyword(message.text || "", urgentKeywords));
    const humanRequestedMessages = messages.filter((message) => includesAnyKeyword(message.text || "", humanKeywords));
    const aiReadyMessages = Math.max(0, storedMessageResult.totalCount - handoffMessages.length);
    const estimatedTokens = getEstimatedTokens(messages);
    const trackedReplies = creators.reduce((sum, creator) => sum + getMetadataNumber(getMetadata(creator), ["ai_replies", "openai_replies", "ai_reply_count"]), 0);
    const trackedSpend = creators.reduce((sum, creator) => sum + getMetadataNumber(getMetadata(creator), ["ai_spend", "openai_spend", "ai_cost", "openai_cost"]), 0);
    const trackedTokens = creators.reduce((sum, creator) => sum + getMetadataNumber(getMetadata(creator), ["ai_tokens", "openai_tokens", "token_usage"]), 0);
    const trackedEscalations = creators.reduce((sum, creator) => sum + getMetadataNumber(getMetadata(creator), ["ai_escalations", "handoffs", "escalations"]), 0);
    const monthlyRevenue = creators.reduce((sum, creator) => sum + getMetadataNumber(getMetadata(creator), ["mrr", "monthly_revenue", "revenue"]), 0);
    const grossMargin = monthlyRevenue > 0 ? Math.max(0, ((monthlyRevenue - trackedSpend) / monthlyRevenue) * 100) : 0;
    const replyStatus = getBucketStatus(trackedReplies || aiReadyMessages, configuredCreators);
    const opportunityStatus = getBucketStatus(opportunityMessages.length, configuredCreators);
    const supportStatus = getBucketStatus(handoffMessages.length, configuredCreators);
    const workflowTestStatus = getBucketStatus(workflowCounts.startConversation + workflowCounts.answerQuestions + workflowCounts.qualifyLeads + workflowCounts.moveToCta, configuredCreators);
    const refundSignals = messages.filter((message) => includesAnyKeyword(message.text || "", ["refund", "cancel", "billing", "charge"]));
    const sentimentSignals = messages.filter((message) => includesAnyKeyword(message.text || "", ["angry", "upset", "bad", "complaint", "issue", "problem"]));

    return NextResponse.json({
      metrics: {
        creators: creators.length,
        configuredCreators,
        autoSendCreators,
        platformKeyConfigured,
        platformAiSource: platformConfig.source,
        totalMessages: storedMessageResult.totalCount,
        messagesToday,
        aiReadyMessages,
        opportunitySignals: opportunityMessages.length,
        handoffSignals: handoffMessages.length + trackedEscalations,
        urgentSignals: urgentMessages.length,
        humanRequestedSignals: humanRequestedMessages.length,
        trackedReplies,
        trackedSpend,
        trackedTokens,
        estimatedTokens,
        grossMargin,
        replyLogsStored: trackedReplies > 0,
        spendLogsStored: trackedSpend > 0 || trackedTokens > 0,
        messagesTableAvailable: storedMessageResult.tableAvailable,
        messagesTableError: storedMessageResult.error,
        workflows: workflowCounts,
      },
      usage: [
        {
          name: "AI reply readiness",
          detail: "Messages without handoff keywords",
          messages: aiReadyMessages,
          replies: trackedReplies,
          opportunities: opportunityMessages.length,
          escalations: trackedEscalations,
          health: replyStatus.health,
          status: replyStatus.status,
          tone: replyStatus.tone,
        },
        {
          name: "Lead qualification",
          detail: "Pricing, booking, buying, and CTA intent",
          messages: opportunityMessages.length,
          replies: trackedReplies,
          opportunities: opportunityMessages.length,
          escalations: 0,
          health: opportunityStatus.health,
          status: opportunityStatus.status,
          tone: opportunityStatus.tone,
        },
        {
          name: "Support intent",
          detail: "Refund, issue, support, and human keywords",
          messages: handoffMessages.length,
          replies: 0,
          opportunities: 0,
          escalations: handoffMessages.length + trackedEscalations,
          health: supportStatus.health,
          status: supportStatus.status,
          tone: supportStatus.tone,
        },
      ],
      costs: [
        {
          name: "Tracked OpenAI usage",
          detail: "Persisted spend and token metadata",
          spend: trackedSpend,
          tokens: trackedTokens,
          replies: trackedReplies,
          costPerReply: trackedReplies > 0 ? trackedSpend / trackedReplies : 0,
          trend: trackedSpend > 0 ? "Tracked" : "Not tracked",
          status: trackedSpend > 0 || trackedTokens > 0 ? "Tracked" : "No logs",
          tone: trackedSpend > 0 || trackedTokens > 0 ? "green" as AiAdminTone : "amber" as AiAdminTone,
        },
        {
          name: "Estimated message volume",
          detail: "Token estimate from stored webhook text",
          spend: 0,
          tokens: estimatedTokens,
          replies: aiReadyMessages,
          costPerReply: 0,
          trend: "Estimated",
          status: "Estimate",
          tone: "amber" as AiAdminTone,
        },
        {
          name: "Workflow coverage",
          detail: "Enabled AI workflows across creators",
          spend: 0,
          tokens: 0,
          replies:
            workflowCounts.startConversation +
            workflowCounts.answerQuestions +
            workflowCounts.qualifyLeads +
            workflowCounts.moveToCta,
          costPerReply: 0,
          trend: platformKeyConfigured ? `${configuredCreators} covered` : "Missing platform key",
          status: workflowTestStatus.status,
          tone: workflowTestStatus.tone,
        },
      ],
      escalations: [
        {
          name: "Refund request",
          detail: "Billing or cancellation language",
          reason: "Refund",
          count: refundSignals.length,
          avgTime: "Not tracked",
          owner: "Support",
          trend: "Live keywords",
          status: refundSignals.length > 0 ? "Review" : "Clear",
          tone: refundSignals.length > 0 ? "amber" as AiAdminTone : "green" as AiAdminTone,
        },
        {
          name: "Angry sentiment",
          detail: "Urgent support tone",
          reason: "Sentiment",
          count: sentimentSignals.length,
          avgTime: "Not tracked",
          owner: "Support",
          trend: "Live keywords",
          status: sentimentSignals.length > 0 ? "Watch" : "Clear",
          tone: sentimentSignals.length > 0 ? "amber" as AiAdminTone : "green" as AiAdminTone,
        },
        {
          name: "Human requested",
          detail: "Customer asks for a person or agent",
          reason: "Human",
          count: humanRequestedMessages.length + trackedEscalations,
          avgTime: "Not tracked",
          owner: "Agents",
          trend: "Live keywords",
          status: humanRequestedMessages.length + trackedEscalations > 0 ? "Open" : "Clear",
          tone: humanRequestedMessages.length + trackedEscalations > 0 ? "red" as AiAdminTone : "green" as AiAdminTone,
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load AI admin data";
    console.error("Admin AI data error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
