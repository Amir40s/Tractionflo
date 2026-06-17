import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type InstagramGraphError = {
  message?: string;
};

type InstagramParticipant = {
  id?: string;
  name?: string;
  username?: string;
  profile_pic?: string;
};

type InstagramConversation = {
  participants?: {
    data?: InstagramParticipant[];
  };
};

type InstagramConversationsResponse = {
  data?: InstagramConversation[];
  error?: InstagramGraphError;
};

type InstagramProfileResponse = {
  id?: string;
  username?: string;
  error?: InstagramGraphError;
};

async function fetchInstagramGraph<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>
) {
  const url = new URL(`https://graph.instagram.com/v21.0/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as T & { error?: InstagramGraphError };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Instagram could not load audience data.");
  }

  return data;
}

async function fetchParticipantProfile(participant: InstagramParticipant, accessToken: string) {
  if (!participant.id || participant.id === "unknown") {
    return participant;
  }

  try {
    return await fetchInstagramGraph<InstagramParticipant>(participant.id, accessToken, {
      fields: "id,username,name,profile_pic",
    });
  } catch {
    return participant;
  }
}

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated", people: [] }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent.", people: [] }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!storedAccount?.access_token) {
      return NextResponse.json({ people: [], error: "No Instagram account connected" }, { status: 200 });
    }

    const accessToken = storedAccount.access_token;
    const profile = await fetchInstagramGraph<InstagramProfileResponse>("me", accessToken, {
      fields: "id,username",
    });
    const conversations = await fetchInstagramGraph<InstagramConversationsResponse>("me/conversations", accessToken, {
      platform: "instagram",
      fields: "participants,updated_time",
      limit: "50",
    });
    const ownId = profile.id || storedAccount.ig_user_id;
    const ownUsername = profile.username;
    const participants = (conversations.data || [])
      .flatMap((conversation) => conversation.participants?.data || [])
      .filter((participant) => {
        return participant.id && participant.id !== ownId && participant.username !== ownUsername;
      });
    const hydratedParticipants = await Promise.all(
      participants.map((participant) => fetchParticipantProfile(participant, accessToken))
    );
    const peopleById = new Map<string, InstagramParticipant>();

    hydratedParticipants.forEach((participant) => {
      if (!participant.id) {
        return;
      }

      peopleById.set(participant.id, {
        ...peopleById.get(participant.id),
        ...participant,
      });
    });

    const people = Array.from(peopleById.values())
      .map((person) => ({
        id: person.id || "",
        username: person.username || "",
        name: person.name || person.username || "Instagram user",
        profilePic: person.profile_pic || "",
        source: "inbox" as const,
      }))
      .sort((first, second) => (first.username || first.name).localeCompare(second.username || second.name));

    return NextResponse.json({
      people,
      limitation: "Instagram does not expose a complete follower username list. This list contains people available from the Instagram inbox.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Instagram audience";
    console.error("Instagram audience error:", error);
    return NextResponse.json({ error: message, people: [] }, { status: 502 });
  }
}
