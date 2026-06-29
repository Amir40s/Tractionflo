import Link from "next/link";
import { CreditCard } from "lucide-react";

type CheckoutCancelSearchParams = {
  order_id?: string | string[];
  reason?: string | string[];
  return_to?: string | string[];
};

function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function buildReturnHref(orderId: string, reason: string, returnTo: string) {
  if (returnTo !== "inbox") {
    return "https://www.instagram.com/direct/inbox/";
  }

  const params = new URLSearchParams();
  params.set("payment", "failed");

  if (orderId) {
    params.set("order_id", orderId);
  }

  if (reason) {
    params.set("reason", reason);
  }

  return `/conversations?${params.toString()}`;
}

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutCancelSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const orderId = getSingleSearchParam(resolvedSearchParams.order_id);
  const reason = getSingleSearchParam(resolvedSearchParams.reason);
  const returnTo = getSingleSearchParam(resolvedSearchParams.return_to);
  const closeHref = buildReturnHref(orderId, reason, returnTo);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 py-10">
      <section className="w-full max-w-md rounded-[8px] border border-[#e3e8f2] bg-white p-6 text-center shadow-[0_24px_70px_rgba(20,28,53,0.08)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3e6] text-[#ff850d]">
          <CreditCard size={25} strokeWidth={2.4} />
        </div>
        <h1 className="mt-5 text-[24px] font-extrabold text-black">Payment not completed</h1>
        <p className="mt-3 text-[14px] font-semibold leading-relaxed text-[#596175]">
          No payment was taken. You can return to Instagram and open the checkout link again when ready.
        </p>
        <Link
          href={closeHref}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[8px] border border-[#dfe5f0] bg-white px-5 text-[13px] font-extrabold text-black"
        >
          {returnTo === "inbox" ? "Open inbox" : "Return to Instagram"}
        </Link>
      </section>
    </main>
  );
}
