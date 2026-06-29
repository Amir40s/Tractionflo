import type { User } from "@supabase/supabase-js";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import type { createSupabaseServiceClient } from "@/lib/supabase";
import type { OpenAiUsage } from "@/lib/openai-chat";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type OpenAiModelRate = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const modelRates: Record<string, OpenAiModelRate> = {
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "gpt-4.1": { inputPerMillion: 2, outputPerMillion: 8 },
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
};

function getMetadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(6));
}

export function estimateOpenAiUsageCost(model: string, usage: OpenAiUsage) {
  const rate = modelRates[model] || modelRates["gpt-4.1-mini"];
  return (
    (usage.promptTokens / 1_000_000) * rate.inputPerMillion +
    (usage.completionTokens / 1_000_000) * rate.outputPerMillion
  );
}

export async function recordOpenAiUsage({
  supabase,
  user,
  model,
  usage,
  source,
}: {
  supabase: SupabaseServiceClient;
  user: User;
  model: string;
  usage: OpenAiUsage;
  source: string;
}) {
  if (usage.totalTokens <= 0) {
    return;
  }

  const metadata = compactUserAuthMetadata(user.user_metadata);
  const cost = estimateOpenAiUsageCost(model, usage);
  const nextReplies = getMetadataNumber(metadata, "ai_replies") + 1;
  const nextPromptTokens = getMetadataNumber(metadata, "ai_prompt_tokens") + usage.promptTokens;
  const nextCompletionTokens = getMetadataNumber(metadata, "ai_completion_tokens") + usage.completionTokens;
  const nextTokens = getMetadataNumber(metadata, "ai_tokens") + usage.totalTokens;
  const nextSpend = roundMoney(getMetadataNumber(metadata, "ai_spend") + cost);
  const now = new Date().toISOString();

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      ai_replies: nextReplies,
      openai_replies: nextReplies,
      ai_reply_count: nextReplies,
      ai_prompt_tokens: nextPromptTokens,
      ai_completion_tokens: nextCompletionTokens,
      ai_tokens: nextTokens,
      openai_tokens: nextTokens,
      token_usage: nextTokens,
      ai_spend: nextSpend,
      openai_spend: nextSpend,
      ai_cost: nextSpend,
      openai_cost: nextSpend,
      ai_usage_last_at: now,
      ai_usage_last_model: model,
      ai_usage_last_source: source,
    },
  });

  if (error) {
    throw error;
  }
}
