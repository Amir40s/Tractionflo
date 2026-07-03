import type { RevenueOperatingSnapshot } from "@/lib/revenue-intelligence";
import type { RevenueOutcomeProviderSettings } from "@/lib/revenue-outcome-providers";

export const revenueOutcomeKeys = [
  "follow_creator",
  "join_newsletter",
  "book_call",
  "start_trial",
  "purchase_product",
  "upgrade_plan",
  "recover_abandoned_cart",
  "renew_subscription",
  "collect_testimonial",
] as const;

export type RevenueOutcomeKey = (typeof revenueOutcomeKeys)[number];

export type RevenueOutcomeAction = {
  outcomeType: RevenueOutcomeKey;
  label: string;
  nextAction: string;
  cta: string;
  actionUrl: string;
  integrationStatus: "connected" | "manual" | "needs_provider";
  providerHint: string;
};

const outcomeActionMap: Record<RevenueOutcomeKey, Omit<RevenueOutcomeAction, "outcomeType" | "actionUrl">> = {
  follow_creator: {
    label: "Follow creator",
    nextAction: "Invite the prospect to follow the creator and continue the relationship.",
    cta: "Follow us here for updates, offers, and examples.",
    integrationStatus: "manual",
    providerHint: "Instagram follow is native to Instagram and cannot be forced through API automation.",
  },
  join_newsletter: {
    label: "Join newsletter",
    nextAction: "Collect email consent or send the newsletter signup link.",
    cta: "Want me to send the signup link so you can get updates and offers?",
    integrationStatus: "needs_provider",
    providerHint: "Connect an email provider such as Mailchimp, ConvertKit, Beehiiv, or Brevo.",
  },
  book_call: {
    label: "Book call",
    nextAction: "Offer a booking link or ask for preferred date and time.",
    cta: "Would you like to book a quick call to find the best fit?",
    integrationStatus: "needs_provider",
    providerHint: "Connect a booking provider such as Calendly, Cal.com, Google Calendar, or HubSpot Meetings.",
  },
  start_trial: {
    label: "Start trial",
    nextAction: "Send the trial signup link or route the prospect to account creation.",
    cta: "I can send the trial link if you want to test it first.",
    integrationStatus: "needs_provider",
    providerHint: "Connect the product signup or billing provider that creates trials.",
  },
  purchase_product: {
    label: "Purchase product",
    nextAction: "Confirm the product and send checkout or payment.",
    cta: "I can send the checkout link now if you want to go ahead.",
    integrationStatus: "needs_provider",
    providerHint: "Connect this account's Stripe Payment Link or Stripe secret key for checkout.",
  },
  upgrade_plan: {
    label: "Upgrade plan",
    nextAction: "Explain the upgrade value and send the plan checkout link.",
    cta: "Want me to show the best upgrade option for your usage?",
    integrationStatus: "needs_provider",
    providerHint: "Connect subscription billing upgrade APIs and plan mapping.",
  },
  recover_abandoned_cart: {
    label: "Recover cart",
    nextAction: "Follow up on the abandoned checkout with reassurance and one clear payment step.",
    cta: "Still interested? I can resend the checkout link.",
    integrationStatus: "manual",
    providerHint: "Stripe checkout status exists; scheduled cart recovery automation still needs a queue/cron flow.",
  },
  renew_subscription: {
    label: "Renew subscription",
    nextAction: "Remind the customer about renewal value and provide the renewal path.",
    cta: "Would you like me to send the renewal link?",
    integrationStatus: "needs_provider",
    providerHint: "Connect subscription lifecycle events from Stripe or another billing system.",
  },
  collect_testimonial: {
    label: "Collect testimonial",
    nextAction: "Ask a happy customer for a short result-focused testimonial.",
    cta: "Could you share one sentence about the result you got?",
    integrationStatus: "manual",
    providerHint: "A testimonial capture destination can be added later.",
  },
};

function getConfiguredProvider(settings: RevenueOutcomeProviderSettings | undefined, outcomeType: RevenueOutcomeKey) {
  return settings?.providers.find((provider) => provider.outcomeType === outcomeType);
}

export function getDominantRevenueOutcome(snapshot: RevenueOperatingSnapshot): RevenueOutcomeKey {
  const candidates = revenueOutcomeKeys.map((key) => [key, snapshot.outcomeProbabilities[key] || 0] as const);
  const [bestKey] = candidates.sort(([, first], [, second]) => second - first)[0] || ["join_newsletter", 0];

  return bestKey;
}

export function buildRevenueOutcomeAction(
  snapshot: RevenueOperatingSnapshot,
  preferredOutcome?: string,
  providers?: RevenueOutcomeProviderSettings
): RevenueOutcomeAction {
  const outcomeType = revenueOutcomeKeys.includes(preferredOutcome as RevenueOutcomeKey)
    ? (preferredOutcome as RevenueOutcomeKey)
    : getDominantRevenueOutcome(snapshot);
  const action = outcomeActionMap[outcomeType];
  const provider = getConfiguredProvider(providers, outcomeType);
  const actionUrl = provider?.enabled ? provider.actionUrl : "";
  const providerConfigured = Boolean(
    provider?.enabled &&
      (
        provider.actionUrl ||
        provider.webhookUrl ||
        provider.apiEndpoint ||
        provider.secretSaved ||
        outcomeType === "follow_creator"
      )
  );
  const integrationStatus =
    action.integrationStatus === "connected" || providerConfigured
      ? "connected"
      : action.integrationStatus === "manual"
        ? "manual"
        : "needs_provider";
  const cta = [provider?.cta || action.cta, actionUrl].filter(Boolean).join(" ");

  return {
    outcomeType,
    ...action,
    cta,
    actionUrl,
    integrationStatus,
    providerHint: actionUrl
      ? `${provider?.provider || action.label} connected: ${actionUrl}`
      : provider?.webhookUrl || provider?.apiEndpoint
        ? `${provider?.provider || action.label} ${provider.executionMode} execution is configured.`
        : provider?.secretSaved
          ? `${provider.provider || action.label} account credentials are saved.`
        : provider?.notes || action.providerHint,
  };
}

export function applyRevenueOutcomeAction(
  snapshot: RevenueOperatingSnapshot,
  providers?: RevenueOutcomeProviderSettings
): RevenueOperatingSnapshot {
  const action = buildRevenueOutcomeAction(snapshot, undefined, providers);
  const recommendation = snapshot.revenueIntelligence.recommendation || action.nextAction;
  const cta = action.cta;

  return {
    ...snapshot,
    revenueIntelligence: {
      ...snapshot.revenueIntelligence,
      recommendation: `${recommendation} Outcome route: ${action.label}. ${action.nextAction}`,
    },
    decision: {
      ...snapshot.decision,
      bestNextAction: snapshot.decision.bestNextAction || action.nextAction,
      rationale: `${snapshot.decision.rationale} Outcome route: ${action.label}.`,
    },
    memory: {
      ...snapshot.memory,
      offersPresented: Array.from(new Set([...snapshot.memory.offersPresented, cta])).slice(0, 8),
    },
  };
}
