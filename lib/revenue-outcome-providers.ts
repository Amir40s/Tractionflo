import { revenueOutcomeKeys, type RevenueOutcomeKey } from "@/lib/revenue-outcome-actions";

export const revenueOutcomeProvidersMetadataKey = "revenue_outcome_providers";

export type RevenueOutcomeExecutionMode = "link" | "webhook" | "api";

export type RevenueOutcomeProviderConfig = {
  outcomeType: RevenueOutcomeKey;
  enabled: boolean;
  autoExecute: boolean;
  provider: string;
  actionUrl: string;
  cta: string;
  notes: string;
  executionMode: RevenueOutcomeExecutionMode;
  webhookUrl: string;
  apiEndpoint: string;
  secretSaved: boolean;
  lastStatus: string;
  lastSyncAt: string;
};

export type RevenueOutcomeProviderSettings = {
  providers: RevenueOutcomeProviderConfig[];
};

const defaultProviderCopy: Record<RevenueOutcomeKey, Pick<RevenueOutcomeProviderConfig, "provider" | "cta" | "notes">> = {
  follow_creator: {
    provider: "Instagram",
    cta: "Follow us here for updates, offers, and examples.",
    notes: "Instagram follow is handled natively by Instagram.",
  },
  join_newsletter: {
    provider: "Newsletter",
    cta: "Want me to send the signup link so you can get updates and offers?",
    notes: "Paste your Mailchimp, ConvertKit, Beehiiv, Brevo, or custom signup link.",
  },
  book_call: {
    provider: "Booking",
    cta: "Would you like to book a quick call to find the best fit?",
    notes: "Paste your Calendly, Cal.com, HubSpot Meetings, or custom booking link.",
  },
  start_trial: {
    provider: "Trial signup",
    cta: "I can send the trial link if you want to test it first.",
    notes: "Paste your trial signup or onboarding link.",
  },
  purchase_product: {
    provider: "Stripe Checkout",
    cta: "I can send the checkout link now if you want to go ahead.",
    notes: "Add this account's Stripe Payment Link or Stripe secret key for product checkout.",
  },
  upgrade_plan: {
    provider: "Billing",
    cta: "Want me to show the best upgrade option for your usage?",
    notes: "Paste your upgrade, pricing, or billing portal link.",
  },
  recover_abandoned_cart: {
    provider: "Stripe Checkout",
    cta: "Still interested? I can resend the checkout link.",
    notes: "Uses existing order/checkout data; add a fallback checkout or support link if desired.",
  },
  renew_subscription: {
    provider: "Billing",
    cta: "Would you like me to send the renewal link?",
    notes: "Paste your renewal or billing portal link.",
  },
  collect_testimonial: {
    provider: "Testimonial form",
    cta: "Could you share one sentence about the result you got?",
    notes: "Paste your Typeform, Tally, Google Form, or testimonial capture link.",
  },
};

function sanitizeText(value: unknown, fallback = "", maxLength = 500) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function sanitizeUrl(value: unknown) {
  const raw = sanitizeText(value, "", 1200);

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeExecutionMode(value: unknown): RevenueOutcomeExecutionMode {
  return value === "webhook" || value === "api" ? value : "link";
}

function normalizeProviderConfig(outcomeType: RevenueOutcomeKey, value: unknown): RevenueOutcomeProviderConfig {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const defaults = defaultProviderCopy[outcomeType];
  const actionUrl = sanitizeUrl(record.actionUrl ?? record.action_url ?? record.url);
  const webhookUrl = sanitizeUrl(record.webhookUrl ?? record.webhook_url);
  const apiEndpoint = sanitizeUrl(record.apiEndpoint ?? record.api_endpoint ?? record.apiUrl ?? record.api_url);
  const hasSavedSecret = record.secretSaved === true || record.secret_saved === true;
  const isAlwaysConnected = outcomeType === "follow_creator";

  return {
    outcomeType,
    enabled: isAlwaysConnected || record.enabled === true || Boolean(actionUrl || webhookUrl || apiEndpoint || hasSavedSecret),
    autoExecute: record.autoExecute === true || record.auto_execute === true,
    provider: sanitizeText(record.provider, defaults.provider, 80),
    actionUrl,
    cta: sanitizeText(record.cta, defaults.cta, 240),
    notes: sanitizeText(record.notes, defaults.notes, 320),
    executionMode: normalizeExecutionMode(record.executionMode ?? record.execution_mode),
    webhookUrl,
    apiEndpoint,
    secretSaved: hasSavedSecret,
    lastStatus: sanitizeText(record.lastStatus ?? record.last_status, "", 80),
    lastSyncAt: sanitizeText(record.lastSyncAt ?? record.last_sync_at, "", 80),
  };
}

export function getDefaultRevenueOutcomeProviderSettings(): RevenueOutcomeProviderSettings {
  return {
    providers: revenueOutcomeKeys.map((outcomeType) => normalizeProviderConfig(outcomeType, {})),
  };
}

export function normalizeRevenueOutcomeProviderSettings(value: unknown): RevenueOutcomeProviderSettings {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const providers = Array.isArray(record.providers) ? record.providers : Array.isArray(value) ? value : [];

  return {
    providers: revenueOutcomeKeys.map((outcomeType) => {
      const existing = providers.find((provider): provider is Record<string, unknown> =>
        Boolean(provider && typeof provider === "object" && !Array.isArray(provider) && provider.outcomeType === outcomeType)
      );

      return normalizeProviderConfig(outcomeType, existing || {});
    }),
  };
}

export function getRevenueOutcomeProvider(
  settings: RevenueOutcomeProviderSettings | undefined,
  outcomeType: RevenueOutcomeKey
) {
  return (settings || getDefaultRevenueOutcomeProviderSettings()).providers.find((provider) => provider.outcomeType === outcomeType) ||
    normalizeProviderConfig(outcomeType, {});
}

export function formatRevenueOutcomeProvidersForPrompt(settings: RevenueOutcomeProviderSettings | undefined) {
  return (settings || getDefaultRevenueOutcomeProviderSettings()).providers
    .filter((provider) =>
      provider.enabled &&
      (provider.actionUrl || provider.webhookUrl || provider.apiEndpoint || provider.secretSaved || provider.outcomeType === "follow_creator")
    )
    .map((provider) => {
      const link = provider.actionUrl ? ` Link: ${provider.actionUrl}` : "";
      const secret = provider.secretSaved ? " Secure account credentials are saved." : "";
      const execution =
        provider.executionMode === "webhook" || provider.executionMode === "api"
          ? ` Execution: ${provider.executionMode}${provider.autoExecute ? " auto-enabled" : " manual-ready"}.`
          : "";
      return `- ${provider.outcomeType}: ${provider.provider}. CTA: ${provider.cta}.${link}${secret}${execution}`;
    })
    .join("\n");
}
