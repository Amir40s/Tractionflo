import { NextResponse } from "next/server";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import {
  escalationWorkflowStateMetadataKey,
  mergeEscalationWorkflowState,
  normalizeEscalationWorkflowState,
  type EscalationWorkflowStatePatch,
} from "@/lib/escalation-workflow-state";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type EscalationStatePayload = {
  state?: EscalationWorkflowStatePatch;
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
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const compactMetadata = compactUserAuthMetadata(metadata);

    if (JSON.stringify(compactMetadata) !== JSON.stringify(metadata)) {
      await supabase.auth.updateUser({ data: compactMetadata }).catch((pruneError) => {
        console.error("Escalation state metadata prune error:", pruneError);
      });
    }

    return NextResponse.json({
      state: normalizeEscalationWorkflowState(metadata[escalationWorkflowStateMetadataKey]),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load escalation state";
    console.error("Escalation state load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as EscalationStatePayload;
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const currentState = normalizeEscalationWorkflowState(metadata[escalationWorkflowStateMetadataKey]);
    const nextState = mergeEscalationWorkflowState(currentState, payload.state || {});
    const compactMetadata = compactUserAuthMetadata(metadata);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...compactMetadata,
        [escalationWorkflowStateMetadataKey]: nextState,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ state: nextState });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save escalation state";
    console.error("Escalation state save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
