import type { Metadata } from "next";
import Link from "next/link";
import StaticPageShell from "../components/StaticPageShell";

export const metadata: Metadata = {
  title: "Contact | TractionFlo",
  description: "Contact the TractionFlo team.",
};

export default function ContactPage() {
  return (
    <StaticPageShell
      eyebrow="Support"
      title="Contact"
      description="Have a question about founding access, product setup, or your account? Reach out and we will help."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:support@tractionflo.com"
          className="rounded-[8px] border border-black/10 bg-white p-6 transition hover:border-black/25"
        >
          <h2 className="text-lg font-black text-black">Email support</h2>
          <p className="mt-2 text-sm font-semibold text-black/55">support@tractionflo.com</p>
        </a>

        <Link
          href="/signup"
          className="rounded-[8px] border border-black/10 bg-[#f7ffe1] p-6 transition hover:border-[#9fe800]"
        >
          <h2 className="text-lg font-black text-black">Founding access</h2>
          <p className="mt-2 text-sm font-semibold text-black/55">Join the first 100 founders.</p>
        </Link>
      </div>

      <section>
        <h2 className="text-xl font-black text-black">What to include</h2>
        <div className="mt-3 space-y-3">
          <p>Tell us what you are trying to automate, which Instagram account or business this is for, and the best email to reach you.</p>
          <p>For support requests, include screenshots or the exact message you are seeing so we can move faster.</p>
        </div>
      </section>
    </StaticPageShell>
  );
}
