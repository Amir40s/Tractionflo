import { NextResponse } from "next/server";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import {
  escalationRulesMetadataKey,
  normalizeEscalationRuleSettings,
} from "@/lib/conversation-escalation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type EscalationRulesPayload = {
  rules?: unknown;
};

export async function GET() {
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

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;

    return NextResponse.json({
      rules: normalizeEscalationRuleSettings(metadata[escalationRulesMetadataKey]),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load escalation rules";
    console.error("Escalation rules load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EscalationRulesPayload;
    const supabase = await createClient();
    const {
      data: { user },
      error: currentUserError,
    } = await supabase.auth.getUser();

    if (currentUserError) {
      throw currentUserError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rules = normalizeEscalationRuleSettings(payload.rules);
    const metadata = compactUserAuthMetadata(user.user_metadata);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        [escalationRulesMetadataKey]: rules,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save escalation rules";
    console.error("Escalation rules save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
