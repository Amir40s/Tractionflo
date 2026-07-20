import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import {
  createInstagramMediaContainer,
  createInstagramCarouselContainer,
  publishInstagramMedia,
  waitForInstagramContainer,
} from "@/lib/instagram-business-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Validate CRON token
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    vercelCronHeader !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to bypass RLS for cron job
  const supabase = createSupabaseServiceClient();

  try {
    // 1. Fetch scheduled posts whose scheduled_for is in the past
    const { data, error: fetchError } = await supabase
      .from("instagram_content_publishing")
      .select("*")
      .eq("status", "SCHEDULED")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(10); // Process in batches of 10 to avoid timeouts

    const pendingPosts = data as any[] | null;

    if (fetchError) {
      console.error("Error fetching scheduled posts:", fetchError);
      return NextResponse.json({ error: "Failed to fetch scheduled posts" }, { status: 500 });
    }

    if (!pendingPosts || pendingPosts.length === 0) {
      return NextResponse.json({ ok: true, message: "No pending posts to publish." });
    }

    const results = [];

    for (const post of pendingPosts) {
      let status = "PUBLISHED";
      let errorMsg = null;
      let finalContainerId = "";
      let publishedPostId = "";

      try {
        // Fetch fresh access token for the user
        const storedAccount = await getFreshInstagramAccount(supabase, post.user_id);

        if (!storedAccount?.access_token) {
          throw new Error("Instagram account disconnected or token expired.");
        }

        const accessToken = storedAccount.access_token;
        const isCarousel = post.media_type === "CAROUSEL";
        const mediaUrls = post.media_urls || [];

        if (mediaUrls.length === 0) {
          throw new Error("No media URLs found for this post.");
        }

        if (isCarousel) {
          const childContainerIds = [];
          for (const url of mediaUrls) {
            // Assume media is IMAGE for carousel items, or derive from URL if possible. 
            // In a robust implementation, we should store media type per URL. 
            // Since Meta API requires knowing if it's a video or image, we'll infer it from the extension.
            const type = url.match(/\.(mp4|mov)$/i) ? "VIDEO" : "IMAGE";
            const childId = await createInstagramMediaContainer(
              accessToken,
              url,
              type,
              "" // No caption for children
            );
            await waitForInstagramContainer(accessToken, childId);
            childContainerIds.push(childId);
          }
          finalContainerId = await createInstagramCarouselContainer(
            accessToken,
            childContainerIds,
            post.caption || ""
          );
        } else {
          finalContainerId = await createInstagramMediaContainer(
            accessToken,
            mediaUrls[0],
            post.media_type as "IMAGE" | "VIDEO" | "REELS",
            post.caption || "",
            post.audio_id
          );
        }

        await waitForInstagramContainer(accessToken, finalContainerId);
        publishedPostId = await publishInstagramMedia(accessToken, finalContainerId);

      } catch (err) {
        status = "FAILED";
        errorMsg = err instanceof Error ? err.message : "Publishing failed";
        console.error(`Error publishing post ${post.id}:`, err);
      }

      // Update the post status in DB
      const updatePayload: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "PUBLISHED") {
        updatePayload.instagram_media_id = finalContainerId;
        updatePayload.instagram_post_id = publishedPostId;
        updatePayload.published_at = new Date().toISOString();
      } else {
        updatePayload.error_message = errorMsg;
      }

      await (supabase.from("instagram_content_publishing") as any)
        .update(updatePayload)
        .eq("id", post.id);

      results.push({
        id: post.id,
        status,
        error: errorMsg,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });

  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
