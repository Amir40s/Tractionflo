import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getUserPermissionProfile, canAccessPage } from "@/lib/agent-permissions";
import {
  fetchInstagramBusinessProfile,
  fetchInstagramBusinessPosts,
  fetchInstagramPostComments,
} from "@/lib/instagram-business-context";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export type OpportunityReportScore = {
  sellingPotential: number;
  leadGenPotential: number;
  revenueOpportunity: number;
  buyingIntent: number;
  engagementQuality: number;
  overallScore: number;
  insights: {
    sellingPotential: string;
    leadGenPotential: string;
    revenueOpportunity: string;
    buyingIntent: string;
    engagementQuality: string;
  };
  strongComments: Array<{
    text: string;
    username: string;
    intent: string;
    postCaption: string;
  }>;
  summary: string;
  lowDataWarning: boolean;
  postsAnalyzed: number;
  commentsAnalyzed: number;
  generatedAt: string;
};

async function generateOpportunityReport(
  apiKey: string,
  commentCorpus: Array<{ text: string; username: string; postCaption: string }>,
  profileInfo: { username: string; bio?: string; followers?: number }
): Promise<Omit<OpportunityReportScore, "postsAnalyzed" | "commentsAnalyzed" | "generatedAt" | "lowDataWarning">> {
  const commentText = commentCorpus
    .map((c, i) => `[${i + 1}] @${c.username}: "${c.text}" (on post: "${c.postCaption?.slice(0, 80) || "No caption"}")`)
    .join("\n");

  const prompt = `You are an expert Instagram monetization analyst. Analyze these comments from @${profileInfo.username}'s Instagram account and generate a detailed opportunity report.

Account Info:
- Username: @${profileInfo.username}
- Bio: ${profileInfo.bio || "Not available"}
- Followers: ${profileInfo.followers || "Unknown"}

Comments to analyze (${commentCorpus.length} total):
${commentText}

Analyze for:
1. Buyer signals (pricing questions, "how much", "where to buy", "I want this")
2. Lead indicators (asking for more info, DM requests, contact requests)
3. Product interest ("I need this", "love this", tagging friends)
4. Revenue signals (payment intent, purchase readiness)
5. Engagement quality (genuine vs spam vs generic reactions)
6. Objections ("too expensive", "not sure", "maybe later")
7. Urgency signals ("how soon", "available now?", "can I order?")

Return ONLY valid JSON with this exact structure:
{
  "sellingPotential": <0-100 integer>,
  "leadGenPotential": <0-100 integer>,
  "revenueOpportunity": <0-100 integer>,
  "buyingIntent": <0-100 integer>,
  "engagementQuality": <0-100 integer>,
  "overallScore": <0-100 integer>,
  "insights": {
    "sellingPotential": "<one sentence explaining this score>",
    "leadGenPotential": "<one sentence explaining this score>",
    "revenueOpportunity": "<one sentence explaining this score>",
    "buyingIntent": "<one sentence explaining this score>",
    "engagementQuality": "<one sentence explaining this score>"
  },
  "strongComments": [
    {
      "text": "<exact comment text>",
      "username": "<@username>",
      "intent": "<one of: Buying Intent | Price Question | Product Interest | Lead Signal | Urgency | Engagement>",
      "postCaption": "<first 60 chars of post caption>"
    }
  ],
  "summary": "<2-3 sentences summarizing overall opportunity from this audience>"
}

Rules:
- strongComments: Extract the top comments from the corpus to highlight as potential leads or audience engagement examples, up to 5 comments. If any comments are available, you MUST populate this array with up to 5 items. Classify the intent of each comment appropriately (e.g. choose one of: Buying Intent, Price Question, Product Interest, Lead Signal, Urgency, or Engagement).
- If few signals found, scores should be lower (20-40 range) but you must still output the top comments in strongComments.
- overallScore should be a weighted average (buyingIntent 30%, revenueOpportunity 25%, leadGenPotential 20%, sellingPotential 15%, engagementQuality 10%)
- Be accurate and honest, not overly optimistic`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("OpenAI returned empty response");

  const parsed = JSON.parse(content);

  return {
    sellingPotential: Math.min(100, Math.max(0, Number(parsed.sellingPotential) || 0)),
    leadGenPotential: Math.min(100, Math.max(0, Number(parsed.leadGenPotential) || 0)),
    revenueOpportunity: Math.min(100, Math.max(0, Number(parsed.revenueOpportunity) || 0)),
    buyingIntent: Math.min(100, Math.max(0, Number(parsed.buyingIntent) || 0)),
    engagementQuality: Math.min(100, Math.max(0, Number(parsed.engagementQuality) || 0)),
    overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 0)),
    insights: {
      sellingPotential: String(parsed.insights?.sellingPotential || ""),
      leadGenPotential: String(parsed.insights?.leadGenPotential || ""),
      revenueOpportunity: String(parsed.insights?.revenueOpportunity || ""),
      buyingIntent: String(parsed.insights?.buyingIntent || ""),
      engagementQuality: String(parsed.insights?.engagementQuality || ""),
    },
    strongComments: Array.isArray(parsed.strongComments)
      ? parsed.strongComments.slice(0, 5).map((c: Record<string, unknown>) => ({
          text: String(c.text || ""),
          username: String(c.username || ""),
          intent: String(c.intent || "Product Interest"),
          postCaption: String(c.postCaption || ""),
        }))
      : [],
    summary: String(parsed.summary || ""),
  };
}

