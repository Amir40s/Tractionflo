import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type InstagramGraphError = {
  message?: string;
};

type InstagramComment = {
  id: string;
  text?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  replies?: {
    data?: InstagramComment[];
  };
};

type InstagramCommentListResponse = {
  data?: InstagramComment[];
  error?: InstagramGraphError;
};

function normalizeComment(comment: InstagramComment) {
  return {
    id: comment.id,
    text: comment.text || "",
    timestamp: comment.timestamp || "",
    username: comment.username || "Instagram user",
    likeCount: Math.max(0, Number(comment.like_count || 0)),
    replies: (comment.replies?.data || []).map((reply) => ({
      id: reply.id,
      text: reply.text || "",
      timestamp: reply.timestamp || "",
      username: reply.username || "Business",
      likeCount: Math.max(0, Number(reply.like_count || 0)),
    })),
  };
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const mediaId = requestUrl.searchParams.get("mediaId")?.trim();

    if (!mediaId) {
      return NextResponse.json({ error: "A media id is required.", comments: [] }, { status: 400 });
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
      return NextResponse.json({ error: "Not authenticated", comments: [] }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent.", comments: [] }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const account = await getFreshInstagramAccount(supabase);

    if (!account?.access_token) {
      return NextResponse.json({ error: "No Instagram account connected", comments: [] }, { status: 400 });
    }

    const commentsUrl = new URL(`https://graph.instagram.com/v21.0/${mediaId}/comments`);
    commentsUrl.searchParams.set("fields", "id,text,timestamp,username,like_count,replies{id,text,timestamp,username,like_count}");
    commentsUrl.searchParams.set("limit", "50");
    commentsUrl.searchParams.set("access_token", account.access_token);

    const response = await fetch(commentsUrl.toString(), { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as InstagramCommentListResponse;

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || "Could not load Instagram comments.");
    }

    return NextResponse.json({
      comments: (data.data || []).map(normalizeComment),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Instagram comments";
    console.error("Instagram comments error:", error);
    return NextResponse.json({ error: message, comments: [] }, { status: 502 });
  }
}
