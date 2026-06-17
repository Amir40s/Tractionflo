import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type InstagramGraphError = {
  message?: string;
  code?: number;
  error_subcode?: number;
};

type InstagramReplyResponse = {
  id?: string;
  error?: InstagramGraphError;
};

function trimText(value: unknown, maxLength = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { commentId?: string; message?: string };
    const commentId = trimText(payload.commentId, 160);
    const message = trimText(payload.message, 800);

    if (!commentId) {
      return NextResponse.json({ error: "A comment id is required." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Write a reply before posting." }, { status: 400 });
    }

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

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent." }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const account = await getFreshInstagramAccount(supabase);

    if (!account?.access_token) {
      return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    }

    const replyUrl = new URL(`https://graph.instagram.com/v21.0/${commentId}/replies`);
    replyUrl.searchParams.set("access_token", account.access_token);

    const body = new URLSearchParams();
    body.set("message", message);

    const response = await fetch(replyUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await response.json().catch(() => ({}))) as InstagramReplyResponse;

    if (!response.ok || data.error) {
      return NextResponse.json(
        {
          error: data.error?.message || "Instagram could not post this comment reply.",
          graphCode: data.error?.code,
          graphSubcode: data.error?.error_subcode,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
      type: "instagram",
      title: "Instagram comment replied",
      body: message.slice(0, 120),
      url: "/instagram-content",
      metadata: {
        commentId,
        replyId: data.id || "",
      },
    }).catch((notificationError) => {
      console.error("Realtime Instagram comment reply notification error:", notificationError);
    });

    return NextResponse.json({ ok: true, replyId: data.id || "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not post Instagram comment reply";
    console.error("Instagram comment reply error:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
