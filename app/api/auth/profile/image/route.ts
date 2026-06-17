import crypto from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxUploadBytes = 8 * 1024 * 1024;
const compressedAvatarSize = 320;

function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folder = (process.env.CLOUDINARY_UPLOAD_FOLDER || process.env.CLOUDINARY_API_NAME || "tractionflo").trim();
  const missing = [];

  if (!cloudName) {
    missing.push("CLOUDINARY_CLOUD_NAME");
  }

  if (!apiKey) {
    missing.push("CLOUDINARY_API_KEY");
  }

  if (!apiSecret) {
    missing.push("CLOUDINARY_API_SECRET");
  }

  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  }

  return {
    cloudName: cloudName!,
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    folder,
  };
}

function createCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

async function uploadToCloudinary({
  bytes,
  userId,
}: {
  bytes: Buffer;
  userId: string;
}) {
  const { cloudName, apiKey, apiSecret, folder } = getCloudinaryEnv();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = `profile-${userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
  const signedParams = {
    folder,
    invalidate: "true",
    overwrite: "true",
    public_id: publicId,
    timestamp,
  };
  const signature = createCloudinarySignature(signedParams, apiSecret);
  const formData = new FormData();

  const uploadArrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  formData.append("file", new Blob([uploadArrayBuffer], { type: "image/webp" }), "profile.webp");
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  Object.entries(signedParams).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || "Cloudinary upload failed");
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id || `${folder}/${publicId}`,
    bytes: payload.bytes || bytes.length,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    }

    if (file.size > maxUploadBytes) {
      return NextResponse.json({ error: "Choose an image smaller than 8MB." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const compressedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(compressedAvatarSize, compressedAvatarSize, {
        fit: "cover",
        position: "attention",
      })
      .webp({
        quality: 78,
        effort: 4,
      })
      .toBuffer();
    const upload = await uploadToCloudinary({
      bytes: compressedBuffer,
      userId: user.id,
    });

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: "profile",
      title: "Profile image uploaded",
      body: `Compressed from ${Math.round(file.size / 1024)}KB to ${Math.round(upload.bytes / 1024)}KB before Cloudinary upload.`,
      url: "/dashboard?admin=profile",
      metadata: {
        originalBytes: file.size,
        compressedBytes: upload.bytes,
      },
    }).catch((notificationError) => {
      console.error("Realtime profile image notification error:", notificationError);
    });

    return NextResponse.json({
      url: upload.url,
      publicId: upload.publicId,
      originalBytes: file.size,
      compressedBytes: upload.bytes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload profile image";
    console.error("Profile image upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
