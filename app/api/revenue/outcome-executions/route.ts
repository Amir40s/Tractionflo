import { NextResponse } from "next/server";
import type { RevenueOperatingSnapshot } from "@/lib/revenue-intelligence";
import { buildRevenueOutcomeAction } from "@/lib/revenue-outcome-actions";
import { executeRevenueOutcomeProvider, loadRevenueOutcomeProviderSettings } from "@/lib/revenue-provider-execution";
import { revenueOutcomeProvidersMetadataKey } from "@/lib/revenue-outcome-providers";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildManualExecutionSnapshot(outcomeType: string, metadata: Record<string, unknown>): RevenueOperatingSnapshot {
  return {
    conversationIntelligence: {
      intent: outcomeType,
      sentiment: "neutral",
      emotion: "",
      objection: "",
      buyingSignal: "",
      urgencySignal: "",
      stage: "manual execution",
      questions: [],
      signals: [],
    },
    buyerIntelligence: {
      goal: "",
      problem: "",
      budget: "",
      authority: "",
      need: "",
      timeline: "",
      behavior: "",
      readiness: "",
      missing: [],
    },
    revenueIntelligence: {
      framework: "",
      method: "execute_outcome",
      nextQuestion: "",
      objection: "",
      salesStage: "manual execution",
      recommendation: getString(metadata.bestNextAction),
    },
    outcomeProbabilities: {
      [outcomeType]: Number(metadata.probability) || 0,
    },
    decision: {
      bestNextAction: getString(metadata.bestNextAction),
      confidence: Number(metadata.probability) || 0,
      rationale: "Manual provider execution for a stored ROS outcome.",
    },
    memory: {
      objections: [],
      questionsAsked: [],
      offersPresented: [],
      followUpNeeded: false,
    },
  };
}

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error,
    } = await authSupabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const { data, error: listError } = await supabase
      .from("ros_outcome_executions")
      .select("*")
      .eq("user_id", user.id)
      .order("attempted_at", { ascending: false })
      .limit(50);

    if (listError) {
      throw listError;
    }

    return NextResponse.json({ executions: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load outcome executions";
    console.error("Revenue outcome executions load error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error,
    } = await authSupabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as { outcomeId?: unknown };
    const outcomeId = getString(payload.outcomeId);

    if (!outcomeId) {
      return NextResponse.json({ error: "outcomeId is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { data: outcome, error: outcomeError } = await supabase
      .from("ros_revenue_outcomes")
      .select("*")
      .eq("id", outcomeId)
      .eq("user_id", user.id)
      .single();

    if (outcomeError) {
      throw outcomeError;
    }

    const metadata = isRecord(outcome.metadata) ? outcome.metadata : {};
    const actionMetadata = isRecord(metadata.outcomeAction) ? metadata.outcomeAction : {};
    const outcomeType = getString(outcome.outcome_type);
    const action = buildRevenueOutcomeAction(buildManualExecutionSnapshot(outcomeType, metadata), outcomeType);
    const providerSettings = await loadRevenueOutcomeProviderSettings({
      supabase,
      userId: user.id,
      metadataValue: (user.user_metadata || {})[revenueOutcomeProvidersMetadataKey],
    });
    const result = await executeRevenueOutcomeProvider({
      supabase,
      userId: user.id,
      prospectId: getString(outcome.prospect_id),
      decisionId: getString(outcome.decision_id),
      outcomeId,
      conversationId: getString(outcome.conversation_id),
      action: {
        ...action,
        ...actionMetadata,
        outcomeType: action.outcomeType,
      },
      providerSettings,
      source: "manual_outcome_execution",
      autoOnly: false,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not execute outcome";
    console.error("Revenue outcome execution error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
