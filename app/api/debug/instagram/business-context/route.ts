import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getFreshInstagramAccount } from '@/lib/instagram-token';
import { getUserPermissionProfile, canAccessPage } from '@/lib/agent-permissions';
import {
  fetchInstagramBusinessProfile,
  fetchInstagramBusinessPosts,
  analyzeInstagramBusinessContextWithVision,
  summarizeBusinessContext,
  generateBusinessContextPrompt,
  saveBusinessContextToDatabase,
} from '@/lib/instagram-business-context';
import { getOrCreateAssistant } from '@/lib/openai-assistants';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to test business context fetch
 * GET /api/debug/instagram/business-context
 */
export async function GET() {
  const debugLog: string[] = [];

  try {
    debugLog.push('=== Instagram Business Context Debug ===');

    // Get authenticated user
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      debugLog.push('❌ Not authenticated');
      return NextResponse.json({ error: 'Not authenticated', logs: debugLog }, { status: 401 });
    }
    debugLog.push(`✅ User authenticated: ${user.id}`);

    // Check permissions
    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);
    if (!canAccessPage(permissions, 'instagram-content')) {
      debugLog.push('❌ Instagram content not enabled');
      return NextResponse.json({ error: 'Not authorized', logs: debugLog }, { status: 403 });
    }
    debugLog.push('✅ Instagram permission granted');

    // Get Instagram account
    const supabase = createSupabaseServiceClient();
    const instagramAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!instagramAccount?.access_token) {
      debugLog.push('❌ No Instagram account connected');
      return NextResponse.json({ error: 'No Instagram connected', logs: debugLog }, { status: 400 });
    }
    debugLog.push(`✅ Instagram account found: ${instagramAccount.ig_user_id}`);

    // Fetch profile
    debugLog.push('📡 Fetching Instagram profile...');
    const profile = await fetchInstagramBusinessProfile(instagramAccount.access_token);
    debugLog.push(`✅ Profile fetched: ${profile.username}`);

    // Fetch posts
    debugLog.push('📡 Fetching top 6 posts...');
    const posts = await fetchInstagramBusinessPosts(instagramAccount.access_token, 6);
    debugLog.push(`✅ Posts fetched: ${posts.length} posts`);

    if (posts.length === 0) {
      debugLog.push('⚠️  No posts found');
      return NextResponse.json({ 
        message: 'No posts found',
        profile,
        logs: debugLog 
      }, { status: 200 });
    }

    // Vision analyze the bio, captions, and images
    debugLog.push('🔍 Analyzing bio, captions, and post images...');
    const learnedContext = await analyzeInstagramBusinessContextWithVision({
      apiKey: process.env.OPENAI_API_KEY,
      profile,
      posts,
      maxPosts: 5,
    });
    debugLog.push(`✅ Summary: ${learnedContext.summary}`);
    debugLog.push(`   Business type: ${learnedContext.businessType}`);
    debugLog.push(`   Selling what: ${learnedContext.sellingWhat}`);
    debugLog.push(`   Pillars: ${learnedContext.contentPillars.join(', ') || 'None'}`);
    debugLog.push(`   Offer signals: ${learnedContext.offerSignals.join(', ') || 'None'}`);
    debugLog.push(`   Keywords: ${learnedContext.keywords.slice(0, 5).join(', ') || 'None'}`);

    // Save to database
    debugLog.push('💾 Saving to database...');
    const savedProfile = await saveBusinessContextToDatabase(
      supabase,
      user.id,
      profile,
      posts,
      learnedContext.keywords,
      learnedContext.contentPillars,
      learnedContext.summary
    );
    debugLog.push(`✅ Saved to database`);

    // Train AI
    debugLog.push('🤖 Training AI assistant...');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      debugLog.push('⚠️  OPENAI_API_KEY not set - skipping AI training');
    } else {
      try {
        const businessContextPrompt = generateBusinessContextPrompt(
          profile,
          posts,
          learnedContext.keywords,
          learnedContext.contentPillars
        );

        const baseInstructions = `You are an AI customer service assistant for ${profile.name}'s Instagram business. 
          summary: learnedContext.summary,
          businessType: learnedContext.businessType,
          sellingWhat: learnedContext.sellingWhat,
          keywords: learnedContext.keywords.slice(0, 8),
          contentPillars: learnedContext.contentPillars.slice(0, 6),
          offerSignals: learnedContext.offerSignals.slice(0, 6),
          contentTypes: learnedContext.contentTypes.slice(0, 6),

${businessContextPrompt}`;

        const assistant = await getOrCreateAssistant({
          apiKey: openaiApiKey,
          name: `${profile.name} AI Assistant`,
          instructions: baseInstructions,
          model: 'gpt-4o-mini',
        });

        debugLog.push(`✅ AI assistant trained: ${assistant.id}`);
      } catch (aiError) {
        debugLog.push(`❌ AI training failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
      }
    }

    debugLog.push('');
    debugLog.push('=== SUCCESS ===');

    return NextResponse.json({
      success: true,
      profile: {
        username: profile.username,
        name: profile.name,
        bio: profile.biography?.slice(0, 100),
        followers: profile.followers_count,
      },
      postsCount: posts.length,
      keywords: learnedContext.keywords.slice(0, 8),
      themes: learnedContext.contentPillars.slice(0, 6),
      summary: learnedContext.summary,
      contentPillars: learnedContext.contentPillars,
      offerSignals: learnedContext.offerSignals,
      contentTypes: learnedContext.contentTypes,
      logs: debugLog,
    }, { status: 200 });

  } catch (error) {
    debugLog.push(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    debugLog.push(`Stack: ${error instanceof Error ? error.stack : 'N/A'}`);

    logger.error('Debug endpoint error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: debugLog,
    }, { status: 500 });
  }
}
