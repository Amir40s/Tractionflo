import Link from "next/link";
import { CreditCard } from "lucide-react";

export default function CheckoutCancelPage() {
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
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[8px] border border-[#dfe5f0] bg-white px-5 text-[13px] font-extrabold text-black"
        >
          Close
        </Link>
      </section>
    </main>
  );
}
