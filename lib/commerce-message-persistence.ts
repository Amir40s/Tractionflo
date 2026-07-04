import {
  buildCommerceOrderPaymentReply,
  type CommerceOrder,
} from "@/lib/commerce-orders";
import { storeInstagramMessage } from "@/lib/instagram-message-store";
import type { InstagramCommercePaymentSendResult } from "@/lib/instagram-send-api";
import logger from "@/lib/logger";
import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

function getMessageSenderId(order: CommerceOrder, senderId = "") {
  const metadataSenderId =
    typeof order.metadata?.businessInstagramId === "string" ? order.metadata.businessInstagramId.trim() : "";

  return senderId || metadataSenderId || "";
}

function buildCheckoutFallbackText(checkoutUrl: string) {
  return [
    "Secure checkout link:",
    checkoutUrl,
    "",
    "After payment is complete, your order will be marked as paid.",
  ].join("\n");
}

async function persistCommerceOutboundMessage({
  supabase,
  order,
  mid,
  senderId,
  recipientId,
  text,
  timestamp,
  source,
  messageType,
  rawEvent = {},
  metadata = {},
}: {
  supabase: SupabaseServiceClient;
  order: CommerceOrder;
  mid?: string;
  senderId?: string;
  recipientId?: string;
  text: string;
  timestamp: number;
  source: string;
  messageType: string;
  rawEvent?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const resolvedRecipientId = recipientId || order.instagramSenderId;
  const resolvedConversationId = order.conversationId || resolvedRecipientId;
  const resolvedSenderId = getMessageSenderId(order, senderId);
  const resolvedUserId = order.userId;

  if (!resolvedUserId || !resolvedConversationId || !resolvedRecipientId) {
    return;
  }

  await storeInstagramMessage({
    supabase,
    mid: mid || null,
    userId: resolvedUserId,
    conversationId: resolvedConversationId,
    senderId: resolvedSenderId,
    recipientId: resolvedRecipientId,
    direction: "outbound",
    text,
    timestamp,
    rawEvent: {
      message_id: mid || "",
      recipient_id: resolvedRecipientId,
      ...rawEvent,
    },
    metadata: {
      ...metadata,
      source,
      orderId: order.id,
      commerceOrderId: order.id,
      commerceMessageType: messageType,
    },
  });
}

export async function persistCommercePaymentOutboundMessages({
  supabase,
  order,
  sent,
  checkoutUrl,
  senderId = "",
  recipientId,
  alreadyConfirmed = false,
  source,
}: {
  supabase: SupabaseServiceClient;
  order: CommerceOrder;
  sent: InstagramCommercePaymentSendResult;
  checkoutUrl: string;
  senderId?: string;
  recipientId?: string;
  alreadyConfirmed?: boolean;
  source: string;
}) {
  const storedMids = new Set<string>();
  const startedAt = Date.now();
  const tasks: Array<Promise<void>> = [];

  if (sent.checkoutButtonMessageId) {
    storedMids.add(sent.checkoutButtonMessageId);
    tasks.push(
      persistCommerceOutboundMessage({
        supabase,
        order,
        mid: sent.checkoutButtonMessageId,
        senderId,
        recipientId,
        text: "",
        timestamp: startedAt,
        source,
        messageType: "checkout_button",
        rawEvent: {
          attachment: {
            type: "template",
            checkoutUrl,
          },
        },
        metadata: {
          checkoutUrl,
          checkoutButtonSent: true,
        },
      })
    );
  }

  if (sent.textMessageId) {
    storedMids.add(sent.textMessageId);
    tasks.push(
      persistCommerceOutboundMessage({
        supabase,
        order,
        mid: sent.textMessageId,
        senderId,
        recipientId,
        text: buildCommerceOrderPaymentReply(order, checkoutUrl, alreadyConfirmed, {
          includeCheckoutUrl: Boolean(checkoutUrl),
        }),
        timestamp: startedAt + tasks.length,
        source,
        messageType: sent.checkoutFallbackMessageId === sent.textMessageId ? "checkout_fallback_text" : "payment_text",
        rawEvent: {
          text: true,
          checkoutUrl,
        },
        metadata: {
          checkoutUrl,
          checkoutFallbackSent: sent.checkoutFallbackMessageId === sent.textMessageId,
        },
      })
    );
  }

  if (sent.checkoutFallbackMessageId && !storedMids.has(sent.checkoutFallbackMessageId)) {
    tasks.push(
      persistCommerceOutboundMessage({
        supabase,
        order,
        mid: sent.checkoutFallbackMessageId,
        senderId,
        recipientId,
        text: buildCheckoutFallbackText(checkoutUrl),
        timestamp: startedAt + tasks.length,
        source,
        messageType: "checkout_fallback_text",
        rawEvent: {
          text: true,
          checkoutUrl,
        },
        metadata: {
          checkoutUrl,
          checkoutFallbackSent: true,
        },
      })
    );
  }

  await Promise.all(
    tasks.map((task) =>
      task.catch((error) => {
        logger.warn("Could not persist commerce payment outbound message.", {
          error,
          orderId: order.id,
          source,
        });
      })
    )
  );
}

export async function persistCommercePaidThankYouOutboundMessage({
  supabase,
  order,
  messageId,
  text,
  senderId = "",
  recipientId,
  source,
}: {
  supabase: SupabaseServiceClient;
  order: CommerceOrder;
  messageId?: string;
  text: string;
  senderId?: string;
  recipientId?: string;
  source: string;
}) {
  await persistCommerceOutboundMessage({
    supabase,
    order,
    mid: messageId || "",
    senderId,
    recipientId,
    text,
    timestamp: Date.now(),
    source,
    messageType: "payment_thank_you",
    rawEvent: {
      text,
    },
  }).catch((error) => {
    logger.warn("Could not persist commerce payment thank-you message.", {
      error,
      orderId: order.id,
      source,
    });
  });
}
