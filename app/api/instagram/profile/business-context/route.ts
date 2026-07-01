import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { getUserPermissionProfile, canAccessPage } from "@/lib/agent-permissions";
import {
  fetchInstagramBusinessProfile,
  fetchInstagramBusinessPosts,
  analyzeInstagramBusinessContextWithVision,
  generateBusinessContextPrompt,
  saveBusinessContextToDatabase,
} from "@/lib/instagram-business-context";
import { getOrCreateAssistant } from "@/lib/openai-assistants";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get authenticated user
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check permissions
    const permissions = getUserPermissionProfile(
      (user.user_metadata || {}) as Record<string, unknown>
    );

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json(
        { error: "Instagram content is not enabled for this agent" },
        { status: 403 }
      );
    }

    // Get Instagram account
    const supabase = createSupabaseServiceClient();
    const instagramAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!instagramAccount?.access_token) {
      return NextResponse.json(
        { error: "No Instagram account connected" },
        { status: 400 }
      );
    }

    logger.info("Fetching Instagram business context", { userId: user.id });

    // Fetch profile and posts
    const profile = await fetchInstagramBusinessProfile(
      instagramAccount.access_token
    );

    const posts = await fetchInstagramBusinessPosts(
      instagramAccount.access_token,
      6 // Top 6 posts
    );

    if (!posts.length) {
      return NextResponse.json(
        {
          error: "No posts found. Business account may need time to load data.",
          profile,
        },
        { status: 200 }
      );
    }

    // Analyze bio, captions, and images with vision
    const analysis = await analyzeInstagramBusinessContextWithVision({
      apiKey: process.env.OPENAI_API_KEY,
      profile,
      posts,
      maxPosts: 5,
    });

    // Save to database
    const savedProfile = await saveBusinessContextToDatabase(
      supabase,
      user.id,
      profile,
      posts,
      analysis.keywords,
      analysis.contentPillars,
      analysis.summary
    );

    // Generate AI context prompt
    const businessContextPrompt = generateBusinessContextPrompt(
      profile,
      posts,
      analysis.keywords,
      analysis.contentPillars
    );

    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      logger.warn("OpenAI API key not configured");
      return NextResponse.json(
        {
          success: true,
          message: "Business context saved successfully",
          profile: savedProfile,
          postsCount: posts.length,
          summary: analysis.summary,
          businessType: analysis.businessType,
          sellingWhat: analysis.sellingWhat,
          keywords: analysis.keywords,
          contentPillars: analysis.contentPillars,
          offerSignals: analysis.offerSignals,
          contentTypes: analysis.contentTypes,
          contextPrompt: businessContextPrompt,
          aiTrainingStatus: "pending", // Would need API key to update
        },
        { status: 200 }
      );
    }

    // Update or create AI assistant with business context
    try {
      const baseInstructions = `You are an AI customer service assistant for ${profile.name}'s Instagram business. 

Be helpful, professional, and knowledgeable about the business. Use the business context provided to give accurate and relevant responses.

    The account appears to sell or promote: ${analysis.sellingWhat}
    The AI learned this from the business bio, post captions, and post images.

${businessContextPrompt}`;

      // Get or create assistant
      const assistant = await getOrCreateAssistant({
        apiKey: openaiApiKey,
        name: `${profile.name} AI Assistant`,
        instructions: baseInstructions,
        model: "gpt-4o-mini",
      });

      logger.info("AI assistant updated with business context", {
        userId: user.id,
        assistantId: assistant.id,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Business context fetched and AI trained successfully",
          profile: savedProfile,
          postsCount: posts.length,
          summary: analysis.summary,
          businessType: analysis.businessType,
          sellingWhat: analysis.sellingWhat,
          keywords: analysis.keywords,
          contentPillars: analysis.contentPillars,
          offerSignals: analysis.offerSignals,
          contentTypes: analysis.contentTypes,
          aiTrainingStatus: "completed",
          assistantId: assistant.id,
          businessContextPreview: businessContextPrompt.slice(0, 200) + "...",
        },
        { status: 200 }
      );
    } catch (aiError) {
      logger.error("Failed to update AI assistant", {
        userId: user.id,
        error: aiError instanceof Error ? aiError.message : String(aiError),
      });

      return NextResponse.json(
        {
          success: true,
          message: "Business context saved but AI training failed",
          profile: savedProfile,
          postsCount: posts.length,
          summary: analysis.summary,
          businessType: analysis.businessType,
          sellingWhat: analysis.sellingWhat,
          keywords: analysis.keywords,
          contentPillars: analysis.contentPillars,
          offerSignals: analysis.offerSignals,
          contentTypes: analysis.contentTypes,
          aiTrainingStatus: "failed",
          aiError: aiError instanceof Error ? aiError.message : "Unknown error",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    logger.error("Failed to fetch Instagram business context", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch business context",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // POST endpoint to trigger manual sync/refresh
  return GET();
}
