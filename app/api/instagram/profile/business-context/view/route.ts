import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getUserPermissionProfile, canAccessPage } from "@/lib/agent-permissions";
import {
  analyzeInstagramBusinessContextWithVision,
  fetchInstagramBusinessPosts,
  fetchInstagramBusinessProfile,
  saveBusinessContextToDatabase,
} from "@/lib/instagram-business-context";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent" }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const instagramAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!instagramAccount?.access_token) {
      return NextResponse.json({
        success: true,
        context: null,
        message: "No Instagram account connected yet",
      });
    }

    const profile = await fetchInstagramBusinessProfile(instagramAccount.access_token);
    const posts = await fetchInstagramBusinessPosts(instagramAccount.access_token, 5);

    if (!posts.length) {
      return NextResponse.json({
        success: true,
        context: {
          username: profile.username,
          name: profile.name,
          followers: profile.followers_count,
          bio: profile.biography,
          website: profile.website,
          keywords: [],
          themes: [],
          summary: "No posts available to analyze yet.",
          contentPillars: [],
          offerSignals: [],
          contentTypes: [],
          postsCount: 0,
          lastSynced: null,
        },
      });
    }

    const learning = await analyzeInstagramBusinessContextWithVision({
      apiKey: process.env.OPENAI_API_KEY,
      profile,
      posts,
      maxPosts: 5,
    });

    // Save live analyzed context to database
    await saveBusinessContextToDatabase(
      supabase,
      user.id,
      profile,
      posts,
      learning.keywords,
      learning.contentPillars,
      learning.summary
    ).catch((err) => {
      logger.error("Failed to auto-save business context from view endpoint to database", { error: err });
    });

    return NextResponse.json({
      success: true,
      context: {
        username: profile.username,
        name: profile.name,
        followers: profile.followers_count,
        bio: profile.biography,
        website: profile.website,
        keywords: learning.keywords,
        themes: learning.contentPillars,
        summary: learning.summary,
        contentPillars: learning.contentPillars,
        offerSignals: learning.offerSignals,
        contentTypes: learning.contentTypes,
        postsCount: posts.length,
        lastSynced: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch business context view", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to fetch business context",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
