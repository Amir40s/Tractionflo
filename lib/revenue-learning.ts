import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type RosRow = Record<string, unknown>;

export type RevenueStrategyAdaptation = {
  strategyKey: string;
  outcomeType: string;
  framework: string;
  recommendation: string;
  confidence: number;
  evidence: Record<string, unknown>;
};

function isMissingTableError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("does not exist") || message.includes("schema cache") || message.includes("not found");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeRows(value: unknown): RosRow[] {
  return Array.isArray(value) ? value.filter((item): item is RosRow => Boolean(item && typeof item === "object")) : [];
}

function getDecisionFramework(decision: RosRow) {
  const payload = asRecord(decision.payload);
  const revenue = asRecord(payload.revenueIntelligence);
  return asString(revenue.framework) || "Unknown";
}

function getDecisionOutcome(outcomes: RosRow[], decisionId: string) {
  return outcomes.filter((outcome) => asString(outcome.decision_id) === decisionId);
}

function isWonStatus(status: string) {
  return status === "won" || status === "completed";
}

function isLostStatus(status: string) {
  return status === "lost" || status === "cancelled" || status === "refunded";
}

function getWinRate(wins: number, losses: number) {
  const total = wins + losses;
  return total > 0 ? Math.round((wins / total) * 100) : 0;
}

async function selectRows(query: PromiseLike<{ data: unknown; error: unknown }>) {
  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw error;
  }

  return normalizeRows(data);
}

