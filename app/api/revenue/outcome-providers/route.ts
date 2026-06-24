import { NextResponse } from "next/server";
import {
  normalizeRevenueOutcomeProviderSettings,
  revenueOutcomeProvidersMetadataKey,
} from "@/lib/revenue-outcome-providers";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import {
  loadRevenueOutcomeProviderSettings,
  saveRevenueProviderConnections,
  type RevenueProviderSecretInput,
} from "@/lib/revenue-provider-execution";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

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
    const serviceSupabase = createSupabaseServiceClient();
    const outcomeProviders = await loadRevenueOutcomeProviderSettings({
      supabase: serviceSupabase,
      userId: user.id,
      metadataValue: (user.user_metadata || {})[revenueOutcomeProvidersMetadataKey],
    });

    return NextResponse.json({
      outcomeProviders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load revenue outcome providers";
    console.error("Revenue outcome providers load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = compactUserAuthMetadata(user.user_metadata);
    const outcomeProviders = normalizeRevenueOutcomeProviderSettings(
      payload && typeof payload === "object" && "outcomeProviders" in payload
        ? (payload as { outcomeProviders?: unknown }).outcomeProviders
        : payload
    );
    const providerSecrets =
      payload && typeof payload === "object" && Array.isArray((payload as { providerSecrets?: unknown }).providerSecrets)
        ? ((payload as { providerSecrets: RevenueProviderSecretInput[] }).providerSecrets || [])
        : [];
    const serviceSupabase = createSupabaseServiceClient();

    await saveRevenueProviderConnections({
      supabase: serviceSupabase,
      userId: user.id,
      providers: outcomeProviders.providers,
      secrets: providerSecrets,
    });

    const { error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      throw error;
    }

    await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
      type: "system",
      title: "Revenue outcome providers saved",
      body: "Newsletter, booking, trial, renewal, upgrade, cart, or testimonial outcome routes were updated.",
      url: "/settings",
      metadata: {
        connectedProviders: outcomeProviders.providers.filter((provider) => provider.enabled && provider.actionUrl).length,
      },
    }).catch((notificationError) => {
      console.error("Realtime outcome provider notification error:", notificationError);
    });

    const mergedOutcomeProviders = await loadRevenueOutcomeProviderSettings({
      supabase: serviceSupabase,
      userId: user.id,
      metadataValue: outcomeProviders,
    });

    return NextResponse.json({
      outcomeProviders: mergedOutcomeProviders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save revenue outcome providers";
    console.error("Revenue outcome providers save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
