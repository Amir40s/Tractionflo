import { NextResponse, after } from 'next/server';
import { createHash } from 'crypto';
import logger from '@/lib/logger';
import type { User } from '@supabase/supabase-js';
import {
  buildCommerceOrderPaymentReply,
  cancelPendingCommerceOrdersForSender,
  confirmPendingCommerceOrderById,
  confirmLatestPendingCommerceOrder,
  createPendingCommerceOrder,
  getCommerceOrderPublicCheckoutUrl,
  hasCommerceOrderCheckoutButtonMessage,
  getLatestCommerceOrderForSender,
  hasCommerceOrderPaymentMessage,
  isCommerceOrderConfirmationText,
  markCommerceOrderPaymentMessageSent,
  prepareCommerceOrderCheckout,
} from '@/lib/commerce-orders';
import {
  detectConversationEscalation,
  escalationRulesMetadataKey,
  shouldPauseAiForEscalation,
  type ConversationEscalation,
} from '@/lib/conversation-escalation';
import {
  getAiBehaviorPrompt,
  getEnabledWorkflowMap,
} from '@/lib/ai-integration';
import { getConditionalCtaPrompt, removeUnrequestedBookingCta } from '@/lib/booking-cta-policy';
import { getFreshInstagramAccountByIgUserId } from '@/lib/instagram-token';
import {
  buildCatalogSearchText,
  buildCatalogOfferReply,
  findCatalogOffers,
  findBestCatalogOffer,
  formatCatalogForPrompt,
  getCatalogDiscoveryState,
  getInstagramProductCatalogForUser,
  isFreshCatalogCategoryRequest,
  isCatalogDeclineRequest,
  isCatalogDiscoveryOnlyRequest,
  shouldUseSingleCatalogOffer,
  type InstagramCatalogOffer,
} from '@/lib/instagram-product-catalog';
import {
  instagramWelcomeAutomationMetadataKey,
  normalizeInstagramWelcomeAutomation,
  renderInstagramWelcomeMessage,
} from '@/lib/instagram-welcome-automation';
import { storeInstagramMessage } from '@/lib/instagram-message-store';
import {
  sendInstagramCommercePaymentMessage,
  sendInstagramGenericTemplate,
  type InstagramGenericTemplateElement,
} from '@/lib/instagram-send-api';
import { shouldSuppressRealtimeNotification } from '@/lib/notification-preferences';
import { runAssistantThread } from '@/lib/openai-assistants';
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
  recordRevenueConversionEvent,
  type RevenueBuyerIntelligence,
  type RevenueMemoryContext,
} from '@/lib/revenue-intelligence';
import { applyRevenueOutcomeAction } from '@/lib/revenue-outcome-actions';
import {
  formatRevenueOutcomeProvidersForPrompt,
  revenueOutcomeProvidersMetadataKey,
  type RevenueOutcomeProviderSettings,
} from '@/lib/revenue-outcome-providers';
import { loadRevenueOutcomeProviderSettings } from '@/lib/revenue-provider-execution';
import { formatRevenueLearningForPrompt } from '@/lib/revenue-learning';
import { applyRevenueStrategy } from '@/lib/revenue-strategy';
import { resolvePlatformAiConfig } from '@/lib/platform-ai-config';

import { getGlobalChannel, getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type InstagramWebhookMessageEvent = {
  sender?: {
    id?: string;
  };
  recipient?: {
    id?: string;
  };
  timestamp?: number;
  postback?: {
    title?: string;
    payload?: string;
    mid?: string;
  };
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: {
      payload?: string;
    };
    postback?: {
      title?: string;
      payload?: string;
      mid?: string;
    };
    attachments?: {
      type?: string;
      payload?: {
        url?: string;
      };
    }[];
    reply_to?: {
      story?: {
        id?: string;
        url?: string;
      };
    };
  };
};

type AutomationMessageEvent = {
  mid: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp?: number;
  previousSenderMessageCount: number;
};

type InstagramParticipantProfile = {
  id?: string;
  username?: string;
  name?: string;
  profile_pic?: string;
  picture?: string | { data?: { url?: string }; url?: string };
};

type InstagramGraphError = {
  message?: string;
};

type WebhookAiReplyResult = {
  reply: string;
  catalogOffer: InstagramCatalogOffer | null;
  catalogOffers: InstagramCatalogOffer[];
};

type InstagramQuickReply = {
  content_type: 'text';
  title: string;
  payload: string;
};

const confirmOrderQuickReplies: InstagramQuickReply[] = [
  {
    content_type: 'text',
    title: 'Confirm order',
    payload: 'CONFIRM_ORDER',
  },
];

const confirmOrderPayloadPrefix = 'CONFIRM_ORDER:';
const catalogCarouselMaxItems = 6;

type CatalogCarouselCard = {
  offer: InstagramCatalogOffer;
  orderId: string;
};

function getConfirmOrderPayload(orderId: string) {
  return `${confirmOrderPayloadPrefix}${orderId}`;
}

function getConfirmOrderIdFromPayload(text: string) {
  const value = text.trim();
  return value.startsWith(confirmOrderPayloadPrefix) ? value.slice(confirmOrderPayloadPrefix.length).trim() : '';
}

function formatCatalogOfferPrice(offer: InstagramCatalogOffer) {
  if (offer.priceText) {
    return offer.priceText;
  }

  if (offer.priceAmount) {
    const currency = (offer.currency || 'USD').toUpperCase();
    return currency === 'USD'
      ? `$${offer.priceAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
      : `${currency} ${offer.priceAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  return '';
}

function truncateTemplateText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, ' ').trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function getCatalogCarouselSubtitle(offer: InstagramCatalogOffer) {
  const price = formatCatalogOfferPrice(offer);
  const details = offer.description ? truncateTemplateText(offer.description, 58) : '';
  return [price, details].filter(Boolean).join(' · ');
}

function buildCatalogCarouselElements(cards: CatalogCarouselCard[]): InstagramGenericTemplateElement[] {
  return cards.map((card) => ({
    title: card.offer.title || 'Instagram product',
    subtitle: getCatalogCarouselSubtitle(card.offer),
    imageUrl: card.offer.imageUrl || card.offer.thumbnailUrl,
    defaultActionUrl: card.offer.permalink,
    buttons: [
      {
        type: 'postback',
        title: 'Confirm order',
        payload: getConfirmOrderPayload(card.orderId),
      },
      ...(card.offer.permalink
        ? [
            {
              type: 'web_url' as const,
              title: 'View product',
              url: card.offer.permalink,
            },
          ]
        : []),
    ],
  }));
}

function getCatalogCarouselStoredText(cards: CatalogCarouselCard[]) {
  return [
    'Product carousel sent:',
    ...cards.map((card, index) => {
      const price = formatCatalogOfferPrice(card.offer);
      return `${index + 1}. ${card.offer.title}${price ? ` - ${price}` : ''}`;
    }),
  ].join('\n');
}

function getCatalogCarouselMetadataItems(cards: CatalogCarouselCard[]) {
  return cards.map((card) => ({
    orderId: card.orderId,
    productId: card.offer.id,
    sourceMediaId: card.offer.sourceMediaId,
    title: card.offer.title,
    description: card.offer.description,
    imageUrl: card.offer.imageUrl,
    thumbnailUrl: card.offer.thumbnailUrl,
    permalink: card.offer.permalink,
    priceText: card.offer.priceText,
    priceAmount: card.offer.priceAmount,
    currency: card.offer.currency,
  }));
}

async function hasStoredMessage(supabase: SupabaseServiceClient, mid: string) {
  if (!mid) {
    return false;
  }

  const { data, error } = await supabase
    .from('messages')
    .select('mid')
    .eq('mid', mid)
    .limit(1);

  if (error) {
    console.error('Stored message lookup error:', error);
    return false;
  }

  return Boolean(data?.length);
}

function normalizeWebhookTimestampMillis(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return Date.now();
  }

  return value < 1_000_000_000_000 ? value * 1000 : value;
}

