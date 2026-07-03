import { NextResponse, type NextRequest } from "next/server";
import { sendCommerceOrderPaymentThankYou } from "@/lib/commerce-payment-notifications";
import {
  type CommerceOrder,
  getCommerceOrderById,
  getCommerceStripeSecretKeyForUser,
  markCommerceOrderPaid,
} from "@/lib/commerce-orders";
import { getFreshInstagramAccount, getFreshInstagramAccountByIgUserId } from "@/lib/instagram-token";
import logger from "@/lib/logger";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { recordRevenueConversionEvent } from "@/lib/revenue-intelligence";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type StripeCheckoutSession = {
  id?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string | undefined> | null;
  payment_status?: string | null;
  status?: string | null;
  payment_intent?: string | { id?: string } | null;
  error?: {
    message?: string;
  };
};

function getReturnTo(requestUrl: URL) {
  if (requestUrl.searchParams.get("return_to") === "instagram") {
    return "instagram";
  }

  return requestUrl.searchParams.get("return_to") === "inbox" ? "inbox" : "";
}

function getOrderConversationId(order: { conversationId?: string; instagramSenderId?: string }) {
  return order.conversationId || order.instagramSenderId || "";
}

function setInboxOrderParams(url: URL, order: { id: string; conversationId?: string; instagramSenderId?: string }) {
  url.searchParams.set("payment", "success");
  url.searchParams.set("order_id", order.id);

  const conversationId = getOrderConversationId(order);

  if (conversationId) {
    url.searchParams.set("conversation", conversationId);
  }
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

async function getCompletionRedirect(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  requestUrl: URL,
  order: CommerceOrder
) {
  const returnTo = getReturnTo(requestUrl);

  if (returnTo === "instagram") {
    return buildInstagramInboxUrl(await getInstagramBusinessUsername(supabase, order));
  }

  if (returnTo === "inbox") {
    const inboxUrl = new URL("/conversations", requestUrl.origin);
    setInboxOrderParams(inboxUrl, order);
    return inboxUrl;
  }

  const successUrl = new URL("/checkout/success", requestUrl.origin);
  successUrl.searchParams.set("order_id", order.id);
  successUrl.searchParams.set("return_to", "instagram");

  const conversationId = getOrderConversationId(order);

  if (conversationId) {
    successUrl.searchParams.set("conversation", conversationId);
  }

  return successUrl;
}

function getCancelRedirect(requestUrl: URL, reason: string, orderId = "") {
  const returnTo = getReturnTo(requestUrl);

  if (returnTo === "instagram") {
    return buildInstagramInboxUrl();
  }

  if (returnTo === "inbox") {
    const inboxUrl = new URL("/conversations", requestUrl.origin);
    inboxUrl.searchParams.set("payment", "failed");
    if (orderId) {
      inboxUrl.searchParams.set("order_id", orderId);
    }
    inboxUrl.searchParams.set("reason", reason);
    return inboxUrl;
  }

  const cancelUrl = new URL("/checkout/cancel", requestUrl.origin);
  if (orderId) {
    cancelUrl.searchParams.set("order_id", orderId);
  }
  cancelUrl.searchParams.set("reason", reason);
  return cancelUrl;
}

function getOrderIdFromStripeSession(session: StripeCheckoutSession) {
  return session.metadata?.order_id || session.client_reference_id || "";
}

function getPaymentIntentId(session: StripeCheckoutSession) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  if (session.payment_intent && typeof session.payment_intent === "object") {
    return session.payment_intent.id || "";
  }

  return "";
}

