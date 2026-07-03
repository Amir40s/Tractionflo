import type { SupabaseClient } from "@supabase/supabase-js";
import logger from "./logger";

export type InstagramBusinessPost = {
  id: string;
  caption?: string;
  media_type: string;
  timestamp: string;
  like_count: number;
  comments_count?: number;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  comments_data?: {
    data: Array<{ text: string }>;
  };
};

export type InstagramBusinessProfile = {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  website?: string;
  category_name?: string;
  profile_pic_url?: string;
  followers_count?: number;
  ig_metadata_business_account_id?: string;
};

export type InstagramBusinessAnalysis = {
  summary: string;
  businessType: string;
  sellingWhat: string;
  contentPillars: string[];
  offerSignals: string[];
  keywords: string[];
  contentTypes: string[];
  confidence: number;
};

export async function fetchInstagramGraphAPI<T>(
  endpoint: string,
  accessToken: string,
  fields?: string
): Promise<T> {
  const url = new URL(`https://graph.instagram.com/v21.0/${endpoint}`);
  
  if (fields) {
    url.searchParams.set("fields", fields);
  }
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message || `Instagram API error: ${response.statusText}`
    );
  }

  return data as T;
}

/**
 * Fetch Instagram business profile details
 */
export async function fetchInstagramBusinessProfile(
  accessToken: string
): Promise<InstagramBusinessProfile> {
  // Try with full fields first
  const fields1 = [
    "id",
    "username",
    "name",
    "biography",
    "website",
    "profile_pic_url",
    "followers_count",
  ].join(",");

  try {
    return await fetchInstagramGraphAPI<InstagramBusinessProfile>("me", accessToken, fields1);
  } catch (error1) {
    // Try with fewer fields
    const fields2 = [
      "id",
      "username",
      "name",
      "biography",
      "followers_count",
    ].join(",");

    try {
      return await fetchInstagramGraphAPI<InstagramBusinessProfile>("me", accessToken, fields2);
    } catch (error2) {
      // Try minimal fields
      const fields3 = [
        "id",
        "username",
        "name",
        "biography",
      ].join(",");

      try {
        return await fetchInstagramGraphAPI<InstagramBusinessProfile>("me", accessToken, fields3);
      } catch (error3) {
        // Last resort - just get id and username
        const fields4 = ["id", "username"].join(",");
        return await fetchInstagramGraphAPI<InstagramBusinessProfile>("me", accessToken, fields4);
      }
    }
  }
}

/**
 * Fetch top Instagram business posts (sorted by engagement)
 */
export async function fetchInstagramBusinessPosts(
  accessToken: string,
  limit: number = 6
): Promise<InstagramBusinessPost[]> {
  // Try with detailed fields first (including caption explicitly)
  const fields1 = [
    "id",
    "caption",
    "media_type",
    "timestamp",
    "like_count",
    "comments_count",
    "media_url",
    "thumbnail_url",
    "permalink",
  ].join(",");

  try {
    const response = await fetchInstagramGraphAPI<{
      data: InstagramBusinessPost[];
    }>("me/media", accessToken, fields1);

    // Sort by engagement (likes + comments) and take top N
    // Include posts WITH or WITHOUT captions
    const sorted = response.data
      .sort((a, b) => {
        const engagementA = (a.like_count || 0) + (a.comments_count || 0);
        const engagementB = (b.like_count || 0) + (b.comments_count || 0);
        return engagementB - engagementA;
      })
      .slice(0, limit);

    return sorted;
  } catch (error1) {
    // Try with minimal fields (no caption requirement)
    const fields2 = [
      "id",
      "media_type",
      "timestamp",
      "like_count",
      "comments_count",
      "media_url",
      "thumbnail_url",
      "permalink",
    ].join(",");

    try {
      const response = await fetchInstagramGraphAPI<{
        data: InstagramBusinessPost[];
      }>("me/media", accessToken, fields2);

      const sorted = response.data
        .sort((a, b) => {
          const engagementA = (a.like_count || 0) + (a.comments_count || 0);
          const engagementB = (b.like_count || 0) + (b.comments_count || 0);
          return engagementB - engagementA;
        })
        .slice(0, limit);

      return sorted;
    } catch (error2) {
      // Last resort - just get id and media_type
      const fields3 = ["id", "media_type", "timestamp", "media_url", "thumbnail_url", "permalink"].join(",");
      const response = await fetchInstagramGraphAPI<{
        data: InstagramBusinessPost[];
      }>("me/media", accessToken, fields3);

      return response.data.slice(0, limit);
    }
  }
}

