import { NextResponse } from 'next/server';
import { getAiBehaviorPrompt, getStoredOpenAiKey, normalizeAiIntegrationMetadata } from '@/lib/ai-integration';
import { buildBookingFollowUpReply, buildBookingMemoryPrompt, shouldUseConversationAwareReply } from '@/lib/conversation-context';
import { searchKnowledgeSources } from '@/lib/knowledge-base';
import { requestOpenAiChatCompletion } from '@/lib/openai-chat';
import { recordOpenAiUsage } from '@/lib/openai-usage';
import { getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type ReplyMessage = {
  from?: 'me' | 'user' | 'note';
  text?: string;
  attachments?: { type?: string; name?: string }[];
  time?: string;
};

type ReplyPayload = {
  assistantId?: string;
  assistant_id?: string;
  participant?: {
    name?: string;
    username?: string;
  };
  accountName?: string;
  takeoverMode?: 'ai' | 'human';
  messages?: ReplyMessage[];
};

function formatConversationLine(message: ReplyMessage) {
  const sender = message.from === 'me' ? 'Business' : message.from === 'note' ? 'Internal note' : 'Instagram user';
  const text = typeof message.text === 'string' && message.text.trim() ? message.text.trim() : '';
  const attachmentSummary = message.attachments?.length
    ? ` [${message.attachments.map((attachment) => attachment.type || attachment.name || 'attachment').join(', ')}]`
    : '';

  return `${sender}: ${text || 'Sent an attachment'}${attachmentSummary}`;
}

function getLatestUserQuestion(messages: ReplyMessage[] = []) {
  return [...messages]
    .reverse()
    .filter((message) => message.from === 'user' && typeof message.text === 'string' && message.text.trim())
    .slice(0, 3)
    .reverse()
    .map((message) => message.text?.trim() || '')
    .join('\n');
}

function resolveAssistantId(payload: ReplyPayload, authenticatedUserId: string) {
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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ReplyPayload;
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
      return NextResponse.json({ error: 'AI replies are paused while human takeover is active.' }, { status: 409 });
    }

    const assistantId = resolveAssistantId(payload, user.id);

    if (!assistantId) {
      return NextResponse.json({ error: 'Assistant ID does not match the authenticated account.' }, { status: 403 });
    }

    const metadata = user.user_metadata || {};
    const integration = normalizeAiIntegrationMetadata(metadata);
    const canAnswer = integration.workflows.find((workflow) => workflow.id === 'answerQuestions')?.enabled;

    if (!canAnswer) {
      return NextResponse.json({ error: 'AI Answers Questions is turned off.' }, { status: 400 });
    }

    const latestUserQuestion = getLatestUserQuestion(payload.messages);
    const useConversationAwareReply = shouldUseConversationAwareReply(payload.messages);
    const bookingMemoryPrompt = buildBookingMemoryPrompt(payload.messages);
    const bookingFollowUpReply = buildBookingFollowUpReply(payload.messages);
    const serviceSupabase = createSupabaseServiceClient();
    const knowledge = latestUserQuestion
      ? await searchKnowledgeSources({
          supabase: serviceSupabase,
          userId: assistantId,
          question: latestUserQuestion,
        })
      : { mode: 'none' as const, matches: [], totalSources: 0 };

    if (bookingFollowUpReply) {
      await triggerRealtimeNotification(getUserChannel(user.id), {
        type: 'ai',
        title: 'Booking reply drafted',
        body: bookingFollowUpReply.slice(0, 120),
        url: '/conversations',
        metadata: {
          assistantId,
          autoSend: integration.autoSend,
          knowledgeMode: knowledge.mode,
          sourceTitle: knowledge.sourceTitle || '',
        },
      }).catch((notificationError) => {
        console.error('Realtime booking reply notification error:', notificationError);
      });

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        reply: bookingFollowUpReply,
        autoSend: integration.autoSend,
        knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
      });
    }

    if (knowledge.mode === 'direct' && knowledge.directAnswer && !useConversationAwareReply) {
      const reply = knowledge.directAnswer;

      await triggerRealtimeNotification(getUserChannel(user.id), {
        type: 'ai',
        title: 'Knowledge reply drafted',
        body: reply.slice(0, 120),
        url: '/conversations',
        metadata: {
          assistantId,
          autoSend: integration.autoSend,
          knowledgeMode: knowledge.mode,
          sourceTitle: knowledge.sourceTitle || '',
        },
      }).catch((notificationError) => {
        console.error('Realtime knowledge reply notification error:', notificationError);
      });

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        reply,
        autoSend: integration.autoSend,
        knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
      });
    }

    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      return NextResponse.json({ error: 'Save your OpenAI API key first.' }, { status: 400 });
    }

    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-12)
      .map(formatConversationLine)
      .join('\n');
    const knowledgeContext = knowledge.mode === 'direct' && knowledge.directAnswer
      ? `Saved business knowledge matched this conversation. Use this as source material, but adapt it to the full conversation.
Do not copy a saved answer if it asks for details the customer already provided.

Direct saved answer:
${knowledge.directAnswer}`
      : knowledge.mode === 'context' && knowledge.context
      ? `Saved business knowledge matched this question. Use this as the source of truth when answering.
Use exact saved prices, policies, hours, and requirements when the user has provided enough details.
Ask only for facts still missing, such as exact start time, duration, or availability confirmation.
If the saved knowledge does not answer the user, say the team can confirm manually instead of inventing details.

${knowledge.context}`
      : '';

    const reply = await requestOpenAiChatCompletion({
      apiKey,
      model: integration.model,
      maxTokens: 180,
      onUsage: (usage) =>
        recordOpenAiUsage({
          supabase: serviceSupabase,
          user,
          model: integration.model,
          usage,
          source: 'ai-reply',
        }),
      messages: [
        {
          role: 'system',
          content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Return only the Instagram DM reply text. Keep it natural, brief, and useful. Do not mention being an AI unless asked. If saved knowledge is provided, do not give a vague answer when an exact saved answer is available.
Never ask again for booking details that the customer already gave earlier in the conversation.`,
        },
        {
          role: 'user',
          content: `Business account: ${payload.accountName || 'TractionFlo'}
Instagram participant: ${participantName}
${knowledgeContext ? `\n${knowledgeContext}\n` : ''}
${bookingMemoryPrompt}

Recent conversation:
${conversationLines || 'No prior messages.'}

Write the next best reply.`,
        },
      ],
    });

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: 'ai',
      title: 'AI reply drafted',
      body: reply.slice(0, 120),
      url: '/conversations',
      metadata: {
        assistantId,
        autoSend: integration.autoSend,
        knowledgeMode: knowledge.mode,
        sourceTitle: knowledge.sourceTitle || '',
      },
    }).catch((notificationError) => {
      console.error('Realtime AI reply notification error:', notificationError);
    });

    return NextResponse.json({
      assistantId,
      assistant_id: assistantId,
      reply,
      autoSend: integration.autoSend,
      knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not generate AI reply';
    console.error('OpenAI reply generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
