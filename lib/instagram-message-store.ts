import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type StoredInstagramMessageInput = {
  supabase: SupabaseServiceClient;
  mid?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  senderId?: string | null;
  recipientId?: string | null;
  direction?: "inbound" | "outbound" | "note" | "system";
  text?: string | null;
  timestamp?: number | string | null;
  rawEvent?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

function getTimestamp(value: StoredInstagramMessageInput["timestamp"]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return Math.round(numeric);
    }
  }

  return Date.now();
}

function isSchemaMismatch(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("not found") ||
    message.includes("column")
  );
}

export async function storeInstagramMessage({
  supabase,
  mid,
  userId,
  conversationId,
  senderId,
  recipientId,
  direction = "inbound",
  text,
  timestamp,
  rawEvent = {},
  metadata = {},
}: StoredInstagramMessageInput) {
  const payload = {
    mid: mid || null,
    user_id: userId || null,
    conversation_id: conversationId || senderId || null,
    sender_id: senderId || null,
    recipient_id: recipientId || null,
    direction,
    text: text || "",
    timestamp: getTimestamp(timestamp),
    raw_event: rawEvent,
    metadata,
  };
  const { error } = await supabase.from("messages").insert(payload);

  if (!error || ("code" in error && error.code === "23505")) {
    return;
  }

  if (!isSchemaMismatch(error)) {
    throw error;
  }

  const fallbackPayload = {
    mid: mid || null,
    sender_id: senderId || recipientId || null,
    text: text || "",
    timestamp: getTimestamp(timestamp),
  };
  const { error: fallbackError } = await supabase.from("messages").insert(fallbackPayload);

  if (fallbackError && (!("code" in fallbackError) || fallbackError.code !== "23505")) {
    throw fallbackError;
  }
}
