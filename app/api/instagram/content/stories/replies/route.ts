import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type InstagramParticipantProfile = {
  id?: string;
  username?: string;
  name?: string;
  profile_pic?: string;
};

async function getParticipantProfile(participantId: string, accessToken: string): Promise<InstagramParticipantProfile> {
  try {
    const profileUrl = new URL(`https://graph.instagram.com/v21.0/${participantId}`);
    profileUrl.searchParams.set("fields", "id,username,name,profile_pic");
    profileUrl.searchParams.set("access_token", accessToken);

    const response = await fetch(profileUrl.toString(), { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || "Could not load Instagram profile");
    }

    return data;
  } catch (err) {
    console.error("Instagram replies participant profile error:", err);
    return { id: participantId };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");

    if (!storyId) {
      return NextResponse.json({ error: "Missing storyId query parameter" }, { status: 400 });
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
      return NextResponse.json({ error: "Not authenticated", replies: [] }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent.", replies: [] }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!storedAccount?.access_token) {
      return NextResponse.json({
        replies: [],
        error: "No Instagram account connected",
      });
    }

     const { data: dbMessages, error: dbError } = await supabase
      .from("messages")
      .select("*")
      .like("text", "%__STORY_REPLY__%");

    if (dbError) {
      console.error("Failed to query story replies from database:", dbError);
      return NextResponse.json({ error: "Database query failed", replies: [] }, { status: 500 });
    }

    const matchingRepliesRaw = [];
    const uniqueSenderIds = new Set<string>();

    if (dbMessages) {
      for (const msg of dbMessages as any[]) {
        const text = msg.text || "";
        if (text.startsWith("__STORY_REPLY__:") && text.includes("__TEXT__:")) {
          try {
            const parts = text.split("__TEXT__:", 2);
            if (parts.length === 2) {
              const storyStr = parts[0].substring("__STORY_REPLY__:".length);
              const story = JSON.parse(storyStr);
              if (story.id === storyId) {
                matchingRepliesRaw.push({
                  id: msg.mid || msg.id,
                  text: parts[1],
                  senderId: msg.sender_id,
                  timestamp: msg.timestamp || msg.created_at,
                });
                if (msg.sender_id) {
                  uniqueSenderIds.add(msg.sender_id);
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse serialized story reply:", e);
          }
        }
      }
    }

    // Resolve profiles for unique senders
    const profileMap: Record<string, InstagramParticipantProfile> = {};
    await Promise.all(
      Array.from(uniqueSenderIds).map(async (senderId) => {
        const profile = await getParticipantProfile(senderId, storedAccount.access_token);
        if (profile) {
          profileMap[senderId] = profile;
        }
      })
    );

    const replies = matchingRepliesRaw.map((reply) => {
      const profile = profileMap[reply.senderId] || {};
      return {
        id: reply.id,
        text: reply.text,
        username: profile.username || `User_${reply.senderId.slice(-6)}`,
        name: profile.name || "Instagram User",
        profilePic: profile.profile_pic || "",
        timestamp: reply.timestamp,
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ replies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load story replies";
    console.error("Story replies fetch error:", error);
    return NextResponse.json({ error: message, replies: [] }, { status: 500 });
  }
}
