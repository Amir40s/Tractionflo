import { NextResponse } from "next/server";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import {
  escalationRulesMetadataKey,
  normalizeEscalationRuleSettings,
} from "@/lib/conversation-escalation";
import {
  normalizeRevenueOutcomeProviderSettings,
  revenueOutcomeProvidersMetadataKey,
  type RevenueOutcomeProviderSettings,
} from "@/lib/revenue-outcome-providers";
import { saveRevenueProviderConnections } from "@/lib/revenue-provider-execution";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type OnboardingSetupPayload = {
  setup?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength = 1200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanOffers(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).slice(0, 20).map((offer) => ({
    title: cleanString(offer.title, 160),
    priceText: cleanString(offer.priceText, 80),
    priceAmount: cleanNumber(offer.priceAmount),
    currency: cleanString(offer.currency, 8).toUpperCase() || "USD",
    description: cleanString(offer.description, 500),
    permalink: cleanString(offer.permalink, 1200),
    tags: Array.isArray(offer.tags) ? offer.tags.map((tag) => cleanString(tag, 60)).filter(Boolean).slice(0, 10) : [],
  })).filter((offer) => offer.title);
}

function cleanConversionActions(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).slice(0, 12).map((action) => ({
    label: cleanString(action.label, 120),
    detail: cleanString(action.detail, 1200),
    configured: cleanBoolean(action.configured),
    href: cleanString(action.href, 1200),
  })).filter((action) => action.label);
}

function cleanEscalationRules(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).slice(0, 20).map((rule) => ({
    id: cleanString(rule.id, 120) || `custom-${Date.now()}`,
    label: cleanString(rule.label, 160) || "Custom rule",
    enabled: cleanBoolean(rule.enabled, true),
    action: cleanString(rule.action, 240),
    priority: cleanString(rule.priority, 80),
  }));
}

function cleanPermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).slice(0, 12).map((permission) => ({
    label: cleanString(permission.label, 120),
    detail: cleanString(permission.detail, 240),
    enabled: cleanBoolean(permission.enabled),
  })).filter((permission) => permission.label);
}

function cleanMissingItems(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).slice(0, 20).map((item) => ({
    label: cleanString(item.label, 160),
    detail: cleanString(item.detail, 800),
    complete: cleanBoolean(item.complete),
  })).filter((item) => item.label);
}

function cleanBehavior(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    tone: cleanString(value.tone, 80),
    responseLength: cleanString(value.responseLength, 80),
    followUp: cleanString(value.followUp, 80),
  };
}

function cleanOnboardingSetup(value: unknown) {
  const input = isRecord(value) ? value : {};
  const setup: Record<string, unknown> = {};
  const stringFields = ["businessName", "niche", "description", "businessGoal"];

  stringFields.forEach((field) => {
    if (field in input) {
      setup[field] = cleanString(input[field], field === "description" ? 1600 : 240);
    }
  });

  const offers = cleanOffers(input.offers);
  const conversionActions = cleanConversionActions(input.conversionActions);
  const escalationRules = cleanEscalationRules(input.escalationRules);
  const permissions = cleanPermissions(input.permissions);
  const missingItems = cleanMissingItems(input.missingItems);
  const behavior = cleanBehavior(input.behavior);

  if (offers) setup.offers = offers;
  if (conversionActions) setup.conversionActions = conversionActions;
  if (escalationRules) setup.escalationRules = escalationRules;
  if (permissions) setup.permissions = permissions;
  if (missingItems) setup.missingItems = missingItems;
  if (behavior) setup.behavior = behavior;

  return setup;
}

function buildRevenueProviderSettingsFromConversionActions(value: unknown): RevenueOutcomeProviderSettings | null {
  const actions = cleanConversionActions(value);

  if (!actions?.length) {
    return null;
  }

  const outcomeByLabel: Record<string, string> = {
    "Book a Call": "book_call",
    "Purchase / Checkout": "purchase_product",
    "Apply / Enroll": "start_trial",
    "Free Resource / Lead Magnet": "join_newsletter",
  };
  const providerInputs: Array<{ outcomeType: string; enabled: boolean; actionUrl: string; executionMode: "link" }> = [];

  actions.forEach((action) => {
    const outcomeType = outcomeByLabel[action.label];

    if (outcomeType) {
      providerInputs.push({
        outcomeType,
        enabled: action.configured,
        actionUrl: action.href,
        executionMode: "link",
      });
    }
  });

  const includedOutcomeTypes = new Set(providerInputs.map((provider) => provider.outcomeType));

  if (!providerInputs.length) {
    return null;
  }

  const normalized = normalizeRevenueOutcomeProviderSettings({ providers: providerInputs });

  return {
    providers: normalized.providers.filter((provider) => includedOutcomeTypes.has(provider.outcomeType)),
  };
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return { supabase, user };
}

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated", setup: {} }, { status: 401 });
    }

    const metadata = isRecord(user.user_metadata) ? user.user_metadata : {};
    return NextResponse.json({
      setup: isRecord(metadata.onboarding_setup) ? metadata.onboarding_setup : {},
      onboardingCompleted: metadata.onboarding_completed === true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load onboarding setup";
    console.error("Onboarding setup load error:", error);
    return NextResponse.json({ error: message, setup: {} }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...compactUserAuthMetadata(user.user_metadata),
        onboarding_completed: true,
      },
    });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update onboarding status";
    console.error("Onboarding completion error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as OnboardingSetupPayload;
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = compactUserAuthMetadata(user.user_metadata);
    const setupPatch = cleanOnboardingSetup(payload.setup);
    const existingSetup = isRecord(metadata.onboarding_setup) ? metadata.onboarding_setup : {};
    const nextSetup: Record<string, unknown> = {
      ...existingSetup,
      ...setupPatch,
      updatedAt: new Date().toISOString(),
    };
    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      onboarding_setup: nextSetup,
    };

    if (isRecord(nextSetup.behavior)) {
      nextMetadata.ai_behavior = nextSetup.behavior;
      nextMetadata.ai_personality = cleanString(nextSetup.behavior.tone, 80);
      nextMetadata.ai_response_style = cleanString(nextSetup.behavior.responseLength, 80);
    }

    if (typeof nextSetup.businessGoal === "string") {
      nextMetadata.onboarding_business_goal = nextSetup.businessGoal;
    }

    if (Array.isArray(nextSetup.escalationRules)) {
      nextMetadata[escalationRulesMetadataKey] = normalizeEscalationRuleSettings(nextSetup.escalationRules);
    }

    const revenueProviderSettings = buildRevenueProviderSettingsFromConversionActions(nextSetup.conversionActions);

    if (revenueProviderSettings) {
      nextMetadata[revenueOutcomeProvidersMetadataKey] = revenueProviderSettings;
    }

    const { error } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    if (error) {
      throw error;
    }

    if (revenueProviderSettings) {
      await saveRevenueProviderConnections({
        supabase: createSupabaseServiceClient(),
        userId: user.id,
        providers: revenueProviderSettings.providers,
      });
    }

    return NextResponse.json({ ok: true, setup: nextSetup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save onboarding setup";
    console.error("Onboarding setup save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
