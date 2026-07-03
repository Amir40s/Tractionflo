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

function asStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeTacticName(value: unknown) {
  return asString(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getTacticsBeforePricing(sequence: string[]) {
  const pricingIndex = sequence.indexOf("present_pricing");

  if (pricingIndex <= 0) {
    return [];
  }

  return sequence.slice(0, pricingIndex).filter((tactic) => tactic !== "present_pricing");
}

function getDecisionTacticIntelligence(decision: RosRow) {
  const payload = asRecord(decision.payload);
  const camelTactic = asRecord(payload.tacticIntelligence);
  const snakeTactic = asRecord(payload.tactic_intelligence);
  const tactic = Object.keys(camelTactic).length > 0 ? camelTactic : snakeTactic;
  const sequence = uniqueStrings(asStringList(tactic.sequence).map(normalizeTacticName));
  const tactics = uniqueStrings([
    ...asStringList(tactic.tactics).map(normalizeTacticName),
    ...sequence,
  ]);
  const usedBeforePricing = uniqueStrings([
    ...asStringList(tactic.usedBeforePricing).map(normalizeTacticName),
    ...asStringList(tactic.used_before_pricing).map(normalizeTacticName),
    ...getTacticsBeforePricing(sequence),
  ]);
  const primaryTactic = normalizeTacticName(tactic.primaryTactic) || normalizeTacticName(tactic.primary_tactic) || tactics[0] || "";

  return {
    tactics,
    sequence,
    primaryTactic,
    usedBeforePricing,
    pricingPresented: Boolean(tactic.pricingPresented || tactic.pricing_presented || sequence.includes("present_pricing")),
  };
}

function getRowsForDecision(rows: RosRow[], decisionId: string) {
  return rows.filter((row: any) => asString(row.decision_id) === decisionId);
}

function isWonStatus(status: string) {
  return status === "won" || status === "completed" || status === "paid" || status === "success" || status === "succeeded";
}

function isLostStatus(status: string) {
  return status === "lost" || status === "cancelled" || status === "refunded" || status === "failed" || status === "expired";
}

function getWinRate(wins: number, losses: number) {
  const total = wins + losses;
  return total > 0 ? Math.round((wins / total) * 100) : 0;
}

function getDecisionResult(outcomes: RosRow[], events: RosRow[], decisionId: string) {
  const relatedRows = [...getRowsForDecision(outcomes, decisionId), ...getRowsForDecision(events, decisionId)];
  const winningRows = relatedRows.filter((row: any) => isWonStatus(asString(row.status)));
  const losingRows = relatedRows.filter((row: any) => isLostStatus(asString(row.status)));
  const status = winningRows.length > 0 ? "won" : losingRows.length > 0 ? "lost" : "";
  const valueRows = winningRows.length > 0 ? winningRows : relatedRows;

  return {
    status,
    value: valueRows.reduce((total, row) => total + asNumber(row.value), 0),
    outcomeType: asString(valueRows[0]?.outcome_type),
  };
}

function formatTacticLabel(tactic: string) {
  return tactic.replaceAll("_", " ");
}

type TacticStats = {
  label: string;
  decisions: number;
  wins: number;
  losses: number;
  value: number;
};

function addTacticStats(
  stats: Map<string, TacticStats>,
  key: string,
  label: string,
  result: ReturnType<typeof getDecisionResult>
) {
  const current = stats.get(key) || { label, decisions: 0, wins: 0, losses: 0, value: 0 };
  current.decisions += 1;
  current.wins += result.status === "won" ? 1 : 0;
  current.losses += result.status === "lost" ? 1 : 0;
  current.value += result.value;
  stats.set(key, current);
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
    const { error } = await (supabase as any).from("ros_strategy_adaptations").upsert(
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
    selectRows((supabase as any).from("ros_revenue_decisions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500)),
    selectRows((supabase as any).from("ros_revenue_outcomes").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(500)),
    selectRows((supabase as any).from("ros_conversion_events").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(500)),
  ]);
  const frameworkStats = new Map<string, { decisions: number; wins: number; losses: number; confidenceTotal: number }>();
  const outcomeStats = new Map<string, { outcomes: number; wins: number; losses: number; value: number }>();
  const objectionStats = new Map<string, { count: number; wins: number }>();
  const tacticStats = new Map<string, TacticStats>();
  let baselineWins = 0;
  let baselineLosses = 0;

  for (const decision of decisions) {
    const framework = getDecisionFramework(decision);
    const decisionId = asString(decision.id);
    const result = decisionId ? getDecisionResult(outcomes, events, decisionId) : { status: "", value: 0, outcomeType: "" };
    const wins = result.status === "won" ? 1 : 0;
    const losses = result.status === "lost" ? 1 : 0;
    const current = frameworkStats.get(framework) || { decisions: 0, wins: 0, losses: 0, confidenceTotal: 0 };
    current.decisions += 1;
    current.wins += wins;
    current.losses += losses;
    current.confidenceTotal += asNumber(decision.confidence);
    frameworkStats.set(framework, current);

    baselineWins += wins;
    baselineLosses += losses;

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

    const tacticIntelligence = getDecisionTacticIntelligence(decision);

    for (const tactic of tacticIntelligence.tactics) {
      addTacticStats(tacticStats, `tactic:${tactic}`, formatTacticLabel(tactic), result);
    }

    for (const tactic of tacticIntelligence.usedBeforePricing) {
      addTacticStats(
        tacticStats,
        `tactic_before_pricing:${tactic}`,
        `${formatTacticLabel(tactic)} before pricing`,
        result
      );
    }

    for (let index = 1; index < tacticIntelligence.sequence.length; index += 1) {
      const previous = tacticIntelligence.sequence[index - 1];
      const currentTactic = tacticIntelligence.sequence[index];

      if (previous && currentTactic) {
        addTacticStats(
          tacticStats,
          `tactic_sequence:${previous}->${currentTactic}`,
          `${formatTacticLabel(previous)} then ${formatTacticLabel(currentTactic)}`,
          result
        );
      }
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

  const baselineTotal = baselineWins + baselineLosses;
  const baselineWinRate = getWinRate(baselineWins, baselineLosses);

  if (baselineTotal >= 2) {
    for (const [strategyKey, stats] of tacticStats.entries()) {
      const total = stats.wins + stats.losses;

      if (total < 2) {
        continue;
      }

      const winRate = getWinRate(stats.wins, stats.losses);
      const lift = winRate - baselineWinRate;
      const absoluteLift = Math.abs(lift);
      const sequencePrefix = strategyKey.startsWith("tactic_sequence:")
        ? "Sequence"
        : strategyKey.startsWith("tactic_before_pricing:")
          ? "Use"
          : "Use";
      const recommendation = lift > 0
        ? `${sequencePrefix} ${stats.label} when relevant; it is converting ${lift} percentage points above this creator's baseline (${winRate}% vs ${baselineWinRate}%).`
        : lift < 0
          ? `Use ${stats.label} carefully; it is converting ${absoluteLift} percentage points below this creator's baseline (${winRate}% vs ${baselineWinRate}%).`
          : `Use ${stats.label} when relevant; it is matching this creator's baseline conversion rate (${winRate}%).`;

      adaptations.push({
        strategyKey,
        outcomeType: "",
        framework: "Revenue Learning Engine",
        recommendation,
        confidence: Math.max(25, Math.min(95, 45 + Math.min(20, total * 5) + Math.min(25, absoluteLift))),
        evidence: {
          ...stats,
          total,
          winRate,
          baselineWinRate,
          lift,
          baselineWins,
          baselineLosses,
        },
      });
    }
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
    (supabase as any)
      .from("ros_strategy_adaptations")
      .select("*")
      .eq("user_id", userId)
      .order("confidence", { ascending: false })
      .limit(limit)
  );

  return rows.map((row: any) => ({
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
