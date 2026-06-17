import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import {
  getAiBehaviorPrompt,
  getEnabledWorkflowMap,
  getStoredOpenAiKey,
  normalizeAiIntegrationMetadata,
} from '@/lib/ai-integration';
import { detectConversationEscalation } from '@/lib/conversation-escalation';
import { buildBookingFollowUpReply, buildBookingMemoryPrompt, shouldUseConversationAwareReply } from '@/lib/conversation-context';
import { getFreshInstagramAccountByIgUserId } from '@/lib/instagram-token';
import {
  instagramWelcomeAutomationMetadataKey,
  normalizeInstagramWelcomeAutomation,
  renderInstagramWelcomeMessage,
} from '@/lib/instagram-welcome-automation';
import { searchKnowledgeSources } from '@/lib/knowledge-base';
import { requestOpenAiChatCompletion } from '@/lib/openai-chat';
import { recordOpenAiUsage } from '@/lib/openai-usage';
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

async function sendInstagramTextMessage(accessToken: string, recipientId: string, text: string) {
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
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const integration = normalizeAiIntegrationMetadata(metadata);
  const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);

  if (!integration.autoSend || !enabledWorkflows.answerQuestions) {
    return '';
  }

  const messages = [{ from: 'user' as const, text: latestText, time: new Date().toISOString() }];
  const escalation = detectConversationEscalation(messages);

  if (escalation) {
    await triggerRealtimeNotification([getUserChannel(user.id), getGlobalChannel(), getSuperAdminChannel()], {
      type: 'agent',
      title: 'Human handoff needed',
      body: escalation.summary,
      url: '/conversations',
      metadata: {
        source: 'instagram-webhook-automation',
        userId: user.id,
        senderId: participant.id || '',
        category: escalation.intent,
        urgency: escalation.urgency,
      },
    }).catch((notificationError) => {
      console.error('Realtime webhook handoff notification error:', notificationError);
    });

    return '';
  }

  const bookingFollowUpReply = buildBookingFollowUpReply(messages);
  const bookingMemoryPrompt = buildBookingMemoryPrompt(messages);
  const useConversationAwareReply = shouldUseConversationAwareReply(messages);
  const knowledge = await searchKnowledgeSources({
    supabase,
    userId: user.id,
    question: latestText,
  });

  if (bookingFollowUpReply) {
    return bookingFollowUpReply;
  }

  if (knowledge.mode === 'direct' && knowledge.directAnswer && !useConversationAwareReply) {
    return knowledge.directAnswer;
  }

  const apiKey = getStoredOpenAiKey(metadata);

  if (!apiKey) {
    return '';
  }

  const knowledgeContext =
    knowledge.mode === 'context' && knowledge.context
      ? `Saved business knowledge matched this question. Use it as the source of truth when answering.
Use exact saved prices, policies, hours, and requirements when available.

${knowledge.context}`
      : knowledge.mode === 'direct' && knowledge.directAnswer
        ? `Saved business knowledge matched this question. Use it as source material.

Direct saved answer:
${knowledge.directAnswer}`
        : '';
  const participantName = participant.username || participant.name || 'this Instagram lead';

  return requestOpenAiChatCompletion({
    apiKey,
    model: integration.model,
    maxTokens: 180,
    onUsage: (usage) =>
      recordOpenAiUsage({
        supabase,
        user,
        model: integration.model,
        usage,
        source: 'instagram-webhook-auto-reply',
      }),
    messages: [
      {
        role: 'system',
        content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Return only the Instagram DM reply text. Keep it natural, brief, and useful. Do not mention being an AI unless asked.`,
      },
      {
        role: 'user',
        content: `Instagram participant: ${participantName}
${knowledgeContext ? `\n${knowledgeContext}\n` : ''}
${bookingMemoryPrompt}

Recent conversation:
${messages.map(formatWebhookConversationLine).join('\n')}

Write the next best reply.`,
      },
    ],
  });
}

async function processInstagramAutomations(
  supabase: SupabaseServiceClient,
  events: AutomationMessageEvent[]
) {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    try {
      if (!event.recipientId) {
        continue;
      }

      const account = await getFreshInstagramAccountByIgUserId(supabase, event.recipientId);

      if (!account?.access_token || !account.user_id) {
        continue;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.admin.getUserById(account.user_id);

      if (userError || !user) {
        if (userError) {
          console.error('Instagram webhook owner lookup error:', userError);
        }

        continue;
      }

      const metadata = (user.user_metadata || {}) as Record<string, unknown>;
      const integration = normalizeAiIntegrationMetadata(metadata);

      if (!integration.autoSend) {
        continue;
      }

      const welcome = normalizeInstagramWelcomeAutomation(metadata[instagramWelcomeAutomationMetadataKey]);
      const participant = await fetchParticipantProfile(account.access_token, event.senderId);
      const isFirstInboundDm = event.previousSenderMessageCount === 0;
      const reply = isFirstInboundDm && welcome.enabled
        ? renderInstagramWelcomeMessage({
            template: welcome.message,
            username: participant.username,
            name: participant.name,
          })
        : await generateWebhookAiReply({
            supabase,
            user,
            latestText: event.text,
            participant,
          });

      if (!reply.trim()) {
        continue;
      }

      const sent = await sendInstagramTextMessage(account.access_token, event.senderId, reply.trim());

      await triggerRealtimeNotification([getUserChannel(user.id), getGlobalChannel(), getSuperAdminChannel()], {
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
          welcome: isFirstInboundDm,
        },
      }).catch((notificationError) => {
        console.error('Realtime Instagram automation notification error:', notificationError);
      });
    } catch (automationError) {
      console.error('Instagram webhook automation error:', automationError);
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
          const text = msg.message?.text?.trim();
          const mid = msg.message?.mid || '';
          const senderId = msg.sender?.id || '';
          const recipientId = msg.recipient?.id || entry.id || '';

          if (msg.message?.is_echo || !text || !senderId || !recipientId) {
            continue;
          }

          const alreadyStored = mid ? await hasStoredMessage(supabase, mid) : false;
          const previousSenderMessageCount = await getSenderMessageCount(supabase, senderId);

          if (!alreadyStored) {
            messagesToInsert.push({
              mid,
              sender_id: senderId,
              text,
              timestamp: msg.timestamp,
            });

            automationEvents.push({
              mid,
              senderId,
              recipientId,
              text,
              timestamp: msg.timestamp,
              previousSenderMessageCount,
            });
          }
        }
      }

      if (messagesToInsert.length > 0) {
        const { error: dbError } = await supabase.from('messages').insert(messagesToInsert);
        if (dbError) {
           console.error('Supabase Insert Error:', dbError);
        }

        await triggerRealtimeNotification([getGlobalChannel(), getSuperAdminChannel()], {
          type: 'message',
          title: messagesToInsert.length === 1 ? 'New Instagram message' : 'New Instagram messages',
          body:
            messagesToInsert.length === 1
              ? messagesToInsert[0].text.slice(0, 120) || 'A new Instagram DM arrived.'
              : `${messagesToInsert.length} new Instagram DMs arrived.`,
          url: '/conversations',
          metadata: {
            count: messagesToInsert.length,
            source: 'meta-webhook',
          },
        }).catch((notificationError) => {
          console.error('Realtime webhook notification error:', notificationError);
        });
      }

      await processInstagramAutomations(supabase, automationEvents);
    }

    // Acknowledge receipt to Meta quickly (must be within 20 seconds)
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
