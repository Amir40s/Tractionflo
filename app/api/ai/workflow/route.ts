import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import {
  defaultAiLeadInsight,
  getEnabledWorkflowMap,
  getAiBehaviorPrompt,
  getStoredOpenAiKey,
  normalizeAiIntegrationMetadata,
  type AiLeadInsight,
  type AiWorkflowRunResult,
} from '@/lib/ai-integration';
import { shouldUseConversationAwareReply } from '@/lib/conversation-context';
import { runAssistantThread } from '@/lib/openai-assistants';
import { recordOpenAiUsage } from '@/lib/openai-usage';
import { getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type WorkflowMessage = {
  from?: 'me' | 'user' | 'note';
  text?: string;
  attachments?: { type?: string; name?: string }[];
  time?: string;
};

type WorkflowPayload = {
  assistantId?: string;
  assistant_id?: string;
  participant?: {
    id?: string;
    name?: string;
    username?: string;
  };
  accountName?: string;
  takeoverMode?: 'ai' | 'human';
  messages?: WorkflowMessage[];
  forceRefresh?: boolean;
};

function formatConversationLine(message: WorkflowMessage) {
  const sender = message.from === 'me' ? 'Business' : message.from === 'note' ? 'Internal note' : 'Instagram user';
  const text = typeof message.text === 'string' && message.text.trim() ? message.text.trim() : '';
  const attachmentSummary = message.attachments?.length
    ? ` [${message.attachments.map((attachment) => attachment.type || attachment.name || 'attachment').join(', ')}]`
    : '';

  return `${sender}: ${text || 'Sent an attachment'}${attachmentSummary}`;
}

function getLatestUserQuestion(messages: WorkflowMessage[] = []) {
  return [...messages]
    .reverse()
    .filter((message) => message.from === 'user' && typeof message.text === 'string' && message.text.trim())
    .slice(0, 3)
    .reverse()
    .map((message) => message.text?.trim() || '')
    .join('\n');
}

function resolveAssistantId(payload: WorkflowPayload, authenticatedUserId: string) {
  const requestedAssistantId = (payload.assistantId || payload.assistant_id || '').trim();

  if (!requestedAssistantId) {
    return authenticatedUserId;
  }

  return requestedAssistantId === authenticatedUserId ? requestedAssistantId : null;
}

function summarizeKnowledgeForResponse(
  knowledge: { mode: 'none' | 'direct' | 'context'; sourceTitle?: string; matches: unknown[] },
  assistantId: string
) {
  return {
    mode: knowledge.mode,
    sourceTitle: knowledge.sourceTitle,
    matches: knowledge.matches.length,
    assistantId,
    assistant_id: assistantId,
  };
}

function isNewInboundLead(messages: WorkflowMessage[] = []) {
  const conversationalMessages = messages.filter((message) => message.from !== 'note');
  const hasUserMessage = conversationalMessages.some((message) => message.from === 'user');
  const hasBusinessMessage = conversationalMessages.some((message) => message.from === 'me');
  const latestMessage = conversationalMessages[conversationalMessages.length - 1];

  return hasUserMessage && !hasBusinessMessage && latestMessage?.from === 'user';
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
    logger.info("Received request in /api/ai/workflow", { payload });
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

    if (payload.takeoverMode === 'human') {
      return NextResponse.json({ error: 'AI workflow is paused while human takeover is active.' }, { status: 409 });
    }

    const assistantId = resolveAssistantId(payload, user.id);

    if (!assistantId) {
      return NextResponse.json({ error: 'Assistant ID does not match the authenticated account.' }, { status: 403 });
    }

    const metadata = user.user_metadata || {};
    const integration = normalizeAiIntegrationMetadata(metadata);
    const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);

    const participantId = payload.participant?.id || '';
    const forceRefresh = Boolean(payload.forceRefresh);
    const userMessageCount = (payload.messages || []).filter((msg) => msg.from === 'user').length;

    // Load lead qualifications cache
    const leadQualifications = (metadata.lead_qualifications || {}) as Record<string, any>;
    const cachedLead = leadQualifications[participantId];

    // Determine if we should qualify this lead during this run
    let shouldQualifyLeads = false;
    let qualificationMocked = false;
    let qualificationReason = '';

    if (enabledWorkflows.qualifyLeads) {
      if (userMessageCount < 15) {
        shouldQualifyLeads = false;
        qualificationMocked = true;
        qualificationReason = `Qualification will run once 15 messages are exchanged (currently at ${userMessageCount} user messages).`;
      } else {
        if (forceRefresh || !cachedLead) {
          shouldQualifyLeads = true;
        } else {
          shouldQualifyLeads = false;
        }
      }
    }

    const runWorkflows = {
      ...enabledWorkflows,
      qualifyLeads: shouldQualifyLeads,
    };

    const newInboundLead = isNewInboundLead(payload.messages);
    const latestUserQuestion = getLatestUserQuestion(payload.messages);
    const useConversationAwareReply = shouldUseConversationAwareReply(payload.messages);
    const serviceSupabase = createSupabaseServiceClient();

    const assistantIdFromMetadata = metadata.openai_assistant_id as string | undefined;
    if (!assistantIdFromMetadata) {
      return NextResponse.json({ error: 'Assistant ID not found in settings. Please save your API key in Settings.' }, { status: 400 });
    }

    const knowledge = { mode: 'none' as const, matches: [], totalSources: 0, sourceTitle: undefined };

    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      logger.warn("OpenAI API key is missing. Bailing out of workflow request.");
      return NextResponse.json({ error: 'Save your OpenAI API key in Settings > AI Integration first.' }, { status: 400 });
    }

    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-16)
      .map(formatConversationLine)
      .join('\n');
    const rawResult = await runAssistantThread({
      apiKey,
      assistantId: assistantIdFromMetadata,
      maxTokens: 700,
      responseFormat: "json_object",
      additionalInstructions: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Return only valid JSON. No markdown. No commentary.
Never ask again for booking details that the customer already gave earlier in the conversation.
JSON shape:
{
  "starter": "first response to send when AI Starts Conversation is on and this is a new inbound lead; empty when not needed",
  "reply": "best next answer to the latest user message; use exact attached file_search knowledge when provided instead of vague ranges",
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
      messages: [
        {
          role: 'user',
          content: `Business account: ${payload.accountName || 'TractionFlo'}
Instagram participant: ${participantName}
Enabled jobs:
- AI Starts Conversation: ${runWorkflows.startConversation ? 'on' : 'off'}
- AI Answers Questions: ${runWorkflows.answerQuestions ? 'on' : 'off'}
- AI Qualifies Leads: ${runWorkflows.qualifyLeads ? 'on' : 'off'}
- AI Moves Lead to CTA: ${runWorkflows.moveToCta ? 'on' : 'off'}
Conversation state:
- New inbound lead with no business reply yet: ${newInboundLead ? 'yes' : 'no'}

Recent conversation:
${conversationLines || 'No prior messages. Treat this as a new Instagram lead.'}`,
        },
      ],
    });

    const normalizedWorkflowResult = normalizeWorkflowResult(rawResult, runWorkflows);
    const workflowResult =
      newInboundLead &&
      runWorkflows.startConversation &&
      !normalizedWorkflowResult.starter &&
      normalizedWorkflowResult.reply
        ? {
            ...normalizedWorkflowResult,
            starter: normalizedWorkflowResult.reply,
          }
        : normalizedWorkflowResult;

    // Apply mock or cached lead details if we did not run qualification
    if (enabledWorkflows.qualifyLeads) {
      if (qualificationMocked) {
        workflowResult.lead = {
          ...defaultAiLeadInsight,
          summary: qualificationReason,
          recommendedAction: 'Keep chatting to build context.',
        };
      } else if (cachedLead && !shouldQualifyLeads) {
        workflowResult.lead = cachedLead;
      }
    }

    // Save generated qualification to user metadata cache
    if (shouldQualifyLeads && participantId) {
      const nextQualifications = {
        ...leadQualifications,
        [participantId]: workflowResult.lead,
      };

      try {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...metadata,
            lead_qualifications: nextQualifications,
          },
        });
        if (updateError) {
          logger.error("Failed to save lead qualification in user metadata:", { error: updateError });
        } else {
          logger.info("Successfully cached lead qualification in user metadata", { participantId, lead: workflowResult.lead });
        }
      } catch (saveError) {
        logger.error("Failed to save lead qualification to user metadata:", { error: saveError });
      }
    }

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: 'ai',
      title: 'AI workflow completed',
      body: `Lead score ${workflowResult.lead.score}/100: ${workflowResult.lead.intent}`,
      url: '/conversations',
      metadata: {
        assistantId,
        score: workflowResult.lead.score,
        urgency: workflowResult.lead.urgency,
        knowledgeMode: knowledge.mode,
        sourceTitle: knowledge.sourceTitle || '',
      },
    }).catch((notificationError) => {
      logger.error('Realtime AI workflow notification error:', { error: notificationError });
    });

    return NextResponse.json({
      assistantId,
      assistant_id: assistantId,
      ...workflowResult,
      enabledWorkflows, // Return original workflows configurations to frontend
      knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not run AI workflow';
    logger.error('OpenAI workflow error:', { error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
