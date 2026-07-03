import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type CommerceOrderStatus = "pending_confirmation" | "confirmed" | "paid" | "cancelled";
export type CommercePaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed";

export type CommerceOrder = {
  id: string;
  userId: string;
  conversationId: string;
  instagramSenderId: string;
  instagramUsername: string;
  productId: string;
  sourceMediaId: string;
  productTitle: string;
  productDescription: string;
  productImageUrl: string;
  productPermalink: string;
  priceText: string;
  amount: number | null;
  currency: string;
  status: CommerceOrderStatus;
  paymentStatus: CommercePaymentStatus;
  paymentMethod: string;
  confirmationText: string;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string;
  paidAt: string;
};

export type CommerceOrderDraft = {
  conversationId?: string;
  instagramSenderId?: string;
  instagramUsername?: string;
  productId?: string;
  sourceMediaId?: string;
  productTitle?: string;
  productDescription?: string;
  productImageUrl?: string;
  productPermalink?: string;
  priceText?: string;
  amount?: number | null;
  currency?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type CommerceOrdersListResult = {
  orders: CommerceOrder[];
  tableReady: boolean;
  error?: string;
};

export type CommerceCheckoutPreparationResult = {
  order: CommerceOrder;
  checkoutUrl: string;
  checkoutConfigured: boolean;
  checkoutCreated: boolean;
  error?: string;
};

export type CommerceCheckoutReturnTo = "instagram" | "inbox" | "";

type CommerceOrderRow = {
  id?: string;
  user_id?: string;
  conversation_id?: string | null;
  instagram_sender_id?: string | null;
  instagram_username?: string | null;
  product_id?: string | null;
  source_media_id?: string | null;
  product_title?: string | null;
  product_description?: string | null;
  product_image_url?: string | null;
  product_permalink?: string | null;
  price_text?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  confirmation_text?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  confirmed_at?: string | null;
  paid_at?: string | null;
};

const orderStatuses = new Set<CommerceOrderStatus>(["pending_confirmation", "confirmed", "paid", "cancelled"]);
const paymentStatuses = new Set<CommercePaymentStatus>(["unpaid", "pending", "paid", "refunded", "failed"]);

function compactText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function normalizeCurrency(value = "") {
  const currency = value.trim().toUpperCase();
  return currency.length >= 3 && currency.length <= 4 ? currency : "USD";
}

function normalizeOrderStatus(value: unknown): CommerceOrderStatus {
  return orderStatuses.has(value as CommerceOrderStatus) ? (value as CommerceOrderStatus) : "pending_confirmation";
}

function normalizePaymentStatus(value: unknown): CommercePaymentStatus {
  return paymentStatuses.has(value as CommercePaymentStatus) ? (value as CommercePaymentStatus) : "unpaid";
}

function getMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

function getCommerceCheckoutBaseUrl(baseUrl?: string) {
  const explicit = baseUrl?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const fallback = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";

  return (explicit || fallback).replace(/\/+$/, "");
}

export function getCommerceOrderPublicCheckoutUrl(
  orderOrId: CommerceOrder | string,
  baseUrl?: string,
  returnTo: CommerceCheckoutReturnTo | string = "instagram"
) {
  const orderId = typeof orderOrId === "string" ? orderOrId : orderOrId.id;

  if (!orderId) {
    return "";
  }

  const checkoutUrl = new URL(`${getCommerceCheckoutBaseUrl(baseUrl)}/checkout/order/${encodeURIComponent(orderId)}`);
  const normalizedReturnTo = normalizeCommerceCheckoutReturnTo(returnTo);

  if (normalizedReturnTo) {
    checkoutUrl.searchParams.set("return_to", normalizedReturnTo);
  }

  return checkoutUrl.toString();
}

function getStripeUnitAmount(order: CommerceOrder) {
  const amount = order.amount || normalizeAmount(order.priceText);

  if (!amount) {
    return 0;
  }

  return Math.round(amount * 100);
}

function truncateForStripe(value: string, maxLength: number) {
  const trimmed = compactText(value);

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function isCommerceOrdersTableMissing(error: unknown) {
  const record = error && typeof error === "object" ? (error as { code?: string; message?: string }) : {};
  const message = (record.message || "").toLowerCase();

  return (
    record.code === "42P01" ||
    record.code === "PGRST116" ||
    (message.includes("commerce_orders") && (message.includes("does not exist") || message.includes("not found"))) ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export function normalizeCommerceOrder(row: CommerceOrderRow): CommerceOrder {
  return {
    id: String(row.id || ""),
    userId: String(row.user_id || ""),
    conversationId: String(row.conversation_id || ""),
    instagramSenderId: String(row.instagram_sender_id || ""),
    instagramUsername: String(row.instagram_username || ""),
    productId: String(row.product_id || ""),
    sourceMediaId: String(row.source_media_id || ""),
    productTitle: String(row.product_title || "Instagram order"),
    productDescription: String(row.product_description || ""),
    productImageUrl: String(row.product_image_url || ""),
    productPermalink: String(row.product_permalink || ""),
    priceText: String(row.price_text || ""),
    amount: normalizeAmount(row.amount),
    currency: normalizeCurrency(String(row.currency || "")),
    status: normalizeOrderStatus(row.status),
    paymentStatus: normalizePaymentStatus(row.payment_status),
    paymentMethod: String(row.payment_method || ""),
    confirmationText: String(row.confirmation_text || ""),
    source: String(row.source || "instagram_ai"),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
    confirmedAt: String(row.confirmed_at || ""),
    paidAt: String(row.paid_at || ""),
  };
}

export function normalizeCommerceOrderDraft(value: unknown): CommerceOrderDraft | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }

    try {
      return normalizeCommerceOrderDraft(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const productTitle = compactText(String(record.productTitle || record.title || ""));
  const productId = compactText(String(record.productId || record.id || record.sourceMediaId || ""));

  if (!productTitle && !productId) {
    return null;
  }

  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
    ? (record.metadata as Record<string, unknown>)
    : {};

  return {
    conversationId: compactText(String(record.conversationId || "")),
    instagramSenderId: compactText(String(record.instagramSenderId || "")),
    instagramUsername: compactText(String(record.instagramUsername || "")),
    productId,
    sourceMediaId: compactText(String(record.sourceMediaId || "")),
    productTitle: productTitle || "Instagram order",
    productDescription: compactText(String(record.productDescription || record.description || "")),
    productImageUrl: compactText(String(record.productImageUrl || record.imageUrl || "")),
    productPermalink: compactText(String(record.productPermalink || record.permalink || "")),
    priceText: compactText(String(record.priceText || "")),
    amount: normalizeAmount(record.amount ?? record.priceAmount),
    currency: normalizeCurrency(String(record.currency || "")),
    source: compactText(String(record.source || "instagram_ai")),
    metadata,
  };
}

export function isCommerceOrderConfirmationText(text: string) {
  const normalized = compactText(text).toLowerCase();

  if (!normalized) {
    return false;
  }

  return (
    normalized === "confirm_order" ||
    /^(confirm|confirmed|approve order|approved order|order it|place order|place the order|confirm order|confirmed order)$/i.test(normalized) ||
    /\b(confirm order|confirmed order|approve order|approved order|place order|place the order|order it|yes confirm|confirm checkout|send payment link|pay now|checkout now)\b/i.test(normalized)
  );
}

export async function listCommerceOrdersForUser(
  supabase: SupabaseServiceClient,
  userId: string
): Promise<CommerceOrdersListResult> {
  const { data, error } = await (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return { orders: [], tableReady: false, error: error.message };
    }

    throw error;
  }

  return {
    orders: (data || []).map((row: any) => normalizeCommerceOrder(row as CommerceOrderRow)),
    tableReady: true,
  };
}

export async function createPendingCommerceOrder(
  supabase: SupabaseServiceClient,
  userId: string,
  draft: CommerceOrderDraft
) {
  const normalizedDraft = normalizeCommerceOrderDraft(draft);

  if (!normalizedDraft) {
    return null;
  }

  const senderId = normalizedDraft.instagramSenderId || "";
  const productId = normalizedDraft.productId || normalizedDraft.sourceMediaId || normalizedDraft.productTitle || "instagram-product";

  if (senderId) {
    const { data: existing, error: existingError } = await (supabase as any)
      .from("commerce_orders")
      .select("*")
      .eq("user_id", userId)
      .eq("instagram_sender_id", senderId)
      .eq("product_id", productId)
      .eq("status", "pending_confirmation")
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      if (isCommerceOrdersTableMissing(existingError)) {
        return null;
      }

      throw existingError;
    }

    if (existing?.[0]) {
      return normalizeCommerceOrder(existing[0] as CommerceOrderRow);
    }
  }

  const { data, error } = await ((supabase as any)
    .from("commerce_orders") as any)
    .insert({
      user_id: userId,
      conversation_id: normalizedDraft.conversationId || null,
      instagram_sender_id: senderId || null,
      instagram_username: normalizedDraft.instagramUsername || null,
      product_id: productId,
      source_media_id: normalizedDraft.sourceMediaId || null,
      product_title: normalizedDraft.productTitle || "Instagram order",
      product_description: normalizedDraft.productDescription || null,
      product_image_url: normalizedDraft.productImageUrl || null,
      product_permalink: normalizedDraft.productPermalink || null,
      price_text: normalizedDraft.priceText || null,
      amount: normalizedDraft.amount,
      currency: normalizedDraft.currency || "USD",
      status: "pending_confirmation",
      payment_status: "unpaid",
      source: normalizedDraft.source || "instagram_ai",
      metadata: normalizedDraft.metadata || {},
    })
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return null;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export async function confirmLatestPendingCommerceOrder(
  supabase: SupabaseServiceClient,
  {
    userId,
    instagramSenderId,
    conversationId,
    confirmationText,
  }: {
    userId: string;
    instagramSenderId: string;
    conversationId?: string;
    confirmationText: string;
  }
) {
  if (!instagramSenderId) {
    return null;
  }

  const { data: pendingRows, error: lookupError } = await (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("instagram_sender_id", instagramSenderId)
    .eq("status", "pending_confirmation")
    .order("created_at", { ascending: false })
    .limit(1);

  if (lookupError) {
    if (isCommerceOrdersTableMissing(lookupError)) {
      return null;
    }

    throw lookupError;
  }

  const pending = pendingRows?.[0] as CommerceOrderRow | undefined;

  if (!pending?.id) {
    return null;
  }

  const confirmedAt = new Date().toISOString();
  const { data, error } = await ((supabase as any)
    .from("commerce_orders") as any)
    .update({
      conversation_id: conversationId || pending.conversation_id || null,
      status: "confirmed",
      payment_status: pending.payment_status === "paid" ? "paid" : "unpaid",
      confirmation_text: confirmationText,
      confirmed_at: confirmedAt,
      updated_at: confirmedAt,
    })
    .eq("id", pending.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return null;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export async function confirmPendingCommerceOrderById(
  supabase: SupabaseServiceClient,
  {
    userId,
    orderId,
    instagramSenderId,
    conversationId,
    confirmationText,
  }: {
    userId: string;
    orderId: string;
    instagramSenderId?: string;
    conversationId?: string;
    confirmationText: string;
  }
) {
  const id = compactText(orderId);

  if (!id) {
    return null;
  }

  let query = (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "pending_confirmation")
    .limit(1);

  if (instagramSenderId) {
    query = query.eq("instagram_sender_id", instagramSenderId);
  }

  const { data: pendingRows, error: lookupError } = await query;

  if (lookupError) {
    if (isCommerceOrdersTableMissing(lookupError)) {
      return null;
    }

    throw lookupError;
  }

  const pending = pendingRows?.[0] as CommerceOrderRow | undefined;

  if (!pending?.id) {
    return null;
  }

  const confirmedAt = new Date().toISOString();
  const { data, error } = await ((supabase as any)
    .from("commerce_orders") as any)
    .update({
      conversation_id: conversationId || pending.conversation_id || null,
      status: "confirmed",
      payment_status: pending.payment_status === "paid" ? "paid" : "unpaid",
      confirmation_text: confirmationText,
      confirmed_at: confirmedAt,
      updated_at: confirmedAt,
    })
    .eq("id", pending.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return null;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export async function cancelPendingCommerceOrdersForSender(
  supabase: SupabaseServiceClient,
  {
    userId,
    instagramSenderId,
    reason,
    source = "instagram_ai",
  }: {
    userId: string;
    instagramSenderId: string;
    reason: string;
    source?: string;
  }
) {
  if (!instagramSenderId) {
    return [];
  }

  const { data: pendingRows, error: lookupError } = await (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("instagram_sender_id", instagramSenderId)
    .eq("status", "pending_confirmation")
    .order("created_at", { ascending: false })
    .limit(20);

  if (lookupError) {
    if (isCommerceOrdersTableMissing(lookupError)) {
      return [];
    }

    throw lookupError;
  }

  const pending = (pendingRows || []) as CommerceOrderRow[];

  if (pending.length === 0) {
    return [];
  }

  const cancelledAt = new Date().toISOString();
  const cancelled = await Promise.all(
    pending.map(async (order) => {
      const metadata = {
        ...((order.metadata && typeof order.metadata === "object" ? order.metadata : {}) as Record<string, unknown>),
        cancelledAt,
        cancellationReason: reason,
        cancellationSource: source,
      };

      const { data, error } = await (supabase as any)
        .from("commerce_orders")
        .update({
          status: "cancelled",
          metadata,
          updated_at: cancelledAt,
        })
        .eq("id", order.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        if (isCommerceOrdersTableMissing(error)) {
          return null;
        }

        throw error;
      }

      return data ? normalizeCommerceOrder(data as CommerceOrderRow) : null;
    })
  );

  return cancelled.filter((order): order is CommerceOrder => Boolean(order));
}

export async function getLatestCommerceOrderForSender(
  supabase: SupabaseServiceClient,
  {
    userId,
    instagramSenderId,
    statuses,
  }: {
    userId: string;
    instagramSenderId: string;
    statuses?: CommerceOrderStatus[];
  }
) {
  if (!instagramSenderId) {
    return null;
  }

  let query = (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("instagram_sender_id", instagramSenderId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (statuses?.length === 1) {
    query = query.eq("status", statuses[0]);
  } else if (statuses?.length) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return null;
    }

    throw error;
  }

  return data?.[0] ? normalizeCommerceOrder(data[0] as CommerceOrderRow) : null;
}

export async function getCommerceOrderById(supabase: SupabaseServiceClient, orderId: string) {
  const id = orderId.trim();

  if (!id) {
    return null;
  }

  const { data, error } = await (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return null;
    }

    throw error;
  }

  return data ? normalizeCommerceOrder(data as CommerceOrderRow) : null;
}

export function getCommerceOrderAmount(order: CommerceOrder) {
  return order.amount || 0;
}

function formatCommerceOrderAmount(amount: number, currency = "USD") {
  const normalizedCurrency = currency.trim().toUpperCase() || "USD";

  if (normalizedCurrency === "USD") {
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }

  return `${normalizedCurrency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function getCommerceOrderPriceText(order: CommerceOrder) {
  const numericPriceText = Number(String(order.priceText || "").replace(/[^\d.-]/g, ""));

  if (order.priceText && Number.isFinite(numericPriceText) && numericPriceText > 0 && !/[a-z$€£¥₨]/i.test(order.priceText)) {
    return formatCommerceOrderAmount(numericPriceText, order.currency);
  }

  if (order.priceText) {
    return order.priceText;
  }

  if (order.amount) {
    return formatCommerceOrderAmount(order.amount, order.currency);
  }

  return "";
}

export function isStripeCommerceCheckoutConfigured() {
  return Boolean(getStripeSecretKey());
}

export function getCommerceOrderCheckoutUrl(order: CommerceOrder) {
  return getMetadataString(order.metadata || {}, [
    "stripeCheckoutUrl",
    "checkoutUrl",
    "checkout_url",
    "paymentUrl",
    "payment_url",
  ]);
}

export function hasCommerceOrderPaymentMessage(order: CommerceOrder) {
  return Boolean(
    order.metadata?.paymentMessageId ||
      order.metadata?.paymentSentAt ||
      order.metadata?.payment_message_id ||
      order.metadata?.payment_sent_at
  );
}

export function hasCommerceOrderCheckoutButtonMessage(order: CommerceOrder) {
  return Boolean(
    order.metadata?.checkoutButtonMessageId ||
      order.metadata?.checkoutButtonSentAt ||
      order.metadata?.checkout_button_message_id ||
      order.metadata?.checkout_button_sent_at
  );
}

function normalizeCommerceCheckoutReturnTo(value?: string): CommerceCheckoutReturnTo {
  if (value === "instagram") {
    return "instagram";
  }

  return value === "inbox" ? "inbox" : "";
}

async function createStripeCheckoutSession(
  order: CommerceOrder,
  {
    baseUrl,
    returnTo = "",
  }: {
    baseUrl?: string;
    returnTo?: CommerceCheckoutReturnTo | string;
  } = {}
) {
  const stripeSecretKey = getStripeSecretKey();

  if (!stripeSecretKey) {
    throw new Error("Stripe checkout is not configured. Add STRIPE_SECRET_KEY.");
  }

  const unitAmount = getStripeUnitAmount(order);

  if (!unitAmount) {
    throw new Error("This order needs a numeric amount before a Stripe checkout link can be created.");
  }

  const appBaseUrl = getCommerceCheckoutBaseUrl(baseUrl);
  const normalizedReturnTo = normalizeCommerceCheckoutReturnTo(returnTo || "instagram");
  const successUrl = new URL("/checkout/complete", appBaseUrl);
  successUrl.searchParams.set("order_id", order.id);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  if (normalizedReturnTo) {
    successUrl.searchParams.set("return_to", normalizedReturnTo);
  }
  const cancelUrl = new URL("/checkout/cancel", appBaseUrl);
  cancelUrl.searchParams.set("order_id", order.id);
  if (normalizedReturnTo) {
    cancelUrl.searchParams.set("return_to", normalizedReturnTo);
  }
  const successUrlString = successUrl
    .toString()
    .replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrlString);
  params.set("cancel_url", cancelUrl.toString());
  params.set("client_reference_id", order.id);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", (order.currency || "USD").toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
  params.set("line_items[0][price_data][product_data][name]", truncateForStripe(order.productTitle || "Instagram order", 120));

  if (order.productDescription) {
    params.set("line_items[0][price_data][product_data][description]", truncateForStripe(order.productDescription, 300));
  }

  if (order.productImageUrl?.startsWith("https://")) {
    params.set("line_items[0][price_data][product_data][images][0]", order.productImageUrl);
  }

  params.set("metadata[order_id]", order.id);
  params.set("metadata[user_id]", order.userId);
  params.set("metadata[instagram_sender_id]", order.instagramSenderId || "");
  params.set("metadata[return_to]", normalizedReturnTo || "");
  params.set("metadata[product_title]", truncateForStripe(order.productTitle || "Instagram order", 300));
  params.set("payment_intent_data[metadata][order_id]", order.id);
  params.set("payment_intent_data[metadata][user_id]", order.userId);
  params.set("payment_intent_data[metadata][instagram_sender_id]", order.instagramSenderId || "");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    url?: string | null;
    payment_status?: string | null;
    payment_intent?: string | null;
    error?: {
      message?: string;
    };
  };

  if (!response.ok || data.error || !data.id || !data.url) {
    throw new Error(data.error?.message || "Stripe could not create a checkout session.");
  }

  return data;
}

export async function prepareCommerceOrderCheckout(
  supabase: SupabaseServiceClient,
  {
    userId,
    order,
    baseUrl,
    forceNew = false,
    returnTo = "instagram",
  }: {
    userId: string;
    order: CommerceOrder;
    baseUrl?: string;
    forceNew?: boolean;
    returnTo?: CommerceCheckoutReturnTo | string;
  }
): Promise<CommerceCheckoutPreparationResult> {
  const existingCheckoutUrl = getCommerceOrderCheckoutUrl(order);
  const normalizedReturnTo = normalizeCommerceCheckoutReturnTo(returnTo || "instagram");
  const existingReturnTo = getMetadataString(order.metadata || {}, ["checkoutReturnTo", "returnTo", "return_to"]);

  if (order.paymentStatus === "paid" || order.status === "paid") {
    return {
      order,
      checkoutUrl: existingCheckoutUrl,
      checkoutConfigured: isStripeCommerceCheckoutConfigured(),
      checkoutCreated: false,
    };
  }

  if (existingCheckoutUrl && !forceNew && existingReturnTo === normalizedReturnTo) {
    return {
      order,
      checkoutUrl: existingCheckoutUrl,
      checkoutConfigured: true,
      checkoutCreated: false,
    };
  }

  if (!isStripeCommerceCheckoutConfigured()) {
    return {
      order,
      checkoutUrl: "",
      checkoutConfigured: false,
      checkoutCreated: false,
      error: "Stripe checkout is not configured.",
    };
  }

  try {
    const session = await createStripeCheckoutSession(order, {
      baseUrl,
      returnTo: normalizedReturnTo,
    });
    const now = new Date().toISOString();
    const metadata = {
      ...(order.metadata || {}),
      stripeCheckoutSessionId: session.id,
      stripeCheckoutUrl: session.url || "",
      stripeCheckoutCreatedAt: now,
      checkoutReturnTo: normalizedReturnTo,
      stripePaymentIntentId: session.payment_intent || "",
      stripePaymentStatus: session.payment_status || "unpaid",
    };

    const { data, error } = await (supabase as any)
      .from("commerce_orders")
      .update({
        payment_status: "pending",
        payment_method: "Stripe Checkout",
        metadata,
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      if (isCommerceOrdersTableMissing(error)) {
        return {
          order,
          checkoutUrl: session.url || "",
          checkoutConfigured: true,
          checkoutCreated: true,
        };
      }

      throw error;
    }

    return {
      order: normalizeCommerceOrder(data as CommerceOrderRow),
      checkoutUrl: session.url || "",
      checkoutConfigured: true,
      checkoutCreated: true,
    };
  } catch (error) {
    return {
      order,
      checkoutUrl: "",
      checkoutConfigured: true,
      checkoutCreated: false,
      error: error instanceof Error ? error.message : "Could not create Stripe checkout.",
    };
  }
}

export function buildCommerceOrderConfirmationReply(order: CommerceOrder, alreadyConfirmed = false) {
  const price = getCommerceOrderPriceText(order);
  const lines = [
    alreadyConfirmed ? "Thanks, your order is already confirmed." : "Thank you for confirming your order.",
    "",
    "Order summary:",
    `- Package: ${order.productTitle || "Instagram order"}`,
    price ? `- Price: ${price}` : "",
    order.productPermalink ? `- Product link: ${order.productPermalink}` : "",
    "",
    "Our team will follow up with payment and scheduling details.",
  ];

  return lines.filter(Boolean).join("\n");
}

export function buildCommerceOrderPaymentReply(
  order: CommerceOrder,
  checkoutUrl = getCommerceOrderCheckoutUrl(order),
  alreadyConfirmed = false,
  options: { includeCheckoutUrl?: boolean } = {}
) {
  const price = getCommerceOrderPriceText(order);
  const includeCheckoutUrl = options.includeCheckoutUrl !== false;
  const lines = [
    alreadyConfirmed ? "Thanks, your order is already confirmed." : "Thank you for confirming your order.",
    "",
    "Order summary:",
    `- Package: ${order.productTitle || "Instagram order"}`,
    price ? `- Price: ${price}` : "",
    order.productPermalink ? `- Product link: ${order.productPermalink}` : "",
    "",
    checkoutUrl ? "Secure checkout link:" : "Payment step:",
    checkoutUrl && includeCheckoutUrl
      ? checkoutUrl
      : checkoutUrl
        ? "Tap the Stripe checkout button below to pay securely."
        : "A secure Stripe payment link is not ready yet. Our team will follow up with payment details.",
    "",
    checkoutUrl
      ? "After payment is complete, your order will be marked as paid."
      : "This order is not counted as revenue until payment is completed.",
  ];

  return lines.filter(Boolean).join("\n");
}

export function buildCommerceOrderPaidReply(order: CommerceOrder) {
  const price = getCommerceOrderPriceText(order);
  const lines = [
    "Payment received. Thank you!",
    "",
    "Order summary:",
    `- Package: ${order.productTitle || "Instagram order"}`,
    price ? `- Paid: ${price}` : "",
    order.productPermalink ? `- Product link: ${order.productPermalink}` : "",
    "",
    "Our team will follow up with the next step shortly.",
  ];

  return lines.filter(Boolean).join("\n");
}

export function hasCommerceOrderConfirmationMessage(order: CommerceOrder) {
  return Boolean(
    order.metadata?.confirmationMessageId ||
      order.metadata?.confirmationSentAt ||
      order.metadata?.confirmation_message_id ||
      order.metadata?.confirmation_sent_at
  );
}

export async function markCommerceOrderConfirmationMessageSent(
  supabase: SupabaseServiceClient,
  {
    userId,
    order,
    messageId,
    source,
  }: {
    userId: string;
    order: CommerceOrder;
    messageId: string;
    source: string;
  }
) {
  if (!order.id) {
    return order;
  }

  const sentAt = new Date().toISOString();
  const metadata = {
    ...(order.metadata || {}),
    confirmationMessageId: messageId,
    confirmationSentAt: sentAt,
    confirmationSource: source,
  };

  const { data, error } = await (supabase as any)
    .from("commerce_orders")
    .update({
      metadata,
      updated_at: sentAt,
    })
    .eq("id", order.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return order;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export async function markCommerceOrderPaymentMessageSent(
  supabase: SupabaseServiceClient,
  {
    userId,
    order,
    messageId,
    source,
    textMessageId,
    checkoutButtonMessageId,
    checkoutFallbackMessageId,
  }: {
    userId: string;
    order: CommerceOrder;
    messageId: string;
    source: string;
    textMessageId?: string;
    checkoutButtonMessageId?: string;
    checkoutFallbackMessageId?: string;
  }
) {
  if (!order.id) {
    return order;
  }

  const sentAt = new Date().toISOString();
  const metadata = {
    ...(order.metadata || {}),
    paymentMessageId: messageId || order.metadata?.paymentMessageId || "",
    paymentSentAt: sentAt,
    paymentMessageSource: source,
    ...(textMessageId ? { paymentTextMessageId: textMessageId } : {}),
    ...(checkoutButtonMessageId
      ? {
          checkoutButtonMessageId,
          checkoutButtonSentAt: sentAt,
        }
      : {}),
    ...(checkoutFallbackMessageId ? { checkoutFallbackMessageId } : {}),
  };

  const { data, error } = await (supabase as any)
    .from("commerce_orders")
    .update({
      metadata,
      updated_at: sentAt,
    })
    .eq("id", order.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return order;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export function hasCommerceOrderPaymentThankYouMessage(order: CommerceOrder) {
  return Boolean(
    order.metadata?.paymentThankYouMessageId ||
      order.metadata?.paymentThankYouSentAt ||
      order.metadata?.payment_thank_you_message_id ||
      order.metadata?.payment_thank_you_sent_at
  );
}

export async function markCommerceOrderPaymentThankYouMessageSent(
  supabase: SupabaseServiceClient,
  {
    userId,
    order,
    messageId,
    source,
  }: {
    userId: string;
    order: CommerceOrder;
    messageId: string;
    source: string;
  }
) {
  if (!order.id) {
    return order;
  }

  const sentAt = new Date().toISOString();
  const metadata = {
    ...(order.metadata || {}),
    paymentThankYouMessageId: messageId,
    paymentThankYouSentAt: sentAt,
    paymentThankYouSource: source,
  };

  const { data, error } = await (supabase as any)
    .from("commerce_orders")
    .update({
      metadata,
      updated_at: sentAt,
    })
    .eq("id", order.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return order;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export async function markCommerceOrderPaid(
  supabase: SupabaseServiceClient,
  {
    orderId,
    userId,
    stripeCheckoutSessionId,
    stripePaymentIntentId,
    stripePaymentStatus,
    metadata,
  }: {
    orderId: string;
    userId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    stripePaymentStatus?: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (!orderId) {
    return null;
  }

  let query = (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("id", orderId)
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: existingRows, error: lookupError } = await query;

  if (lookupError) {
    if (isCommerceOrdersTableMissing(lookupError)) {
      return null;
    }

    throw lookupError;
  }

  const existing = existingRows?.[0] as CommerceOrderRow | undefined;

  if (!existing?.id) {
    return null;
  }

  const paidAt = new Date().toISOString();
  const nextMetadata = {
    ...((existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}) as Record<string, unknown>),
    ...(metadata || {}),
    stripeCheckoutSessionId: stripeCheckoutSessionId || getMetadataString((existing.metadata || {}) as Record<string, unknown>, ["stripeCheckoutSessionId"]),
    stripePaymentIntentId: stripePaymentIntentId || getMetadataString((existing.metadata || {}) as Record<string, unknown>, ["stripePaymentIntentId"]),
    stripePaymentStatus: stripePaymentStatus || "paid",
    stripePaidAt: paidAt,
  };

  const { data, error } = await (supabase as any)
    .from("commerce_orders")
    .update({
      status: "paid",
      payment_status: "paid",
      payment_method: "Stripe Checkout",
      paid_at: paidAt,
      metadata: nextMetadata,
      updated_at: paidAt,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return null;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export async function markCommerceOrderPaymentFailed(
  supabase: SupabaseServiceClient,
  {
    orderId,
    userId,
    stripeCheckoutSessionId,
    stripePaymentIntentId,
    reason,
  }: {
    orderId: string;
    userId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    reason?: string;
  }
) {
  if (!orderId) {
    return null;
  }

  let query = (supabase as any)
    .from("commerce_orders")
    .select("*")
    .eq("id", orderId)
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: existingRows, error: lookupError } = await query;

  if (lookupError) {
    if (isCommerceOrdersTableMissing(lookupError)) {
      return null;
    }

    throw lookupError;
  }

  const existing = existingRows?.[0] as CommerceOrderRow | undefined;

  if (!existing?.id) {
    return null;
  }

  const now = new Date().toISOString();
  const metadata = {
    ...((existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}) as Record<string, unknown>),
    stripeCheckoutSessionId: stripeCheckoutSessionId || "",
    stripePaymentIntentId: stripePaymentIntentId || "",
    stripePaymentFailedAt: now,
    stripePaymentFailureReason: reason || "",
  };

  const { data, error } = await (supabase as any)
    .from("commerce_orders")
    .update({
      payment_status: "failed",
      metadata,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    if (isCommerceOrdersTableMissing(error)) {
      return null;
    }

    throw error;
  }

  return normalizeCommerceOrder(data as CommerceOrderRow);
}

export function getCommerceOrderRevenue(orders: CommerceOrder[]) {
  const paidRevenue = orders
    .filter((order) => order.status === "paid" || order.paymentStatus === "paid")
    .reduce((total, order) => total + getCommerceOrderAmount(order), 0);
  const confirmedRevenue = orders
    .filter((order) => order.status === "confirmed" || order.status === "paid" || order.paymentStatus === "paid")
    .reduce((total, order) => total + getCommerceOrderAmount(order), 0);

  return {
    paidRevenue,
    confirmedRevenue,
    pendingRevenue: orders
      .filter((order) => order.status === "pending_confirmation" || (order.status === "confirmed" && order.paymentStatus !== "paid"))
      .reduce((total, order) => total + getCommerceOrderAmount(order), 0),
  };
}