async function hasAutomatedReplyAfterInbound({
  supabase,
  userId,
  conversationId,
  inboundTimestamp,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  conversationId: string;
  inboundTimestamp: number;
}) {
  const { data, error } = await supabase
    .from('messages')
    .select('metadata,timestamp')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .gte('timestamp', inboundTimestamp)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    logger.warn('Could not check existing automated reply for webhook event.', {
      error,
      userId,
      conversationId,
    });
    return false;
  }

  return (data || []).some((row) => {
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
    const source = typeof metadata.source === 'string' ? metadata.source : '';

    return (
      source === 'instagram_webhook_ai' ||
      source === 'instagram_webhook_welcome' ||
      source === 'instagram_webhook_ai_lock' ||
      source === 'ai_instagram_send' ||
      source === 'manual_instagram_send'
    );
  });
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}

function getWebhookAutomationIdempotencyKey({
  userId,
  conversationId,
  inboundMid,
  text,
}: {
  userId: string;
  conversationId: string;
  inboundMid: string;
  text: string;
}) {
  const basis = inboundMid || `${conversationId}:${text}`;
  return `instagram-webhook-ai:${userId}:${conversationId}:${createHash('sha256').update(basis).digest('hex')}`;
}

function getWebhookAutomationLockMid(idempotencyKey: string) {
  return `webhook-ai-lock-${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 40)}`;
}

async function hasWebhookAutomationSendForKey({
  supabase,
  userId,
  conversationId,
  idempotencyKey,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  conversationId: string;
  idempotencyKey: string;
}) {
  const { data, error } = await supabase
    .from('messages')
    .select('mid')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .contains('metadata', { idempotencyKey })
    .limit(1);

  if (error) {
    logger.warn('Could not check webhook AI send idempotency key.', {
      error,
      userId,
      conversationId,
    });
    return false;
  }

  return Boolean(data?.length);
}

async function claimWebhookAutomationSend({
  supabase,
  userId,
  conversationId,
  senderId,
  recipientId,
  text,
  idempotencyKey,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  idempotencyKey: string;
}) {
  if (await hasWebhookAutomationSendForKey({ supabase, userId, conversationId, idempotencyKey })) {
    return { claimed: false, lockMid: '' };
  }

  const lockMid = getWebhookAutomationLockMid(idempotencyKey);
  const { error } = await supabase.from('messages').insert({
    mid: lockMid,
    user_id: userId,
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    direction: 'outbound',
    text,
    timestamp: Date.now(),
    raw_event: {
      message_id: lockMid,
      text,
    },
    metadata: {
      source: 'instagram_webhook_ai_lock',
      idempotencyKey,
      idempotencyStatus: 'sending',
    },
  });

  if (!error) {
    return { claimed: true, lockMid };
  }

  if (isDuplicateKeyError(error)) {
    return { claimed: false, lockMid: '' };
  }

  logger.warn('Could not create webhook AI send lock; continuing without lock.', {
    error,
    userId,
    conversationId,
  });
  return { claimed: true, lockMid: '' };
}

async function completeWebhookAutomationSendLock({
  supabase,
  lockMid,
  sentMid,
  text,
  rawEvent,
  metadata,
}: {
  supabase: SupabaseServiceClient;
  lockMid: string;
  sentMid: string;
  text: string;
  rawEvent: Record<string, unknown>;
  metadata: Record<string, unknown>;
}) {
  if (!lockMid) {
    return false;
  }

  const { error } = await supabase
    .from('messages')
    .update({
      mid: sentMid || lockMid,
      text,
      raw_event: rawEvent,
      metadata: {
        ...metadata,
        idempotencyStatus: 'sent',
      },
    })
    .eq('mid', lockMid);

  if (error) {
    logger.warn('Could not complete webhook AI send lock.', { error, lockMid, sentMid });
    return false;
  }

  return true;
}

async function deleteWebhookAutomationSendLock(supabase: SupabaseServiceClient, lockMid: string) {
  if (!lockMid) {
    return;
  }

  const { error } = await supabase.from('messages').delete().eq('mid', lockMid);

  if (error) {
    logger.warn('Could not delete webhook AI send lock.', { error, lockMid });
  }
}

async function getSenderMessageCount(supabase: SupabaseServiceClient, senderId: string) {
  const { count, error } = await supabase
    .from('messages')
    .select('mid', { count: 'exact', head: true })
    .eq('sender_id', senderId);

  if (error) {
    console.error('Sender message count error:', error);
    return 1;
  }

  return count || 0;
}

function getWebhookAttachmentText(message?: InstagramWebhookMessageEvent['message']) {
  const attachment = message?.attachments?.find((item) => item.payload?.url);

  if (!attachment?.payload?.url) {
    return '';
  }

  const type = attachment.type?.trim() || 'attachment';
  return `[${type} attachment] ${attachment.payload.url}`;
}

function getProfilePictureUrl(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as { data?: { url?: unknown }; url?: unknown };
  const url = record.data?.url || record.url;
  return typeof url === 'string' && url.trim() ? url.trim() : undefined;
}

async function fetchParticipantProfile(accessToken: string, participantId: string) {
  try {
    const profileUrl = new URL(`https://graph.instagram.com/v21.0/${participantId}`);
    profileUrl.searchParams.set('fields', 'id,username,name,profile_pic');
    profileUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(profileUrl.toString(), { cache: 'no-store' });
    const data = (await response.json().catch(() => ({}))) as InstagramParticipantProfile & {
      error?: InstagramGraphError;
    };

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Could not load Instagram participant profile');
    }

    return {
      id: typeof data.id === 'string' && data.id.trim() ? data.id.trim() : participantId,
      username: typeof data.username === 'string' && data.username.trim() ? data.username.trim() : undefined,
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : undefined,
      profile_pic: getProfilePictureUrl(data.profile_pic) || getProfilePictureUrl(data.picture),
    } satisfies InstagramParticipantProfile;
  } catch (error) {
    logger.warn('Instagram webhook participant profile unavailable.', {
      error,
      participantId,
    });
    return { id: participantId } satisfies InstagramParticipantProfile;
  }
}

async function sendInstagramTextMessage(
  accessToken: string,
  recipientId: string,
  text: string,
  quickReplies: InstagramQuickReply[] = []
) {
  const messageUrl = new URL('https://graph.instagram.com/v21.0/me/messages');
  messageUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(messageUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message: {
        text,
        ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    recipient_id?: string;
    message_id?: string;
    error?: InstagramGraphError;
  };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Instagram could not send this automated message.');
  }

  return data;
}

async function sendInstagramTextMessageWithQuickReplyFallback(
  accessToken: string,
  recipientId: string,
  text: string,
  quickReplies: InstagramQuickReply[] = []
) {
  if (quickReplies.length === 0) {
    return sendInstagramTextMessage(accessToken, recipientId, text);
  }

  try {
    return await sendInstagramTextMessage(accessToken, recipientId, text, quickReplies);
  } catch (error) {
    logger.warn('Instagram quick reply send failed; retrying webhook reply as plain text.', { error });
    return sendInstagramTextMessage(accessToken, recipientId, text);
  }
}

async function sendInstagramAttachmentMessage(
  accessToken: string,
  recipientId: string,
  attachment: { type: 'image' | 'video'; url: string }
) {
  const messageUrl = new URL('https://graph.instagram.com/v21.0/me/messages');
  messageUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(messageUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message: {
        attachment: {
          type: attachment.type,
          payload: {
            url: attachment.url,
          },
        },
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    recipient_id?: string;
    message_id?: string;
    error?: InstagramGraphError;
  };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Instagram could not send this automated product image.');
  }

  return data;
}

