import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type InstagramGraphError = {
  message?: string;
};

type InstagramGraphListResponse<T> = {
  data?: T[];
  error?: InstagramGraphError;
};

type InstagramProfileResponse = {
  id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  profile_picture_url?: string;
  error?: InstagramGraphError;
};

type InstagramMediaResponse = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  comments_count?: number;
  like_count?: number;
};

type InstagramInsightValue = {
  value?: number;
  end_time?: string;
};

type InstagramInsightsResponse = {
  data?: {
    name?: string;
    values?: InstagramInsightValue[];
  }[];
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
    throw new Error(data.error?.message || "Instagram could not load content.");
  }

  return data;
}

function normalizeMedia(media: InstagramMediaResponse, kind: "post" | "story") {
  return {
    id: media.id,
    kind,
    caption: media.caption || "",
    mediaType: media.media_type || "UNKNOWN",
    mediaUrl: media.media_url || "",
    thumbnailUrl: media.thumbnail_url || "",
    permalink: media.permalink || "",
    timestamp: media.timestamp || "",
    commentsCount: Math.max(0, Number(media.comments_count || 0)),
    likeCount: typeof media.like_count === "number" ? Math.max(0, media.like_count) : null,
  };
}

function getFollowerInsightWindow() {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCMonth(since.getUTCMonth() - 5);

  return {
    since: String(Math.floor(since.getTime() / 1000)),
    until: String(Math.floor(Date.now() / 1000)),
  };
}

function normalizeFollowerHistory(insights?: InstagramInsightsResponse) {
  const followerMetric =
    insights?.data?.find((metric) => metric.name === "follower_count") || insights?.data?.[0];

  return (followerMetric?.values || [])
    .map((point) => {
      const date = point.end_time || "";
      const value = Number(point.value || 0);

      return {
        date,
        newFollowers: Number.isFinite(value) ? Math.max(0, value) : 0,
      };
    })
    .filter((point) => point.date)
    .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const scanMode = requestUrl.searchParams.get("scan") === "1";
    const mediaLimit = scanMode ? "50" : "18";
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated", posts: [], stories: [] }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent.", posts: [], stories: [] }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!storedAccount?.access_token) {
      return NextResponse.json({
        account: null,
        posts: [],
        stories: [],
        error: "No Instagram account connected",
      });
    }

    const accessToken = storedAccount.access_token;
    let profileMetricError = "";
    let profile: InstagramProfileResponse;

    try {
      profile = await fetchInstagramGraph<InstagramProfileResponse>("me", accessToken, {
        fields: "id,username,name,account_type,media_count,followers_count,follows_count,profile_picture_url",
      });
    } catch (profileError) {
      profileMetricError = profileError instanceof Error ? profileError.message : "Could not load follower counts.";
      try {
        profile = await fetchInstagramGraph<InstagramProfileResponse>("me", accessToken, {
          fields: "id,username,name,account_type,media_count,profile_picture_url",
        });
      } catch {
        profile = await fetchInstagramGraph<InstagramProfileResponse>("me", accessToken, {
          fields: "id,username,name,account_type,media_count",
        });
      }
    }

    const insightWindow = getFollowerInsightWindow();

    const [postsResult, storiesResult, followerInsightsResult] = await Promise.allSettled([
      fetchInstagramGraph<InstagramGraphListResponse<InstagramMediaResponse>>("me/media", accessToken, {
        fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,comments_count,like_count",
        limit: mediaLimit,
      }),
      fetchInstagramGraph<InstagramGraphListResponse<InstagramMediaResponse>>("me/stories", accessToken, {
        fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp",
        limit: mediaLimit,
      }),
      fetchInstagramGraph<InstagramInsightsResponse>("me/insights", accessToken, {
        metric: "follower_count",
        period: "day",
        since: insightWindow.since,
        until: insightWindow.until,
      }),
    ]);

    const posts = postsResult.status === "fulfilled"
      ? (postsResult.value.data || []).map((media) => normalizeMedia(media, "post"))
      : [];
    const stories = storiesResult.status === "fulfilled"
      ? (storiesResult.value.data || []).map((media) => normalizeMedia(media, "story"))
      : [];

    return NextResponse.json({
      account: {
        id: profile.id || storedAccount.ig_user_id,
        username: profile.username,
        name: profile.name,
        accountType: profile.account_type,
        profilePictureUrl: profile.profile_picture_url || "",
        profile_picture_url: profile.profile_picture_url || "",
        mediaCount: profile.media_count,
        followersCount: typeof profile.followers_count === "number" ? profile.followers_count : null,
        followingCount: typeof profile.follows_count === "number" ? profile.follows_count : null,
        followerHistory: followerInsightsResult.status === "fulfilled" ? normalizeFollowerHistory(followerInsightsResult.value) : [],
        followerHistoryError:
          profileMetricError ||
          (followerInsightsResult.status === "rejected"
            ? followerInsightsResult.reason?.message || "Could not load follower history."
            : ""),
      },
      posts,
      stories,
      postError: postsResult.status === "rejected" ? postsResult.reason?.message || "Could not load posts" : "",
      storyError: storiesResult.status === "rejected" ? storiesResult.reason?.message || "Could not load stories" : "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Instagram content";
    console.error("Instagram content error:", error);
    return NextResponse.json({ error: message, posts: [], stories: [] }, { status: 502 });
  }
}
