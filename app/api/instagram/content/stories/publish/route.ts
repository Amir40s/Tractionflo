import { NextResponse, type NextRequest } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const STORY_MEDIA_BUCKET = "instagram-attachments";
const MAX_STORY_MEDIA_BYTES = 20 * 1024 * 1024;

type PublishStoryPayload = {
  mediaUrl?: string;
  mediaType?: "image" | "video";
};

type InstagramGraphError = {
  message?: string;
};

type InstagramContainerResponse = {
  id?: string;
  error?: InstagramGraphError;
};

type InstagramPublishResponse = {
  id?: string;
  error?: InstagramGraphError;
};

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof value !== "string" && Boolean(value?.size) && typeof value?.arrayBuffer === "function";
}

function getStoryMediaType(file: File): "image" | "video" {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  throw new Error("Upload an image or video file for the Instagram story.");
}

function getSafeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "story-media";
}

function assertPublicUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid public media URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Instagram story media must use a public HTTPS URL.");
  }

  return url.toString();
}

async function postInstagramGraph<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>
) {
  const url = new URL(`https://graph.instagram.com/v21.0/${path}`);
  url.searchParams.set("access_token", accessToken);

  const body = new URLSearchParams(params);
  const response = await fetch(url.toString(), {
    method: "POST",
    body,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: InstagramGraphError };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Instagram could not publish this story.");
  }

  return data;
}

async function ensureStoryMediaBucket(supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const { data: bucket } = await supabase.storage.getBucket(STORY_MEDIA_BUCKET);

  if (bucket) {
    return;
  }

  const { error } = await supabase.storage.createBucket(STORY_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: MAX_STORY_MEDIA_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Could not prepare story media storage: ${error.message}`);
  }
}

async function uploadStoryMedia(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  file: File
) {
  if (file.size > MAX_STORY_MEDIA_BYTES) {
    throw new Error(`${file.name} is too large. Keep story uploads under 20MB.`);
  }

  const mediaType = getStoryMediaType(file);
  const path = `stories/${userId}/${Date.now()}-${globalThis.crypto.randomUUID()}-${getSafeFileName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(STORY_MEDIA_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Could not upload ${file.name}: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORY_MEDIA_BUCKET).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error(`Could not create a public URL for ${file.name}.`);
  }

  return {
    mediaType,
    mediaUrl: data.publicUrl,
    fileName: file.name,
  };
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent." }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase);

    if (!storedAccount?.access_token) {
      return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    }

    const accessToken = storedAccount.access_token;
    const contentType = request.headers.get("content-type") || "";
    let mediaUrl = "";
    let mediaType: "image" | "video" = "image";
    let uploadedFileName = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("media");

      if (!isUploadFile(file)) {
        return NextResponse.json({ error: "Choose an image or video file to publish as a story." }, { status: 400 });
      }

      await ensureStoryMediaBucket(supabase);
      const upload = await uploadStoryMedia(supabase, user.id, file);
      mediaUrl = upload.mediaUrl;
      mediaType = upload.mediaType;
      uploadedFileName = upload.fileName;
    } else {
      const payload = (await request.json()) as PublishStoryPayload;
      mediaUrl = assertPublicUrl(String(payload.mediaUrl || "").trim());
      mediaType = payload.mediaType === "video" ? "video" : "image";
    }

    const container = await postInstagramGraph<InstagramContainerResponse>("me/media", accessToken, {
      media_type: "STORIES",
      [mediaType === "video" ? "video_url" : "image_url"]: mediaUrl,
    });

    if (!container.id) {
      throw new Error("Instagram did not return a story container.");
    }

    const published = await postInstagramGraph<InstagramPublishResponse>("me/media_publish", accessToken, {
      creation_id: container.id,
    });

    return NextResponse.json({
      ok: true,
      containerId: container.id,
      storyId: published.id || "",
      mediaType,
      mediaUrl,
      fileName: uploadedFileName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not publish Instagram story";
    console.error("Instagram story publish error:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
