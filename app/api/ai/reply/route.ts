import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getAiBehaviorPrompt, getStoredOpenAiKey, normalizeAiIntegrationMetadata } from '@/lib/ai-integration';
import {
  detectConversationEscalation,
  escalationRulesMetadataKey,
  shouldPauseAiForEscalation,
} from '@/lib/conversation-escalation';
import { buildBookingFollowUpReply, buildBookingMemoryPrompt } from '@/lib/conversation-context';
import {
  buildCatalogOfferReply,
  findCatalogOffers,
  formatCatalogForPrompt,
  getInstagramProductCatalogForUser,
  shouldUseSingleCatalogOffer,
} from '@/lib/instagram-product-catalog';
import { shouldSuppressRealtimeNotification } from '@/lib/notification-preferences';
import { runAssistantThread } from '@/lib/openai-assistants';
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
  conversationId?: string;
  conversation_id?: string;
  participant?: {
    id?: string;
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
    logger.info("Received request in /api/ai/reply", { payload });
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

    const escalation = detectConversationEscalation(payload.messages, {
      rules: metadata[escalationRulesMetadataKey],
    });
    const pauseForEscalation = shouldPauseAiForEscalation(escalation);

    if (escalation && pauseForEscalation) {
      const notificationTitle = `${escalation.label} detected`;
      const notificationBody = escalation.summary;
      const participantId = payload.participant?.id || '';
      const notificationMetadata = {
        assistantId,
        conversationId: payload.conversationId || payload.conversation_id || '',
        participantId,
        category: escalation.intent,
        urgency: escalation.urgency,
        urgent: escalation.urgency === 'High',
      };
      const notificationId = `escalation:${assistantId}:${participantId || notificationMetadata.conversationId}:${escalation.intent}`;

      if (!shouldSuppressRealtimeNotification({ title: notificationTitle, body: notificationBody, metadata: notificationMetadata })) {
        await triggerRealtimeNotification(getUserChannel(user.id), {
          id: notificationId,
          type: 'escalation',
          title: notificationTitle,
          body: notificationBody,
          url: '/escalations',
          metadata: notificationMetadata,
        }).catch((notificationError) => {
          logger.error('Realtime handoff reply notification error:', { error: notificationError });
        });
      }

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        reply: escalation.reply,
        autoSend: false,
        handoff: true,
        escalation,
        knowledge: summarizeKnowledgeForResponse({ mode: 'none', matches: [] }, assistantId),
      });
    } else if (escalation) {
      logger.info('AI reply sales lead signal detected; continuing reply generation without escalation handoff.', {
        intent: escalation.intent,
        urgency: escalation.urgency,
      });
    }

    const latestUserQuestion = getLatestUserQuestion(payload.messages);
    const bookingMemoryPrompt = buildBookingMemoryPrompt(payload.messages);
    const bookingFollowUpReply = buildBookingFollowUpReply(payload.messages);
    const serviceSupabase = createSupabaseServiceClient();

    const assistantIdFromMetadata = metadata.openai_assistant_id as string | undefined;
    if (!assistantIdFromMetadata) {
      return NextResponse.json({ error: 'Assistant ID not found in settings. Please save your API key in Settings.' }, { status: 400 });
    }

    const knowledge = { mode: 'none' as const, matches: [], totalSources: 0, sourceTitle: undefined };

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
        logger.error('Realtime booking reply notification error:', { error: notificationError });
      });

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        reply: bookingFollowUpReply,
        autoSend: integration.autoSend,
        knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
      });
    }

    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      logger.warn("OpenAI API key is missing. Bailing out of reply request.");
      return NextResponse.json({ error: 'Save your OpenAI API key first.' }, { status: 400 });
    }

    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-12)
      .map(formatConversationLine)
      .join('\n');
    const catalogQuery = `${latestUserQuestion}\n${conversationLines}`;
    const catalogSearchText = latestUserQuestion || catalogQuery;
    const productCatalog = await getInstagramProductCatalogForUser(serviceSupabase, user.id).catch((catalogError) => {
      logger.warn('Instagram catalog unavailable during AI reply generation:', { error: catalogError });
      return [];
    });
    const catalogPrompt = formatCatalogForPrompt(productCatalog, catalogSearchText);
    const catalogOffers = findCatalogOffers(catalogSearchText, productCatalog);
    const catalogOffer = shouldUseSingleCatalogOffer(catalogSearchText, catalogOffers) ? catalogOffers[0] : null;
    const reply = await runAssistantThread({
      apiKey,
      assistantId: assistantIdFromMetadata,
      maxTokens: 800,
      additionalInstructions: `${integration.systemPrompt}

IMPORTANT: The attached files and vector store contain the primary truth for this business (such as menus, pricing, services, and policies). You MUST search these files using the file_search tool for any specific business inquiries (e.g. "menu", "pricing", "cost", "hours", "booking", or specific products/services). Do NOT rely on default prompts or assume the business context is TractionFlo if the knowledge base documents specify a different business (e.g. Taste Haven Restaurant).

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Auto-detected Instagram product catalog:
${catalogPrompt || 'No relevant catalog product was detected for this conversation.'}

Return only the Instagram DM reply text. Keep it natural, brief, and useful. Do not mention being an AI unless asked. If saved knowledge is provided, do not give a vague answer when an exact saved answer is available.
Never ask again for booking details that the customer already gave earlier in the conversation.`,
      messages: [
        {
          role: 'user',
          content: `Business account: ${payload.accountName || 'TractionFlo'}
Instagram participant: ${participantName}
${bookingMemoryPrompt}

Recent conversation:
${conversationLines || 'No prior messages.'}

Write the next best reply.`,
        },
      ],
    });


    const finalReply = buildCatalogOfferReply(reply, catalogOffer);

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: 'ai',
      title: 'AI reply drafted',
      body: finalReply.slice(0, 120),
      url: '/conversations',
      metadata: {
        assistantId,
        autoSend: integration.autoSend,
        knowledgeMode: knowledge.mode,
        sourceTitle: knowledge.sourceTitle || '',
      },
    }).catch((notificationError) => {
      logger.error('Realtime AI reply notification error:', { error: notificationError });
    });

    return NextResponse.json({
      assistantId,
      assistant_id: assistantId,
      reply: finalReply,
      autoSend: integration.autoSend,
      catalogOffer,
      catalogOffers,
      knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not generate AI reply';
    logger.error('OpenAI reply generation error:', { error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
