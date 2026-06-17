import { NextResponse } from "next/server";
import { normalizeNotificationSettings } from "@/lib/notification-preferences";
import {
  getAuthorizedPusherChannels,
  getPusherClientConfig,
  getRealtimeEventName,
  getUserRoleFlags,
  isPusherConfigured,
} from "@/lib/pusher";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ enabled: false, error: "Not authenticated" }, { status: 401 });
    }

    const clientConfig = getPusherClientConfig();

    if (!clientConfig || !isPusherConfigured()) {
      return NextResponse.json({
        enabled: false,
        error:
          "Pusher is not configured. Add PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER, NEXT_PUBLIC_PUSHER_KEY, and NEXT_PUBLIC_PUSHER_CLUSTER.",
      });
    }

    return NextResponse.json({
      enabled: true,
      key: clientConfig.key,
      cluster: clientConfig.cluster,
      eventName: getRealtimeEventName(),
      channels: getAuthorizedPusherChannels(user),
      role: getUserRoleFlags(user),
      preferences: normalizeNotificationSettings((user.user_metadata || {}).notification_preferences),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load notification settings";
    console.error("Notification bootstrap error:", error);
    return NextResponse.json({ enabled: false, error: message }, { status: 500 });
  }
}
