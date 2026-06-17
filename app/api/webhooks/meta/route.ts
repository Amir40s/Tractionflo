import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import type { User } from '@supabase/supabase-js';
import {
  getAiBehaviorPrompt,
  getEnabledWorkflowMap,
  getStoredOpenAiKey,
  normalizeAiIntegrationMetadata,
} from '@/lib/ai-integration';
import { getFreshInstagramAccount } from '@/lib/instagram-token';
import {
  instagramWelcomeAutomationMetadataKey,
  normalizeInstagramWelcomeAutomation,
  renderInstagramWelcomeMessage,
} from '@/lib/instagram-welcome-automation';
import { searchKnowledgeSources } from '@/lib/knowledge-base';
import { runAssistantThread } from '@/lib/openai-assistants';
import { recordOpenAiUsage } from '@/lib/openai-usage';
import { getGlobalChannel, getSuperAdminChannel, triggerRealtimeNotification } from '@/lib/pusher';
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

async function findAutomationUser(supabase: SupabaseServiceClient) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    throw error;
  }

  const candidates = (data.users || [])
    .map((user) => {
      const metadata = (user.user_metadata || {}) as Record<string, unknown>;
      const integration = normalizeAiIntegrationMetadata(metadata);
      const welcome = normalizeInstagramWelcomeAutomation(metadata[instagramWelcomeAutomationMetadataKey]);

      return {
        user,
        integration,
        welcome,
        hasAssistantId: Boolean(metadata.openai_assistant_id),
      };
    })
    .filter((candidate) => candidate.integration.autoSend);

  logger.info("findAutomationUser debug list:", {
    totalUsersChecked: data.users?.length || 0,
    userStatuses: (data.users || []).map(u => {
      const meta = (u.user_metadata || {}) as Record<string, unknown>;
      return {
        email: u.email,
        autoSend: normalizeAiIntegrationMetadata(meta).autoSend,
        hasAssistantId: Boolean(meta.openai_assistant_id)
      };
    })
  });

  logger.info("findAutomationUser: Found candidates with autoSend enabled", { candidateCount: candidates.length });

  return candidates.find((candidate) => candidate.hasAssistantId) || candidates[0] || null;
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
  logger.info("generateWebhookAiReply: Starting generation", { latestText, participantId: participant.id });
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const integration = normalizeAiIntegrationMetadata(metadata);
  const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);

  logger.info("generateWebhookAiReply: Workflow settings evaluated", { autoSend: integration.autoSend, answerQuestions: enabledWorkflows.answerQuestions });

  if (!integration.autoSend || !enabledWorkflows.answerQuestions) {
    logger.info("generateWebhookAiReply: Bailing out because autoSend or answerQuestions workflow is disabled.");
    return '';
  }

  const messages = [{ from: 'user' as const, text: latestText, time: new Date().toISOString() }];

  const apiKey = getStoredOpenAiKey(metadata);

  if (!apiKey) {
    logger.info("generateWebhookAiReply: Bailing out because no OpenAI API key was found.");
    return '';
  }

  const assistantId = metadata.openai_assistant_id as string | undefined;

  if (!assistantId) {
    logger.info("generateWebhookAiReply: Bailing out because no OpenAI Assistant ID was found in metadata.");
    return '';
  }
  const participantName = participant.username || participant.name || 'this Instagram lead';

  logger.info("generateWebhookAiReply: Proceeding to request OpenAI Assistant Thread...", { participantName });
  return runAssistantThread({
    apiKey,
    assistantId,
    maxTokens: 180,
    additionalInstructions: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Return only the Instagram DM reply text. Keep it natural, brief, and useful. Do not mention being an AI unless asked.`,
    messages: [
      {
        role: 'user',
        content: `Instagram participant: ${participantName}

Recent conversation:
${messages.map(formatWebhookConversationLine).join('\n')}

Write the next best reply. Ensure you use the attached file_search knowledge base to answer questions accurately.`,
      },
    ],
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

  const automationUser = await findAutomationUser(supabase);

  if (!automationUser) {
    logger.info("processInstagramAutomations: No automation user found. This means Auto-Send AI Replies is DISABLED in your settings. Bailing out.");
    return;
  }

  logger.info("processInstagramAutomations: Found automation user", { userId: automationUser.user.id });

  const account = await getFreshInstagramAccount(supabase);

  if (!account?.access_token) {
    logger.info("processInstagramAutomations: No fresh Instagram access token found. Returning.");
    return;
  }

  logger.info("processInstagramAutomations: Successfully retrieved fresh Instagram account token.");

  for (const event of events) {
    logger.info("processInstagramAutomations: Processing event", { senderId: event.senderId, mid: event.mid, text: event.text });
    try {
      const participant = await fetchParticipantProfile(account.access_token, event.senderId);
      logger.info("processInstagramAutomations: Fetched participant profile", { username: participant.username });
      
      const isFirstInboundDm = event.previousSenderMessageCount === 0;
      logger.info("processInstagramAutomations: Checked message history", { isFirstInboundDm, previousCount: event.previousSenderMessageCount, welcomeEnabled: automationUser.welcome.enabled });

      let reply = '';
      if (isFirstInboundDm && automationUser.welcome.enabled) {
        logger.info("processInstagramAutomations: Generating Welcome Message.");
        reply = renderInstagramWelcomeMessage({
          template: automationUser.welcome.message,
          username: participant.username,
          name: participant.name,
        });
      } else {
        logger.info("processInstagramAutomations: Triggering generateWebhookAiReply.");
        reply = await generateWebhookAiReply({
          supabase,
          user: automationUser.user,
          latestText: event.text,
          participant,
        });
      }

      if (!reply.trim()) {
        logger.info("processInstagramAutomations: Generated reply is empty. Skipping message send.");
        continue;
      }

      logger.info("processInstagramAutomations: Sending Instagram text message reply...", { reply: reply.trim() });
      const sent = await sendInstagramTextMessage(account.access_token, event.senderId, reply.trim());
      logger.info("processInstagramAutomations: Instagram text message sent successfully", { message_id: sent.message_id });

      logger.info("processInstagramAutomations: Triggering realtime pusher notification for sent reply...");
      await triggerRealtimeNotification([getGlobalChannel(), getSuperAdminChannel()], {
        type: 'ai',
        title: isFirstInboundDm ? 'Welcome DM sent' : 'Instagram AI reply sent',
        body: reply.slice(0, 120),
        url: '/conversations',
        metadata: {
          source: 'instagram-webhook-automation',
          senderId: event.senderId,
          messageId: sent.message_id || '',
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
          const text = msg.message?.text?.trim();
          const mid = msg.message?.mid || '';
          const senderId = msg.sender?.id || '';

          if (msg.message?.is_echo || !text || !senderId) {
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
          logger.error('Realtime webhook notification error:', { error: notificationError });
        });
      }

      await processInstagramAutomations(supabase, automationEvents);
    }

    // Acknowledge receipt to Meta quickly (must be within 20 seconds)
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    logger.error('Webhook Error:', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