/**
 * Extract keywords and themes from posts
 */
export function extractBusinessKeywords(
  posts: InstagramBusinessPost[],
  bio: string | undefined
): {
  keywords: string[];
  themes: string[];
} {
  // Use bio + any captions available from posts
  const textSources = [bio || ""];
  
  // Add captions from posts (some may not have captions)
  posts.forEach(post => {
    if (post.caption) {
      textSources.push(post.caption);
    }
  });

  const allText = textSources.join(" ").trim();

  if (!allText) {
    // If no captions and no bio, use media types as fallback
    const mediaTypes = posts.map(p => p.media_type).filter(Boolean);
    return {
      keywords: mediaTypes as string[],
      themes: mediaTypes as string[],
    };
  }

  // Extract hashtags
  const hashtagRegex = /#\w+/g;
  const hashtags = (allText.match(hashtagRegex) || [])
    .map((tag) => tag.toLowerCase())
    .filter((tag, index, arr) => arr.indexOf(tag) === index)
    .slice(0, 15);

  // Extract common words (basic theme detection)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "is", "are", "be", "have", "has", "do", "does", "will", "would",
    "could", "should", "may", "might", "must", "can", "i", "you", "he", "she",
    "it", "we", "they", "this", "that", "these", "those", "my", "your",
  ]);

  const words = allText
    .toLowerCase()
    .replace(/[^\w\s#]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .reduce(
      (acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const themes = Object.entries(words)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  // If still no themes extracted, use media types as fallback
  if (themes.length === 0) {
    const mediaTypes = posts.map(p => p.media_type).filter(Boolean);
    return {
      keywords: hashtags.length > 0 ? hashtags : (mediaTypes as string[]),
      themes: mediaTypes as string[],
    };
  }

  return { keywords: hashtags, themes };
}

function getPostImageUrl(post: InstagramBusinessPost) {
  return post.media_type === "VIDEO"
    ? post.thumbnail_url || post.media_url || ""
    : post.media_url || post.thumbnail_url || "";
}

export async function analyzeInstagramBusinessContextWithVision({
  apiKey,
  profile,
  posts,
  maxPosts = 5,
}: {
  apiKey?: string;
  profile: InstagramBusinessProfile;
  posts: InstagramBusinessPost[];
  maxPosts?: number;
}): Promise<InstagramBusinessAnalysis> {
  function chooseTopPillars(combinedText: string) {
    const scored = [
      { label: "Ecommerce & product sales", score: /ecommerce|e-commerce|shopify|shop|store|cart|checkout|order|shipping|catalog|product|products|buy now|add to cart|sale/.test(combinedText) ? 100 : 0 },
      { label: "Courses & education", score: /course|training|learn|masterclass|lesson|tutorial|education|coaching|mentor|workshop/.test(combinedText) ? 70 : 0 },
      { label: "AI automation & workflows", score: /ai|automation|automate|workflow|openai|chatgpt|agent|bot/.test(combinedText) ? 35 : 0 },
      { label: "Products & sales", score: /product|shop|catalog|store|collection|drop|order|buy|cart/.test(combinedText) ? 60 : 0 },
      { label: "Services & offers", score: /service|agency|design|marketing|branding|web|content|management/.test(combinedText) ? 55 : 0 },
      { label: "Bookings & appointments", score: /book|booking|appointment|call|schedule|reserve|slot/.test(combinedText) ? 50 : 0 },
      { label: "Fashion & clothing", score: /fashion|clothing|shirt|tee|hoodie|style|outfit|apparel|dress/.test(combinedText) ? 45 : 0 },
    ]
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score);

    return scored.slice(0, 2).map((item) => item.label);
  }

  const fallback = () => {
    const { keywords, themes } = extractBusinessKeywords(posts, profile.biography);
    const combinedText = [profile.biography || "", ...posts.map((post) => post.caption || ""), ...keywords, ...themes].join(" ").toLowerCase();
    const contentPillars = chooseTopPillars(combinedText);

    const offerSignals = [
      /ecommerce|shopify|store|cart|checkout|product|products|order|shipping|bundle|variants/.test(combinedText)
        ? "Selling products online"
        : null,
      /sell|selling|sale|discount|offer|launch|promo|deal/.test(combinedText) ? "Promoting or selling something" : null,
      /course|program|digital product|template|guide|download|bundle/.test(combinedText) ? "Selling a course or digital product" : null,
      /price|pricing|cost|rate|quote|budget/.test(combinedText) ? "Pricing or purchase intent" : null,
      /book|booking|call|appointment|schedule/.test(combinedText) ? "Booking intent" : null,
    ].filter((item): item is string => Boolean(item));

    const sellingWhat = contentPillars[0] || offerSignals[0] || "General content or services";

    return {
      summary: `${profile.username} appears to be selling ${sellingWhat.toLowerCase()}.`,
      businessType: sellingWhat,
      sellingWhat,
      contentPillars,
      offerSignals,
      keywords,
      contentTypes: Array.from(new Set(posts.map((post) => post.media_type).filter(Boolean))),
      confidence: 0.45,
    };
  };

  if (!apiKey) {
    return fallback();
  }

  const selectedPosts = posts.slice(0, Math.max(1, maxPosts));
  const postTextBlocks = selectedPosts.map((post, index) => {
    const imageUrl = getPostImageUrl(post);
    return [
      `Post ${index + 1}:`,
      `- Caption: ${post.caption || "No caption"}`,
      `- Media type: ${post.media_type || "Unknown"}`,
      `- Likes: ${post.like_count || 0}`,
      `- Comments: ${post.comments_count || 0}`,
      `- Media URL: ${imageUrl || "No image URL"}`,
      `- Timestamp: ${post.timestamp || "Unknown"}`,
    ].join("\n");
  }).join("\n\n");

  const postMessages = (await Promise.all(
    selectedPosts.map(async (post, index) => {
      const imageUrl = getPostImageUrl(post);
      let base64Url: string | null = null;
      
      if (imageUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const imgRes = await fetch(imageUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            base64Url = `data:${mimeType};base64,${buffer.toString("base64")}`;
          }
        } catch (err) {
          logger.warn("Failed to download image for analysis", { error: err instanceof Error ? err.message : String(err) });
        }
      }

      const contentArray: any[] = [
        {
          type: "text" as const,
          text: `Analyze this post image for @${profile.username}. Caption: ${post.caption || "No caption"}`,
        }
      ];

      if (base64Url) {
        contentArray.push({
          type: "image_url" as const,
          image_url: {
            url: base64Url,
            detail: "low" as const,
          },
        });
      }

      return contentArray;
    })
  )).flat();

  const openAiMessages = [
    {
      role: "system" as const,
      content: [
        {
          type: "text" as const,
          text: "You analyze Instagram business accounts using bio, captions, and images. Return only valid JSON. Focus on what the user is selling, teaching, offering, or promoting.",
        },
      ],
    },
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: [
            `Instagram account: @${profile.username}`,
            `Name: ${profile.name || "Unknown"}`,
            `Bio: ${profile.biography || "No bio provided"}`,
            `Followers: ${profile.followers_count || 0}`,
            `\nPosts to inspect:\n${postTextBlocks}`,
            `\nReturn JSON with keys: summary, businessType, sellingWhat, contentPillars, offerSignals, keywords, contentTypes, confidence.`,
            `\nCRITICAL INSTRUCTIONS:`,
            `1. For 'summary', write a detailed and comprehensive 6-7 line paragraph explaining exactly what the business is doing, based strictly on the images and captions. Make it descriptive and long.`,
            `2. Business classification: Do not assume it is an e-commerce store or digital marketing course unless the posts or images explicitly confirm it. If it sells a course or digital product, say that explicitly. Do not default to AI automation unless the content clearly says so.`,
          ].join("\n"),
        },
        ...postMessages,
      ],
    },
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openAiMessages,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenAI request failed with status ${response.status}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }

    const parsed = JSON.parse(content) as Partial<InstagramBusinessAnalysis>;
    const fallbackAnalysis = fallback();

    return {
      summary: parsed.summary || fallbackAnalysis.summary,
      businessType: parsed.businessType || fallbackAnalysis.businessType,
      sellingWhat: parsed.sellingWhat || fallbackAnalysis.sellingWhat,
      contentPillars: Array.isArray(parsed.contentPillars) && parsed.contentPillars.length > 0
        ? parsed.contentPillars.slice(0, 2)
        : fallbackAnalysis.contentPillars.slice(0, 2),
      offerSignals: Array.isArray(parsed.offerSignals) && parsed.offerSignals.length > 0 ? parsed.offerSignals : fallbackAnalysis.offerSignals,
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : fallbackAnalysis.keywords,
      contentTypes: Array.isArray(parsed.contentTypes) && parsed.contentTypes.length > 0 ? parsed.contentTypes : fallbackAnalysis.contentTypes,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
    };
  } catch (error) {
    logger.warn("Vision analysis failed, using fallback analysis", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback();
  }
}

