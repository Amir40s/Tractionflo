import { NextResponse, type NextRequest } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import {
  createInstagramMediaContainer,
  createInstagramCarouselContainer,
  publishInstagramMedia,
  waitForInstagramContainer,
} from "@/lib/instagram-business-context";

export const dynamic = "force-dynamic";

const POST_MEDIA_BUCKET = "instagram-attachments";
const MAX_POST_MEDIA_BYTES = 50 * 1024 * 1024;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof value !== "string" && Boolean(value?.size) && typeof value?.arrayBuffer === "function";
}

function getPostMediaType(file: File): "IMAGE" | "REELS" {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "REELS";
  throw new Error("Upload an image or video file for the Instagram post.");
}

function getSafeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "post-media";
}

async function ensurePostMediaBucket(supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const { data: bucket } = await supabase.storage.getBucket(POST_MEDIA_BUCKET);
  if (bucket) return;

  const { error } = await supabase.storage.createBucket(POST_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: MAX_POST_MEDIA_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Could not prepare post media storage: ${error.message}`);
  }
}

async function uploadPostMedia(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  file: File
) {
  if (file.size > MAX_POST_MEDIA_BYTES) {
    throw new Error(`${file.name} is too large. Keep post uploads under 50MB.`);
  }

  const mediaType = getPostMediaType(file);
  const path = `posts/${userId}/${Date.now()}-${globalThis.crypto.randomUUID()}-${getSafeFileName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(POST_MEDIA_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Could not upload ${file.name}: ${error.message}`);
  }

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error(`Could not create a public URL for ${file.name}.`);
  }

  return { mediaType, mediaUrl: data.publicUrl, fileName: file.name };
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);
    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent." }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!storedAccount?.access_token) {
      return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    }

    // Must have a connected profile to link in DB
    const { data: profileData } = await (supabase
      .from("instagram_business_profiles") as any)
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!profileData?.id) {
      return NextResponse.json({ error: "No Instagram business profile found." }, { status: 400 });
    }

    const accessToken = storedAccount.access_token;
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Must use multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const caption = formData.get("caption")?.toString() || "";
    const scheduledFor = formData.get("scheduledFor")?.toString() || null;
    const audioId = formData.get("audioId")?.toString() || undefined;
    const audioName = formData.get("audioName")?.toString() || undefined;
    
    // Process media files
    const mediaFiles: File[] = [];
    formData.getAll("media").forEach((val) => {
      if (isUploadFile(val)) mediaFiles.push(val);
    });

    if (mediaFiles.length === 0) {
      return NextResponse.json({ error: "Please upload at least one image or video." }, { status: 400 });
    }
    if (mediaFiles.length > 10) {
      return NextResponse.json({ error: "You can upload a maximum of 10 files for a carousel." }, { status: 400 });
    }

    await ensurePostMediaBucket(supabase);
    
    const uploads = [];
    for (const file of mediaFiles) {
      uploads.push(await uploadPostMedia(supabase, user.id, file));
    }

    const isCarousel = uploads.length > 1;
    const finalMediaType = isCarousel ? "CAROUSEL" : uploads[0].mediaType;
    const mediaUrls = uploads.map(u => u.mediaUrl);

    // Save to DB
    const { data: dbEntry, error: dbError } = await (supabase.from("instagram_content_publishing") as any)
      .insert({
        user_id: user.id,
        profile_id: profileData.id,
        media_type: finalMediaType,
        media_urls: mediaUrls,
        caption,
        audio_id: audioId,
        audio_name: audioName,
        status: scheduledFor ? "SCHEDULED" : "DRAFT", // Wait, if not scheduled, we can publish immediately, let's treat no scheduledFor as immediate PUBLISH if a flag is passed, or just immediate.
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      })
      .select()
      .single();

    if (dbError || !dbEntry) {
      throw new Error(`Could not save post to database: ${dbError?.message}`);
    }

    // If there is a scheduled date, we stop here. Cron job will pick it up.
    if (scheduledFor) {
      return NextResponse.json({
        ok: true,
        message: "Post scheduled successfully",
        post: dbEntry
      });
    }

    // Publish immediately
    let finalContainerId: string;
    try {
      if (isCarousel) {
        const childContainerIds = [];
        for (const upload of uploads) {
          const childId = await createInstagramMediaContainer(
            accessToken,
            upload.mediaUrl,
            upload.mediaType,
            "" // No caption for children
          );
          await waitForInstagramContainer(accessToken, childId);
          childContainerIds.push(childId);
        }
        finalContainerId = await createInstagramCarouselContainer(
          accessToken,
          childContainerIds,
          caption
        );
      } else {
        finalContainerId = await createInstagramMediaContainer(
          accessToken,
          uploads[0].mediaUrl,
          uploads[0].mediaType,
          caption,
          audioId
        );
      }

      await waitForInstagramContainer(accessToken, finalContainerId);
      const publishedPostId = await publishInstagramMedia(accessToken, finalContainerId);

      // Update DB
      const { data: updatedEntry } = await (supabase.from("instagram_content_publishing") as any)
        .update({
          status: "PUBLISHED",
          instagram_media_id: finalContainerId,
          instagram_post_id: publishedPostId,
          published_at: new Date().toISOString(),
        })
        .eq("id", dbEntry.id)
        .select()
        .single();

      return NextResponse.json({
        ok: true,
        message: "Post published successfully",
        post: updatedEntry
      });

    } catch (publishError) {
      const errorMsg = publishError instanceof Error ? publishError.message : "Publishing failed";
      
      await (supabase.from("instagram_content_publishing") as any)
        .update({
          status: "FAILED",
          error_message: errorMsg
        })
        .eq("id", dbEntry.id);

      return NextResponse.json({
        ok: false,
        error: errorMsg,
        post: { ...dbEntry, status: "FAILED", error_message: errorMsg }
      }, { status: 400 });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create Instagram post";
    console.error("Instagram post create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
