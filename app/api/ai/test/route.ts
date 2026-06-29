import { NextResponse } from 'next/server';
import { getAiBehaviorPrompt } from '@/lib/ai-integration';
import { requestOpenAiChatCompletion } from '@/lib/openai-chat';
import { recordOpenAiUsage } from '@/lib/openai-usage';
import { resolvePlatformAiConfig } from '@/lib/platform-ai-config';
import { getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
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

    const serviceSupabase = createSupabaseServiceClient();
    const platformConfig = await resolvePlatformAiConfig(serviceSupabase);
    const { apiKey, integration } = platformConfig;

    if (!apiKey) {
      return NextResponse.json({ error: 'Ask a superadmin to add the platform OpenAI key first.' }, { status: 400 });
    }

    const reply = await requestOpenAiChatCompletion({
      apiKey,
      model: integration.model,
      maxTokens: 80,
      onUsage: (usage) =>
        recordOpenAiUsage({
          supabase: serviceSupabase,
          user,
          model: integration.model,
          usage,
          source: 'ai-test',
        }),
      messages: [
        {
          role: 'system',
          content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}`,
        },
        {
          role: 'user',
          content:
            'Write one short Instagram DM reply confirming that TractionFlo AI is connected and ready to help with leads.',
        },
      ],
    });

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: 'ai',
      title: 'OpenAI test completed',
      body: reply.slice(0, 120),
      url: '/settings',
      metadata: {
        model: integration.model,
      },
    }).catch((notificationError) => {
      console.error('Realtime AI test notification error:', notificationError);
    });

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not test OpenAI';
    console.error('OpenAI integration test error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
