import { NextResponse, type NextRequest } from "next/server";
import { sendCommerceOrderPaymentThankYou } from "@/lib/commerce-payment-notifications";
import {
  getCommerceOrderById,
  markCommerceOrderPaid,
} from "@/lib/commerce-orders";
import logger from "@/lib/logger";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
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

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

function getReturnTo(requestUrl: URL) {
  return requestUrl.searchParams.get("return_to") === "inbox" ? "inbox" : "";
}

function getCompletionRedirect(requestUrl: URL, orderId: string) {
  const returnTo = getReturnTo(requestUrl);

  if (returnTo === "inbox") {
    const inboxUrl = new URL("/conversations", requestUrl.origin);
    inboxUrl.searchParams.set("payment", "success");
    inboxUrl.searchParams.set("order_id", orderId);
    return inboxUrl;
  }

  const successUrl = new URL("/checkout/success", requestUrl.origin);
  successUrl.searchParams.set("order_id", orderId);
  return successUrl;
}

function getCancelRedirect(requestUrl: URL, reason: string, orderId = "") {
  const returnTo = getReturnTo(requestUrl);

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

async function retrieveStripeCheckoutSession(sessionId: string) {
  const stripeSecretKey = getStripeSecretKey();

  if (!stripeSecretKey) {
    throw new Error("Stripe checkout is not configured.");
  }

  const sessionUrl = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  sessionUrl.searchParams.append("expand[]", "payment_intent");

  const response = await fetch(sessionUrl.toString(), {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
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
      return NextResponse.redirect(getCompletionRedirect(requestUrl, order.id), 303);
    }

    const session = await retrieveStripeCheckoutSession(sessionId);
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

    return NextResponse.redirect(getCompletionRedirect(requestUrl, order.id), 303);
  } catch (error) {
    logger.error("Stripe checkout completion error:", {
      error,
      orderId,
      sessionId,
    });
    return NextResponse.redirect(getCancelRedirect(requestUrl, "checkout_completion_error", orderId), 303);
  }
}
