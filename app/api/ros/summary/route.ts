import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { buildRevenueOperatingSummary } from "@/lib/revenue-analytics";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import { loadRevenueOutcomeProviderSettings } from "@/lib/revenue-provider-execution";
import { revenueOutcomeProvidersMetadataKey } from "@/lib/revenue-outcome-providers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error,
    } = await authSupabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const permissions = getUserPermissionProfile(metadata);

    if (!canAccessPage(permissions, "ros")) {
      return NextResponse.json({ error: "ROS is not enabled for this account." }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const outcomeProviders = await loadRevenueOutcomeProviderSettings({
      supabase,
      userId: user.id,
      metadataValue: metadata[revenueOutcomeProvidersMetadataKey],
    });
    
    const summary = await buildRevenueOperatingSummary({ supabase, userId: user.id, outcomeProviders });

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load ROS summary";
    console.error("ROS summary error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
