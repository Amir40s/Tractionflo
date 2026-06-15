import { NextResponse } from "next/server";
import { normalizeNotificationSettings } from "@/lib/notification-preferences";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type NotificationPreferencesPayload = {
  notifications?: unknown;
};

export async function GET() {
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

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;

    return NextResponse.json({
      notifications: normalizeNotificationSettings(metadata.notification_preferences),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load notification preferences";
    console.error("Notification preferences load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NotificationPreferencesPayload;
    const supabase = await createClient();
    const {
      data: { user },
      error: currentUserError,
    } = await supabase.auth.getUser();

    if (currentUserError) {
      throw currentUserError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const notifications = normalizeNotificationSettings(payload.notifications);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        notification_preferences: notifications,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save notification preferences";
    console.error("Notification preferences save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
