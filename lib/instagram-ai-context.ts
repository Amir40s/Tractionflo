import type { SupabaseClient } from "@supabase/supabase-js";
import { getBusinessContextFromDatabase } from "./instagram-business-context";
import logger from "./logger";

/**
 * Build conversation context with business information
 * This is used when responding to customer messages
 */
export async function buildConversationContextWithBusiness(
  supabase: SupabaseClient,
  userId: string,
  userMessage: string
): Promise<{
  systemPrompt: string;
  businessContext: string;
  hasContext: boolean;
}> {
  try {
    // Fetch saved business context
    const businessData = await getBusinessContextFromDatabase(supabase, userId);

    if (!businessData) {
      return {
        systemPrompt:
          "You are a helpful customer service assistant. Be professional and courteous.",
        businessContext: "",
        hasContext: false,
      };
    }

    const { profile, posts } = businessData;

    // Build business context string
    const businessContext = `
## Business Information
- **Name**: ${profile.name}
- **Username**: @${profile.username}
- **Bio**: ${profile.bio}
- **Website**: ${profile.website || "Not specified"}
- **Category**: ${profile.category_name}

## Key Business Keywords
${profile.business_keywords?.slice(0, 8).join(", ") || "Not available"}

## Recent Posts
${posts
  ?.slice(0, 3)
  .map((p) => `- "${p.caption?.slice(0, 100) || "(Media post)"}" (${p.likes_count} likes)`)
  .join("\n")}
`;

    // Build system prompt with business context
    const systemPrompt = `You are an AI customer service assistant for ${profile.name}'s Instagram business.

${businessContext}

Guidelines:
- Use the business information above to provide accurate, relevant responses
- Adopt the tone and style evident in the business's posts
- When discussing products/services, reference information from recent posts
- Be helpful, professional, and knowledgeable about the business
- If asked about something not in the business context, be honest about limitations
- Personalize responses to reflect the business's values and focus areas`;

    return {
      systemPrompt,
      businessContext,
      hasContext: true,
    };
  } catch (error) {
    logger.warn("Failed to build business context for conversation", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      systemPrompt:
        "You are a helpful customer service assistant. Be professional and courteous.",
      businessContext: "",
      hasContext: false,
    };
  }
}

/**
 * Enrich a message with business context for better AI responses
 */
export async function enrichMessageWithBusinessContext(
  supabase: SupabaseClient,
  userId: string,
  message: string
): Promise<string> {
  const { systemPrompt } = await buildConversationContextWithBusiness(
    supabase,
    userId,
    message
  );

  return `${systemPrompt}\n\nCustomer Message: "${message}"`;
}

/**
 * Check if business context exists and is recent (within 7 days)
 */
export async function isBusinessContextFresh(
  supabase: SupabaseClient,
  userId: string,
  maxAgeHours: number = 168 // 7 days
): Promise<boolean> {
  try {
    const businessData = await getBusinessContextFromDatabase(supabase, userId);

    if (!businessData?.profile.last_synced_at) {
      return false;
    }

    const lastSyncDate = new Date(businessData.profile.last_synced_at);
    const now = new Date();
    const hoursDiff =
      (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

    return hoursDiff < maxAgeHours;
  } catch (error) {
    logger.warn("Failed to check business context freshness", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get a summary of business for display
 */
export async function getBusinessSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  name: string;
  username: string;
  bio: string;
  followerCount: number;
  keywords: string[];
  recentPostsCount: number;
} | null> {
  try {
    const businessData = await getBusinessContextFromDatabase(supabase, userId);

    if (!businessData) return null;

    const { profile, posts } = businessData;

    return {
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      followerCount: profile.followers_count,
      keywords: profile.business_keywords || [],
      recentPostsCount: posts?.length || 0,
    };
  } catch (error) {
    logger.warn("Failed to get business summary", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
