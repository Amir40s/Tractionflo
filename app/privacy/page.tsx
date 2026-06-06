import type { Metadata } from "next";
import StaticPageShell from "../components/StaticPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | TractionFlo",
  description: "Privacy Policy for TractionFlo.",
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "We collect account details you provide, such as your name, email address, login information, and business profile details.",
      "When you connect social accounts or use messaging features, we may process conversation data, uploaded knowledge, campaign settings, and related activity needed to provide the service.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use information to operate TractionFlo, personalize automation workflows, provide customer support, improve product reliability, and keep accounts secure.",
      "We may also use contact details to send service updates, onboarding messages, and product announcements. You can opt out of non-essential marketing emails.",
    ],
  },
  {
    title: "Sharing and security",
    body: [
      "We do not sell your personal information. We share data only with service providers that help us run the product, comply with law, prevent abuse, or protect TractionFlo and our users.",
      "We use reasonable technical and organizational safeguards, but no online service can guarantee complete security.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can request access, correction, export, or deletion of your personal information by contacting us.",
      "Some information may be retained where required for security, legal compliance, billing records, or legitimate business operations.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <StaticPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="This page explains how TractionFlo collects, uses, and protects information when you use our website and product."
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
