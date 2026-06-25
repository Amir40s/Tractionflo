import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getAiBehaviorPrompt } from '@/lib/ai-integration';
import { getConditionalCtaPrompt, removeUnrequestedBookingCta } from '@/lib/booking-cta-policy';
import {
  detectConversationEscalation,
  escalationRulesMetadataKey,
  shouldPauseAiForEscalation,
} from '@/lib/conversation-escalation';
import { buildBookingFollowUpReply, buildBookingMemoryPrompt } from '@/lib/conversation-context';
import {
  buildCatalogSearchText,
  buildCatalogOfferReply,
  findCatalogOffers,
  formatCatalogForPrompt,
  getCatalogDiscoveryState,
  getInstagramProductCatalogForUser,
  isFreshCatalogCategoryRequest,
  isCatalogDiscoveryOnlyRequest,
  shouldUseSingleCatalogOffer,
} from '@/lib/instagram-product-catalog';
import { shouldSuppressRealtimeNotification } from '@/lib/notification-preferences';
import { runAssistantThread } from '@/lib/openai-assistants';
import { resolvePlatformAiConfig } from '@/lib/platform-ai-config';
import { getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import {
  formatBuyerIntelligenceForPrompt,
  formatRevenueMemoryForPrompt,
  loadRosProspectBuyerProfile,
  loadRosProspectRevenueMemory,
} from '@/lib/revenue-intelligence';
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
    const serviceSupabase = createSupabaseServiceClient();
    const platformConfig = await resolvePlatformAiConfig(serviceSupabase);
    const integration = platformConfig.integration;
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
    const assistantIdFromMetadata = metadata.openai_assistant_id as string | undefined;
    if (!assistantIdFromMetadata) {
      return NextResponse.json({ error: 'Knowledge assistant is not ready. Ask a superadmin to connect the platform OpenAI key, then re-save a knowledge source.' }, { status: 400 });
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

    const apiKey = platformConfig.apiKey;

    if (!apiKey) {
      logger.warn("OpenAI API key is missing. Bailing out of reply request.");
      return NextResponse.json({ error: 'Ask a superadmin to add the platform OpenAI key first.' }, { status: 400 });
    }

    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-12)
      .map(formatConversationLine)
      .join('\n');
    const catalogSearchText = buildCatalogSearchText(latestUserQuestion, conversationLines);
    const freshCatalogCategoryRequest = isFreshCatalogCategoryRequest(latestUserQuestion, conversationLines);
    const productCatalog = await getInstagramProductCatalogForUser(serviceSupabase, user.id).catch((catalogError) => {
      logger.warn('Instagram catalog unavailable during AI reply generation:', { error: catalogError });
      return [];
    });
    const catalogPrompt = formatCatalogForPrompt(productCatalog, catalogSearchText);
    const catalogDiscoveryRequired = isCatalogDiscoveryOnlyRequest(catalogSearchText);
    const catalogDiscoveryState = getCatalogDiscoveryState(catalogSearchText);
    const catalogOffers = findCatalogOffers(catalogSearchText, productCatalog);
    const catalogOffer = shouldUseSingleCatalogOffer(catalogSearchText, catalogOffers) ? catalogOffers[0] : null;
    const previousBuyerProfile = await loadRosProspectBuyerProfile({
      supabase: serviceSupabase,
      userId: user.id,
      participant: payload.participant,
    }).catch((buyerMemoryError) => {
      logger.warn('Could not load saved buyer memory for AI reply prompt:', { error: buyerMemoryError, participantId: payload.participant?.id || '' });
      return null;
    });
    const buyerMemoryPrompt = formatBuyerIntelligenceForPrompt(previousBuyerProfile);
    const previousRevenueMemory = await loadRosProspectRevenueMemory({
      supabase: serviceSupabase,
      userId: user.id,
      participant: payload.participant,
    }).catch((revenueMemoryError) => {
      logger.warn('Could not load saved revenue memory for AI reply prompt:', { error: revenueMemoryError, participantId: payload.participant?.id || '' });
      return null;
    });
    const revenueMemoryPrompt = formatRevenueMemoryForPrompt(previousRevenueMemory);
    const reply = await runAssistantThread({
      apiKey,
      assistantId: assistantIdFromMetadata,
      maxTokens: 800,
      additionalInstructions: `${integration.systemPrompt}

IMPORTANT: The attached files and vector store contain the primary truth for this business (such as menus, pricing, services, and policies). You MUST search these files using the file_search tool for any specific business inquiries (e.g. "menu", "pricing", "cost", "hours", "booking", or specific products/services). Do NOT rely on default prompts or assume the business context is TractionFlo if the knowledge base documents specify a different business (e.g. Taste Haven Restaurant).

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
${getConditionalCtaPrompt(integration.ctaMessage, latestUserQuestion)}

Auto-detected Instagram product catalog:
${catalogPrompt || 'No relevant catalog product was detected for this conversation.'}

Product discovery status: ${catalogDiscoveryRequired ? 'needs_questions' : 'ready_or_not_needed'}
- New product category inquiry: ${freshCatalogCategoryRequest ? 'yes' : 'no'}
- If new product category inquiry is yes, answer only the latest category question. Do not continue, confirm, re-show, or send checkout/payment steps for any previous order.
- If new product category inquiry is yes and no relevant catalog product was detected, say that no matching option is currently available in the catalog/knowledge instead of offering the previous product.
- If relevant catalog products are listed for a new product category inquiry, say they are available and answer from those products. Do not say the category is unavailable.
- For availability or browse questions, do not ask for checkout or order confirmation unless the customer explicitly chooses a product and confirms purchase intent.
- If product discovery status is needs_questions, do not list specific products, send catalog options, mention checkout, or ask for order confirmation yet.
- Only ask for missing core details: budget and product goal/desired item/use-case.
- Known core details: budget=${catalogDiscoveryState.hasBudget ? 'yes' : 'no'}, product_goal=${catalogDiscoveryState.hasGoal ? 'yes' : 'no'}.
- Once budget and product goal are known, stop asking more discovery questions and show the best matching product option.
- If the customer asks for details of one specific product/type, answer only that product/type. Do not list the full catalog or multiple unrelated products.

Saved buyer memory for this Instagram participant:
${buyerMemoryPrompt}

Buyer memory rules:
- Use saved buyer memory as known context for this same participant.
- Do not ask again for known goal, problem, budget, authority, need, or timeline unless the latest message clearly changes them.
- Personalize the reply to the saved buyer profile when it helps the sale.

Saved revenue memory for this Instagram participant:
${revenueMemoryPrompt}

Revenue memory rules:
- Use saved revenue memory as the cumulative customer relationship.
- Remember previous objections, questions asked, offers presented, purchases, and follow-up history.
- Do not restart discovery or repeat an already-presented offer unless the latest message makes that useful.

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


    const finalReply = buildCatalogOfferReply(removeUnrequestedBookingCta(reply, latestUserQuestion), catalogOffer);

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