export function summarizeBusinessContext(
  profile: InstagramBusinessProfile,
  posts: InstagramBusinessPost[],
  keywords: string[],
  themes: string[]
): {
  summary: string;
  contentPillars: string[];
  offerSignals: string[];
  contentTypes: string[];
} {
  const combinedText = [
    profile.biography || "",
    ...posts.map((post) => post.caption || ""),
    ...keywords,
    ...themes,
  ]
    .join(" ")
    .toLowerCase();

  const contentPillars = (() => {
    const pillars = [
      { label: "Ecommerce & product sales", score: /ecommerce|e-commerce|shopify|shop|store|cart|checkout|order|shipping|catalog|product|products|buy now|add to cart|sale/.test(combinedText) ? 100 : 0 },
      { label: "Courses & education", score: /course|training|learn|masterclass|lesson|tutorial|education|coaching|mentor|workshop/.test(combinedText) ? 70 : 0 },
      { label: "AI automation & workflows", score: /ai|automation|automate|workflow|openai|chatgpt|agent|bot/.test(combinedText) ? 35 : 0 },
      { label: "Products & sales", score: /product|shop|catalog|store|collection|drop|order|buy|cart/.test(combinedText) ? 60 : 0 },
      { label: "Services & offers", score: /service|agency|design|marketing|branding|web|content|management/.test(combinedText) ? 55 : 0 },
      { label: "Bookings & appointments", score: /book|booking|appointment|call|schedule|reserve|slot/.test(combinedText) ? 50 : 0 },
      { label: "Fashion & clothing", score: /fashion|clothing|shirt|tee|hoodie|style|outfit|apparel|dress/.test(combinedText) ? 45 : 0 },
    ]
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score);

    return pillars.slice(0, 2).map((item) => item.label);
  })();

  const offerSignals = [
    /sell|selling|sale|discount|offer|limited|launch|new drop|promo|deal/.test(combinedText)
      ? "Promotions or launches"
      : null,
    /price|pricing|cost|rate|quote|budget/.test(combinedText)
      ? "Pricing or purchase intent"
      : null,
    /course|program|digital product|template|guide|download|bundle/.test(combinedText)
      ? "Selling a course or digital product"
      : null,
    /book|booking|call|appointment|schedule/.test(combinedText)
      ? "Booking intent"
      : null,
    /join|apply|application|register|waitlist/.test(combinedText)
      ? "Applications or signups"
      : null,
  ].filter((item): item is string => Boolean(item));

  const contentTypes = Array.from(new Set(posts.map((post) => post.media_type).filter(Boolean)));

  const strongestSummary = contentPillars[0] || offerSignals[0] || "General content creator or business account";

  return {
    summary: `${profile.name || profile.username} appears to focus on ${strongestSummary.toLowerCase()}.`,
    contentPillars,
    offerSignals,
    contentTypes,
  };
}

