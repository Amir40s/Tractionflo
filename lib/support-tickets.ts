import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type SupportTicketInput = {
  supabase: SupabaseServiceClient;
  userId?: string | null;
  creatorEmail?: string | null;
  creatorName?: string | null;
  title: string;
  summary?: string | null;
  topic?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent" | string;
  status?: "Open" | "In progress" | "Waiting" | "Resolved" | "Closed" | "Dismissed";
  assignee?: string;
  source?: string;
  sourceEventId?: string | null;
  conversationId?: string | null;
  instagramSenderId?: string | null;
  metadata?: Record<string, unknown>;
};

function isMissingTableError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("does not exist") || message.includes("schema cache") || message.includes("not found");
}

function normalizePriority(value = "Medium") {
  const normalized = value.toLowerCase();

  if (normalized.includes("urgent")) return "High";
  if (normalized.includes("high")) return "High";
  if (normalized.includes("low")) return "Low";
  return "Medium";
}

export async function createSupportTicket({
  supabase,
  userId,
  creatorEmail,
  creatorName,
  title,
  summary,
  topic = "Support",
  priority = "Medium",
  status = "Open",
  assignee = "Support",
  source = "system",
  sourceEventId,
  conversationId,
  instagramSenderId,
  metadata = {},
}: SupportTicketInput) {
  const payload = {
    user_id: userId || null,
    creator_email: creatorEmail || null,
    creator_name: creatorName || null,
    title: title.trim().slice(0, 220),
    summary: summary?.trim().slice(0, 1000) || null,
    topic,
    priority: normalizePriority(priority),
    status,
    assignee,
    source,
    source_event_id: sourceEventId || null,
    conversation_id: conversationId || null,
    instagram_sender_id: instagramSenderId || null,
    metadata,
  };

  if (sourceEventId) {
    const { data: existing, error: lookupError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("source_event_id", sourceEventId)
      .eq("user_id", userId || "")
      .limit(1);

    if (lookupError && !isMissingTableError(lookupError)) {
      throw lookupError;
    }

    if (existing?.[0]?.id) {
      const { error: updateError } = await supabase
        .from("support_tickets")
        .update(payload)
        .eq("id", existing[0].id);

      if (updateError && !isMissingTableError(updateError)) {
        throw updateError;
      }

      return { ticketId: existing[0].id };
    }
  }

  const { data, error } = await supabase.from("support_tickets").insert(payload).select("id").single();

  if (error) {
    if (isMissingTableError(error)) {
      return { ticketId: null };
    }

    throw error;
  }

  return { ticketId: data?.id || null };
}
