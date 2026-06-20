import {
  buildCommerceOrderPaymentReply,
  getCommerceOrderCheckoutUrl,
  getCommerceOrderPriceText,
  type CommerceOrder,
} from "@/lib/commerce-orders";

export type InstagramQuickReply = {
  content_type: "text";
  title: string;
  payload: string;
};

export type InstagramGraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

export type InstagramSendResult = {
  recipient_id?: string;
  message_id?: string;
  error?: InstagramGraphError;
};

type InstagramTextMessagePayload = {
  text: string;
  quick_replies?: InstagramQuickReply[];
};

type InstagramMediaMessagePayload = {
  attachment: {
    type: "image" | "video";
    payload: {
      url: string;
    };
  };
};

type InstagramTemplateMessagePayload = {
  attachment: {
    type: "template";
    payload: {
      template_type: "generic";
      elements: Array<{
        title: string;
        subtitle?: string;
        image_url?: string;
        default_action?: {
          type: "web_url";
          url: string;
        };
        buttons: Array<{
          type: "web_url";
          title: string;
          url: string;
        }>;
      }>;
    };
  };
};

type InstagramMessagePayload =
  | InstagramTextMessagePayload
  | InstagramMediaMessagePayload
  | InstagramTemplateMessagePayload;

export type InstagramCommercePaymentSendResult = {
  textMessageId: string;
  checkoutButtonMessageId: string;
  checkoutFallbackMessageId: string;
  checkoutButtonSent: boolean;
  checkoutFallbackSent: boolean;
  messageId: string;
  checkoutButtonError?: string;
};

export class InstagramSendApiError extends Error {
  graphError?: InstagramGraphError;

  constructor(message: string, graphError?: InstagramGraphError) {
    super(message);
    this.name = "InstagramSendApiError";
    this.graphError = graphError;
  }
}

function truncateInstagramText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3))}...`;
}

function getCheckoutCardSubtitle(order: CommerceOrder) {
  const price = getCommerceOrderPriceText(order);
  const bits = [price, "Secure Stripe checkout"].filter(Boolean);
  return truncateInstagramText(bits.join(" · "), 80);
}

function buildCheckoutFallbackText(checkoutUrl: string) {
  return [
    "Secure checkout link:",
    checkoutUrl,
    "",
    "After payment is complete, your order will be marked as paid.",
  ].join("\n");
}

export async function sendInstagramApiMessage(
  accessToken: string,
  recipientId: string,
  message: InstagramMessagePayload
) {
  const messageUrl = new URL("https://graph.instagram.com/v21.0/me/messages");
  messageUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(messageUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as InstagramSendResult;

  if (!response.ok || data.error) {
    throw new InstagramSendApiError(
      data.error?.message || "Instagram could not send this message.",
      data.error
    );
  }

  return data;
}

export function sendInstagramTextMessage(
  accessToken: string,
  recipientId: string,
  text: string,
  quickReplies: InstagramQuickReply[] = []
) {
  return sendInstagramApiMessage(accessToken, recipientId, {
    text,
    ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
  });
}

export async function sendInstagramTextMessageWithQuickReplyFallback(
  accessToken: string,
  recipientId: string,
  text: string,
  quickReplies: InstagramQuickReply[] = []
) {
  if (quickReplies.length === 0) {
    return sendInstagramTextMessage(accessToken, recipientId, text);
  }

  try {
    return await sendInstagramTextMessage(accessToken, recipientId, text, quickReplies);
  } catch {
    return sendInstagramTextMessage(accessToken, recipientId, text);
  }
}

export function sendInstagramAttachmentMessage(
  accessToken: string,
  recipientId: string,
  attachment: { type: "image" | "video"; url: string }
) {
  return sendInstagramApiMessage(accessToken, recipientId, {
    attachment: {
      type: attachment.type,
      payload: {
        url: attachment.url,
      },
    },
  });
}

export function sendInstagramCheckoutButtonTemplate(
  accessToken: string,
  recipientId: string,
  order: CommerceOrder,
  checkoutUrl = getCommerceOrderCheckoutUrl(order)
) {
  const element: InstagramTemplateMessagePayload["attachment"]["payload"]["elements"][number] = {
    title: truncateInstagramText(order.productTitle || "Instagram order", 80),
    subtitle: getCheckoutCardSubtitle(order),
    default_action: {
      type: "web_url",
      url: checkoutUrl,
    },
    buttons: [
      {
        type: "web_url",
        title: "Pay with Stripe",
        url: checkoutUrl,
      },
    ],
  };

  if (order.productImageUrl?.startsWith("https://")) {
    element.image_url = order.productImageUrl;
  }

  return sendInstagramApiMessage(accessToken, recipientId, {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [element],
      },
    },
  });
}

export async function sendInstagramCommercePaymentMessage({
  accessToken,
  recipientId,
  order,
  checkoutUrl = getCommerceOrderCheckoutUrl(order),
  alreadyConfirmed = false,
  sendText = true,
  sendCheckoutButton = true,
}: {
  accessToken: string;
  recipientId: string;
  order: CommerceOrder;
  checkoutUrl?: string;
  alreadyConfirmed?: boolean;
  sendText?: boolean;
  sendCheckoutButton?: boolean;
}): Promise<InstagramCommercePaymentSendResult> {
  const result: InstagramCommercePaymentSendResult = {
    textMessageId: "",
    checkoutButtonMessageId: "",
    checkoutFallbackMessageId: "",
    checkoutButtonSent: false,
    checkoutFallbackSent: false,
    messageId: "",
  };

  const shouldTryButton = Boolean(checkoutUrl && sendCheckoutButton);

  if (sendText) {
    const text = buildCommerceOrderPaymentReply(order, checkoutUrl, alreadyConfirmed, {
      includeCheckoutUrl: !shouldTryButton,
    });
    const sentText = await sendInstagramTextMessage(accessToken, recipientId, text);
    result.textMessageId = sentText.message_id || "";
    result.messageId = result.textMessageId;
  }

  if (!checkoutUrl || !sendCheckoutButton) {
    return result;
  }

  try {
    const sentButton = await sendInstagramCheckoutButtonTemplate(accessToken, recipientId, order, checkoutUrl);
    result.checkoutButtonMessageId = sentButton.message_id || "";
    result.checkoutButtonSent = true;
    result.messageId = result.checkoutButtonMessageId || result.messageId;
    return result;
  } catch (error) {
    result.checkoutButtonError = error instanceof Error ? error.message : "Instagram checkout button failed.";
  }

  const fallbackText = buildCheckoutFallbackText(checkoutUrl);
  const fallback = await sendInstagramTextMessage(accessToken, recipientId, fallbackText);
  result.checkoutFallbackMessageId = fallback.message_id || "";
  result.checkoutFallbackSent = true;
  result.messageId = result.checkoutFallbackMessageId || result.messageId;

  return result;
}
