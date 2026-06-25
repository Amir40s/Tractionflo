import { NextResponse, type NextRequest } from "next/server";
import {
  type CommerceOrder,
  getCommerceOrderById,
  prepareCommerceOrderCheckout,
} from "@/lib/commerce-orders";
import { getFreshInstagramAccount, getFreshInstagramAccountByIgUserId } from "@/lib/instagram-token";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getOrderConversationId(order: { conversationId?: string; instagramSenderId?: string }) {
  return order.conversationId || order.instagramSenderId || "";
}

function addOrderReturnParams(url: URL, order: { id: string; conversationId?: string; instagramSenderId?: string }) {
  url.searchParams.set("order_id", order.id);

  const conversationId = getOrderConversationId(order);

  if (conversationId) {
    url.searchParams.set("conversation", conversationId);
  }
}

function getReturnTo(requestUrl: URL) {
  if (requestUrl.searchParams.get("return_to") === "instagram") {
    return "instagram";
  }

  return requestUrl.searchParams.get("return_to") === "inbox" ? "inbox" : "";
}

function buildInstagramInboxUrl(username = "") {
  const normalizedUsername = username.replace(/^@/, "").trim();

  if (normalizedUsername) {
    return new URL(`https://ig.me/m/${encodeURIComponent(normalizedUsername)}`);
  }

  return new URL("https://www.instagram.com/direct/inbox/");
}

function getMetadataString(metadata: Record<string, unknown> | undefined, keys: string[]) {
  const record = metadata || {};

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

async function getInstagramBusinessUsername(supabase: ReturnType<typeof createSupabaseServiceClient>, order: CommerceOrder) {
  const savedUsername = getMetadataString(order.metadata, ["businessInstagramUsername", "business_instagram_username"]);
  const savedInstagramId = getMetadataString(order.metadata, ["businessInstagramId", "business_instagram_id", "recipientId", "recipient_id"]);

  if (savedUsername) {
    return savedUsername;
  }

  try {
    let account = savedInstagramId
      ? await getFreshInstagramAccountByIgUserId(supabase, savedInstagramId)
      : null;

    if (!account?.access_token) {
      account = await getFreshInstagramAccount(supabase, order.userId);
    }

    if (!account?.access_token) {
      return "";
    }

    const profileUrl = new URL("https://graph.instagram.com/v21.0/me");
    profileUrl.searchParams.set("fields", "id,username");
    profileUrl.searchParams.set("access_token", account.access_token);

    const response = await fetch(profileUrl.toString(), { cache: "no-store" });
    const profile = (await response.json().catch(() => ({}))) as { username?: string };

    return response.ok && typeof profile.username === "string" ? profile.username.trim() : "";
  } catch {
    return "";
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const requestUrl = new URL(request.url);
  const cancelUrl = new URL("/checkout/cancel", requestUrl.origin);
  const returnTo = getReturnTo(requestUrl);

  if (returnTo) {
    cancelUrl.searchParams.set("return_to", returnTo);
  }

  try {
    const { orderId } = await context.params;
    const supabase = createSupabaseServiceClient();
    const order = await getCommerceOrderById(supabase, orderId);

    if (!order) {
      cancelUrl.searchParams.set("reason", "order_not_found");
      return NextResponse.redirect(cancelUrl, 303);
    }

    if (order.status === "paid" || order.paymentStatus === "paid") {
      if (returnTo === "instagram") {
        return NextResponse.redirect(buildInstagramInboxUrl(await getInstagramBusinessUsername(supabase, order)), 303);
      }

      const successUrl = new URL(returnTo === "inbox" ? "/conversations" : "/checkout/success", requestUrl.origin);
      addOrderReturnParams(successUrl, order);
      if (returnTo === "inbox") {
        successUrl.searchParams.set("payment", "success");
      }
      return NextResponse.redirect(successUrl, 303);
    }

    const checkout = await prepareCommerceOrderCheckout(supabase, {
      userId: order.userId,
      order,
      baseUrl: requestUrl.origin,
      forceNew: true,
      returnTo,
    });

    if (!checkout.checkoutUrl) {
      cancelUrl.searchParams.set("reason", checkout.error || "checkout_unavailable");
      return NextResponse.redirect(cancelUrl, 303);
    }

    return NextResponse.redirect(checkout.checkoutUrl, 303);
  } catch (error) {
    console.error("Commerce checkout redirect error:", error);
    cancelUrl.searchParams.set("reason", "checkout_error");
    return NextResponse.redirect(cancelUrl, 303);
  }
}
