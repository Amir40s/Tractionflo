import {
  buildCommerceOrderPaidReply,
  getCommerceOrderById,
  hasCommerceOrderPaymentThankYouMessage,
  markCommerceOrderPaymentThankYouMessageSent,
  type CommerceOrder,
} from "@/lib/commerce-orders";
import { persistCommercePaidThankYouOutboundMessage } from "@/lib/commerce-message-persistence";
import { sendInstagramTextMessage } from "@/lib/instagram-send-api";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import logger from "@/lib/logger";
import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export async function sendCommerceOrderPaymentThankYou(
  supabase: SupabaseServiceClient,
  order: CommerceOrder | null,
  source: string
) {
  if (!order?.id || !order.userId || !order.instagramSenderId) {
    return false;
  }

  const freshOrder = (await getCommerceOrderById(supabase, order.id).catch((error) => {
    logger.warn("Could not reload paid commerce order before thank-you message.", {
      error,
      orderId: order.id,
    });
    return null;
  })) || order;

  if (freshOrder.paymentStatus !== "paid" && freshOrder.status !== "paid") {
    return false;
  }

  if (hasCommerceOrderPaymentThankYouMessage(freshOrder)) {
    return false;
  }

  const account = await getFreshInstagramAccount(supabase, freshOrder.userId).catch((error) => {
    logger.warn("Could not load Instagram account for payment thank-you message.", {
      error,
      orderId: freshOrder.id,
      userId: freshOrder.userId,
    });
    return null;
  });

  if (!account?.access_token) {
    logger.warn("Payment thank-you message skipped because Instagram is not connected.", {
      orderId: freshOrder.id,
      userId: freshOrder.userId,
    });
    return false;
  }

  try {
    const text = buildCommerceOrderPaidReply(freshOrder);
    const sent = await sendInstagramTextMessage(
      account.access_token,
      freshOrder.instagramSenderId,
      text
    );

    await persistCommercePaidThankYouOutboundMessage({
      supabase,
      order: freshOrder,
      messageId: sent.message_id || "",
      text,
      senderId: account.ig_user_id || "",
      recipientId: freshOrder.instagramSenderId,
      source,
    });

    await markCommerceOrderPaymentThankYouMessageSent(supabase, {
      userId: freshOrder.userId,
      order: freshOrder,
      messageId: sent.message_id || "",
      source,
    });

    return true;
  } catch (error) {
    logger.error("Could not send payment thank-you Instagram message.", {
      error,
      orderId: freshOrder.id,
      userId: freshOrder.userId,
    });
    return false;
  }
}