function buildWebhookRevenueOperatingSnapshot({
  latestText,
  catalogOffer,
  pendingOrderId,
  escalation,
  outcomeProviders,
  previousBuyerProfile,
  previousRevenueMemory,
}: {
  latestText: string;
  catalogOffer?: InstagramCatalogOffer | null;
  pendingOrderId?: string;
  escalation?: ConversationEscalation | null;
  outcomeProviders?: RevenueOutcomeProviderSettings;
  previousBuyerProfile?: RevenueBuyerIntelligence | null;
  previousRevenueMemory?: RevenueMemoryContext | null;
}) {
  const normalizedText = latestText.toLowerCase();
  const hasPriceSignal = /\b(price|pricing|cost|expensive|budget|how much|payment)\b/.test(normalizedText);
  const hasTimelineSignal = /\b(this month|today|tonight|tomorrow|asap|urgent|now|soon|start)\b/.test(normalizedText);
  const hasConversionSignal = /\b(confirm|order|checkout|payment|book|call|buy|purchase|works)\b/.test(normalizedText);
  const offerScore = catalogOffer
    ? Math.round((catalogOffer.confidence + Math.min(100, catalogOffer.matchScore)) / 2)
    : 0;
  const score =
    escalation?.urgency === 'High'
      ? 92
      : catalogOffer
        ? Math.max(78, Math.min(94, offerScore || catalogOffer.confidence))
        : hasPriceSignal || hasConversionSignal
          ? 68
          : 45;
  const urgency =
    escalation?.urgency ||
    (catalogOffer && (hasTimelineSignal || hasConversionSignal) ? 'High' : hasPriceSignal ? 'Medium' : 'Low');
  const signals = [
    ...(escalation?.signals || []),
    catalogOffer ? `Catalog product matched: ${catalogOffer.title}` : '',
    hasPriceSignal ? 'Asked about price or payment' : '',
    hasTimelineSignal ? 'Mentioned purchase timeline' : '',
    hasConversionSignal ? 'Used booking, order, or checkout language' : '',
    pendingOrderId ? 'Pending order created' : '',
  ].filter(Boolean);
  const missing = [
    !hasTimelineSignal ? 'purchase timeline' : '',
    !catalogOffer && !hasPriceSignal ? 'budget or price range' : '',
    catalogOffer && !hasConversionSignal ? 'confirmation or checkout preference' : '',
  ].filter(Boolean);
  const cta = pendingOrderId
    ? 'Confirm order'
    : catalogOffer
      ? `Confirm interest in ${catalogOffer.title}`
      : 'Ask one clear follow-up question';
  const recommendedAction = pendingOrderId
    ? 'Get confirmation, then send checkout/payment link.'
    : catalogOffer
      ? 'Confirm fit and move the lead toward booking, checkout, or payment.'
      : escalation?.recommendedAction || 'Answer the question and ask one concise qualification question.';
  const summary =
    escalation?.summary ||
    (catalogOffer
      ? `Customer showed pricing interest and received the ${catalogOffer.title} offer.`
      : 'Customer received an automated Instagram reply.');

  const fallback = buildFallbackRevenueOperatingSnapshot({
    lead: {
      score,
      stage: pendingOrderId ? 'pending_order_confirmation' : catalogOffer ? 'pricing_offer_presented' : 'automated_reply',
      urgency,
      intent: escalation?.label || (catalogOffer ? 'High-ticket pricing interest' : 'Instagram DM inquiry'),
      summary,
      signals,
      missing,
      recommendedAction,
      cta,
    },
    cta,
    escalation,
  });
  const mergedRevenueMemory = mergeRevenueMemoryProfiles(previousRevenueMemory?.memory, fallback.memory);
  const memoryWithPriceObjection = hasPriceSignal
    ? mergeRevenueMemoryProfiles(mergedRevenueMemory, { objections: ['price'] })
    : mergedRevenueMemory;
  const memoryWithCatalogOffer = catalogOffer
    ? mergeRevenueMemoryProfiles(memoryWithPriceObjection, {
      offersPresented: [catalogOffer.title, catalogOffer.priceText].filter(Boolean),
    })
    : memoryWithPriceObjection;
  const fallbackWithBuyerMemory = {
    ...fallback,
    buyerIntelligence: mergeBuyerIntelligenceProfiles(previousBuyerProfile, fallback.buyerIntelligence),
    memory: mergedRevenueMemory,
  };

  return applyRevenueOutcomeAction(
    applyRevenueStrategy(
      normalizeRevenueOperatingSnapshot(
        {
          ...fallbackWithBuyerMemory,
          outcomeProbabilities: {
            ...fallbackWithBuyerMemory.outcomeProbabilities,
            book_call: Math.max(fallbackWithBuyerMemory.outcomeProbabilities.book_call || 0, catalogOffer ? 84 : 35),
            purchase_product: Math.max(fallbackWithBuyerMemory.outcomeProbabilities.purchase_product || 0, pendingOrderId ? 92 : catalogOffer ? 86 : 25),
          },
          decision: {
            ...fallbackWithBuyerMemory.decision,
            bestNextAction: pendingOrderId
              ? 'confirm_order_then_send_checkout'
              : catalogOffer
                ? 'present_offer_and_confirm_interest'
                : fallback.decision.bestNextAction,
            confidence: score,
            rationale: summary,
          },
          memory: {
            ...fallbackWithBuyerMemory.memory,
            objections: memoryWithPriceObjection.objections,
            offersPresented: memoryWithCatalogOffer.offersPresented,
          },
        },
        fallbackWithBuyerMemory
      ),
      {
        latestText,
        hasCatalogOffer: Boolean(catalogOffer),
        hasPendingOrder: Boolean(pendingOrderId),
        escalation,
      }
    ),
    outcomeProviders
  );
}

