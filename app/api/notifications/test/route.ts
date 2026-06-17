import { NextResponse } from "next/server";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function isSuperAdmin(metadata: Record<string, unknown>, email?: string) {
  const role = getMetadataString(metadata, "role").toLowerCase();
  const accountRole = getMetadataString(metadata, "account_role").toLowerCase();

  return (
    metadata.is_superadmin === true ||
    role === "superadmin" ||
    role === "super admin" ||
    accountRole === "superadmin" ||
    email?.toLowerCase() === "tractionflo@gmail.com"
  );
}

export async function POST() {
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
    const channels = [getUserChannel(user.id)];

    if (isSuperAdmin(metadata, user.email || undefined)) {
      channels.push(getSuperAdminChannel());
    }

    const result = await triggerRealtimeNotification(channels, {
      type: "system",
      title: "Realtime notifications are working",
      body: "Pusher delivered this test notification through TractionFlo.",
      url: "/settings",
      metadata: {
        test: true,
      },
    });

    if (!result.sent) {
      return NextResponse.json({ error: result.reason || "Pusher is not configured" }, { status: 503 });
    }

    return NextResponse.json({ ok: true, channels: result.channels });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send test notification";
    console.error("Realtime notification test error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
