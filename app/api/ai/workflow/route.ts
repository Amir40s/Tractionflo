import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import {
  detectConversationEscalation,
  escalationRulesMetadataKey,
  shouldPauseAiForEscalation,
} from '@/lib/conversation-escalation';
import {
  defaultAiLeadInsight,
  getEnabledWorkflowMap,
  getAiBehaviorPrompt,
  type AiLeadInsight,
  type AiWorkflowRunResult,
} from '@/lib/ai-integration';
import { getConditionalCtaPrompt, hasExplicitBookingCtaRequest, removeUnrequestedBookingCta } from '@/lib/booking-cta-policy';
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
import { isCommerceOrderConfirmationText } from '@/lib/commerce-orders';
import { shouldSuppressRealtimeNotification } from '@/lib/notification-preferences';
import { runAssistantThread } from '@/lib/openai-assistants';
import { getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import {
  buildFallbackRevenueOperatingSnapshot,
  formatBuyerIntelligenceForPrompt,
  formatRevenueMemoryForPrompt,
  loadRosProspectBuyerProfile,
  loadRosProspectRevenueMemory,
  mergeBuyerIntelligenceProfiles,
  mergeRevenueMemoryProfiles,
  normalizeRevenueOperatingSnapshot,
  persistRevenueOperatingSnapshot,
} from '@/lib/revenue-intelligence';
import { applyRevenueOutcomeAction } from '@/lib/revenue-outcome-actions';
import {
  formatRevenueOutcomeProvidersForPrompt,
  revenueOutcomeProvidersMetadataKey,
} from '@/lib/revenue-outcome-providers';
import { loadRevenueOutcomeProviderSettings } from '@/lib/revenue-provider-execution';
import { formatRevenueLearningForPrompt } from '@/lib/revenue-learning';
import { applyRevenueStrategy } from '@/lib/revenue-strategy';
import { resolvePlatformAiConfig } from '@/lib/platform-ai-config';
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
  conversationId?: string;
  conversation_id?: string;
  forceRefresh?: boolean;
};

const maxCachedLeadQualifications = 12;

function formatConversationLine(message: WorkflowMessage) {
  const sender = message.from === 'me' ? 'Business' : message.from === 'note' ? 'Internal note' : 'Instagram user';
  const text = typeof message.text === 'string' && message.text.trim() ? message.text.trim() : '';
  const attachmentSummary = message.attachments?.length
    ? ` [${message.attachments.map((attachment) => attachment.type || attachment.name || 'attachment').join(', ')}]`
    : '';
  const body = `${text || 'Sent an attachment'}${attachmentSummary}`;

  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `${sender}: ${line}`)
    .join('\n');
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

