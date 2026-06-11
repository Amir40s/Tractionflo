import { NextResponse } from 'next/server';
import { getStoredOpenAiKey, normalizeAiIntegrationMetadata } from '@/lib/ai-integration';
import { requestOpenAiChatCompletion } from '@/lib/openai-chat';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type ReplyMessage = {
  from?: 'me' | 'user' | 'note';
  text?: string;
  attachments?: { type?: string; name?: string }[];
  time?: string;
};

type ReplyPayload = {
  participant?: {
    name?: string;
    username?: string;
  };
  accountName?: string;
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

    const metadata = user.user_metadata || {};
    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      return NextResponse.json({ error: 'Save your OpenAI API key first.' }, { status: 400 });
    }

    const integration = normalizeAiIntegrationMetadata(metadata);
    const canAnswer = integration.workflows.find((workflow) => workflow.id === 'answerQuestions')?.enabled;

    if (!canAnswer) {
      return NextResponse.json({ error: 'AI Answers Questions is turned off.' }, { status: 400 });
    }

    const participantName =
      payload.participant?.username || payload.participant?.name || 'this Instagram lead';
    const conversationLines = (payload.messages || [])
      .slice(-12)
      .map(formatConversationLine)
      .join('\n');

    const reply = await requestOpenAiChatCompletion({
      apiKey,
      model: integration.model,
      maxTokens: 180,
      messages: [
        {
          role: 'system',
          content: `${integration.systemPrompt}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

Return only the Instagram DM reply text. Keep it natural, brief, and useful. Do not mention being an AI unless asked.`,
        },
        {
          role: 'user',
          content: `Business account: ${payload.accountName || 'TractionFlo'}
Instagram participant: ${participantName}

Recent conversation:
${conversationLines || 'No prior messages.'}

Write the next best reply.`,
        },
      ],
    });

    return NextResponse.json({ reply, autoSend: integration.autoSend });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not generate AI reply';
    console.error('OpenAI reply generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
