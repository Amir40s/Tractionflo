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

function normalizeMessageText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
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

async function hasNearbyStoredDuplicate({
  supabase,
  userId,
  conversationId,
  senderId,
  recipientId,
  direction,
  text,
  timestamp,
}: {
  supabase: SupabaseServiceClient;
  userId: string | null;
  conversationId: string | null;
  senderId: string | null;
  recipientId: string | null;
  direction: StoredInstagramMessageInput["direction"];
  text: string;
  timestamp: number;
}) {
  const normalizedText = normalizeMessageText(text);

  if (!userId || !conversationId || !senderId || !recipientId || !normalizedText) {
    return false;
  }

  const { data, error } = await supabase
    .from("messages")
    .select("text,timestamp")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .eq("sender_id", senderId)
    .eq("recipient_id", recipientId)
    .eq("direction", direction)
    .gte("timestamp", timestamp - 120_000)
    .lte("timestamp", timestamp + 120_000)
    .limit(20);

  if (error) {
    if (!isSchemaMismatch(error)) {
      console.warn("Stored Instagram message duplicate check failed:", error);
    }

    return false;
  }

  return (data || []).some((row) => normalizeMessageText(String(row.text || "")) === normalizedText);
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
  const normalizedMid = typeof mid === "string" ? mid.trim() : mid || null;
  const normalizedTimestamp = getTimestamp(timestamp);
  const payload = {
    mid: normalizedMid || null,
    user_id: userId || null,
    conversation_id: conversationId || senderId || null,
    sender_id: senderId || null,
    recipient_id: recipientId || null,
    direction,
    text: text || "",
    timestamp: normalizedTimestamp,
    raw_event: rawEvent,
    metadata,
  };

  if (!payload.mid) {
    const duplicateExists = await hasNearbyStoredDuplicate({
      supabase,
      userId: payload.user_id,
      conversationId: payload.conversation_id,
      senderId: payload.sender_id,
      recipientId: payload.recipient_id,
      direction,
      text: payload.text,
      timestamp: payload.timestamp,
    });

    if (duplicateExists) {
      return;
    }
  }

  const { error } = await supabase.from("messages").insert(payload);

  if (!error || ("code" in error && error.code === "23505")) {
    return;
  }

  if (!isSchemaMismatch(error)) {
    throw error;
  }

  const fallbackPayload = {
    mid: normalizedMid || null,
    sender_id: senderId || recipientId || null,
    text: text || "",
    timestamp: normalizedTimestamp,
  };
  const { error: fallbackError } = await supabase.from("messages").insert(fallbackPayload);

  if (fallbackError && (!("code" in fallbackError) || fallbackError.code !== "23505")) {
    throw fallbackError;
  }
}