async function generateWebhookAiReply({
  supabase,
  user,
  latestText,
  participant,
  recentCatalogDecline = false,
}: {
  supabase: SupabaseServiceClient;
  user: User;
  latestText: string;
  participant: InstagramParticipantProfile;
  recentCatalogDecline?: boolean;
}) {
  logger.info("generateWebhookAiReply: Starting generation", { latestText, participantId: participant.id });
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const serviceSupabase = createSupabaseServiceClient();
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

  logger.info("generateWebhookAiReply: Workflow settings evaluated", { autoSend: integration.autoSend, answerQuestions: enabledWorkflows.answerQuestions });

  if (!integration.autoSend || !enabledWorkflows.answerQuestions) {
    logger.info("generateWebhookAiReply: Bailing out because autoSend or answerQuestions workflow is disabled.");
    return { reply: '', catalogOffer: null, catalogOffers: [] } satisfies WebhookAiReplyResult;
  }

  const apiKey = platformConfig.apiKey;

  if (!apiKey) {
    logger.info("generateWebhookAiReply: Bailing out because no OpenAI API key was found.");
    return { reply: '', catalogOffer: null, catalogOffers: [] } satisfies WebhookAiReplyResult;
  }

  const assistantId = metadata.openai_assistant_id as string | undefined;

  if (!assistantId) {
    logger.info("generateWebhookAiReply: Bailing out because no OpenAI Assistant ID was found in metadata.");
    return { reply: '', catalogOffer: null, catalogOffers: [] } satisfies WebhookAiReplyResult;
  }
  const participantName = participant.username || participant.name || 'this Instagram lead';
  const conversationId = participant.id || participant.username || participant.name || '';
  const recentConversationLines = (
    conversationId
      ? await getRecentWebhookConversationLines({
          supabase,
          userId: user.id,
          conversationId,
        })
      : ''
  ) || `Customer: ${latestText}`;
  const productCatalog = await getInstagramProductCatalogForUser(supabase, user.id).catch((catalogError) => {
    logger.warn('Instagram catalog unavailable during webhook AI generation:', { error: catalogError });
    return [];
  });
  const catalogSearchText = buildCatalogSearchText(latestText, recentConversationLines);
  const freshCatalogCategoryRequest = isFreshCatalogCategoryRequest(latestText, recentConversationLines);
  const catalogPrompt = formatCatalogForPrompt(productCatalog, catalogSearchText);
  const catalogDiscoveryRequired = isCatalogDiscoveryOnlyRequest(catalogSearchText);
  const catalogDiscoveryState = getCatalogDiscoveryState(catalogSearchText);
  const catalogOffers = findCatalogOffers(catalogSearchText, productCatalog, catalogCarouselMaxItems);
  const catalogOffer = shouldUseSingleCatalogOffer(catalogSearchText, catalogOffers) ? catalogOffers[0] : null;
  const previousBuyerProfile = await loadRosProspectBuyerProfile({
    supabase: serviceSupabase,
    userId: user.id,
    participant: {
      id: participant.id,
      username: participant.username,
      name: participant.name,
    },
  }).catch((buyerMemoryError) => {
    logger.warn('Could not load saved buyer memory for webhook AI prompt:', { error: buyerMemoryError, participantId: participant.id });
    return null;
  });
  const buyerMemoryPrompt = formatBuyerIntelligenceForPrompt(previousBuyerProfile);
  const previousRevenueMemory = await loadRosProspectRevenueMemory({
    supabase: serviceSupabase,
    userId: user.id,
    participant: {
      id: participant.id,
      username: participant.username,
      name: participant.name,
    },
  }).catch((revenueMemoryError) => {
    logger.warn('Could not load saved revenue memory for webhook AI prompt:', { error: revenueMemoryError, participantId: participant.id });
    return null;
  });
  const revenueMemoryPrompt = formatRevenueMemoryForPrompt(previousRevenueMemory);

  logger.info("generateWebhookAiReply: Proceeding to request OpenAI Assistant Thread...", { participantName });
  const reply = await runAssistantThread({
    apiKey,
    assistantId,
    maxTokens: 800,
    additionalInstructions: `${integration.systemPrompt}

IMPORTANT: The attached files and vector store contain the primary truth for this business (such as menus, pricing, services, and policies). You MUST search these files using the file_search tool for any specific business inquiries (e.g. "menu", "pricing", "cost", "hours", "booking", or specific products/services). Do NOT rely on default prompts or assume the business context is TractionFlo if the knowledge base documents specify a different business (e.g. Taste Haven Restaurant).

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
${getConditionalCtaPrompt(integration.ctaMessage, latestText)}

Auto-detected Instagram product catalog:
${catalogPrompt || 'No relevant catalog product was detected for this conversation.'}

Product discovery status: ${catalogDiscoveryRequired ? 'needs_questions' : 'ready_or_not_needed'}
- New product category inquiry: ${freshCatalogCategoryRequest ? 'yes' : 'no'}
- If new product category inquiry is yes, answer only the latest category question. Do not continue, confirm, re-show, or send checkout/payment steps for any previous order.
- If new product category inquiry is yes and no relevant catalog product was detected, say that no matching option is currently available in the catalog/knowledge instead of offering the previous product.
- If relevant catalog products are listed for a new product category inquiry, say they are available and answer from those products. Do not say the category is unavailable.
- For availability or browse questions, do not ask for checkout or order confirmation unless the customer explicitly chooses a product and confirms purchase intent.
- If product discovery status is needs_questions, do not list specific products, send catalog cards, mention checkout, or ask them to confirm an order yet.
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
- Use saved buyer memory as known context for this same participant.
- Do not ask again for known goal, problem, budget, authority, need, or timeline unless the latest message clearly changes them.
- Personalize the reply to the saved buyer profile when it helps the sale.

Saved revenue memory for this Instagram participant:
${revenueMemoryPrompt}

Revenue memory rules:
- Use saved revenue memory as the cumulative customer relationship.
- Remember previous objections, questions asked, offers presented, purchases, and follow-up history.
- Do not restart discovery or repeat an already-presented offer unless the latest message makes that useful.

Product refusal context: ${recentCatalogDecline ? 'yes' : 'no'}
- If product refusal context is yes, do not pitch products, send product options, mention checkout, or ask them to confirm an order unless the latest customer message explicitly asks to see or buy a product.
- If the latest customer message gives budget after a product refusal, acknowledge the budget and say you will keep it in mind. Do not turn it into a product offer.

Return only the Instagram DM reply text. Keep it natural, brief, and useful. Do not mention being an AI unless asked.`,
    messages: [
      {
        role: 'user',
        content: `Instagram participant: ${participantName}

	Recent conversation:
	${recentConversationLines}

	Write the next best reply.`,
      },
    ],
  });
  const guardedReply = removeUnrequestedBookingCta(reply, latestText);

  return {
    reply: buildCatalogOfferReply(guardedReply, catalogOffer),
    catalogOffer,
    catalogOffers,
  } satisfies WebhookAiReplyResult;
}

async function getRecentSenderCatalogText(supabase: SupabaseServiceClient, senderId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('text')
    .eq('sender_id', senderId)
    .order('timestamp', { ascending: false })
    .limit(8);

  if (error) {
    logger.warn('Could not load recent sender messages for commerce recovery.', { error, senderId });
    return '';
  }

  return (data || [])
    .map((row) => String((row as { text?: string }).text || ''))
    .filter((text) => text.trim() && !isCommerceOrderConfirmationText(text))
    .reverse()
    .join('\n');
}