/**
 * Generate business context for AI training
 */
export function generateBusinessContextPrompt(
  profile: InstagramBusinessProfile,
  posts: InstagramBusinessPost[],
  keywords: string[],
  themes: string[],
  summary?: string
): string {
  const topPosts = posts
    .slice(0, 5)
    .map(
      (post) =>
        `- "${post.caption || `(${post.media_type || "post"})`}" (${post.like_count || 0} likes, ${post.comments_count || 0} comments)`
    )
    .join("\n");

  const contextPrompt = `
# Business Context: ${profile.name || profile.username}

## Profile Information
- **Business Name**: ${profile.name || "Not specified"}
- **Username**: @${profile.username}
- **Bio**: ${profile.biography || "No bio provided"}
- **Website**: ${profile.website || "No website"}
- **Followers**: ${profile.followers_count || 0}

${summary ? `## AI Business Analysis\n${summary}\n` : ""}
## Business Keywords & Topics
${keywords.slice(0, 8).length > 0 ? keywords.slice(0, 8).map((k) => `- ${k}`).join("\n") : "- No keywords detected"}

## Business Themes & Focus Areas
${themes.slice(0, 6).length > 0 ? themes.slice(0, 6).map((t) => `- ${t}`).join("\n") : "- No themes detected"}

## Recent Top Posts
${topPosts || "- No posts available"}

## Instructions
You are an AI assistant for this Instagram business. Use the above context to:
1. Understand the business model and focus areas
2. Adopt the business tone and communication style
3. Reference content themes from the posts
4. Use industry-specific language from hashtags and keywords
5. Provide responses that align with the business values
6. Be authentic and knowledgeable about their content
`;

  return contextPrompt;
}

/**
 * Save business profile and posts to database
 */
export async function saveBusinessContextToDatabase(
  supabase: SupabaseClient,
  userId: string,
  profile: InstagramBusinessProfile,
  posts: InstagramBusinessPost[],
  keywords: string[],
  themes: string[],
  summary?: string
) {
  try {
    // Save or update profile
    const { data: profileData, error: profileError } = await supabase
      .from("instagram_business_profiles")
      .upsert(
        {
          user_id: userId,
          instagram_id: profile.id,
          username: profile.username,
          bio: profile.biography || null,
          website: profile.website || null,
          category_name: profile.category_name || null,
          profile_pic_url: profile.profile_pic_url || null,
          followers_count: profile.followers_count || 0,
          business_keywords: keywords.length > 0 ? keywords : [],
          business_summary: summary || (themes.length > 0 ? themes.join(", ") : null),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,instagram_id" }
      )
      .select()
      .single();

    if (profileError) throw profileError;

    // Save posts
    if (posts.length > 0) {
      const postsToInsert = posts.map((post) => ({
        profile_id: profileData.id,
        instagram_post_id: post.id,
        caption: post.caption || null,
        hashtags: extractHashtags(post.caption),
        media_type: post.media_type || null,
        media_urls: [post.media_url, post.thumbnail_url].filter(Boolean),
        likes_count: post.like_count || 0,
        comments_count: (post.comments_data?.data || []).length,
        posted_at: post.timestamp || null,
      }));

      const { error: postsError } = await supabase
        .from("instagram_business_posts")
        .upsert(postsToInsert, { onConflict: "profile_id,instagram_post_id" });

      if (postsError) throw postsError;
    }

    return profileData;
  } catch (error) {
    logger.error("Failed to save business context to database", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Helper function to extract hashtags from text
 */
function extractHashtags(text: string | undefined | null): string[] {
  if (!text) return [];
  const hashtagRegex = /#\w+/g;
  return (text.match(hashtagRegex) || []).map((tag) => tag.toLowerCase());
}

/**
 * Get saved business context from database
 */
export async function getBusinessContextFromDatabase(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("instagram_business_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (profileError && profileError.code !== "PGRST116") throw profileError;
    if (!profile) return null;

    // Fetch related posts
    const { data: posts, error: postsError } = await supabase
      .from("instagram_business_posts")
      .select("*")
      .eq("profile_id", profile.id)
      .order("posted_at", { ascending: false })
      .limit(10);

    if (postsError) throw postsError;

    return { profile, posts };
  } catch (error) {
    logger.error("Failed to get business context from database", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
