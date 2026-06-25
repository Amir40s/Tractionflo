import { NextResponse } from "next/server";
import { getAiBehaviorPrompt } from "@/lib/ai-integration";
import { requestOpenAiChatCompletion } from "@/lib/openai-chat";
import { recordOpenAiUsage } from "@/lib/openai-usage";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { isSuperAdminUser, resolvePlatformAiConfig } from "@/lib/platform-ai-config";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSuperAdminUser(user)) {
      return NextResponse.json({ error: "Only superadmins can test the platform AI integration." }, { status: 403 });
    }

    const serviceSupabase = createSupabaseServiceClient();
    const platformConfig = await resolvePlatformAiConfig(serviceSupabase);
    const { apiKey, integration } = platformConfig;

    if (!apiKey) {
      return NextResponse.json({ error: "Add the platform OpenAI key in Super Admin > AI Integration first." }, { status: 400 });
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
          source: "platform-ai-test",
        }),
      messages: [
        {
          role: "system",
          content: `${integration.systemPrompt}

${getAiBehaviorPrompt(integration.behavior)}`,
        },
        {
          role: "user",
          content:
            "Write one short Instagram DM reply confirming that the shared TractionFlo platform AI key is connected for all creator accounts.",
        },
      ],
    });

    await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
      type: "ai",
      title: "Platform OpenAI test completed",
      body: reply.slice(0, 120),
      url: "/dashboard?admin=ai-integration",
      metadata: {
        model: integration.model,
        platformWide: true,
      },
    }).catch((notificationError) => {
      console.error("Realtime platform AI test notification error:", notificationError);
    });

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not test platform OpenAI";
    console.error("Platform OpenAI integration test error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
