import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getFreshInstagramAccount } from "@/lib/instagram-token";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as {
      conversationId: string;
      text: string;
    };

    const { conversationId, text } = body;

    if (!conversationId || !text) {
      return NextResponse.json({ error: "Missing conversationId or text" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    // Get the stored Instagram account for this user
    const account = await getFreshInstagramAccount(supabase, user.id);
    const ownIgUserId = account?.ig_user_id || "me";

    // Insert the internal note message into the messages table
    const { data, error } = await (supabase as any)
      .from("messages")
      .insert({
        mid: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        user_id: user.id,
        conversation_id: conversationId,
        sender_id: ownIgUserId,
        recipient_id: conversationId,
        direction: "note",
        text: text,
        timestamp: Date.now(),
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error("Notes db insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, note: data });
  } catch (error) {
    console.error("Notes save handler error:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
