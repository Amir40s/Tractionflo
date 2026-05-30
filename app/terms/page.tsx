import type { Metadata } from "next";
import StaticPageShell from "../components/StaticPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | TractionFlo",
  description: "Terms of Service for TractionFlo.",
};

const sections = [
  {
    title: "Using TractionFlo",
    body: [
      "You are responsible for keeping your account secure and for the content, automations, messages, files, and settings created through your account.",
      "You agree to use TractionFlo only for lawful purposes and in a way that respects platform rules, privacy rights, intellectual property rights, and anti-spam requirements.",
    ],
  },
  {
    title: "Product access",
    body: [
      "Features may change as TractionFlo evolves. Founding access, pricing, trials, and feature availability may be updated or discontinued as we improve the product.",
      "We may suspend or terminate access if an account creates risk, violates these terms, abuses the service, or is required to comply with law.",
    ],
  },
  {
    title: "Content and integrations",
    body: [
      "You keep ownership of your content. You grant TractionFlo permission to process your content only as needed to provide, secure, support, and improve the service.",
      "Third-party platforms and integrations are governed by their own terms. TractionFlo is not responsible for outages, policy changes, or actions taken by those providers.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "TractionFlo is provided as-is and as available. We do not promise uninterrupted service, specific business results, revenue, follower growth, or conversion outcomes.",
      "To the fullest extent allowed by law, TractionFlo will not be liable for indirect, incidental, special, consequential, or punitive damages.",
    ],
  },
];

export default function TermsPage() {
  return (
    <StaticPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms describe the rules for accessing and using TractionFlo."
    >
      <p className="text-sm font-semibold text-black/45">Effective date: May 30, 2026</p>
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="text-xl font-black text-black">{section.title}</h2>
          <div className="mt-3 space-y-3">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </StaticPageShell>
  );
}
