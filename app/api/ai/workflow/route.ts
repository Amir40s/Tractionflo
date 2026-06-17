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
import { buildBookingFollowUpReply, buildBookingMemoryPrompt, shouldUseConversationAwareReply } from '@/lib/conversation-context';
import { searchKnowledgeSources } from '@/lib/knowledge-base';
import { requestOpenAiChatCompletion } from '@/lib/openai-chat';
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
    name?: string;
    username?: string;
  };
  accountName?: string;
  takeoverMode?: 'ai' | 'human';
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
    const newInboundLead = isNewInboundLead(payload.messages);
    const latestUserQuestion = getLatestUserQuestion(payload.messages);
    const useConversationAwareReply = shouldUseConversationAwareReply(payload.messages);
    const bookingMemoryPrompt = buildBookingMemoryPrompt(payload.messages);
    const bookingFollowUpReply = buildBookingFollowUpReply(payload.messages);
    const serviceSupabase = createSupabaseServiceClient();
    const knowledge = latestUserQuestion && enabledWorkflows.answerQuestions
      ? await searchKnowledgeSources({
          supabase: serviceSupabase,
          userId: assistantId,
          question: latestUserQuestion,
        })
      : { mode: 'none' as const, matches: [], totalSources: 0 };

    if (enabledWorkflows.answerQuestions && bookingFollowUpReply) {
      const needsPhone = bookingFollowUpReply.toLowerCase().includes('share your phone number');
      const workflowResult = {
        starter: enabledWorkflows.startConversation && newInboundLead ? bookingFollowUpReply : '',
        reply: bookingFollowUpReply,
        cta: enabledWorkflows.moveToCta ? bookingFollowUpReply : '',
        lead: enabledWorkflows.qualifyLeads
          ? {
              ...defaultAiLeadInsight,
              score: needsPhone ? 68 : 82,
              stage: needsPhone ? 'Qualified' : 'Ready for CTA',
              urgency: 'Medium',
              intent: needsPhone ? 'Booking details collected' : 'Booking confirmation',
              summary: needsPhone
                ? 'Customer supplied booking details and still needs to share a phone number.'
                : 'Customer supplied booking details and phone number for final confirmation.',
              signals: [knowledge.sourceTitle || 'Booking flow matched', needsPhone ? 'Missing phone number' : 'Phone number received'],
              missing: needsPhone ? ['phone number'] : [],
              recommendedAction: needsPhone
                ? 'Ask for the phone number to finalize the booking.'
                : 'Confirm availability and save the booking.',
              cta: bookingFollowUpReply,
            }
          : {
              ...defaultAiLeadInsight,
              summary: 'AI Qualifies Leads is turned off.',
              recommendedAction: 'Turn on lead qualification in AI Integration.',
            },
        enabledWorkflows,
      } satisfies AiWorkflowRunResult;

      await triggerRealtimeNotification(getUserChannel(user.id), {
        type: 'ai',
        title: 'Booking workflow completed',
        body: workflowResult.reply.slice(0, 120),
        url: '/conversations',
        metadata: {
          assistantId,
          score: workflowResult.lead.score,
          urgency: workflowResult.lead.urgency,
          knowledgeMode: knowledge.mode,
          sourceTitle: knowledge.sourceTitle || '',
        },
      }).catch((notificationError) => {
        console.error('Realtime booking workflow notification error:', notificationError);
      });

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        ...workflowResult,
        knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
      });
    }

    if (knowledge.mode === 'direct' && knowledge.directAnswer && !useConversationAwareReply) {
      const workflowResult = {
        starter: enabledWorkflows.startConversation && newInboundLead ? knowledge.directAnswer : '',
        reply: knowledge.directAnswer,
        cta: enabledWorkflows.moveToCta ? integration.ctaMessage : '',
        lead: enabledWorkflows.qualifyLeads
          ? {
              ...defaultAiLeadInsight,
              score: 45,
              stage: 'Warm',
              intent: 'Knowledge answer',
              summary: `Answered from ${knowledge.sourceTitle || 'saved knowledge'}.`,
              signals: [knowledge.sourceTitle || 'Saved knowledge matched'],
              recommendedAction: 'Send the saved-knowledge answer.',
              cta: integration.ctaMessage,
            }
          : {
              ...defaultAiLeadInsight,
              summary: 'AI Qualifies Leads is turned off.',
              recommendedAction: 'Turn on lead qualification in AI Integration.',
            },
        enabledWorkflows,
      } satisfies AiWorkflowRunResult;

      await triggerRealtimeNotification(getUserChannel(user.id), {
        type: 'ai',
        title: 'Knowledge workflow completed',
        body: workflowResult.reply.slice(0, 120),
        url: '/conversations',
        metadata: {
          assistantId,
          score: workflowResult.lead.score,
          urgency: workflowResult.lead.urgency,
          knowledgeMode: knowledge.mode,
          sourceTitle: knowledge.sourceTitle || '',
        },
      }).catch((notificationError) => {
        console.error('Realtime knowledge workflow notification error:', notificationError);
      });

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        ...workflowResult,
        knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
      });
    }

    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      return NextResponse.json({ error: 'Save your OpenAI API key in Settings > AI Integration first.' }, { status: 400 });
    }

    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-16)
      .map(formatConversationLine)
      .join('\n');
    const knowledgeContext = knowledge.mode === 'direct' && knowledge.directAnswer
      ? `Saved business knowledge matched this conversation. Use this as source material, but adapt it to the full conversation.
Do not copy a saved answer if it asks for details the customer already provided.

Direct saved answer:
${knowledge.directAnswer}`
      : knowledge.mode === 'context' && knowledge.context
      ? `Saved business knowledge matched this conversation. Use this as the source of truth for the reply field.
Use exact saved prices, policies, hours, and requirements when the user has provided enough details.
Ask only for facts still missing, such as exact start time, duration, or availability confirmation.
If the saved knowledge does not answer the user, say the team can confirm manually instead of inventing details.

${knowledge.context}`
      : '';

    const rawResult = await requestOpenAiChatCompletion({
      apiKey,
      model: integration.model,
      maxTokens: 700,
      onUsage: (usage) =>
        recordOpenAiUsage({
          supabase: serviceSupabase,
          user,
          model: integration.model,
          usage,
          source: 'ai-workflow',
        }),
      messages: [
        {
          role: 'system',
          content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Return only valid JSON. No markdown. No commentary.
Never ask again for booking details that the customer already gave earlier in the conversation.
JSON shape:
{
  "starter": "first response to send when AI Starts Conversation is on and this is a new inbound lead; empty when not needed",
  "reply": "best next answer to the latest user message; use exact saved knowledge when provided instead of vague ranges",
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
Conversation state:
- New inbound lead with no business reply yet: ${newInboundLead ? 'yes' : 'no'}
${knowledgeContext ? `\n${knowledgeContext}\n` : ''}
${bookingMemoryPrompt}

Recent conversation:
${conversationLines || 'No prior messages. Treat this as a new Instagram lead.'}`,
        },
      ],
    });

    const normalizedWorkflowResult = normalizeWorkflowResult(rawResult, enabledWorkflows);
    const workflowResult =
      newInboundLead &&
      enabledWorkflows.startConversation &&
      !normalizedWorkflowResult.starter &&
      normalizedWorkflowResult.reply
        ? {
            ...normalizedWorkflowResult,
            starter: normalizedWorkflowResult.reply,
          }
        : normalizedWorkflowResult;

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
      console.error('Realtime AI workflow notification error:', notificationError);
    });

    return NextResponse.json({
      assistantId,
      assistant_id: assistantId,
      ...workflowResult,
      knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not run AI workflow';
    console.error('OpenAI workflow error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
