import { NextResponse } from "next/server";
import {
  cancelPendingCommerceOrdersForSender,
  confirmLatestPendingCommerceOrder,
  createPendingCommerceOrder,
  type CommerceOrder,
  getCommerceOrderPublicCheckoutUrl,
  getLatestCommerceOrderForSender,
  hasCommerceOrderCheckoutButtonMessage,
  listCommerceOrdersForUser,
  hasCommerceOrderPaymentMessage,
  markCommerceOrderPaymentMessageSent,
  normalizeCommerceOrderDraft,
  prepareCommerceOrderCheckout,
} from "@/lib/commerce-orders";
import { sendInstagramCommercePaymentMessage } from "@/lib/instagram-send-api";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { findBestCatalogOffer, getInstagramProductCatalogForUser, isCatalogDeclineRequest } from "@/lib/instagram-product-catalog";
import { recordRevenueConversionEvent } from "@/lib/revenue-intelligence";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type CreateOrderPayload = {
  order?: unknown;
};

type ConfirmOrderPayload = {
  instagramSenderId?: string;
  instagramUsername?: string;
  conversationId?: string;
  confirmationText?: string;
  fallbackText?: string;
  sendConfirmation?: boolean;
};

async function getAuthenticatedUser() {
  const authSupabase = await createClient();
  const {
    data: { user },
    error,
  } = await authSupabase.auth.getUser();

  if (error || !user) {
    return { user: null };
  }

  return { user };
}

async function hasRecentProductRefusal({
  supabase,
  userId,
  conversationId,
}: {
  supabase: ReturnType<typeof createSupabaseServiceClient>;
  userId: string;
  conversationId: string;
}) {
  if (!conversationId) {
    return false;
  }

  const { data, error } = await supabase
    .from("messages")
    .select("text")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("timestamp", { ascending: false })
    .limit(8);

  if (error) {
    console.warn("Could not check recent product refusals for pending orders:", error);
    return false;
  }

  return (data || []).some((row) => isCatalogDeclineRequest(String((row as any).text || "")));
}