async function retrieveStripeCheckoutSession(sessionId: string, stripeSecretKey: string) {
  const resolvedStripeSecretKey = stripeSecretKey.trim();

  if (!resolvedStripeSecretKey) {
    throw new Error("Stripe checkout is not configured for this account.");
  }

  const sessionUrl = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  sessionUrl.searchParams.append("expand[]", "payment_intent");

  const response = await fetch(sessionUrl.toString(), {
    headers: {
      Authorization: `Bearer ${resolvedStripeSecretKey}`,
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as StripeCheckoutSession;

  if (!response.ok || data.error || !data.id) {
    throw new Error(data.error?.message || "Could not verify Stripe checkout session.");
  }

  return data;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const orderId = requestUrl.searchParams.get("order_id") || "";
  const sessionId = requestUrl.searchParams.get("session_id") || "";

  if (!orderId || !sessionId) {
    return NextResponse.redirect(getCancelRedirect(requestUrl, "missing_payment_details", orderId), 303);
  }

  const supabase = createSupabaseServiceClient();

  try {
    const order = await getCommerceOrderById(supabase, orderId);

    if (!order) {
      return NextResponse.redirect(getCancelRedirect(requestUrl, "order_not_found", orderId), 303);
    }

    if (order.paymentStatus === "paid" || order.status === "paid") {
      await sendCommerceOrderPaymentThankYou(supabase, order, "stripe-return-already-paid");
      return NextResponse.redirect(await getCompletionRedirect(supabase, requestUrl, order), 303);
    }

    const stripeSecretKey = await getCommerceStripeSecretKeyForUser(supabase, order.userId);
    const session = await retrieveStripeCheckoutSession(sessionId, stripeSecretKey);
    const stripeOrderId = getOrderIdFromStripeSession(session);

    if (stripeOrderId !== order.id) {
      logger.warn("Stripe checkout completion order mismatch.", {
        orderId: order.id,
        stripeOrderId,
        sessionId,
      });
      return NextResponse.redirect(getCancelRedirect(requestUrl, "order_mismatch", order.id), 303);
    }

    if (session.payment_status !== "paid") {
      return NextResponse.redirect(getCancelRedirect(requestUrl, "payment_not_paid", order.id), 303);
    }

    const paymentIntentId = getPaymentIntentId(session);
    const paidOrder = await markCommerceOrderPaid(supabase, {
      orderId: order.id,
      userId: order.userId,
      stripeCheckoutSessionId: session.id || "",
      stripePaymentIntentId: paymentIntentId,
      stripePaymentStatus: session.payment_status || "paid",
      metadata: {
        stripeCheckoutStatus: session.status || "",
        stripeReturnCompletedAt: new Date().toISOString(),
      },
    });

    if (paidOrder?.userId) {
      await recordRevenueConversionEvent({
        supabase,
        userId: paidOrder.userId,
        instagramSenderId: paidOrder.instagramSenderId,
        conversationId: paidOrder.conversationId,
        eventType: "payment_paid",
        outcomeType: "purchase_product",
        status: "won",
        value: paidOrder.amount,
        currency: paidOrder.currency,
        commerceOrder: paidOrder,
        metadata: {
          source: "stripe-return",
          checkoutSessionId: session.id || "",
          paymentIntentId,
        },
      }).catch((rosError) => {
        logger.warn("Could not record ROS paid checkout return event.", { error: rosError, orderId: paidOrder.id });
      });

      await sendCommerceOrderPaymentThankYou(supabase, paidOrder, "stripe-return-payment-complete");
      await triggerRealtimeNotification([getUserChannel(paidOrder.userId), getSuperAdminChannel()], {
        type: "billing",
        title: "Instagram order paid",
        body: `${paidOrder.productTitle || "Instagram order"} is now paid.`,
        url: "/dashboard",
        metadata: {
          source: "stripe-return",
          orderId: paidOrder.id,
          checkoutSessionId: session.id || "",
          paymentIntentId,
        },
      }).catch((notificationError) => {
        logger.error("Stripe return payment notification error:", { error: notificationError });
      });
    }

    return NextResponse.redirect(await getCompletionRedirect(supabase, requestUrl, paidOrder || order), 303);
  } catch (error) {
    logger.error("Stripe checkout completion error:", {
      error,
      orderId,
      sessionId,
    });
    return NextResponse.redirect(getCancelRedirect(requestUrl, "checkout_completion_error", orderId), 303);
  }
}
