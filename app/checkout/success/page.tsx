import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 py-10">
      <section className="w-full max-w-md rounded-[8px] border border-[#e3e8f2] bg-white p-6 text-center shadow-[0_24px_70px_rgba(20,28,53,0.08)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eafaf0] text-[#12a64d]">
          <CheckCircle2 size={26} strokeWidth={2.4} />
        </div>
        <h1 className="mt-5 text-[24px] font-extrabold text-black">Payment received</h1>
        <p className="mt-3 text-[14px] font-semibold leading-relaxed text-[#596175]">
          Thank you. Your order is paid, and the business will follow up with the next step.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#3044ff] px-5 text-[13px] font-extrabold text-white shadow-[0_18px_34px_rgba(48,68,255,0.18)]"
        >
          Done
        </Link>
      </section>
    </main>
  );
}