async function getRecentWebhookConversationLines({
  supabase,
  userId,
  conversationId,
  limit = 12,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  conversationId: string;
  limit?: number;
}) {
  const { data, error } = await supabase
    .from('messages')
    .select('direction,text,timestamp')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('Could not load recent webhook conversation context.', {
      error,
      userId,
      conversationId,
    });
    return '';
  }

  return (data || [])
    .reverse()
    .map((row) => {
      const direction = typeof row.direction === 'string' ? row.direction : '';
      const label = direction === 'outbound' ? 'Business' : 'Customer';
      const rawText = String(row.text || '').trim();
      const text = rawText.startsWith('__STORY_REPLY__:') && rawText.includes('__TEXT__:')
        ? rawText.split('__TEXT__:', 2)[1]
        : rawText;

      return text ? `${label}: ${text}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

async function hasRecentCatalogDeclineForSender({
  supabase,
  userId,
  conversationId,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  conversationId: string;
}) {
  const { data, error } = await supabase
    .from('messages')
    .select('text')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .order('timestamp', { ascending: false })
    .limit(8);

  if (error) {
    logger.warn('Could not load recent inbound messages for catalog decline check.', {
      error,
      userId,
      conversationId,
    });
    return false;
  }

  return (data || []).some((row) => isCatalogDeclineRequest(String(row.text || '')));
}

async function recoverPendingCommerceOrderFromCatalog({
  supabase,
  user,
  event,
  participant,
}: {
  supabase: SupabaseServiceClient;
  user: User;
  event: AutomationMessageEvent;
  participant?: InstagramParticipantProfile;
}) {
  const recentCatalogText = await getRecentSenderCatalogText(supabase, event.senderId);

  if (!recentCatalogText.trim()) {
    return null;
  }

  const catalog = await getInstagramProductCatalogForUser(supabase, user.id).catch((catalogError) => {
    logger.warn('Instagram catalog unavailable during commerce confirmation recovery.', { error: catalogError });
    return [];
  });
  const offer = findBestCatalogOffer(recentCatalogText, catalog);

  if (!offer) {
    return null;
  }

  return createPendingCommerceOrder(supabase, user.id, {
    instagramSenderId: event.senderId,
    instagramUsername: participant?.username || participant?.name || '',
    productId: offer.id,
    sourceMediaId: offer.sourceMediaId,
    productTitle: offer.title,
    productDescription: offer.description,
    productImageUrl: offer.imageUrl,
    productPermalink: offer.permalink,
    priceText: offer.priceText,
    amount: offer.priceAmount,
    currency: offer.currency || 'USD',
    source: 'instagram_webhook_confirmation_recovery',
    metadata: {
      businessInstagramId: event.recipientId,
      matchScore: offer.matchScore,
      confidence: offer.confidence,
      recoveredFromConfirmation: true,
    },
  }).catch((orderError) => {
    logger.error('Could not recover pending commerce order from catalog.', {
      error: orderError,
      userId: user.id,
      senderId: event.senderId,
    });
    return null;
  });
}

async function createCatalogCarouselCards({
  supabase,
  user,
  event,
  participant,
  offers,
}: {
  supabase: SupabaseServiceClient;
  user: User;
  event: AutomationMessageEvent;
  participant: InstagramParticipantProfile;
  offers: InstagramCatalogOffer[];
}) {
  const cards: CatalogCarouselCard[] = [];

  for (const offer of offers.slice(0, catalogCarouselMaxItems)) {
    const order = await createPendingCommerceOrder(supabase, user.id, {
      instagramSenderId: event.senderId,
      instagramUsername: participant.username || participant.name || '',
      productId: offer.id,
      sourceMediaId: offer.sourceMediaId,
      productTitle: offer.title,
      productDescription: offer.description,
      productImageUrl: offer.imageUrl,
      productPermalink: offer.permalink,
      priceText: offer.priceText,
      amount: offer.priceAmount,
      currency: offer.currency || 'USD',
      source: 'instagram_webhook_catalog_carousel',
      metadata: {
        businessInstagramId: event.recipientId,
        matchScore: offer.matchScore,
        confidence: offer.confidence,
        catalogCarousel: true,
      },
    }).catch((orderError) => {
      logger.error('Could not create pending commerce order for catalog carousel card.', {
        error: orderError,
        userId: user.id,
        senderId: event.senderId,
        product: offer.title,
      });
      return null;
    });

    if (order?.id) {
      cards.push({ offer, orderId: order.id });
    }
  }

  return cards;
}



async function processInstagramAutomations(
  supabase: SupabaseServiceClient,
  events: AutomationMessageEvent[]
) {
  logger.info("processInstagramAutomations: Starting", { eventCount: events.length });
  if (events.length === 0) {
    logger.info("processInstagramAutomations: No events to process. Returning.");
    return;
  }

  for (const event of events) {
    let activeWebhookAutomationLockMid = '';
    try {
      if (!event.recipientId) {
        continue;
      }

      const account = await getFreshInstagramAccountByIgUserId(supabase, event.recipientId);

      if (!account || !account.access_token || !account.user_id) {
        logger.info("processInstagramAutomations: No connected Instagram account or user found for recipientId", { recipientId: event.recipientId });
        continue;
      }

      // Fetch user to check settings and metadata
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(account.user_id);
      if (userError || !user) {
        logger.error("processInstagramAutomations: Failed to load user metadata by user_id", { userId: account.user_id, error: userError });
        continue;
      }

      const metadata = (user.user_metadata || {}) as Record<string, unknown>;
      const integration = (await resolvePlatformAiConfig(supabase)).integration;
      const outcomeProviders = await loadRevenueOutcomeProviderSettings({
        supabase,
        userId: user.id,
        metadataValue: metadata[revenueOutcomeProvidersMetadataKey],
      });
      const welcome = normalizeInstagramWelcomeAutomation(metadata[instagramWelcomeAutomationMetadataKey]);

      const explicitConfirmOrderId = getConfirmOrderIdFromPayload(event.text);
      if (explicitConfirmOrderId || isCommerceOrderConfirmationText(event.text)) {
        const confirmationText = explicitConfirmOrderId ? 'Confirm order' : event.text;
        let confirmedOrder = explicitConfirmOrderId
          ? await confirmPendingCommerceOrderById(supabase, {
              userId: user.id,
              orderId: explicitConfirmOrderId,
              instagramSenderId: event.senderId,
              conversationId: event.senderId,
              confirmationText,
            }).catch((orderError) => {
              logger.error('processInstagramAutomations: Could not confirm catalog carousel order.', {
                error: orderError,
                userId: user.id,
                senderId: event.senderId,
                orderId: explicitConfirmOrderId,
              });
              return null;
            })
          : await confirmLatestPendingCommerceOrder(supabase, {
              userId: user.id,
              instagramSenderId: event.senderId,
              confirmationText,
            }).catch((orderError) => {
              logger.error('processInstagramAutomations: Could not confirm pending commerce order.', {
                error: orderError,
                userId: user.id,
                senderId: event.senderId,
              });
              return null;
            });

        if (!confirmedOrder && !explicitConfirmOrderId) {
          const participant = await fetchParticipantProfile(account.access_token, event.senderId);
          const recoveredOrder = await recoverPendingCommerceOrderFromCatalog({
            supabase,
            user,
            event,
            participant,
          });

          if (recoveredOrder) {
            confirmedOrder = await confirmLatestPendingCommerceOrder(supabase, {
              userId: user.id,
              instagramSenderId: event.senderId,
              confirmationText,
            }).catch((orderError) => {
              logger.error('processInstagramAutomations: Could not confirm recovered commerce order.', {
                error: orderError,
                userId: user.id,
                senderId: event.senderId,
              });
              return null;
            });
          }
        }

        const alreadyConfirmedOrder = confirmedOrder || explicitConfirmOrderId
          ? null
          : await getLatestCommerceOrderForSender(supabase, {
              userId: user.id,
              instagramSenderId: event.senderId,
              statuses: ['confirmed', 'paid'],
            }).catch((orderError) => {
              logger.error('processInstagramAutomations: Could not load already-confirmed commerce order.', {
                error: orderError,
                userId: user.id,
                senderId: event.senderId,
              });
              return null;
            });

        const orderForReply = confirmedOrder || alreadyConfirmedOrder;

        if (orderForReply) {
          let payableOrder = orderForReply;
          const checkout = await prepareCommerceOrderCheckout(supabase, {
            userId: user.id,
            order: orderForReply,
          });
          payableOrder = checkout.order;
          if (checkout.error) {
            logger.warn('processInstagramAutomations: Commerce checkout link was not created.', {
              error: checkout.error,
              orderId: orderForReply.id,
              userId: user.id,
            });
          }
          let sent: Awaited<ReturnType<typeof sendInstagramTextMessage>> = {};
          const shouldSendPaymentText = !hasCommerceOrderPaymentMessage(payableOrder);
          const shouldSendCheckoutButton = Boolean(
            checkout.checkoutUrl && !hasCommerceOrderCheckoutButtonMessage(payableOrder)
          );
          const customerCheckoutUrl = checkout.checkoutUrl
            ? getCommerceOrderPublicCheckoutUrl(payableOrder)
            : '';
          const paymentReply = buildCommerceOrderPaymentReply(payableOrder, customerCheckoutUrl, Boolean(alreadyConfirmedOrder), {
            includeCheckoutUrl: !shouldSendCheckoutButton,
          });

          if (shouldSendPaymentText || shouldSendCheckoutButton) {
            const paymentSent = await sendInstagramCommercePaymentMessage({
              accessToken: account.access_token,
              recipientId: event.senderId,
              order: payableOrder,
              checkoutUrl: customerCheckoutUrl,
              alreadyConfirmed: Boolean(alreadyConfirmedOrder),
              sendText: shouldSendPaymentText,
              sendCheckoutButton: shouldSendCheckoutButton,
            });
            sent = {
              message_id: paymentSent.messageId,
            };
            if (checkout.checkoutUrl) {
              await markCommerceOrderPaymentMessageSent(supabase, {
                userId: user.id,
                order: payableOrder,
                messageId: paymentSent.messageId,
                source: alreadyConfirmedOrder ? 'webhook_already_confirmed_payment' : 'webhook_confirm_payment',
                textMessageId: paymentSent.textMessageId,
                checkoutButtonMessageId: paymentSent.checkoutButtonMessageId,
                checkoutFallbackMessageId: paymentSent.checkoutFallbackMessageId,
              }).catch((markError) => {
                logger.warn('Could not mark commerce payment message as sent.', {
                  error: markError,
                  orderId: payableOrder.id,
                });
              });
            }
            if (paymentSent.checkoutButtonError) {
              logger.warn('Instagram checkout button failed; payment link fallback was used.', {
                error: paymentSent.checkoutButtonError,
                orderId: payableOrder.id,
              });
            }
          }

          await recordRevenueConversionEvent({
            supabase,
            userId: user.id,
            instagramSenderId: event.senderId,
            conversationId: event.senderId,
            eventType: alreadyConfirmedOrder ? 'order_confirmation_replayed' : 'order_confirmed',
            outcomeType: 'purchase_product',
            status: 'pending',
            value: payableOrder.amount,
            currency: payableOrder.currency,
            commerceOrder: payableOrder,
            metadata: {
              checkoutCreated: checkout.checkoutCreated,
              checkoutConfigured: checkout.checkoutConfigured,
              source: 'instagram_webhook_confirmation',
            },
          }).catch((rosError) => {
            logger.warn('Could not record ROS commerce confirmation event.', {
              error: rosError,
              orderId: payableOrder.id,
              userId: user.id,
            });
          });

          if (checkout.checkoutUrl) {
            await recordRevenueConversionEvent({
              supabase,
              userId: user.id,
              instagramSenderId: event.senderId,
              conversationId: event.senderId,
              eventType: 'checkout_created',
              outcomeType: 'purchase_product',
              status: 'pending',
              value: payableOrder.amount,
              currency: payableOrder.currency,
              commerceOrder: payableOrder,
              metadata: {
                checkoutUrl: customerCheckoutUrl,
                source: 'instagram_webhook_confirmation',
              },
            }).catch((rosError) => {
              logger.warn('Could not record ROS checkout event.', {
                error: rosError,
                orderId: payableOrder.id,
                userId: user.id,
              });
            });
          }

          await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
            type: 'message',
            title: checkout.checkoutUrl ? 'Instagram checkout link sent' : 'Instagram order confirmed',
            body: paymentReply.slice(0, 120),
            url: '/dashboard',
            metadata: {
              source: 'instagram-webhook-confirmation',
              userId: user.id,
              senderId: event.senderId,
              orderId: payableOrder.id,
              messageId: sent.message_id || '',
              checkoutCreated: checkout.checkoutCreated,
              checkoutConfigured: checkout.checkoutConfigured,
            },
          }).catch((notificationError) => {
            logger.error('Realtime Instagram order confirmation notification error:', { error: notificationError });
          });

          logger.info('processInstagramAutomations: Pending commerce order confirmed.', {
            orderId: payableOrder.id,
            userId: user.id,
            senderId: event.senderId,
            checkoutCreated: checkout.checkoutCreated,
            checkoutConfigured: checkout.checkoutConfigured,
          });
          continue;
        }

        logger.info('processInstagramAutomations: Confirmation text received, but no commerce order was found. Skipping generic AI reply.', {
          userId: user.id,
          senderId: event.senderId,
        });
        continue;
      }

      const recentCatalogDecline =
        isCatalogDeclineRequest(event.text) ||
        await hasRecentCatalogDeclineForSender({
          supabase,
          userId: user.id,
          conversationId: event.senderId,
        });

      if (recentCatalogDecline) {
        const cancelledOrders = await cancelPendingCommerceOrdersForSender(supabase, {
          userId: user.id,
          instagramSenderId: event.senderId,
          reason: isCatalogDeclineRequest(event.text)
            ? event.text
            : 'Recent customer message declined product offers.',
          source: 'instagram_webhook_product_refusal',
        }).catch((cancelError) => {
          logger.warn('processInstagramAutomations: Could not cancel pending order after product refusal.', {
            error: cancelError,
            userId: user.id,
            senderId: event.senderId,
          });
          return [];
        });

        if (cancelledOrders.length > 0) {
          logger.info('processInstagramAutomations: Cancelled pending order after product refusal.', {
            userId: user.id,
            senderId: event.senderId,
            orderIds: cancelledOrders.map((order) => order.id),
          });
        }
      }

      const escalation = detectConversationEscalation([{ from: 'user', text: event.text }], {
        rules: metadata[escalationRulesMetadataKey],
      });
      const pauseForEscalation = shouldPauseAiForEscalation(escalation);

      if (escalation && pauseForEscalation) {
        const notificationTitle = `${escalation.label} detected`;
        const notificationBody = escalation.summary;
        const notificationMetadata = {
          source: 'instagram-webhook',
          userId: user.id,
          senderId: event.senderId,
          conversationId: event.senderId,
          messageId: event.mid,
          category: escalation.intent,
          urgency: escalation.urgency,
          urgent: escalation.urgency === 'High',
        };
        const notificationId = `escalation:${user.id}:${event.senderId}:${escalation.intent}`;

        if (!shouldSuppressRealtimeNotification({ title: notificationTitle, body: notificationBody, metadata: notificationMetadata })) {
          await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
            id: notificationId,
            type: 'escalation',
            title: notificationTitle,
            body: notificationBody,
            url: '/escalations',
            metadata: notificationMetadata,
          }).catch((notificationError) => {
            logger.error('Realtime Instagram escalation notification error:', { error: notificationError });
          });
        }

        logger.info("processInstagramAutomations: Escalation detected, pausing webhook auto-reply.", {
          userId: user.id,
          intent: escalation.intent,
          senderId: event.senderId,
        });
        continue;
      }

      if (escalation) {
        logger.info("processInstagramAutomations: Sales lead signal detected, continuing webhook auto-reply.", {
          userId: user.id,
          intent: escalation.intent,
          senderId: event.senderId,
        });
      }

      if (!integration.autoSend) {
        logger.info("processInstagramAutomations: Auto-Send AI Replies is DISABLED for user.", { userId: user.id });
        continue;
      }

      logger.info("processInstagramAutomations: Processing event", { senderId: event.senderId, mid: event.mid, text: event.text });
      const participant = await fetchParticipantProfile(account.access_token, event.senderId);
      logger.info("processInstagramAutomations: Fetched participant profile", { username: participant.username });

      const isFirstInboundDm = event.previousSenderMessageCount === 0;
      logger.info("processInstagramAutomations: Checked message history", { isFirstInboundDm, previousCount: event.previousSenderMessageCount, welcomeEnabled: welcome.enabled });

      let reply = '';
      let catalogOffer: InstagramCatalogOffer | null = null;
      let catalogOffers: InstagramCatalogOffer[] = [];
      if (isFirstInboundDm && welcome.enabled) {
        logger.info("processInstagramAutomations: Generating Welcome Message.");
        reply = renderInstagramWelcomeMessage({
          template: welcome.message,
          username: participant.username,
          name: participant.name,
        });
      } else {
        logger.info("processInstagramAutomations: Triggering generateWebhookAiReply.");
        const aiResult = await generateWebhookAiReply({
          supabase,
          user,
          latestText: event.text,
          participant,
          recentCatalogDecline,
        });
        reply = aiResult.reply;
        catalogOffer = aiResult.catalogOffer;
        catalogOffers = aiResult.catalogOffers;
      }

      if (!reply.trim()) {
        logger.info("processInstagramAutomations: Generated reply is empty. Skipping message send.");
        continue;
      }

      const alreadyReplied = await hasAutomatedReplyAfterInbound({
        supabase,
        userId: user.id,
        conversationId: event.senderId,
        inboundTimestamp: normalizeWebhookTimestampMillis(Number(event.timestamp || 0)),
      });

      if (alreadyReplied) {
        logger.info("processInstagramAutomations: Existing reply found after inbound event. Skipping duplicate send.", {
          userId: user.id,
          senderId: event.senderId,
          mid: event.mid,
        });
        continue;
      }

      const idempotencyKey = getWebhookAutomationIdempotencyKey({
        userId: user.id,
        conversationId: event.senderId,
        inboundMid: event.mid,
        text: event.text,
      });
      const sendClaim = await claimWebhookAutomationSend({
        supabase,
        userId: user.id,
        conversationId: event.senderId,
        senderId: event.recipientId,
        recipientId: event.senderId,
        text: reply.trim(),
        idempotencyKey,
      });

      if (!sendClaim.claimed) {
        logger.info("processInstagramAutomations: Webhook AI send already claimed. Skipping duplicate send.", {
          userId: user.id,
          senderId: event.senderId,
          mid: event.mid,
        });
        continue;
      }
      activeWebhookAutomationLockMid = sendClaim.lockMid;

      let orderId = '';
      let pendingOrder: Awaited<ReturnType<typeof createPendingCommerceOrder>> = null;
      if (catalogOffer) {
        pendingOrder = await createPendingCommerceOrder(supabase, user.id, {
          instagramSenderId: event.senderId,
          instagramUsername: participant.username || participant.name || '',
          productId: catalogOffer.id,
          sourceMediaId: catalogOffer.sourceMediaId,
          productTitle: catalogOffer.title,
          productDescription: catalogOffer.description,
          productImageUrl: catalogOffer.imageUrl,
          productPermalink: catalogOffer.permalink,
          priceText: catalogOffer.priceText,
          amount: catalogOffer.priceAmount,
          currency: catalogOffer.currency || 'USD',
          source: 'instagram_webhook_ai',
          metadata: {
            businessInstagramId: event.recipientId,
            matchScore: catalogOffer.matchScore,
            confidence: catalogOffer.confidence,
          },
        }).catch((orderError) => {
          logger.error('processInstagramAutomations: Could not create pending commerce order before confirm reply.', {
            error: orderError,
            userId: user.id,
            senderId: event.senderId,
          });
          return null;
        });
        orderId = pendingOrder?.id || '';
      }

      const shouldSendCatalogCarousel = !catalogOffer && catalogOffers.length > 1;
      const catalogCarouselCards = shouldSendCatalogCarousel
        ? await createCatalogCarouselCards({
            supabase,
            user,
            event,
            participant,
            offers: catalogOffers,
          })
        : [];

      let catalogImageMessageId = '';
      if (catalogOffer?.imageUrl?.startsWith('https://')) {
        try {
          const imageSent = await sendInstagramAttachmentMessage(account.access_token, event.senderId, {
            type: 'image',
            url: catalogOffer.imageUrl,
          });
          catalogImageMessageId = imageSent.message_id || '';
          logger.info("processInstagramAutomations: Product image sent successfully before confirm reply", {
            product: catalogOffer.title,
            message_id: imageSent.message_id,
          });
        } catch (attachmentError) {
          logger.warn('processInstagramAutomations: Product image could not be sent before AI reply.', {
            error: attachmentError,
            product: catalogOffer.title,
          });
        }
      }

      logger.info("processInstagramAutomations: Sending Instagram text message reply...", { reply: reply.trim() });
      const sent = await sendInstagramTextMessageWithQuickReplyFallback(
        account.access_token,
        event.senderId,
        reply.trim(),
        pendingOrder ? confirmOrderQuickReplies : []
      );
      logger.info("processInstagramAutomations: Instagram text message sent successfully", { message_id: sent.message_id });

      const outboundMetadata = {
        source: isFirstInboundDm && welcome.enabled ? 'instagram_webhook_welcome' : 'instagram_webhook_ai',
        catalogProduct: catalogOffer?.title || '',
        catalogImageMessageId,
        catalogCarouselCount: catalogCarouselCards.length,
        orderId,
        idempotencyKey,
      };
      const lockMidToComplete = activeWebhookAutomationLockMid;
      const lockCompleted = await completeWebhookAutomationSendLock({
        supabase,
        lockMid: lockMidToComplete,
        sentMid: sent.message_id || '',
        text: reply.trim(),
        rawEvent: sent as Record<string, unknown>,
        metadata: outboundMetadata,
      });
      activeWebhookAutomationLockMid = '';

      if (!lockCompleted) {
        await deleteWebhookAutomationSendLock(supabase, lockMidToComplete);
        await storeInstagramMessage({
          supabase,
          mid: sent.message_id || '',
          userId: user.id,
          conversationId: event.senderId,
          senderId: event.recipientId,
          recipientId: event.senderId,
          direction: 'outbound',
          text: reply.trim(),
          timestamp: Date.now(),
          rawEvent: sent as Record<string, unknown>,
          metadata: outboundMetadata,
        }).catch((storeError) => {
          logger.warn('processInstagramAutomations: Could not persist outbound automation message.', { error: storeError });
        });
      }

      let catalogCarouselMessageId = '';
      if (catalogCarouselCards.length > 1) {
        try {
          const carouselSent = await sendInstagramGenericTemplate(
            account.access_token,
            event.senderId,
            buildCatalogCarouselElements(catalogCarouselCards)
          );
          catalogCarouselMessageId = carouselSent.message_id || '';
          await storeInstagramMessage({
            supabase,
            mid: catalogCarouselMessageId,
            userId: user.id,
            conversationId: event.senderId,
            senderId: event.recipientId,
            recipientId: event.senderId,
            direction: 'outbound',
            text: getCatalogCarouselStoredText(catalogCarouselCards),
            timestamp: Date.now() + 1,
            rawEvent: carouselSent as Record<string, unknown>,
            metadata: {
              source: 'instagram_webhook_catalog_carousel',
              catalogCarousel: true,
              catalogCarouselItems: getCatalogCarouselMetadataItems(catalogCarouselCards),
              orderIds: catalogCarouselCards.map((card) => card.orderId),
            },
          }).catch((storeError) => {
            logger.warn('processInstagramAutomations: Could not persist outbound catalog carousel message.', { error: storeError });
          });
          logger.info('processInstagramAutomations: Catalog carousel sent successfully.', {
            message_id: carouselSent.message_id,
            itemCount: catalogCarouselCards.length,
          });
        } catch (carouselError) {
          logger.warn('processInstagramAutomations: Catalog carousel could not be sent.', {
            error: carouselError,
            itemCount: catalogCarouselCards.length,
          });
        }
      }

      const previousBuyerProfile = await loadRosProspectBuyerProfile({
        supabase,
        userId: user.id,
        participant: {
          id: event.senderId,
          username: participant.username,
          name: participant.name,
        },
      }).catch((buyerMemoryError) => {
        logger.warn('processInstagramAutomations: Could not load saved buyer memory for ROS snapshot.', {
          error: buyerMemoryError,
          senderId: event.senderId,
        });
        return null;
      });
      const previousRevenueMemory = await loadRosProspectRevenueMemory({
        supabase,
        userId: user.id,
        participant: {
          id: event.senderId,
          username: participant.username,
          name: participant.name,
        },
      }).catch((revenueMemoryError) => {
        logger.warn('processInstagramAutomations: Could not load saved revenue memory for ROS snapshot.', {
          error: revenueMemoryError,
          senderId: event.senderId,
        });
        return null;
      });
      const rosSnapshot = buildWebhookRevenueOperatingSnapshot({
        latestText: event.text,
        catalogOffer: catalogOffer || catalogCarouselCards[0]?.offer || null,
        pendingOrderId: orderId || catalogCarouselCards[0]?.orderId || '',
        escalation,
        outcomeProviders,
        previousBuyerProfile,
        previousRevenueMemory,
      });
      await persistRevenueOperatingSnapshot({
        supabase,
        userId: user.id,
        participant: {
          id: event.senderId,
          username: participant.username,
          name: participant.name,
        },
        conversationId: event.senderId,
        messages: [
          { from: 'user', text: event.text },
          { from: 'me', text: reply.trim() },
        ],
        snapshot: rosSnapshot,
        escalation: pauseForEscalation ? escalation : null,
        outcomeProviders,
        source: isFirstInboundDm && welcome.enabled ? 'instagram_webhook_welcome' : 'instagram_webhook_ai',
      }).catch((rosError) => {
        logger.warn('processInstagramAutomations: Could not persist ROS decision for webhook reply.', {
          error: rosError,
          userId: user.id,
          senderId: event.senderId,
          orderId,
        });
      });

      logger.info("processInstagramAutomations: Triggering realtime pusher notification for sent reply...");
      await triggerRealtimeNotification([getGlobalChannel(), getSuperAdminChannel()], {
        type: 'ai',
        title: isFirstInboundDm ? 'Welcome DM sent' : 'Instagram AI reply sent',
        body: reply.slice(0, 120),
        url: '/conversations',
        metadata: {
          source: 'instagram-webhook-automation',
          userId: user.id,
          igUserId: event.recipientId,
          senderId: event.senderId,
          messageId: sent.message_id || '',
          catalogProduct: catalogOffer?.title || '',
          catalogImageMessageId,
          catalogCarouselMessageId,
          catalogCarouselCount: catalogCarouselCards.length,
          orderId,
          welcome: isFirstInboundDm,
        },
      }).catch((notificationError) => {
        logger.error('Realtime Instagram automation notification error:', { error: notificationError });
      });
      logger.info("processInstagramAutomations: Event processed successfully.");
    } catch (automationError) {
      if (activeWebhookAutomationLockMid) {
        await deleteWebhookAutomationSendLock(supabase, activeWebhookAutomationLockMid);
      }
      logger.error('Instagram webhook automation error:', { error: automationError, event });
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Meta verification parameters
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN;

  console.log('\n--- WEBHOOK VERIFICATION ATTEMPT ---');
  console.log('Mode:', mode);
  console.log('Received Token:', token);
  console.log('Expected Token (.env):', verifyToken);
  console.log('Challenge:', challenge);

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WEBHOOK_VERIFIED SUCCESSFULLY!');
      return new Response(challenge || '', { 
        status: 200, 
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.log('❌ FORBIDDEN: Tokens do not match!');
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  console.log('❌ BAD REQUEST: Missing mode or token');
  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook Received:', JSON.stringify(body, null, 2));

    // Parse incoming messages and save to Supabase
    if (body.object === 'instagram') {
      const messagesToInsert = [];
      const automationEvents: AutomationMessageEvent[] = [];
      const supabase = createSupabaseServiceClient();

      for (const entry of body.entry || []) {
        for (const msg of (entry.messaging || []) as InstagramWebhookMessageEvent[]) {
          const quickReplyPayload = msg.message?.quick_reply?.payload?.trim() || '';
          const postbackPayload = (msg.postback?.payload || msg.message?.postback?.payload || '').trim();
          const postbackTitle = (msg.postback?.title || msg.message?.postback?.title || '').trim();
          const attachmentText = getWebhookAttachmentText(msg.message);
          const displayText =
            msg.message?.text?.trim() ||
            attachmentText ||
            postbackTitle ||
            (postbackPayload.startsWith(confirmOrderPayloadPrefix) ? 'Confirm order' : postbackPayload) ||
            (quickReplyPayload === 'CONFIRM_ORDER' ? 'Confirm order' : quickReplyPayload);
          const automationText = postbackPayload || quickReplyPayload || displayText;
          const mid =
            msg.message?.mid ||
            msg.postback?.mid ||
            msg.message?.postback?.mid ||
            (postbackPayload ? `postback-${msg.sender?.id || ''}-${msg.recipient?.id || entry.id || ''}-${msg.timestamp || Date.now()}-${postbackPayload}` : '');
          const senderId = msg.sender?.id || '';
          const recipientId = msg.recipient?.id || entry.id || '';

          if (msg.message?.is_echo || !automationText || !senderId || !recipientId) {
            continue;
          }

          const alreadyStored = mid ? await hasStoredMessage(supabase, mid) : false;
          const previousSenderMessageCount = await getSenderMessageCount(supabase, senderId);

          if (!alreadyStored) {
            let dbText = displayText;
            const story = msg.message?.reply_to?.story;
            if (story) {
              dbText = `__STORY_REPLY__:${JSON.stringify(story)}__TEXT__:${displayText}`;
            }
            const connectedAccount = await getFreshInstagramAccountByIgUserId(supabase, recipientId).catch((accountError) => {
              logger.warn('Could not resolve connected Instagram account while storing inbound webhook message.', {
                error: accountError,
                recipientId,
              });
              return null;
            });
            const participant = connectedAccount?.access_token
              ? await fetchParticipantProfile(connectedAccount.access_token, senderId).catch((participantError) => {
                  logger.warn('Could not resolve Instagram participant while storing inbound webhook message.', {
                    error: participantError,
                    senderId,
                  });
                  return null;
                })
              : null;

            messagesToInsert.push({
              mid,
              userId: connectedAccount?.user_id || null,
              conversationId: senderId,
              senderId,
              recipientId,
              text: dbText,
              timestamp: msg.timestamp,
              rawEvent: msg as Record<string, unknown>,
              participant,
            });

            automationEvents.push({
              mid,
              senderId,
              recipientId,
              text: automationText,
              timestamp: msg.timestamp,
              previousSenderMessageCount,
            });
          }
        }
      }

      const insertedMids = new Set<string>();
      if (messagesToInsert.length > 0) {
        for (const msgToInsert of messagesToInsert) {
          try {
            await storeInstagramMessage({
              supabase,
              mid: msgToInsert.mid,
              userId: msgToInsert.userId,
              conversationId: msgToInsert.conversationId,
              senderId: msgToInsert.senderId,
              recipientId: msgToInsert.recipientId,
              direction: 'inbound',
              text: msgToInsert.text,
              timestamp: msgToInsert.timestamp,
              rawEvent: msgToInsert.rawEvent,
              metadata: {
                source: 'meta-webhook',
                participant: msgToInsert.participant || undefined,
              },
            });
            insertedMids.add(msgToInsert.mid);
          } catch (insertError) {
            logger.error('Failed to insert message into Supabase:', { error: insertError, mid: msgToInsert.mid });
          }
        }

        const messagesForNotification = messagesToInsert.filter(m => insertedMids.has(m.mid));
        const notificationMessages = messagesForNotification.filter((message) => {
          const cleanText = message.text.startsWith('__STORY_REPLY__:') && message.text.includes('__TEXT__:')
            ? message.text.split('__TEXT__:', 2)[1]
            : message.text;

          return !shouldSuppressRealtimeNotification({
            title: 'New Instagram message',
            body: cleanText.slice(0, 120) || 'A new Instagram DM arrived.',
            metadata: { source: 'meta-webhook' },
          });
        });

        if (notificationMessages.length > 0) {
          const firstMsgText = notificationMessages[0].text;
          const cleanText = firstMsgText.startsWith('__STORY_REPLY__:') && firstMsgText.includes('__TEXT__:')
            ? firstMsgText.split('__TEXT__:', 2)[1]
            : firstMsgText;
          const notificationTitle = notificationMessages.length === 1 ? 'New Instagram message' : 'New Instagram messages';
          const notificationBody =
            notificationMessages.length === 1
              ? cleanText.slice(0, 120) || 'A new Instagram DM arrived.'
              : `${notificationMessages.length} new Instagram DMs arrived.`;
          const notificationMetadata = {
            count: notificationMessages.length,
            source: 'meta-webhook',
          };

          if (!shouldSuppressRealtimeNotification({ title: notificationTitle, body: notificationBody, metadata: notificationMetadata })) {
            await triggerRealtimeNotification([getGlobalChannel(), getSuperAdminChannel()], {
              type: 'message',
              title: notificationTitle,
              body: notificationBody,
              url: '/conversations',
              metadata: notificationMetadata,
            }).catch((notificationError) => {
              logger.error('Realtime webhook notification error:', { error: notificationError });
            });
          }
        }
      }
      const filteredEvents = automationEvents.filter(event => insertedMids.has(event.mid));
      if (filteredEvents.length > 0) {
        try {
          after(async () => {
            await processInstagramAutomations(supabase, filteredEvents).catch((err) => {
              logger.error('Error processing background Instagram automations:', { error: err });
            });
          });
        } catch (afterError) {
          logger.warn('after() was not available or failed. Running automations synchronously:', { error: afterError });
          await processInstagramAutomations(supabase, filteredEvents);
        }
      }
    }
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    logger.error('Webhook Error:', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
