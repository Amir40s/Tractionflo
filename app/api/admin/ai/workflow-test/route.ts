import { NextResponse } from "next/server";
import {
  defaultAiLeadInsight,
  getAiBehaviorPrompt,
  getEnabledWorkflowMap,
  type AiLeadInsight,
} from "@/lib/ai-integration";
import { getConditionalCtaPrompt, removeUnrequestedBookingCta } from "@/lib/booking-cta-policy";
import { requestOpenAiChatCompletion } from "@/lib/openai-chat";
import { recordOpenAiUsage } from "@/lib/openai-usage";
import { isSuperAdminUser, resolvePlatformAiConfig } from "@/lib/platform-ai-config";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type WorkflowTestJson = {
  starter?: unknown;
  reply?: unknown;
  cta?: unknown;
  lead?: Partial<AiLeadInsight> | null;
};

function parseWorkflowJson(value: string): WorkflowTestJson {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;

  try {
    return JSON.parse(candidate) as WorkflowTestJson;
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    return objectMatch ? (JSON.parse(objectMatch[0]) as WorkflowTestJson) : {};
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 900) : "";
}

function normalizeLead(value: WorkflowTestJson["lead"]): AiLeadInsight {
  if (!value || typeof value !== "object") {
    return defaultAiLeadInsight;
  }

  const score = typeof value.score === "number" ? value.score : Number(value.score);
  const urgency = value.urgency === "High" || value.urgency === "Medium" || value.urgency === "Low" ? value.urgency : defaultAiLeadInsight.urgency;
  const toList = (items: unknown) =>
    Array.isArray(items)
      ? items.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 5)
      : [];

  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : defaultAiLeadInsight.score,
    stage: normalizeText(value.stage) || defaultAiLeadInsight.stage,
    urgency,
    intent: normalizeText(value.intent) || defaultAiLeadInsight.intent,
    summary: normalizeText(value.summary) || defaultAiLeadInsight.summary,
    signals: toList(value.signals),
    missing: toList(value.missing),
    recommendedAction: normalizeText(value.recommendedAction) || defaultAiLeadInsight.recommendedAction,
    cta: normalizeText(value.cta) || defaultAiLeadInsight.cta,
  };
}

export async function POST() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error,
    } = await authSupabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSuperAdminUser(user)) {
      return NextResponse.json({ error: "Only superadmins can test platform AI workflows." }, { status: 403 });
    }

    const serviceSupabase = createSupabaseServiceClient();
    const platformConfig = await resolvePlatformAiConfig(serviceSupabase);
    const { apiKey, integration } = platformConfig;

    if (!apiKey) {
      return NextResponse.json({ error: "Add the platform OpenAI key in Super Admin > AI Integration first." }, { status: 400 });
    }

    const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);
    const rawResult = await requestOpenAiChatCompletion({
      apiKey,
      model: integration.model,
      maxTokens: 850,
      onUsage: (usage) =>
        recordOpenAiUsage({
          supabase: serviceSupabase,
          user,
          model: integration.model,
          usage,
          source: "platform-ai-workflow-test",
        }),
      messages: [
        {
          role: "system",
          content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
${getConditionalCtaPrompt(integration.ctaMessage, "I need more leads quickly. I can start this week if the package is a good fit.")}

Return JSON only with keys: starter, reply, cta, lead. If a workflow is disabled, set that field to an empty string, and set lead to null when lead qualification is disabled.`,
        },
        {
          role: "user",
          content: `Enabled workflows:
${JSON.stringify(enabledWorkflows)}

Sample Instagram thread:
Lead: Hi, I want to know your coaching price and whether you can help me grow my Instagram this month.
Business: Happy to help. What are you trying to improve first?
Lead: I need more leads quickly. I can start this week if the package is a good fit.`,
        },
      ],
    });
    const parsed = parseWorkflowJson(rawResult);
    const lead = enabledWorkflows.qualifyLeads ? normalizeLead(parsed.lead) : null;

    return NextResponse.json({
      starter: enabledWorkflows.startConversation ? removeUnrequestedBookingCta(normalizeText(parsed.starter), "") : "",
      reply: enabledWorkflows.answerQuestions ? removeUnrequestedBookingCta(normalizeText(parsed.reply), "") : "",
      cta: enabledWorkflows.moveToCta ? removeUnrequestedBookingCta(normalizeText(parsed.cta), "") : "",
      lead,
      enabledWorkflows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not test platform AI workflows";
    console.error("Platform AI workflow test error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
