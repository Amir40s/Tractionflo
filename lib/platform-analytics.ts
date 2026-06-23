import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type PlatformAnalyticsEventInput = {
  supabase: SupabaseServiceClient;
  userId?: string | null;
  eventName: string;
  source?: string;
  conversationId?: string | null;
  instagramSenderId?: string | null;
  value?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
};

function isMissingTableError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("does not exist") || message.includes("schema cache") || message.includes("not found");
}

export async function recordPlatformAnalyticsEvent({
  supabase,
  userId,
  eventName,
  source = "app",
  conversationId,
  instagramSenderId,
  value,
  currency,
  metadata = {},
  occurredAt,
}: PlatformAnalyticsEventInput) {
  const { error } = await supabase.from("platform_analytics_events").insert({
    user_id: userId || null,
    event_name: eventName,
    source,
    conversation_id: conversationId || null,
    instagram_sender_id: instagramSenderId || null,
    value: value ?? null,
    currency: currency || null,
    metadata,
    occurred_at: occurredAt || new Date().toISOString(),
  });

  if (error && !isMissingTableError(error)) {
    throw error;
  }
}
