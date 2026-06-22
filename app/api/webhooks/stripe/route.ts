import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { sendCommerceOrderPaymentThankYou } from "@/lib/commerce-payment-notifications";
import {
  markCommerceOrderPaid,
  markCommerceOrderPaymentFailed,
} from "@/lib/commerce-orders";
import logger from "@/lib/logger";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { recordRevenueConversionEvent } from "@/lib/revenue-intelligence";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: StripeCheckoutSession | StripePaymentIntent;
  };
};

type StripeCheckoutSession = {
  id?: string;
  object?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string | undefined> | null;
  payment_status?: string | null;
  status?: string | null;
  payment_intent?: string | StripePaymentIntent | null;
};

type StripePaymentIntent = {
  id?: string;
  object?: string;
  metadata?: Record<string, string | undefined> | null;
  status?: string | null;
  last_payment_error?: {
    message?: string;
  } | null;
};

function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

function parseStripeSignatureHeader(header: string) {
  return header.split(",").reduce(
    (parts, item) => {
      const [key, value] = item.split("=");

      if (key && value) {
        parts[key] = value;
      }

      return parts;
    },
    {} as Record<string, string>
  );
}

function verifyStripeWebhookSignature(body: string, signatureHeader: string) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }

  const parts = parseStripeSignatureHeader(signatureHeader);
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    throw new Error("Invalid Stripe signature header.");
  }

  const timestampMs = Number(timestamp) * 1000;
  const toleranceMs = 5 * 60 * 1000;

  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > toleranceMs) {
    throw new Error("Stripe webhook timestamp is outside the allowed tolerance.");
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error("Stripe webhook signature verification failed.");
  }
}

function getStripeObjectMetadata(object: StripeCheckoutSession | StripePaymentIntent) {
  return object.metadata && typeof object.metadata === "object" ? object.metadata : {};
}

function getOrderIdFromStripeObject(object: StripeCheckoutSession | StripePaymentIntent) {
  const metadata = getStripeObjectMetadata(object);
  return metadata.order_id || ("client_reference_id" in object ? object.client_reference_id || "" : "");
}

function getUserIdFromStripeObject(object: StripeCheckoutSession | StripePaymentIntent) {
  return getStripeObjectMetadata(object).user_id || "";
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

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") || "";
  const body = await request.text();

  try {
    verifyStripeWebhookSignature(body, signature);
  } catch (error) {
    logger.warn("Stripe webhook signature rejected.", { error });
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(body) as StripeEvent;
  } catch (error) {
    logger.warn("Stripe webhook body could not be parsed.", { error });
    return NextResponse.json({ error: "Invalid Stripe event." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const object = event.data?.object;

  try {
    if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") && object) {
      const session = object as StripeCheckoutSession;
      const orderId = getOrderIdFromStripeObject(session);
      const userId = getUserIdFromStripeObject(session);
      const paymentIntentId = getPaymentIntentId(session);

      if (orderId && session.payment_status === "paid") {
        const order = await markCommerceOrderPaid(supabase, {
          orderId,
          userId,
          stripeCheckoutSessionId: session.id || "",
          stripePaymentIntentId: paymentIntentId,
          stripePaymentStatus: session.payment_status || "paid",
          metadata: {
            stripeEventId: event.id || "",
            stripeCheckoutCompletedAt: new Date().toISOString(),
          },
        });

        if (order?.userId) {
          await recordRevenueConversionEvent({
            supabase,
            userId: order.userId,
            instagramSenderId: order.instagramSenderId,
            conversationId: order.conversationId,
            eventType: "payment_paid",
            outcomeType: "purchase_product",
            status: "won",
            value: order.amount,
            currency: order.currency,
            commerceOrder: order,
            metadata: {
              source: "stripe-webhook",
              stripeEventId: event.id || "",
              checkoutSessionId: session.id || "",
              paymentIntentId,
            },
          }).catch((rosError) => {
            logger.warn("Could not record ROS paid payment event.", { error: rosError, orderId: order.id });
          });

          await sendCommerceOrderPaymentThankYou(supabase, order, "stripe-webhook-payment-complete");
          await triggerRealtimeNotification([getUserChannel(order.userId), getSuperAdminChannel()], {
            type: "billing",
            title: "Instagram order paid",
            body: `${order.productTitle || "Instagram order"} is now paid.`,
            url: "/dashboard",
            metadata: {
              source: "stripe-webhook",
              orderId: order.id,
              checkoutSessionId: session.id || "",
              paymentIntentId,
            },
          }).catch((notificationError) => {
            logger.error("Stripe payment notification error:", { error: notificationError });
          });
        }
      }
    }

    if (event.type === "checkout.session.expired" && object) {
      const session = object as StripeCheckoutSession;
      const failedOrder = await markCommerceOrderPaymentFailed(supabase, {
        orderId: getOrderIdFromStripeObject(session),
        userId: getUserIdFromStripeObject(session),
        stripeCheckoutSessionId: session.id || "",
        stripePaymentIntentId: getPaymentIntentId(session),
        reason: "Checkout session expired before payment.",
      });

      if (failedOrder?.userId) {
        await recordRevenueConversionEvent({
          supabase,
          userId: failedOrder.userId,
          instagramSenderId: failedOrder.instagramSenderId,
          conversationId: failedOrder.conversationId,
          eventType: "checkout_expired",
          outcomeType: "purchase_product",
          status: "failed",
          value: failedOrder.amount,
          currency: failedOrder.currency,
          commerceOrder: failedOrder,
          metadata: {
            source: "stripe-webhook",
            checkoutSessionId: session.id || "",
          },
        }).catch((rosError) => {
          logger.warn("Could not record ROS checkout expired event.", { error: rosError, orderId: failedOrder.id });
        });
      }
    }

    if (event.type === "payment_intent.payment_failed" && object) {
      const paymentIntent = object as StripePaymentIntent;
      const failedOrder = await markCommerceOrderPaymentFailed(supabase, {
        orderId: getOrderIdFromStripeObject(paymentIntent),
        userId: getUserIdFromStripeObject(paymentIntent),
        stripePaymentIntentId: paymentIntent.id || "",
        reason: paymentIntent.last_payment_error?.message || "Payment failed.",
      });

      if (failedOrder?.userId) {
        await recordRevenueConversionEvent({
          supabase,
          userId: failedOrder.userId,
          instagramSenderId: failedOrder.instagramSenderId,
          conversationId: failedOrder.conversationId,
          eventType: "payment_failed",
          outcomeType: "purchase_product",
          status: "failed",
          value: failedOrder.amount,
          currency: failedOrder.currency,
          commerceOrder: failedOrder,
          metadata: {
            source: "stripe-webhook",
            paymentIntentId: paymentIntent.id || "",
            reason: paymentIntent.last_payment_error?.message || "Payment failed.",
          },
        }).catch((rosError) => {
          logger.warn("Could not record ROS payment failed event.", { error: rosError, orderId: failedOrder.id });
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook processing error:", { error, eventType: event.type });
    return NextResponse.json({ error: "Could not process Stripe webhook." }, { status: 500 });
  }
}