async function upsertAdaptations(
  supabase: SupabaseServiceClient,
  userId: string,
  adaptations: RevenueStrategyAdaptation[]
) {
  for (const adaptation of adaptations) {
    const { error } = await supabase.from("ros_strategy_adaptations").upsert(
      {
        user_id: userId,
        strategy_key: adaptation.strategyKey,
        outcome_type: adaptation.outcomeType || null,
        framework: adaptation.framework || null,
        recommendation: adaptation.recommendation,
        confidence: adaptation.confidence,
        evidence: adaptation.evidence,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,strategy_key" }
    );

    if (error && !isMissingTableError(error)) {
      throw error;
    }
  }
}

export async function refreshRevenueLearningModel({
  supabase,
  userId,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
}) {
  const [decisions, outcomes, events] = await Promise.all([
    selectRows(supabase.from("ros_revenue_decisions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500)),
    selectRows(supabase.from("ros_revenue_outcomes").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(500)),
    selectRows(supabase.from("ros_conversion_events").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(500)),
  ]);
  const frameworkStats = new Map<string, { decisions: number; wins: number; losses: number; confidenceTotal: number }>();
  const outcomeStats = new Map<string, { outcomes: number; wins: number; losses: number; value: number }>();
  const objectionStats = new Map<string, { count: number; wins: number }>();

  for (const decision of decisions) {
    const framework = getDecisionFramework(decision);
    const decisionId = asString(decision.id);
    const relatedOutcomes = decisionId ? getDecisionOutcome(outcomes, decisionId) : [];
    const wins = relatedOutcomes.filter((outcome) => isWonStatus(asString(outcome.status))).length;
    const losses = relatedOutcomes.filter((outcome) => isLostStatus(asString(outcome.status))).length;
    const current = frameworkStats.get(framework) || { decisions: 0, wins: 0, losses: 0, confidenceTotal: 0 };
    current.decisions += 1;
    current.wins += wins;
    current.losses += losses;
    current.confidenceTotal += asNumber(decision.confidence);
    frameworkStats.set(framework, current);

    const payload = asRecord(decision.payload);
    const conversation = asRecord(payload.conversationIntelligence);
    const revenue = asRecord(payload.revenueIntelligence);
    const objection = asString(conversation.objection) || asString(revenue.objection);

    if (objection) {
      const objectionCurrent = objectionStats.get(objection) || { count: 0, wins: 0 };
      objectionCurrent.count += 1;
      objectionCurrent.wins += wins;
      objectionStats.set(objection, objectionCurrent);
    }
  }

  for (const outcome of outcomes) {
    const outcomeType = asString(outcome.outcome_type) || "unknown";
    const status = asString(outcome.status);
    const current = outcomeStats.get(outcomeType) || { outcomes: 0, wins: 0, losses: 0, value: 0 };
    current.outcomes += 1;
    current.wins += isWonStatus(status) ? 1 : 0;
    current.losses += isLostStatus(status) ? 1 : 0;
    current.value += asNumber(outcome.value);
    outcomeStats.set(outcomeType, current);
  }

  const adaptations: RevenueStrategyAdaptation[] = [];

  for (const [framework, stats] of frameworkStats.entries()) {
    if (stats.decisions < 2) {
      continue;
    }

    const winRate = getWinRate(stats.wins, stats.losses);
    const averageConfidence = Math.round(stats.confidenceTotal / stats.decisions);
    adaptations.push({
      strategyKey: `framework:${framework.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      outcomeType: "",
      framework,
      recommendation:
        stats.wins > stats.losses
          ? `Lean into ${framework} when matching conversations appear; recent outcomes show a ${winRate}% win rate.`
          : `Use ${framework} carefully and add more proof or qualification before closing; recent win rate is ${winRate}%.`,
      confidence: Math.max(25, Math.min(95, Math.round((averageConfidence + winRate) / 2))),
      evidence: stats,
    });
  }

  for (const [outcomeType, stats] of outcomeStats.entries()) {
    if (stats.outcomes < 2) {
      continue;
    }

    const winRate = getWinRate(stats.wins, stats.losses);
    adaptations.push({
      strategyKey: `outcome:${outcomeType}`,
      outcomeType,
      framework: "",
      recommendation:
        stats.wins > stats.losses
          ? `Prioritize ${outcomeType.replaceAll("_", " ")} when buyer signals fit; this path is converting at ${winRate}%.`
          : `Route ${outcomeType.replaceAll("_", " ")} through more nurturing before pushing the action; this path needs stronger qualification.`,
      confidence: Math.max(20, Math.min(95, winRate || stats.outcomes * 10)),
      evidence: stats,
    });
  }

  for (const [objection, stats] of objectionStats.entries()) {
    if (stats.count < 2) {
      continue;
    }

    adaptations.push({
      strategyKey: `objection:${objection.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      outcomeType: "",
      framework: "Challenger",
      recommendation: `When ${objection} appears, address it earlier with proof, guarantee, or a smaller next step before repeating the CTA.`,
      confidence: Math.max(30, Math.min(90, stats.count * 12 + stats.wins * 8)),
      evidence: stats,
    });
  }

  if (events.length >= 10) {
    adaptations.push({
      strategyKey: "cadence:conversion_volume",
      outcomeType: "",
      framework: "",
      recommendation: `Use recent conversion data aggressively; ${events.length} conversion events are available for this creator.`,
      confidence: Math.min(95, 55 + events.length),
      evidence: { conversionEvents: events.length },
    });
  }

  const ranked = adaptations.sort((first, second) => second.confidence - first.confidence).slice(0, 20);
  await upsertAdaptations(supabase, userId, ranked);

  return ranked;
}

export async function listRevenueStrategyAdaptations({
  supabase,
  userId,
  limit = 8,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  limit?: number;
}) {
  const rows = await selectRows(
    supabase
      .from("ros_strategy_adaptations")
      .select("*")
      .eq("user_id", userId)
      .order("confidence", { ascending: false })
      .limit(limit)
  );

  return rows.map((row) => ({
    strategyKey: asString(row.strategy_key),
    outcomeType: asString(row.outcome_type),
    framework: asString(row.framework),
    recommendation: asString(row.recommendation),
    confidence: asNumber(row.confidence),
    evidence: asRecord(row.evidence),
  }));
}

export async function formatRevenueLearningForPrompt({
  supabase,
  userId,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
}) {
  let adaptations = await listRevenueStrategyAdaptations({ supabase, userId, limit: 6 });

  if (adaptations.length === 0) {
    adaptations = await refreshRevenueLearningModel({ supabase, userId });
  }

  return adaptations
    .slice(0, 6)
    .map((adaptation) => `- ${adaptation.recommendation} Confidence: ${adaptation.confidence}/100.`)
    .join("\n");
}
