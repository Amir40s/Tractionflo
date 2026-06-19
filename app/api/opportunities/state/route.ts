import { NextResponse } from "next/server";
import {
  mergeOpportunityWorkflowState,
  normalizeOpportunityWorkflowState,
  opportunityWorkflowStateMetadataKey,
  type OpportunityWorkflowStatePatch,
} from "@/lib/opportunity-workflow-state";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type OpportunityStatePayload = {
  state?: OpportunityWorkflowStatePatch;
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;

    return NextResponse.json({
      state: normalizeOpportunityWorkflowState(metadata[opportunityWorkflowStateMetadataKey]),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load lead state";
    console.error("Lead state load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as OpportunityStatePayload;
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const currentState = normalizeOpportunityWorkflowState(metadata[opportunityWorkflowStateMetadataKey]);
    const nextState = mergeOpportunityWorkflowState(currentState, payload.state || {});
    const { error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        [opportunityWorkflowStateMetadataKey]: nextState,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ state: nextState });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save lead state";
    console.error("Lead state save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
