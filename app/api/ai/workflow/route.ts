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
import { runRosPipeline } from '@/lib/ros-pipeline';



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

  // If no JSON braces found, the AI returned plain text — treat it as the reply
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    const plainText = value.trim();
    logger.warn('AI Workflow: AI returned plain text instead of JSON. Using as reply fallback.', { preview: plainText.slice(0, 120) });
    return { reply: plainText, starter: '', cta: '', lead: null, ros: null } as Record<string, unknown>;
  }

  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch (parseError) {
    const plainText = value.trim();
    logger.warn('AI Workflow: Failed to parse AI JSON response. Using as reply fallback.', { preview: plainText.slice(0, 120) });
    return { reply: plainText, starter: '', cta: '', lead: null, ros: null } as Record<string, unknown>;
  }
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

    const assistantId = resolveAssistantId(payload, user.id);

    if (!assistantId) {
      return NextResponse.json({ error: 'Assistant ID does not match the authenticated account.' }, { status: 403 });
    }

    const serviceSupabase = createSupabaseServiceClient();
    const participantId = payload.participant?.id || '';
    const forceRefresh = Boolean(payload.forceRefresh);
    const metadata = user.user_metadata || {};
    const platformConfig = await resolvePlatformAiConfig(serviceSupabase);
    const integration = platformConfig.integration;
    const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);

    // Try to load cached ROS snapshot first to save tokens
    if (!forceRefresh) {
      const query = serviceSupabase
        .from('ros_revenue_decisions')
        .select('payload, created_at')
        .eq('user_id', user.id);

      const filters: string[] = [];
      if (payload.conversationId) filters.push(`conversation_id.eq.${payload.conversationId}`);
      if (participantId) filters.push(`instagram_sender_id.eq.${participantId}`);

      const { data: cachedDecisions } = filters.length > 0
        ? await query.or(filters.join(',')).order('created_at', { ascending: false }).limit(1)
        : { data: null };

      const latestDecision = cachedDecisions?.[0] as any;
      if (latestDecision && typeof latestDecision.payload === 'object' && latestDecision.payload !== null) {
        const cachedPayload = latestDecision.payload as any;

        // Invalidate cache if a new user message arrived after this decision was cached
        const cacheCreatedAt = latestDecision.created_at ? new Date(latestDecision.created_at).getTime() : 0;
        const latestUserMessage = [...(payload.messages || [])]
          .reverse()
          .find((msg) => msg.from === 'user' && msg.time);
        const latestUserMessageTime = latestUserMessage?.time ? new Date(latestUserMessage.time).getTime() : 0;

        if (latestUserMessageTime > cacheCreatedAt) {
          logger.info('Cache invalidated: new user message arrived after cached decision.', {
            cacheCreatedAt: new Date(cacheCreatedAt).toISOString(),
            latestUserMessageTime: new Date(latestUserMessageTime).toISOString(),
          });
          // Fall through to re-run the AI
        } else {
        logger.info("Found cached ROS snapshot in database. Returning to save tokens.");
        return NextResponse.json({
          assistantId,
          assistant_id: assistantId,
          autoSend: false,
          starter: cachedPayload.starter || '',
          reply: cachedPayload.reply || '',
          cta: cachedPayload.ros?.revenueIntelligence?.recommendation || '',
          handoff: cachedPayload.handoff || false,
          escalation: cachedPayload.escalation || null,
          lead: cachedPayload.lead || (cachedPayload.ros?.buyerIntelligence ? {
            score: cachedPayload.ros.buyerIntelligence.readiness === 'high' ? 85 : cachedPayload.ros.buyerIntelligence.readiness === 'medium' ? 55 : 25,
            stage: cachedPayload.ros.revenueIntelligence?.salesStage || 'consideration',
            urgency: cachedPayload.ros.buyerIntelligence.readiness === 'high' ? 'High' : 'Medium',
            intent: cachedPayload.ros.conversationIntelligence?.intent || 'inquiry',
            summary: cachedPayload.ros.decision?.rationale || 'Loaded from cache',
            signals: cachedPayload.ros.conversationIntelligence?.signals || [],
            missing: cachedPayload.ros.buyerIntelligence?.missing || [],
            recommendedAction: cachedPayload.ros.decision?.bestNextAction || 'No recommended action',
            cta: cachedPayload.ros.revenueIntelligence?.recommendation || '',
          } : null),
          ros: cachedPayload.ros || cachedPayload,
          enabledWorkflows,
          knowledge: { mode: 'none' as const, matches: [], totalSources: 0 },
          cached: true,
        });
        } // end else (cache is still valid)
      }
    }

    const outcomeProviders = await loadRevenueOutcomeProviderSettings({
      supabase: serviceSupabase,
      userId: user.id,
      metadataValue: metadata[revenueOutcomeProvidersMetadataKey],
    });
    const revenueLearningPrompt = await formatRevenueLearningForPrompt({
      supabase: serviceSupabase,
      userId: user.id,
    }).catch(() => '');
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

    const cleanMessages = (payload.messages || []).map((msg) => ({
      from: msg.from === 'me' ? 'me' as const : msg.from === 'note' ? 'note' as const : 'user' as const,
      text: msg.text || '',
      time: msg.time,
    }));

    const result = await runRosPipeline({
      supabase: serviceSupabase,
      user,
      participant: {
        id: participantId,
        username: payload.participant?.username,
        name: payload.participant?.name,
      },
      conversationId: payload.conversationId || payload.conversation_id || participantId,
      latestText: getLatestUserQuestion(payload.messages),
      messages: cleanMessages,
      forceRefresh,
    });

    const knowledge = { mode: 'none' as const, matches: [], totalSources: 0, sourceTitle: undefined };

    if (result.handoff && result.escalation) {
      const notificationTitle = `${result.escalation.label} detected`;
      const notificationBody = result.escalation.summary;
      const notificationMetadata = {
        assistantId,
        conversationId: payload.conversationId || payload.conversation_id || participantId,
        participantId,
        category: result.escalation.intent,
        urgency: result.escalation.urgency,
        urgent: result.escalation.urgency === 'High',
      };
      const notificationId = `escalation:${assistantId}:${participantId || notificationMetadata.conversationId}:${result.escalation.intent}`;

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

      return NextResponse.json({
        assistantId,
        assistant_id: assistantId,
        autoSend: false,
        starter: '',
        reply: result.reply,
        cta: '',
        handoff: true,
        escalation: result.escalation,
        lead: result.lead,
        ros: result.ros,
        enabledWorkflows,
        knowledge: summarizeKnowledgeForResponse({ mode: 'none', matches: [] }, assistantId),
      });
    }

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: 'ai',
      title: 'AI workflow completed',
      body: `Lead score ${result.lead.score}/100: ${result.ros.decision.bestNextAction}`,
      url: '/conversations',
      metadata: {
        assistantId,
        score: result.lead.score,
        urgency: result.lead.urgency,
        bestNextAction: result.ros.decision.bestNextAction,
        decisionConfidence: result.ros.decision.confidence,
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
      reply: result.reply,
      starter: result.starter,
      cta: result.cta,
      lead: result.lead,
      ros: result.ros,
      catalogOffer: result.catalogOffer,
      catalogOffers: result.catalogOffers,
      enabledWorkflows,
      knowledge: summarizeKnowledgeForResponse(knowledge, assistantId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not run AI workflow';
    logger.error('OpenAI workflow error:', { error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