function hasImmediateLeadQualificationSignal(messages: WorkflowMessage[] = []) {
  const userText = messages
    .filter((message) => message.from === 'user' && typeof message.text === 'string')
    .map((message) => message.text || '')
    .join(' ')
    .toLowerCase();

  return /\b(price|pricing|cost|expensive|budget|payment|checkout|confirm|order|buy|purchase|book|booking|call|program|package|this month|today|tomorrow|asap|urgent)\b/.test(userText);
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

function normalizeLeadQualificationCache(value: unknown): Record<string, AiLeadInsight> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, lead]) => key.trim().length > 0 && lead && typeof lead === 'object')
      .slice(-maxCachedLeadQualifications)
  ) as Record<string, AiLeadInsight>;
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
  const resultLead = enabledWorkflows.qualifyLeads
    ? lead
    : {
      ...defaultAiLeadInsight,
      summary: 'AI Qualifies Leads is turned off.',
      recommendedAction: 'Turn on lead qualification in AI Integration.',
    };
  const resultCta = enabledWorkflows.moveToCta
    ? normalizeText(parsed.cta, lead.cta, 500)
    : '';
  const fallbackRos = buildFallbackRevenueOperatingSnapshot({
    lead: resultLead,
    cta: resultCta,
  });

  return {
    starter: enabledWorkflows.startConversation
      ? normalizeText(parsed.starter, '', 500)
      : '',
    reply: enabledWorkflows.answerQuestions
      ? normalizeText(parsed.reply, '', 500)
      : '',
    cta: enabledWorkflows.moveToCta
      ? resultCta
      : '',
    lead: resultLead,
    ros: normalizeRevenueOperatingSnapshot(parsed.ros ?? parsed.revenue_operating_system, fallbackRos),
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

    const serviceSupabase = createSupabaseServiceClient();
    const metadata = user.user_metadata || {};
    const platformConfig = await resolvePlatformAiConfig(serviceSupabase);
    const integration = platformConfig.integration;
    const outcomeProviders = await loadRevenueOutcomeProviderSettings({
      supabase: serviceSupabase,
      userId: user.id,
      metadataValue: metadata[revenueOutcomeProvidersMetadataKey],
    });
    const revenueLearningPrompt = await formatRevenueLearningForPrompt({
      supabase: serviceSupabase,
      userId: user.id,
    }).catch(() => '');
    const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);

    const participantId = payload.participant?.id || '';
    const forceRefresh = Boolean(payload.forceRefresh);
    const userMessageCount = (payload.messages || []).filter((msg) => msg.from === 'user').length;

    // Load lead qualifications cache
    const leadQualifications = normalizeLeadQualificationCache(metadata.lead_qualifications);
    const cachedLead = leadQualifications[participantId];

    const messages = payload.messages || [];
    const lastMessage = messages[messages.length - 1];
    const previousBuyerProfile = await loadRosProspectBuyerProfile({
      supabase: serviceSupabase,
      userId: user.id,
      participant: payload.participant,
    }).catch((buyerMemoryError) => {
      logger.warn('Could not load saved buyer memory for workflow prompt:', { error: buyerMemoryError, participantId });
      return null;
    });
    const buyerMemoryPrompt = formatBuyerIntelligenceForPrompt(previousBuyerProfile);
    const previousRevenueMemory = await loadRosProspectRevenueMemory({
      supabase: serviceSupabase,
      userId: user.id,
      participant: payload.participant,
    }).catch((revenueMemoryError) => {
      logger.warn('Could not load saved revenue memory for workflow prompt:', { error: revenueMemoryError, participantId });
      return null;
    });
    const revenueMemoryPrompt = formatRevenueMemoryForPrompt(previousRevenueMemory);
    const latestMessageIsFromBusiness = lastMessage?.from === 'me';

    if (lastMessage?.from === 'user' && isCommerceOrderConfirmationText(lastMessage.text || '')) {
      logger.info("Skipping OpenAI Assistant run because the latest user message is an order confirmation.");
      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        autoSend: false,
        starter: '',
        reply: '',
        cta: '',
        lead: cachedLead || {
          ...defaultAiLeadInsight,
          stage: 'Order confirmation',
          summary: 'Customer confirmed the order and should receive the payment step.',
          recommendedAction: 'Checkout is handled automatically. Revenue updates after payment succeeds.',
        },
        enabledWorkflows,
        knowledge: summarizeKnowledgeForResponse({ mode: 'none', matches: [] }, assistantId),
      });
    }

    const escalation = detectConversationEscalation(messages, {
      rules: metadata[escalationRulesMetadataKey],
    });
    const pauseForEscalation = shouldPauseAiForEscalation(escalation);

    if (escalation && pauseForEscalation) {
      const notificationTitle = `${escalation.label} detected`;
      const notificationBody = escalation.summary;
      const notificationMetadata = {
        assistantId,
        conversationId: payload.conversationId || payload.conversation_id || participantId,
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
          logger.error('Realtime workflow escalation notification error:', { error: notificationError });
        });
      }
    } else if (escalation) {
      logger.info('Workflow sales lead signal detected; keeping it in Leads instead of Escalations.', {
        intent: escalation.intent,
        urgency: escalation.urgency,
      });
    }

    if (escalation && pauseForEscalation) {
      const escalationLead = {
        ...defaultAiLeadInsight,
        score: escalation.urgency === 'High' ? 92 : 78,
        stage: 'Needs human',
        urgency: escalation.urgency,
        intent: escalation.label,
        summary: escalation.summary,
        signals: escalation.signals,
        missing: [],
        recommendedAction: escalation.recommendedAction,
        cta: 'Take over in inbox',
      };
      let escalationRos = applyRevenueOutcomeAction(
        applyRevenueStrategy(
          buildFallbackRevenueOperatingSnapshot({
            lead: escalationLead,
            cta: 'Take over in inbox',
            escalation,
          }),
          {
            latestText: getLatestUserQuestion(messages),
            escalation,
          }
        ),
        outcomeProviders
      );
      escalationRos = {
        ...escalationRos,
        buyerIntelligence: mergeBuyerIntelligenceProfiles(previousBuyerProfile, escalationRos.buyerIntelligence),
        memory: mergeRevenueMemoryProfiles(previousRevenueMemory?.memory, escalationRos.memory),
      };

      await persistRevenueOperatingSnapshot({
        supabase: serviceSupabase,
        userId: user.id,
        participant: payload.participant,
        conversationId: payload.conversationId || payload.conversation_id || participantId,
        messages,
        snapshot: escalationRos,
        escalation,
        outcomeProviders,
        source: 'ai_workflow_escalation',
      }).catch((persistError) => {
        logger.warn('ROS escalation decision persistence skipped or failed:', { error: persistError });
      });

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        autoSend: false,
        starter: '',
        reply: escalation.reply,
        cta: '',
        handoff: true,
        escalation,
        lead: escalationLead,
        ros: escalationRos,
        enabledWorkflows,
        knowledge: summarizeKnowledgeForResponse({ mode: 'none', matches: [] }, assistantId),
      });
    }

    // Determine if we should qualify this lead during this run
    let shouldQualifyLeads = false;
    let qualificationMocked = false;
    let qualificationReason = '';
    const immediateQualificationSignal = hasImmediateLeadQualificationSignal(payload.messages);

    if (enabledWorkflows.qualifyLeads) {
      if (forceRefresh || immediateQualificationSignal) {
        shouldQualifyLeads = true;
      } else if (userMessageCount < 15) {
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

    const assistantIdFromMetadata = metadata.openai_assistant_id as string | undefined;
    if (!assistantIdFromMetadata) {
      return NextResponse.json({ error: 'Knowledge assistant is not ready. Ask a superadmin to connect the platform OpenAI key, then re-save a knowledge source.' }, { status: 400 });
    }

    const knowledge = { mode: 'none' as const, matches: [], totalSources: 0, sourceTitle: undefined };

    const apiKey = platformConfig.apiKey;

    if (!apiKey) {
      logger.warn("OpenAI API key is missing. Bailing out of workflow request.");
      return NextResponse.json({ error: 'Ask a superadmin to add the platform OpenAI key first.' }, { status: 400 });
    }

    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-16)
      .map(formatConversationLine)
      .join('\n');
    const catalogSearchText = buildCatalogSearchText(latestUserQuestion, conversationLines);
    const freshCatalogCategoryRequest = isFreshCatalogCategoryRequest(latestUserQuestion, conversationLines);
    const productCatalog = await getInstagramProductCatalogForUser(serviceSupabase, user.id).catch((catalogError) => {
      logger.warn('Instagram catalog unavailable during AI workflow:', { error: catalogError });
      return [];
    });
    const catalogPrompt = formatCatalogForPrompt(productCatalog, catalogSearchText);
    const catalogDiscoveryRequired = isCatalogDiscoveryOnlyRequest(catalogSearchText);
    const catalogDiscoveryState = getCatalogDiscoveryState(catalogSearchText);
    const catalogOffers = findCatalogOffers(catalogSearchText, productCatalog);
    const catalogOffer = shouldUseSingleCatalogOffer(catalogSearchText, catalogOffers) ? catalogOffers[0] : null;
    const leadSchema = runWorkflows.qualifyLeads
      ? `"lead": {
    "score": 0-100,
    "stage": "New | Warm | Qualified | Ready for CTA | Needs human",
    "urgency": "Low | Medium | High",
    "intent": "short intent label",
    "summary": "one sentence",
    "signals": ["up to five buying or support signals"],
    "missing": ["up to five missing qualification facts"],
    "recommendedAction": "one next action for the business",
    "cta": "best CTA for this lead"
  }`
      : `"lead": null`;

    const rawResult = await runAssistantThread({
      apiKey,
      assistantId: assistantIdFromMetadata,
      maxTokens: 1100,
      responseFormat: "json_object",
      additionalInstructions: `${integration.systemPrompt}

IMPORTANT: The attached files and vector store contain the primary truth for this business (such as menus, pricing, services, and policies). You MUST search these files using the file_search tool for any specific business inquiries (e.g. "menu", "pricing", "cost", "hours", "booking", or specific products/services). Do NOT rely on default prompts or assume the business context is TractionFlo if the knowledge base documents specify a different business (e.g. Taste Haven Restaurant).

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
${getConditionalCtaPrompt(integration.ctaMessage, latestUserQuestion)}

Auto-detected Instagram product catalog:
${catalogPrompt || 'No relevant catalog product was detected for this conversation.'}

Product discovery status: ${catalogDiscoveryRequired ? 'needs_questions' : 'ready_or_not_needed'}
- The Instagram product catalog above is the source of truth for currently loaded posts/products. If it lists a category or product, do not contradict it using older conversation context or general business assumptions.
- New product category inquiry: ${freshCatalogCategoryRequest ? 'yes' : 'no'}
- If new product category inquiry is yes, answer only the latest category question. Do not continue, confirm, re-show, or send checkout/payment steps for any previous order.
- If new product category inquiry is yes and no relevant catalog product was detected, say that no matching option is currently available in the catalog/knowledge instead of offering the previous product.
- If relevant catalog products are listed for a new product category inquiry, say they are available and answer from those products. Do not say the category is unavailable.
- For availability or browse questions, do not ask for checkout or order confirmation unless the customer explicitly chooses a product and confirms purchase intent.
- If product discovery status is needs_questions, the reply must ask consultative discovery questions before any product offer.
- Do not present catalog items, checkout, confirm-order language, or pricing cards yet.
- Only ask for missing core details: budget and product goal/desired item/use-case.
- Known core details: budget=${catalogDiscoveryState.hasBudget ? 'yes' : 'no'}, product_goal=${catalogDiscoveryState.hasGoal ? 'yes' : 'no'}.
- Once budget and product goal are known, stop asking more discovery questions and show the best matching product option.
- If the customer asks for details of one specific product/type, answer only that product/type. Do not list the full catalog or multiple unrelated products.

Configured revenue outcome providers:
${formatRevenueOutcomeProvidersForPrompt(outcomeProviders) || 'No external outcome provider links are configured yet. If the right outcome needs a provider link, ask for contact/consent or use a manual next step.'}

Creator-specific revenue learning:
${revenueLearningPrompt || 'No creator-specific learning is available yet. Use the default ROS strategy and persist the decision for future learning.'}

Saved buyer memory for this Instagram participant:
${buyerMemoryPrompt}

Buyer memory rules:
- Treat saved buyer memory as known context for this same participant.
- Preserve known goal, problem, budget, authority, need, and timeline unless the latest conversation clearly corrects them.
- Return buyerIntelligence as the merged live buyer profile across all interactions, not only facts from the latest message.

Saved revenue memory for this Instagram participant:
${revenueMemoryPrompt}

Revenue memory rules:
- Treat saved revenue memory as the cumulative customer relationship.
- Remember previous objections, questions asked, offers presented, purchases, and follow-up history.
- Do not restart discovery or repeat an already-presented offer unless the latest message makes that useful.
- Return memory as the merged relationship memory across all interactions.

Return only valid JSON. No markdown. No commentary.
Never ask again for booking details that the customer already gave earlier in the conversation.
Always include a "ros" object. The ROS object is the Revenue Operating System decision layer and must choose the highest-probability next action that advances a business outcome.
Track tacticIntelligence with stable snake_case tactic names, including the ordered tactic sequence and which tactics happened before pricing. Useful tactic names include ask_budget, ask_timeline, ask_authority, diagnose_need, show_case_study, use_social_proof, state_guarantee, handle_price_objection, present_pricing, present_offer, offer_checkout, offer_booking, smaller_next_step, human_handoff, and follow_up.
JSON shape:
{
  "starter": "first response to send when AI Starts Conversation is on and this is a new inbound lead; empty when not needed",
  "reply": "best next answer to the latest user message; use exact attached file_search knowledge when provided instead of vague ranges",
  "cta": "short CTA message that moves a ready lead forward",
  ${leadSchema},
  "ros": {
    "conversationIntelligence": {
      "intent": "short intent label",
      "sentiment": "positive | neutral | negative | mixed",
      "emotion": "curious | hesitant | ready | frustrated | unknown",
      "objection": "cost | trust | timing | fit | none",
      "buyingSignal": "detected buying signal or empty string",
      "urgencySignal": "detected urgency signal or empty string",
      "stage": "new | awareness | consideration | qualified | ready_for_cta | needs_human",
      "questions": ["questions the user asked"],
      "signals": ["up to five important conversation signals"]
    },
    "buyerIntelligence": {
      "goal": "known goal or empty string",
      "problem": "known problem or empty string",
      "budget": "known budget or empty string",
      "authority": "known authority or empty string",
      "need": "known need or empty string",
      "timeline": "known timeline or empty string",
      "behavior": "short behavior summary",
      "readiness": "low | medium | high",
      "missing": ["missing qualification facts"]
    },
    "revenueIntelligence": {
      "framework": "BANT, SPIN, MEDDIC, consultative selling, or other useful framework",
      "method": "ask | explain | handle_objection | present_offer | escalate | follow_up",
      "nextQuestion": "one qualification question if needed",
      "objection": "current objection or empty string",
      "salesStage": "current revenue stage",
      "recommendation": "specific next action for the business"
    },
    "tacticIntelligence": {
      "tactics": ["stable snake_case tactics used or recommended"],
      "sequence": ["ordered stable snake_case tactic names"],
      "primaryTactic": "single main tactic",
      "usedBeforePricing": ["tactics used before present_pricing"],
      "pricingPresented": true
    },
    "outcomeProbabilities": {
      "follow_creator": 0-100,
      "join_newsletter": 0-100,
      "book_call": 0-100,
      "start_trial": 0-100,
      "purchase_product": 0-100,
      "upgrade_plan": 0-100,
      "recover_abandoned_cart": 0-100,
      "renew_subscription": 0-100,
      "collect_testimonial": 0-100
    },
    "decision": {
      "bestNextAction": "single best next action",
      "confidence": 0-100,
      "rationale": "short reason for this decision"
    },
    "memory": {
      "objections": ["objections to remember"],
      "questionsAsked": ["important questions already asked"],
      "offersPresented": ["offers or CTAs already presented"],
      "followUpNeeded": true
    }
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

    workflowResult.starter = removeUnrequestedBookingCta(workflowResult.starter, latestUserQuestion);
    workflowResult.reply = removeUnrequestedBookingCta(workflowResult.reply, latestUserQuestion);
    workflowResult.cta = removeUnrequestedBookingCta(workflowResult.cta, latestUserQuestion);

    if (catalogOffer) {
      workflowResult.reply = buildCatalogOfferReply(workflowResult.reply, catalogOffer);
      workflowResult.starter = buildCatalogOfferReply(workflowResult.starter, catalogOffer);
      workflowResult.cta = buildCatalogOfferReply(workflowResult.cta, catalogOffer);
    }

    if (latestMessageIsFromBusiness) {
      workflowResult.starter = '';
      workflowResult.reply = '';
      workflowResult.cta = '';
    }

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

    if (escalation && !pauseForEscalation) {
      workflowResult.lead = {
        ...workflowResult.lead,
        score: Math.max(workflowResult.lead.score, escalation.urgency === 'High' ? 92 : 78),
        stage: workflowResult.lead.stage === defaultAiLeadInsight.stage ? 'Ready for CTA' : workflowResult.lead.stage,
        urgency: escalation.urgency,
        intent: escalation.label,
        summary: escalation.summary,
        signals: Array.from(new Set([...escalation.signals, ...workflowResult.lead.signals])).slice(0, 5),
        recommendedAction: escalation.recommendedAction,
        cta: workflowResult.lead.cta || (hasExplicitBookingCtaRequest(latestUserQuestion) ? integration.ctaMessage : '') || defaultAiLeadInsight.cta,
      };
    }

    const normalizedRos = normalizeRevenueOperatingSnapshot(
      workflowResult.ros,
      buildFallbackRevenueOperatingSnapshot({
        lead: workflowResult.lead,
        cta: workflowResult.cta || workflowResult.lead.cta || (hasExplicitBookingCtaRequest(latestUserQuestion) ? integration.ctaMessage : ''),
        escalation: null,
      })
    );
    const rosWithBuyerMemory = {
      ...normalizedRos,
      buyerIntelligence: mergeBuyerIntelligenceProfiles(previousBuyerProfile, normalizedRos.buyerIntelligence),
      memory: mergeRevenueMemoryProfiles(previousRevenueMemory?.memory, normalizedRos.memory),
    };

    workflowResult.ros = applyRevenueOutcomeAction(
      applyRevenueStrategy(
        rosWithBuyerMemory,
        {
          latestText: latestUserQuestion,
          hasCatalogOffer: Boolean(catalogOffer),
          escalation: null,
        }
      ),
      outcomeProviders
    );

    await persistRevenueOperatingSnapshot({
      supabase: serviceSupabase,
      userId: user.id,
      participant: payload.participant,
      conversationId: payload.conversationId || payload.conversation_id || participantId,
      messages,
      snapshot: workflowResult.ros,
      escalation: null,
      outcomeProviders,
      source: 'ai_workflow',
    }).catch((persistError) => {
      logger.warn('ROS decision persistence skipped or failed:', { error: persistError });
    });

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: 'ai',
      title: 'AI workflow completed',
      body: `Lead score ${workflowResult.lead.score}/100: ${workflowResult.ros.decision.bestNextAction}`,
      url: '/conversations',
      metadata: {
        assistantId,
        score: workflowResult.lead.score,
        urgency: workflowResult.lead.urgency,
        bestNextAction: workflowResult.ros.decision.bestNextAction,
        decisionConfidence: workflowResult.ros.decision.confidence,
        knowledgeMode: knowledge.mode,
        sourceTitle: knowledge.sourceTitle || '',
      },
    }).catch((notificationError) => {
      logger.error('Realtime AI workflow notification error:', { error: notificationError });
    });

    return NextResponse.json({
      assistantId,
      assistant_id: assistantId,
      autoSend: integration.autoSend,
      handoff: false,
      ...workflowResult,
      catalogOffer,
      catalogOffers,
      enabledWorkflows, // Return original workflows configurations to frontend
      knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not run AI workflow';
    logger.error('OpenAI workflow error:', { error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
