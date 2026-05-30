import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "./BrandLogo";

type StaticPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function StaticPageShell({
  eyebrow,
  title,
  description,
  children,
}: StaticPageShellProps) {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10 bg-white">
        <nav className="mx-auto flex h-[68px] w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center" aria-label="TractionFlo home">
            <BrandLogo className="h-9 w-40" preload sizes="160px" />
          </Link>

          <Link
            href="/signup"
            className="inline-flex h-9 items-center justify-center rounded-[4px] bg-[#d4ff00] px-5 text-[12px] font-black text-black transition hover:bg-[#b8e600]"
          >
            Join Founding Access
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[920px] px-5 py-14 sm:px-8 lg:py-20">
        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#7acb00]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-black sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-black/65">
          {description}
        </p>

        <div className="mt-10 space-y-8 text-[15px] font-medium leading-7 text-black/75">
          {children}
        </div>
      </section>

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto flex min-h-14 w-full max-w-[1180px] flex-col items-center justify-between gap-4 px-5 py-4 text-center sm:px-8 md:flex-row">
          <Link href="/" className="inline-flex items-center" aria-label="TractionFlo home">
            <BrandLogo className="h-7 w-32" sizes="128px" />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-[12px] font-semibold text-black">
            <Link href="/privacy" className="transition-colors hover:text-black/55">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-black/55">Terms of Service</Link>
            <Link href="/contact" className="transition-colors hover:text-black/55">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
