import { NextResponse } from 'next/server';
import {
  defaultAiLeadInsight,
  getEnabledWorkflowMap,
  getAiBehaviorPrompt,
  getStoredOpenAiKey,
  normalizeAiIntegrationMetadata,
  type AiLeadInsight,
  type AiWorkflowRunResult,
} from '@/lib/ai-integration';
import { requestOpenAiChatCompletion } from '@/lib/openai-chat';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type WorkflowMessage = {
  from?: 'me' | 'user' | 'note';
  text?: string;
  attachments?: { type?: string; name?: string }[];
  time?: string;
};

type WorkflowPayload = {
  participant?: {
    name?: string;
    username?: string;
  };
  accountName?: string;
  messages?: WorkflowMessage[];
};

function formatConversationLine(message: WorkflowMessage) {
  const sender = message.from === 'me' ? 'Business' : message.from === 'note' ? 'Internal note' : 'Instagram user';
  const text = typeof message.text === 'string' && message.text.trim() ? message.text.trim() : '';
  const attachmentSummary = message.attachments?.length
    ? ` [${message.attachments.map((attachment) => attachment.type || attachment.name || 'attachment').join(', ')}]`
    : '';

  return `${sender}: ${text || 'Sent an attachment'}${attachmentSummary}`;
}

function clampScore(score: unknown) {
  const numericScore = typeof score === 'number' ? score : Number(score);

  if (!Number.isFinite(numericScore)) {
    return defaultAiLeadInsight.score;
  }

  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 5);
}

function normalizeUrgency(value: unknown): AiLeadInsight['urgency'] {
  if (value === 'High' || value === 'Medium' || value === 'Low') {
    return value;
  }

  return defaultAiLeadInsight.urgency;
}

function normalizeText(value: unknown, fallback: string, maxLength = 500) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function extractJsonObject(value: string) {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] || value;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('OpenAI did not return valid workflow JSON.');
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
}

function normalizeLeadInsight(value: unknown): AiLeadInsight {
  if (!value || typeof value !== 'object') {
    return defaultAiLeadInsight;
  }

  const lead = value as Record<string, unknown>;

  return {
    score: clampScore(lead.score),
    stage: normalizeText(lead.stage, defaultAiLeadInsight.stage, 80),
    urgency: normalizeUrgency(lead.urgency),
    intent: normalizeText(lead.intent, defaultAiLeadInsight.intent, 120),
    summary: normalizeText(lead.summary, defaultAiLeadInsight.summary, 500),
    signals: normalizeList(lead.signals),
    missing: normalizeList(lead.missing),
    recommendedAction: normalizeText(lead.recommendedAction, defaultAiLeadInsight.recommendedAction, 260),
    cta: normalizeText(lead.cta, defaultAiLeadInsight.cta, 260),
  };
}

function normalizeWorkflowResult(value: string, enabledWorkflows: AiWorkflowRunResult['enabledWorkflows']) {
  const parsed = extractJsonObject(value);
  const lead = normalizeLeadInsight(parsed.lead);

  return {
    starter: enabledWorkflows.startConversation
      ? normalizeText(parsed.starter, '', 500)
      : '',
    reply: enabledWorkflows.answerQuestions
      ? normalizeText(parsed.reply, '', 500)
      : '',
    cta: enabledWorkflows.moveToCta
      ? normalizeText(parsed.cta, lead.cta, 500)
      : '',
    lead: enabledWorkflows.qualifyLeads
      ? lead
      : {
          ...defaultAiLeadInsight,
          summary: 'AI Qualifies Leads is turned off.',
          recommendedAction: 'Turn on lead qualification in AI Integration.',
        },
    enabledWorkflows,
  } satisfies AiWorkflowRunResult;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WorkflowPayload;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const metadata = user.user_metadata || {};
    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      return NextResponse.json({ error: 'Save your OpenAI API key in Settings > AI Integration first.' }, { status: 400 });
    }

    const integration = normalizeAiIntegrationMetadata(metadata);
    const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);
    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-16)
      .map(formatConversationLine)
      .join('\n');

    const rawResult = await requestOpenAiChatCompletion({
      apiKey,
      model: integration.model,
      maxTokens: 700,
      messages: [
        {
          role: 'system',
          content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Return only valid JSON. No markdown. No commentary.
JSON shape:
{
  "starter": "short opener for a new Instagram lead",
  "reply": "best next answer to the latest user message",
  "cta": "short CTA message that moves a ready lead forward",
  "lead": {
    "score": 0-100,
    "stage": "New | Warm | Qualified | Ready for CTA | Needs human",
    "urgency": "Low | Medium | High",
    "intent": "short intent label",
    "summary": "one sentence",
    "signals": ["up to five buying or support signals"],
    "missing": ["up to five missing qualification facts"],
    "recommendedAction": "one next action for the business",
    "cta": "best CTA for this lead"
  }
}`,
        },
        {
          role: 'user',
          content: `Business account: ${payload.accountName || 'TractionFlo'}
Instagram participant: ${participantName}
Enabled jobs:
- AI Starts Conversation: ${enabledWorkflows.startConversation ? 'on' : 'off'}
- AI Answers Questions: ${enabledWorkflows.answerQuestions ? 'on' : 'off'}
- AI Qualifies Leads: ${enabledWorkflows.qualifyLeads ? 'on' : 'off'}
- AI Moves Lead to CTA: ${enabledWorkflows.moveToCta ? 'on' : 'off'}

Recent conversation:
${conversationLines || 'No prior messages. Treat this as a new Instagram lead.'}`,
        },
      ],
    });

    return NextResponse.json(normalizeWorkflowResult(rawResult, enabledWorkflows));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not run AI workflow';
    console.error('OpenAI workflow error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
