import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import { defaultPricingPlans, findPricingPlan, normalizePricingPlans } from "@/lib/pricing";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function getMetadata(user?: User | null) {
  return compactUserAuthMetadata(user?.user_metadata);
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

async function getPricingPlans(supabase: SupabaseClient) {
  const users = await listAllUsers(supabase);
  const pricingOwner =
    users.find(isSuperAdminUser) || users.find((user) => user.email?.toLowerCase() === "tractionflo@gmail.com");
  return normalizePricingPlans(getMetadata(pricingOwner).platform_pricing_plans || defaultPricingPlans);
}

function getNextBillingDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

    const payload = (await request.json()) as { planId?: string };
    const planId = typeof payload.planId === "string" ? payload.planId : "";
    const supabase = createSupabaseServiceClient();
    const plans = await getPricingPlans(supabase);
    const plan = findPricingPlan(plans, planId);

    if (!plan || plan.status !== "active") {
      return NextResponse.json({ error: "This pricing plan is not available." }, { status: 400 });
    }

    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setDate(nextBilling.getDate() + 30);
    const metadata = getMetadata(user);
    const invoiceId = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${user.id
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase()}`;
    const nextMetadata = {
      ...metadata,
      role: getMetadataString(metadata, "role") || "Creator",
      plan: plan.name,
      subscription_plan: plan.name,
      subscription_plan_id: plan.id,
      billing_status: "Active",
      status: "Active",
      payment_status: "paid",
      payment_method: getMetadataString(metadata, "payment_method") || "App checkout",
      invoice_id: invoiceId,
      billing_date: now.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: nextBilling.toISOString(),
      mrr: plan.monthlyPrice,
      monthly_revenue: plan.monthlyPrice,
      revenue: plan.monthlyPrice,
      last_checkout_at: now.toISOString(),
    };

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: nextMetadata,
    });

    if (error) {
      throw error;
    }

    await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
      type: "billing",
      title: "Subscription updated",
      body: `${data.user?.email || user.email || "A creator"} moved to ${plan.name} at $${plan.monthlyPrice}/month.`,
      url: "/dashboard?admin=revenue-subscriptions",
      metadata: {
        planId: plan.id,
        monthlyPrice: plan.monthlyPrice,
      },
    }).catch((notificationError) => {
      console.error("Realtime billing notification error:", notificationError);
    });

    return NextResponse.json({
      plan,
      billing: {
        plan: plan.name,
        status: "Active",
        price: `$${plan.monthlyPrice} / month`,
        nextBillingDate: getNextBillingDate(),
        invoiceEmail: data.user?.email || user.email || "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update billing plan";
    console.error("Billing checkout error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
