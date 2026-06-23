import { NextResponse, type NextRequest } from "next/server";
import {
  getCommerceOrderById,
  prepareCommerceOrderCheckout,
} from "@/lib/commerce-orders";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const requestUrl = new URL(request.url);
  const cancelUrl = new URL("/checkout/cancel", requestUrl.origin);
  const returnTo = requestUrl.searchParams.get("return_to") === "inbox" ? "inbox" : "";

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
      const successUrl = new URL(returnTo === "inbox" ? "/conversations" : "/checkout/success", requestUrl.origin);
      successUrl.searchParams.set("order_id", order.id);
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
