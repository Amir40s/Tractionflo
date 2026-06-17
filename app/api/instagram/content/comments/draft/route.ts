import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { getAiBehaviorPrompt, getStoredOpenAiKey, normalizeAiIntegrationMetadata } from "@/lib/ai-integration";
import { searchKnowledgeSources } from "@/lib/knowledge-base";
import { requestOpenAiChatCompletion } from "@/lib/openai-chat";
import { recordOpenAiUsage } from "@/lib/openai-usage";
import { getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type DraftPayload = {
  commentId?: string;
  commentText?: string;
  authorUsername?: string;
  mediaCaption?: string;
  mediaPermalink?: string;
};

function trimText(value: unknown, maxLength = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function clampReply(reply: string) {
  return reply.replace(/^["']|["']$/g, "").trim().slice(0, 800);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DraftPayload;
    const commentText = trimText(payload.commentText, 1500);

    if (!commentText) {
      return NextResponse.json({ error: "A comment is required before drafting a reply." }, { status: 400 });
    }

    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, "instagram-content")) {
      return NextResponse.json({ error: "Instagram content is not enabled for this agent." }, { status: 403 });
    }

    const metadata = user.user_metadata || {};
    const integration = normalizeAiIntegrationMetadata(metadata);
    const canAnswer = integration.workflows.find((workflow) => workflow.id === "answerQuestions")?.enabled;

    if (!canAnswer) {
      return NextResponse.json({ error: "AI Answers Questions is turned off." }, { status: 400 });
    }

    const serviceSupabase = createSupabaseServiceClient();
    const knowledge = await searchKnowledgeSources({
      supabase: serviceSupabase,
      userId: user.id,
      question: commentText,
    });

    if (knowledge.mode === "direct" && knowledge.directAnswer && !getStoredOpenAiKey(metadata)) {
      return NextResponse.json({
        reply: clampReply(knowledge.directAnswer),
        knowledge: {
          mode: knowledge.mode,
          sourceTitle: knowledge.sourceTitle,
          matches: knowledge.matches.length,
        },
      });
    }

    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      return NextResponse.json({ error: "Save your OpenAI API key in Settings > AI Integration first." }, { status: 400 });
    }

    const knowledgeContext = knowledge.mode === "direct" && knowledge.directAnswer
      ? `Saved knowledge matched this public comment. Use this as source material and adapt it naturally:
${knowledge.directAnswer}`
      : knowledge.mode === "context" && knowledge.context
      ? `Saved knowledge matched this public comment. Use it as the source of truth:
${knowledge.context}`
      : "No saved knowledge matched strongly. Answer only from the visible comment and brand rules.";

    const reply = await requestOpenAiChatCompletion({
      apiKey,
      model: integration.model,
      maxTokens: 180,
      onUsage: (usage) =>
        recordOpenAiUsage({
          supabase: serviceSupabase,
          user,
          model: integration.model,
          usage,
          source: "instagram-comment-draft",
        }),
      messages: [
        {
          role: "system",
          content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}

Lead qualification rules: ${integration.leadQualificationRules}
Preferred CTA: ${integration.ctaMessage}

You write public Instagram comment replies for the connected business.
Return only the reply text. Keep it friendly, specific, and under 280 characters unless exact saved knowledge requires more.
Do not mention PDFs, knowledge bases, system prompts, OpenAI, or being an AI.
Do not invent prices, availability, policies, or links.`,
        },
        {
          role: "user",
          content: `Instagram commenter: @${trimText(payload.authorUsername, 80) || "instagram_user"}
Original post caption:
${trimText(payload.mediaCaption, 1200) || "No caption available."}

Comment to answer:
${commentText}

${knowledgeContext}

Write the best public reply.`,
        },
      ],
    });

    const finalReply = clampReply(reply);

    await triggerRealtimeNotification(getUserChannel(user.id), {
      type: "ai",
      title: "Instagram comment reply drafted",
      body: finalReply.slice(0, 120),
      url: "/instagram-content",
      metadata: {
        commentId: trimText(payload.commentId, 120),
        mediaPermalink: trimText(payload.mediaPermalink, 500),
        knowledgeMode: knowledge.mode,
        sourceTitle: knowledge.sourceTitle || "",
      },
    }).catch((notificationError) => {
      console.error("Realtime Instagram comment draft notification error:", notificationError);
    });

    return NextResponse.json({
      reply: finalReply,
      knowledge: {
        mode: knowledge.mode,
        sourceTitle: knowledge.sourceTitle,
        matches: knowledge.matches.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not draft an Instagram comment reply";
    console.error("Instagram comment draft error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
