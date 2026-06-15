import { NextResponse } from "next/server";
import { canAuthorizePusherChannel, getPusherServer } from "@/lib/pusher";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

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

    const pusher = getPusherServer();

    if (!pusher) {
      return NextResponse.json({ error: "Pusher is not configured" }, { status: 503 });
    }

    const formData = await request.formData();
    const socketId = String(formData.get("socket_id") || "");
    const channelName = String(formData.get("channel_name") || "");

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing Pusher auth payload" }, { status: 400 });
    }

    if (!canAuthorizePusherChannel(user, channelName)) {
      return NextResponse.json({ error: "Channel not allowed" }, { status: 403 });
    }

    return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not authorize Pusher channel";
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
