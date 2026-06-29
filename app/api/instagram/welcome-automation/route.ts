import { NextResponse } from "next/server";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import {
  defaultInstagramWelcomeAutomation,
  instagramWelcomeAutomationMetadataKey,
  normalizeInstagramWelcomeAutomation,
} from "@/lib/instagram-welcome-automation";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type WelcomeAutomationPayload = {
  enabled?: boolean;
  message?: string;
};

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return { supabase, user };
}

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      automation: normalizeInstagramWelcomeAutomation(
        (user.user_metadata || {})[instagramWelcomeAutomationMetadataKey]
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load welcome automation";
    console.error("Instagram welcome automation load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WelcomeAutomationPayload;
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = compactUserAuthMetadata(user.user_metadata || {});
    const current = normalizeInstagramWelcomeAutomation(metadata[instagramWelcomeAutomationMetadataKey]);
    const nextAutomation = normalizeInstagramWelcomeAutomation({
      ...current,
      enabled:
        typeof payload.enabled === "boolean"
          ? payload.enabled
          : current.enabled,
      message:
        typeof payload.message === "string"
          ? payload.message
          : current.message || defaultInstagramWelcomeAutomation.message,
    });
    const nextMetadata = {
      ...metadata,
      [instagramWelcomeAutomationMetadataKey]: nextAutomation,
    };
    const { data, error } = await supabase.auth.updateUser({ data: nextMetadata });

    if (error) {
      throw error;
    }

    await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
      type: "instagram",
      title: "Instagram welcome automation updated",
      body: nextAutomation.enabled
        ? "Welcome messages are enabled for new inbound Instagram DMs."
        : "Welcome messages are turned off.",
      url: "/instagram-content",
      metadata: {
        enabled: nextAutomation.enabled,
      },
    }).catch((notificationError) => {
      console.error("Realtime welcome automation notification error:", notificationError);
    });

    return NextResponse.json({
      automation: normalizeInstagramWelcomeAutomation(
        (data.user?.user_metadata || nextMetadata)[instagramWelcomeAutomationMetadataKey]
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save welcome automation";
    console.error("Instagram welcome automation save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
