import { NextResponse } from "next/server";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import {
  escalationRulesMetadataKey,
  normalizeEscalationRuleSettings,
} from "@/lib/conversation-escalation";
import {
  buildKnowledgeSourceIndex,
  createKnowledgeStoragePaths,
  listKnowledgeSourceIndexes,
  saveKnowledgeSourceIndex,
} from "@/lib/knowledge-base";
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
    detail: cleanString(item.detail, 3000),
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
  const stringFields = ["businessName", "niche", "description", "businessGoal", "websiteUrl"];

  stringFields.forEach((field) => {
    if (field in input) {
      setup[field] = cleanString(input[field], field === "description" ? 1600 : field === "websiteUrl" ? 500 : 240);
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

function buildAiSystemPrompt(setup: Record<string, unknown>): string {
  const parts: string[] = [];
  const name = cleanString(setup.businessName, 160);
  const niche = cleanString(setup.niche, 120);
  const description = cleanString(setup.description, 800);
  const websiteUrl = cleanString(setup.websiteUrl, 400);
  const offers = Array.isArray(setup.offers) ? (setup.offers as Array<Record<string, unknown>>) : [];

  if (name) parts.push(`Business name: ${name}`);
  if (niche) parts.push(`Niche: ${niche}`);
  if (description) parts.push(`About: ${description}`);
  if (websiteUrl) parts.push(`Website / Purchase link: ${websiteUrl}`);
  if (offers.length) {
    const offerSummary = offers
      .slice(0, 8)
      .map((o) => {
        const title = cleanString(o.title, 120);
        const price = cleanString(o.priceText, 40);
        const link = cleanString(o.permalink, 300) || websiteUrl;
        return [title, price, link].filter(Boolean).join(' — ');
      })
      .filter(Boolean)
      .join('; ');
    if (offerSummary) parts.push(`Products/offers: ${offerSummary}`);
  }

  if (!parts.length) return '';

  return `You are an Instagram DM assistant for this business. Use the details below to answer questions accurately. Always provide the website link when asked and never say you don't have the link.\n\n${parts.join('\n')}`;
}

async function buildAutoKnowledgeText(setup: Record<string, unknown>): Promise<string> {
  const lines: string[] = ['# Business Info'];
  const name = cleanString(setup.businessName, 160);
  const niche = cleanString(setup.niche, 120);
  const description = cleanString(setup.description, 800);
  const websiteUrl = cleanString(setup.websiteUrl, 400);
  const businessGoal = cleanString(setup.businessGoal, 200);
  const offers = Array.isArray(setup.offers) ? (setup.offers as Array<Record<string, unknown>>) : [];
  const missingItems = Array.isArray(setup.missingItems) ? (setup.missingItems as Array<Record<string, unknown>>) : [];

  if (name) lines.push(`Business Name: ${name}`);
  if (niche) lines.push(`Niche: ${niche}`);
  if (description) lines.push(`\nDescription:\n${description}`);
  if (websiteUrl) lines.push(`\nWebsite / Purchase Link: ${websiteUrl}`);
  if (businessGoal) lines.push(`Business Goal: ${businessGoal}`);
  if (offers.length) {
    lines.push('\n## Products / Offers');
    offers.slice(0, 20).forEach((o) => {
      const title = cleanString(o.title, 120);
      if (!title) return;
      const price = cleanString(o.priceText, 40);
      const desc = cleanString(o.description, 300);
      const link = cleanString(o.permalink, 300) || websiteUrl;
      const offerLine = [`- ${title}`, price && `Price: ${price}`, desc, link && `Link: ${link}`].filter(Boolean).join(' | ');
      lines.push(offerLine);
    });
  }

  if (missingItems.length) {
    lines.push('\n## Additional Policies & Business Information');
    missingItems.forEach((item) => {
      const label = cleanString(item.label, 120);
      const detail = cleanString(item.detail, 3000);
      const complete = Boolean(item.complete);
      if (label && complete && detail && !detail.includes('Add pricing') && !detail.includes('Add your') && !detail.includes('Add shipping') && !detail.includes('Add detailed')) {
        lines.push(`### ${label}\n${detail}\n`);
      }
    });
  }

  if (websiteUrl) {
    lines.push(`\n## Common Questions`);
    lines.push(`Q: What is your website?\nA: ${websiteUrl}`);
    lines.push(`Q: How can I buy / purchase?\nA: You can buy here: ${websiteUrl}`);
    lines.push(`Q: Send me the link\nA: Here is the link: ${websiteUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      let html = "";
      
      try {
        const rawResponse = await fetch(websiteUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; TractionFloBot/1.0)" }
        });
        if (rawResponse.ok) {
          const rawHtml = await rawResponse.text();
          if (rawHtml.length > 2000 && !rawHtml.includes('<noscript>You need to enable JavaScript')) {
            html = rawHtml;
          }
        }
      } catch (e) {
        console.warn("Raw fetch failed, falling back to Jina AI", e);
      }

      if (!html) {
        const response = await fetch(`https://r.jina.ai/${websiteUrl}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'text/plain',
            'X-Return-Format': 'html',
            'X-Target-Selector': 'body'
          }
        });
        if (response.ok) {
          html = await response.text();
        } else {
          console.warn(`Jina AI returned status ${response.status} for ${websiteUrl}`);
        }
      }
      
      clearTimeout(timeoutId);

      if (html) {
        const cheerio = await import("cheerio");
        const $ = cheerio.load(html);

        // Extract JSON-LD FAQs which are often used by SPAs for SEO when content is hidden behind accordions
        let hiddenFaqContent = "";
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const data = JSON.parse($(el).html() || "{}");
            if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
              hiddenFaqContent += "\n\n## Frequently Asked Questions\n";
              data.mainEntity.forEach((item: any) => {
                if (item['@type'] === 'Question' && item.name && item.acceptedAnswer?.text) {
                  hiddenFaqContent += `**Q: ${item.name}**\nA: ${item.acceptedAnswer.text}\n\n`;
                }
              });
            }
          } catch (e) {}
        });

        $('script, style, svg, noscript, iframe, nav, footer, header').remove();
        
        const rawText = $('body').text();
        let markdown = rawText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();

        if (hiddenFaqContent) {
          markdown += hiddenFaqContent;
        }

        if (markdown && markdown.length > 50) {
           lines.push(`\n## Website Content\nThe following is the scraped content of the business website:\n\n${markdown}`);
        }
      }
    } catch (scrapeError) {
      console.warn("Failed to scrape website url:", scrapeError);
    }
  }

  return lines.join('\n');
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

    const metadata = compactUserAuthMetadata(user.user_metadata);
    const existingSetup = isRecord(metadata.onboarding_setup) ? metadata.onboarding_setup as Record<string, unknown> : {};

    // Auto-create a Knowledge Base entry from onboarding data so the AI can answer from day one
    const kbText = await buildAutoKnowledgeText(existingSetup);
    const businessName = cleanString(existingSetup.businessName, 160) || 'Business';
    if (kbText.length > 20) {
      try {
        const serviceClient = createSupabaseServiceClient();
        const existingSources = await listKnowledgeSourceIndexes(serviceClient, user.id).catch(() => []);
        const autoEntry = existingSources.find((s) => s.title === 'Business Info (Auto-generated)');
        const sourceId = autoEntry?.id ?? globalThis.crypto.randomUUID();
        const fileName = 'Business-Info.manual.txt';
        const { indexPath } = createKnowledgeStoragePaths(user.id, sourceId, fileName);
        const indexedText = `Category: Business Information\nTitle: Business Info (Auto-generated)\n\n${kbText}`;
        const assignment = existingSources.filter((s) => s.id !== autoEntry?.id).length === 0 ? 'default' : 'auto';
        const sourceIndex = buildKnowledgeSourceIndex({
          userId: user.id,
          sourceId,
          fileName,
          mimeType: 'text/x-tractionflo-manual',
          fileSize: Buffer.byteLength(indexedText, 'utf8'),
          filePath: '',
          indexPath,
          text: indexedText,
          assignment,
          categories: [businessName, 'Business Information'],
          openAiFileId: autoEntry?.openAiFileId,
        });
        // Override title to match expected search
        (sourceIndex as typeof sourceIndex & { title: string }).title = 'Business Info (Auto-generated)';
        await saveKnowledgeSourceIndex(serviceClient, sourceIndex);
      } catch (kbError) {
        // Non-fatal — log but don't fail the completion
        console.error('Could not auto-create knowledge base entry:', kbError);
      }
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

    // Auto-build AI system prompt from collected business info
    const autoPrompt = buildAiSystemPrompt(nextSetup);
    if (autoPrompt) {
      // Only overwrite if user hasn't set a custom prompt, or prepend business facts to any existing custom prompt
      const existingPrompt = cleanString(metadata.ai_integration_system_prompt, 1800);
      const hasCustomPrompt = existingPrompt && !existingPrompt.startsWith('You are an Instagram DM assistant for this business.');
      nextMetadata.ai_integration_system_prompt = hasCustomPrompt
        ? `${autoPrompt}\n\n${existingPrompt}`.slice(0, 1800)
        : autoPrompt;
    }

    // Auto-set CTA from websiteUrl or purchase_product conversion action
    const websiteUrl = cleanString(nextSetup.websiteUrl, 400);
    if (websiteUrl) {
      nextMetadata.ai_integration_cta = websiteUrl;
    } else if (Array.isArray(nextSetup.conversionActions)) {
      const purchaseAction = (nextSetup.conversionActions as Array<Record<string, unknown>>)
        .find((a) => cleanString(a.label) === 'Purchase / Checkout' && cleanString(a.href));
      if (purchaseAction) {
        nextMetadata.ai_integration_cta = cleanString(purchaseAction.href, 400);
      }
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
