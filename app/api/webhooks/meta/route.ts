import { NextResponse, after } from 'next/server';
import logger from '@/lib/logger';
import type { User } from '@supabase/supabase-js';
import {
  buildCommerceOrderPaymentReply,
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
} from '@/lib/conversation-escalation';
import {
  getAiBehaviorPrompt,
  getEnabledWorkflowMap,
  getStoredOpenAiKey,
  normalizeAiIntegrationMetadata,
} from '@/lib/ai-integration';
import { getFreshInstagramAccountByIgUserId } from '@/lib/instagram-token';
import {
  buildCatalogOfferReply,
  findBestCatalogOffer,
  formatCatalogForPrompt,
  getInstagramProductCatalogForUser,
  type InstagramCatalogOffer,
} from '@/lib/instagram-product-catalog';
import {
  instagramWelcomeAutomationMetadataKey,
  normalizeInstagramWelcomeAutomation,
  renderInstagramWelcomeMessage,
} from '@/lib/instagram-welcome-automation';
import { sendInstagramCommercePaymentMessage } from '@/lib/instagram-send-api';
import { runAssistantThread } from '@/lib/openai-assistants';

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
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: {
      payload?: string;
    };
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
};

type InstagramGraphError = {
  message?: string;
};

type WebhookAiReplyResult = {
  reply: string;
  catalogOffer: InstagramCatalogOffer | null;
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

async function fetchParticipantProfile(accessToken: string, participantId: string) {
  try {
    const profileUrl = new URL(`https://graph.instagram.com/v21.0/${participantId}`);
    profileUrl.searchParams.set('fields', 'id,username,name');
    profileUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(profileUrl.toString(), { cache: 'no-store' });
    const data = (await response.json().catch(() => ({}))) as InstagramParticipantProfile & {
      error?: InstagramGraphError;
    };

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Could not load Instagram participant profile');
    }

    return data;
  } catch (error) {
    console.error('Instagram webhook participant profile error:', error);
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

function formatWebhookConversationLine(message: { from?: 'me' | 'user' | 'note'; text?: string }) {
  const sender = message.from === 'me' ? 'Business' : message.from === 'note' ? 'Internal note' : 'Instagram user';
  return `${sender}: ${message.text?.trim() || 'Sent an attachment'}`;
}

async function generateWebhookAiReply({
  supabase,
  user,
  latestText,
  participant,
}: {
  supabase: SupabaseServiceClient;
  user: User;
  latestText: string;
  participant: InstagramParticipantProfile;
}) {
  logger.info("generateWebhookAiReply: Starting generation", { latestText, participantId: participant.id });
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const integration = normalizeAiIntegrationMetadata(metadata);
  const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);

  logger.info("generateWebhookAiReply: Workflow settings evaluated", { autoSend: integration.autoSend, answerQuestions: enabledWorkflows.answerQuestions });

  if (!integration.autoSend || !enabledWorkflows.answerQuestions) {
    logger.info("generateWebhookAiReply: Bailing out because autoSend or answerQuestions workflow is disabled.");
    return { reply: '', catalogOffer: null } satisfies WebhookAiReplyResult;
  }

  const messages = [{ from: 'user' as const, text: latestText, time: new Date().toISOString() }];

  const apiKey = getStoredOpenAiKey(metadata);

  if (!apiKey) {
    logger.info("generateWebhookAiReply: Bailing out because no OpenAI API key was found.");
    return { reply: '', catalogOffer: null } satisfies WebhookAiReplyResult;
  }

  const assistantId = metadata.openai_assistant_id as string | undefined;

  if (!assistantId) {
    logger.info("generateWebhookAiReply: Bailing out because no OpenAI Assistant ID was found in metadata.");
    return { reply: '', catalogOffer: null } satisfies WebhookAiReplyResult;
  }
  const participantName = participant.username || participant.name || 'this Instagram lead';
  const productCatalog = await getInstagramProductCatalogForUser(supabase, user.id).catch((catalogError) => {
    logger.warn('Instagram catalog unavailable during webhook AI generation:', { error: catalogError });
    return [];
  });
  const catalogPrompt = formatCatalogForPrompt(productCatalog, latestText);
  const catalogOffer = findBestCatalogOffer(latestText, productCatalog);

  logger.info("generateWebhookAiReply: Proceeding to request OpenAI Assistant Thread...", { participantName });
  const reply = await runAssistantThread({
    apiKey,
    assistantId,
    maxTokens: 800,
    additionalInstructions: `${integration.systemPrompt}

IMPORTANT: The attached files and vector store contain the primary truth for this business (such as menus, pricing, services, and policies). You MUST search these files using the file_search tool for any specific business inquiries (e.g. "menu", "pricing", "cost", "hours", "booking", or specific products/services). Do NOT rely on default prompts or assume the business context is TractionFlo if the knowledge base documents specify a different business (e.g. Taste Haven Restaurant).

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Auto-detected Instagram product catalog:
${catalogPrompt || 'No relevant catalog product was detected for this conversation.'}

Return only the Instagram DM reply text. Keep it natural, brief, and useful. Do not mention being an AI unless asked.`,
    messages: [
      {
        role: 'user',
        content: `Instagram participant: ${participantName}

Recent conversation:
${messages.map(formatWebhookConversationLine).join('\n')}

Write the next best reply.`,
      },
    ],
  });

  return {
    reply: buildCatalogOfferReply(reply, catalogOffer),
    catalogOffer,
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
      const integration = normalizeAiIntegrationMetadata(metadata);
      const welcome = normalizeInstagramWelcomeAutomation(metadata[instagramWelcomeAutomationMetadataKey]);

      if (isCommerceOrderConfirmationText(event.text)) {
        let confirmedOrder = await confirmLatestPendingCommerceOrder(supabase, {
          userId: user.id,
          instagramSenderId: event.senderId,
          confirmationText: event.text,
        }).catch((orderError) => {
          logger.error('processInstagramAutomations: Could not confirm pending commerce order.', {
            error: orderError,
            userId: user.id,
            senderId: event.senderId,
          });
          return null;
        });

        if (!confirmedOrder) {
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
              confirmationText: event.text,
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

        const alreadyConfirmedOrder = confirmedOrder
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

      const escalation = detectConversationEscalation([{ from: 'user', text: event.text }], {
        rules: metadata[escalationRulesMetadataKey],
      });

      if (escalation) {
        await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
          type: 'escalation',
          title: `${escalation.label} detected`,
          body: escalation.summary,
          url: '/conversations',
          metadata: {
            source: 'instagram-webhook',
            userId: user.id,
            senderId: event.senderId,
            messageId: event.mid,
            category: escalation.intent,
            urgency: escalation.urgency,
            urgent: escalation.urgency === 'High',
          },
        }).catch((notificationError) => {
          logger.error('Realtime Instagram escalation notification error:', { error: notificationError });
        });

        if (shouldPauseAiForEscalation(escalation)) {
          logger.info("processInstagramAutomations: Escalation detected, pausing webhook auto-reply.", {
            userId: user.id,
            intent: escalation.intent,
            senderId: event.senderId,
          });
          continue;
        }

        logger.info("processInstagramAutomations: Sales escalation detected, continuing webhook auto-reply.", {
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
        });
        reply = aiResult.reply;
        catalogOffer = aiResult.catalogOffer;
      }

      if (!reply.trim()) {
        logger.info("processInstagramAutomations: Generated reply is empty. Skipping message send.");
        continue;
      }

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
          orderId,
          welcome: isFirstInboundDm,
        },
      }).catch((notificationError) => {
        logger.error('Realtime Instagram automation notification error:', { error: notificationError });
      });
      logger.info("processInstagramAutomations: Event processed successfully.");
    } catch (automationError) {
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
          const displayText =
            msg.message?.text?.trim() ||
            (quickReplyPayload === 'CONFIRM_ORDER' ? 'Confirm order' : quickReplyPayload);
          const automationText = quickReplyPayload || displayText;
          const mid = msg.message?.mid || '';
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

            messagesToInsert.push({
              mid,
              sender_id: senderId,
              text: dbText,
              timestamp: msg.timestamp,
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
          const { error: insertError } = await supabase
            .from('messages')
            .insert(msgToInsert);

          if (!insertError) {
            insertedMids.add(msgToInsert.mid);
          } else {
            if (insertError.code === '23505') {
              logger.info('Duplicate message received concurrently, skipping processing:', { mid: msgToInsert.mid });
            } else {
              logger.error('Failed to insert message into Supabase:', { error: insertError, mid: msgToInsert.mid });
            }
          }
        }

        const messagesForNotification = messagesToInsert.filter(m => insertedMids.has(m.mid));
        if (messagesForNotification.length > 0) {
          const firstMsgText = messagesForNotification[0].text;
          const cleanText = firstMsgText.startsWith('__STORY_REPLY__:') && firstMsgText.includes('__TEXT__:')
            ? firstMsgText.split('__TEXT__:', 2)[1]
            : firstMsgText;

          await triggerRealtimeNotification([getGlobalChannel(), getSuperAdminChannel()], {
            type: 'message',
            title: messagesForNotification.length === 1 ? 'New Instagram message' : 'New Instagram messages',
            body:
              messagesForNotification.length === 1
                ? cleanText.slice(0, 120) || 'A new Instagram DM arrived.'
                : `${messagesForNotification.length} new Instagram DMs arrived.`,
            url: '/conversations',
            metadata: {
              count: messagesForNotification.length,
              source: 'meta-webhook',
            },
          }).catch((notificationError) => {
            logger.error('Realtime webhook notification error:', { error: notificationError });
          });
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
