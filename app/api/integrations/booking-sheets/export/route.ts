import { NextResponse } from "next/server";
import { buildBookingMemory, type ConversationContextMessage } from "@/lib/conversation-context";
import { findBookingRoute, type BookingIntegrationConfig, writeBookingRows } from "@/lib/booking-sheet-export";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingExportPayload = {
  integrations?: BookingIntegrationConfig;
  conversation?: {
    id?: unknown;
    participantName?: unknown;
    username?: unknown;
  };
  messages?: ConversationContextMessage[];
  replyText?: unknown;
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isBookingConfirmationReply(text: string) {
  return /\b(booking request is noted|booking confirmed|final booking confirmation|confirm availability|booking has been confirmed|confirmed your booking)\b/i.test(text);
}

function inferBookingType(messages: ConversationContextMessage[], replyText: string) {
  const combinedText = `${messages.map((message) => message.text || "").join(" ")} ${replyText}`.toLowerCase();

  if (/\bpadel\b/.test(combinedText)) {
    return "Padel ground booking";
  }

  return "Cricket ground booking";
}

function formatAddOns(memory: ReturnType<typeof buildBookingMemory>) {
  const entries = Object.entries(memory.addOns);

  if (entries.length === 0) {
    return "";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as BookingExportPayload;
    const replyText = getString(payload.replyText);
    const messages = Array.isArray(payload.messages) ? payload.messages : [];

    if (!isBookingConfirmationReply(replyText)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Reply is not a booking confirmation." });
    }

    const memory = buildBookingMemory(messages);

    if (!memory.date || !memory.time || !memory.players || !memory.phone) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Booking is not complete enough for sheet export.",
      });
    }

    const bookingType = inferBookingType(messages, replyText);
    const route = findBookingRoute(payload.integrations, bookingType);

    if (!route) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "No active booking sheet route matched this booking.",
      });
    }

    const participantName = getString(payload.conversation?.participantName) || getString(payload.conversation?.username) || "Instagram customer";
    const addOns = formatAddOns(memory);
    const groundOrCourt = [memory.groundType, memory.matchType, memory.players, addOns].filter(Boolean).join(" · ");
    const result = await writeBookingRows(
      route,
      [
        {
          customer: participantName,
          phone: memory.phone,
          bookingType,
          date: memory.date,
          time: memory.time,
          groundOrCourt: groundOrCourt || bookingType,
          paymentStatus: "Confirmed request",
          confirmedAt: new Date().toISOString(),
          sourceConversation: getString(payload.conversation?.id) || "Instagram conversation",
        },
      ],
      { includeHeaders: true },
    );

    return NextResponse.json({
      ok: true,
      exported: true,
      routeName: route.name || "Booking sheet route",
      worksheetName: route.worksheetName || "Confirmed Bookings",
      lastSync: result.lastSync,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export the confirmed booking.";

    console.error("Booking sheet export error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
