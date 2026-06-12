import { NextResponse } from 'next/server';
import {
  getStoredOpenAiKey,
  isOpenAiKeyLike,
  normalizeAiBehaviorSettings,
  normalizeAiIntegrationMetadata,
  normalizeAiWorkflows,
  normalizeOpenAiModel,
  sanitizeAiText,
} from '@/lib/ai-integration';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type IntegrationPayload = {
  apiKey?: string;
  clearApiKey?: boolean;
  model?: string;
  workflows?: unknown;
  behavior?: unknown;
  systemPrompt?: string;
  leadQualificationRules?: string;
  ctaMessage?: string;
  autoSend?: boolean;
};

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return { supabase, user };
}

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      integration: normalizeAiIntegrationMetadata(user.user_metadata || {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load AI integration';
    console.error('AI integration load error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as IntegrationPayload;
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const metadata = user.user_metadata || {};
    const nextMetadata: Record<string, unknown> = { ...metadata };
    const apiKey = payload.apiKey?.trim();

    if (payload.clearApiKey) {
      delete nextMetadata.openai_api_key;
    } else if (apiKey) {
      if (!isOpenAiKeyLike(apiKey)) {
        return NextResponse.json({ error: 'Enter a valid OpenAI API key that starts with sk-.' }, { status: 400 });
      }

      nextMetadata.openai_api_key = apiKey;
    } else if (getStoredOpenAiKey(metadata)) {
      nextMetadata.openai_api_key = getStoredOpenAiKey(metadata);
    }

    nextMetadata.openai_model = normalizeOpenAiModel(payload.model ?? metadata.openai_model);
    nextMetadata.ai_integration_workflows = normalizeAiWorkflows(
      payload.workflows ?? metadata.ai_integration_workflows
    );
    const nextBehavior = normalizeAiBehaviorSettings(payload.behavior ?? metadata.ai_behavior, metadata);
    nextMetadata.ai_behavior = nextBehavior;
    nextMetadata.ai_personality = nextBehavior.personality;
    nextMetadata.ai_response_style = nextBehavior.responseStyle;
    nextMetadata.ai_knowledge_usage = nextBehavior.knowledgeUsage;
    nextMetadata.ai_proactive_outreach = nextBehavior.proactiveOutreach;
    nextMetadata.ai_auto_tagging = nextBehavior.autoTagging;
    nextMetadata.ai_integration_system_prompt = sanitizeAiText(
      payload.systemPrompt,
      sanitizeAiText(metadata.ai_integration_system_prompt, '', 1800),
      1800
    );
    nextMetadata.ai_integration_lead_rules = sanitizeAiText(
      payload.leadQualificationRules,
      sanitizeAiText(metadata.ai_integration_lead_rules, '', 1400),
      1400
    );
    nextMetadata.ai_integration_cta = sanitizeAiText(
      payload.ctaMessage,
      sanitizeAiText(metadata.ai_integration_cta, '', 600),
      600
    );
    nextMetadata.ai_integration_auto_send =
      typeof payload.autoSend === 'boolean'
        ? payload.autoSend
        : typeof metadata.ai_integration_auto_send === 'boolean'
          ? metadata.ai_integration_auto_send
          : false;

    const { data, error } = await supabase.auth.updateUser({ data: nextMetadata });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      integration: normalizeAiIntegrationMetadata(data.user?.user_metadata || nextMetadata),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save AI integration';
    console.error('AI integration save error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
