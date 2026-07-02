import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getInstagramProductCatalogForUser } from "@/lib/instagram-product-catalog";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated", catalog: [] }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content") && !canAccessPage(permissions, "inbox")) {
      return NextResponse.json({ error: "Instagram catalog is not enabled for this agent.", catalog: [] }, { status: 403 });
    }

    return NextResponse.json({
      catalog: [],
      count: 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Instagram catalog";
    console.error("Instagram catalog error:", error);
    return NextResponse.json({ error: message, catalog: [] }, { status: 502 });
  }
}