async function cancelRefusedPendingOrders({
  supabase,
  userId,
  orders,
}: {
  supabase: ReturnType<typeof createSupabaseServiceClient>;
  userId: string;
  orders: CommerceOrder[];
}) {
  const pendingBySender = new Map<string, CommerceOrder>();

  for (const order of orders) {
    if (order.status !== "pending_confirmation" || !order.instagramSenderId) {
      continue;
    }

    pendingBySender.set(order.instagramSenderId, order);
  }

  const cancelled: CommerceOrder[] = [];
  for (const order of pendingBySender.values()) {
    const conversationId = order.conversationId || order.instagramSenderId;
    const hasRefusal = await hasRecentProductRefusal({
      supabase,
      userId,
      conversationId,
    });

    if (!hasRefusal) {
      continue;
    }

    const cancelledOrders = await cancelPendingCommerceOrdersForSender(supabase, {
      userId,
      instagramSenderId: order.instagramSenderId,
      reason: "Recent customer message declined product offers.",
      source: "commerce_orders_get_product_refusal_cleanup",
    });
    cancelled.push(...cancelledOrders);
  }

  return cancelled;
}

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated", orders: [] }, { status: 401 });
    }

    const serviceSupabase = createSupabaseServiceClient();
    const result = await listCommerceOrdersForUser(serviceSupabase, user.id);
    const cancelled = result.tableReady
      ? await cancelRefusedPendingOrders({
          supabase: serviceSupabase,
          userId: user.id,
          orders: result.orders,
        })
      : [];

    if (cancelled.length > 0) {
      return NextResponse.json(await listCommerceOrdersForUser(serviceSupabase, user.id));
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load orders";
    console.error("Commerce orders load error:", error);
    return NextResponse.json({ error: message, orders: [], tableReady: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = (await request.json()) as CreateOrderPayload;
    const draft = normalizeCommerceOrderDraft(payload.order);

    if (!draft) {
      return NextResponse.json({ error: "A product/order payload is required." }, { status: 400 });
    }

    const serviceSupabase = createSupabaseServiceClient();
    const order = await createPendingCommerceOrder(serviceSupabase, user.id, draft);

    if (!order) {
      return NextResponse.json({
        order: null,
        tableReady: false,
        error: "Commerce order table is not ready. Apply migrations/20260619_commerce_orders.sql.",
      }, { status: 202 });
    }

    return NextResponse.json({ order, tableReady: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create order";
    console.error("Commerce order create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = (await request.json()) as ConfirmOrderPayload;
    const serviceSupabase = createSupabaseServiceClient();
    const instagramSenderId = String(payload.instagramSenderId || "").trim();
    const conversationId = String(payload.conversationId || "").trim();
    const confirmationText = String(payload.confirmationText || "Confirmed").trim();
    let alreadyConfirmed = false;
    let order = await confirmLatestPendingCommerceOrder(serviceSupabase, {
      userId: user.id,
      instagramSenderId,
      conversationId,
      confirmationText,
    });

    if (!order) {
      order = await getLatestCommerceOrderForSender(serviceSupabase, {
        userId: user.id,
        instagramSenderId,
        statuses: ["confirmed", "paid"],
      });
      alreadyConfirmed = Boolean(order);
    }

    if (!order && payload.fallbackText) {
      const catalog = await getInstagramProductCatalogForUser(serviceSupabase, user.id).catch((catalogError) => {
        console.error("Commerce order fallback catalog load error:", catalogError);
        return [];
      });
      const offer = findBestCatalogOffer(String(payload.fallbackText || ""), catalog);

      if (offer) {
        const pendingOrder = await createPendingCommerceOrder(serviceSupabase, user.id, {
          conversationId,
          instagramSenderId,
          instagramUsername: String(payload.instagramUsername || "").trim(),
          productId: offer.id,
          sourceMediaId: offer.sourceMediaId,
          productTitle: offer.title,
          productDescription: offer.description,
          productImageUrl: offer.imageUrl,
          productPermalink: offer.permalink,
          priceText: offer.priceText,
          amount: offer.priceAmount,
          currency: offer.currency || "USD",
          source: "instagram_confirmation_recovery",
          metadata: {
            matchScore: offer.matchScore,
            confidence: offer.confidence,
            recoveredFromConfirmation: true,
          },
        });

        if (pendingOrder) {
          order = await confirmLatestPendingCommerceOrder(serviceSupabase, {
            userId: user.id,
            instagramSenderId,
            conversationId,
            confirmationText,
          });
        }
      }
    }

    if (!order) {
      return NextResponse.json({
        order: null,
        tableReady: false,
        error: "No pending order was found to confirm.",
      }, { status: 404 });
    }

    const checkout = await prepareCommerceOrderCheckout(serviceSupabase, {
      userId: user.id,
      order,
    });
    order = checkout.order;

    let confirmationSent = false;
    let confirmationMessageId = "";
    const shouldSendConfirmationText = payload.sendConfirmation !== false && !hasCommerceOrderPaymentMessage(order);
    const shouldSendCheckoutButton = Boolean(
      payload.sendConfirmation !== false &&
        checkout.checkoutUrl &&
        !hasCommerceOrderCheckoutButtonMessage(order)
    );
    const customerCheckoutUrl = checkout.checkoutUrl ? getCommerceOrderPublicCheckoutUrl(order) : "";

    await recordRevenueConversionEvent({
      supabase: serviceSupabase,
      userId: user.id,
      instagramSenderId,
      conversationId,
      eventType: alreadyConfirmed ? "order_confirmation_replayed" : "order_confirmed",
      outcomeType: "purchase_product",
      status: "pending",
      value: order.amount,
      currency: order.currency,
      commerceOrder: order,
      metadata: {
        checkoutCreated: checkout.checkoutCreated,
        checkoutConfigured: checkout.checkoutConfigured,
        source: "commerce_orders_patch",
      },
    }).catch((rosError) => {
      console.error("Commerce order ROS event error:", rosError);
    });

    if (checkout.checkoutUrl) {
      await recordRevenueConversionEvent({
        supabase: serviceSupabase,
        userId: user.id,
        instagramSenderId,
        conversationId,
        eventType: "checkout_created",
        outcomeType: "purchase_product",
        status: "pending",
        value: order.amount,
        currency: order.currency,
        commerceOrder: order,
        metadata: {
          checkoutUrl: customerCheckoutUrl,
          source: "commerce_orders_patch",
        },
      }).catch((rosError) => {
        console.error("Commerce checkout ROS event error:", rosError);
      });
    }

    if (shouldSendConfirmationText || shouldSendCheckoutButton) {
      const account = await getFreshInstagramAccount(serviceSupabase, user.id).catch((accountError) => {
        console.error("Commerce order confirmation account load error:", accountError);
        return null;
      });

      if (account?.access_token && order.instagramSenderId) {
        await sendInstagramCommercePaymentMessage({
          accessToken: account.access_token,
          recipientId: order.instagramSenderId,
          order,
          checkoutUrl: customerCheckoutUrl,
          alreadyConfirmed,
          sendText: shouldSendConfirmationText,
          sendCheckoutButton: shouldSendCheckoutButton,
        })
          .then(async (sent) => {
            confirmationSent = true;
            confirmationMessageId = sent.messageId || "";
            if (checkout.checkoutUrl) {
              order = await markCommerceOrderPaymentMessageSent(serviceSupabase, {
                userId: user.id,
                order: order!,
                messageId: confirmationMessageId,
                source: alreadyConfirmed ? "inbox_already_confirmed_payment_fallback" : "inbox_confirm_payment",
                textMessageId: sent.textMessageId,
                checkoutButtonMessageId: sent.checkoutButtonMessageId,
                checkoutFallbackMessageId: sent.checkoutFallbackMessageId,
              });
            }
          })
          .catch((sendError) => {
            console.error("Commerce order confirmation Instagram send error:", sendError);
          });
      }
    }

    return NextResponse.json({
      order,
      tableReady: true,
      confirmationSent,
      confirmationMessageId,
      checkoutUrl: customerCheckoutUrl,
      checkoutConfigured: checkout.checkoutConfigured,
      checkoutCreated: checkout.checkoutCreated,
      checkoutError: checkout.error || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm order";
    console.error("Commerce order confirm error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