export async function POST() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const permissions = getUserPermissionProfile(
      (user.user_metadata || {}) as Record<string, unknown>
    );

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json(
        { error: "Instagram content is not enabled for this agent" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const instagramAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!instagramAccount?.access_token) {
      return NextResponse.json(
        { error: "No Instagram account connected" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    logger.info("Generating opportunity report", { userId: user.id });

    // Fetch profile and latest 5 posts
    const [profile, posts] = await Promise.all([
      fetchInstagramBusinessProfile(instagramAccount.access_token),
      fetchInstagramBusinessPosts(instagramAccount.access_token, 5),
    ]);

    // Fetch top 10 comments per post in parallel
    const commentsPerPost = await Promise.all(
      posts.map((post) =>
        fetchInstagramPostComments(instagramAccount.access_token, post.id, 10).then(
          (comments) =>
            comments.map((c) => ({
              text: c.text,
              username: c.username || "user",
              postCaption: post.caption || "",
            }))
        )
      )
    );

    const commentCorpus = commentsPerPost.flat();
    const lowDataWarning = commentCorpus.length < 10;

    let reportScores: Omit<OpportunityReportScore, "postsAnalyzed" | "commentsAnalyzed" | "generatedAt" | "lowDataWarning">;

    if (commentCorpus.length === 0) {
      // No comments at all — return zero-state report
      reportScores = {
        sellingPotential: 0,
        leadGenPotential: 0,
        revenueOpportunity: 0,
        buyingIntent: 0,
        engagementQuality: 0,
        overallScore: 0,
        insights: {
          sellingPotential: "No comments available to analyze yet.",
          leadGenPotential: "No comments available to analyze yet.",
          revenueOpportunity: "No comments available to analyze yet.",
          buyingIntent: "No comments available to analyze yet.",
          engagementQuality: "No comments available to analyze yet.",
        },
        strongComments: [],
        summary:
          "Your account doesn't have enough comment data yet. Post consistently and engage with your audience to generate a stronger report.",
      };
    } else {
      reportScores = await generateOpportunityReport(apiKey, commentCorpus, {
        username: profile.username,
        bio: profile.biography,
        followers: profile.followers_count,
      });

    }

    const report: OpportunityReportScore = {
      ...reportScores,
      lowDataWarning,
      postsAnalyzed: posts.length,
      commentsAnalyzed: commentCorpus.length,
      generatedAt: new Date().toISOString(),
    };

    // Save to database
    try {
      const { data: existingProfile } = await (supabase
        .from("instagram_business_profiles") as any)
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingProfile) {
        await (supabase
          .from("instagram_business_profiles") as any)
          .update({ opportunity_report: report })
          .eq("id", existingProfile.id);
      } else {
         await (supabase.from("instagram_business_profiles") as any).upsert(
          {
            user_id: user.id,
            instagram_id: profile.id,
            username: profile.username,
            bio: profile.biography || null,
            opportunity_report: report,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "user_id,instagram_id" }
        );
      }
    } catch (dbErr) {
      logger.warn("Failed to save opportunity report to DB", {
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    logger.error("Failed to generate opportunity report", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 }
    );
  }
}

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

    const supabase = createSupabaseServiceClient();

    const { data } = await (supabase
      .from("instagram_business_profiles") as any)
      .select("opportunity_report")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      report: (data?.opportunity_report as OpportunityReportScore) || null,
    });
  } catch {
    return NextResponse.json({ report: null });
  }
}
