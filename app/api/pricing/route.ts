import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { defaultPricingPlans, normalizePricingPlans } from "@/lib/pricing";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function getMetadata(user?: User | null) {
  return (user?.user_metadata || {}) as Record<string, unknown>;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function isSuperAdminUser(user?: User | null) {
  const metadata = getMetadata(user);
  const role = getMetadataString(metadata, "role").toLowerCase();
  const accountRole = getMetadataString(metadata, "account_role").toLowerCase();

  return (
    metadata.is_superadmin === true ||
    role === "superadmin" ||
    role === "super admin" ||
    accountRole === "superadmin" ||
    user?.email?.toLowerCase() === "tractionflo@gmail.com"
  );
}

async function listAllUsers(supabase: SupabaseClient) {
  const users: User[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    users.push(...(data.users || []));

    if (!data.users || data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function getPricingOwner(supabase: SupabaseClient) {
  const users = await listAllUsers(supabase);
  return users.find(isSuperAdminUser) || users.find((user) => user.email?.toLowerCase() === "tractionflo@gmail.com");
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const pricingOwner = await getPricingOwner(supabase);
    const metadata = getMetadata(pricingOwner);

    return NextResponse.json({
      plans: normalizePricingPlans(metadata.platform_pricing_plans || defaultPricingPlans),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load pricing plans";
    console.error("Pricing load error:", error);
    return NextResponse.json({ error: message, plans: defaultPricingPlans }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSuperAdminUser(user)) {
      return NextResponse.json({ error: "Only superadmins can update pricing." }, { status: 403 });
    }

    const payload = (await request.json()) as { plans?: unknown };
    const plans = normalizePricingPlans(payload.plans);
    const supabase = createSupabaseServiceClient();
    const currentMetadata = getMetadata(user);
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMetadata,
        platform_pricing_plans: plans,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ plans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update pricing plans";
    console.error("Pricing update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
