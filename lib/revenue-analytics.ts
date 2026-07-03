import type { createSupabaseServiceClient } from "@/lib/supabase";
import { listKnowledgeSourceIndexes, type KnowledgeSourceIndex } from "@/lib/knowledge-base";
import { refreshRevenueLearningModel } from "@/lib/revenue-learning";
import type { RevenueOutcomeProviderSettings } from "@/lib/revenue-outcome-providers";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type RosRow = Record<string, unknown>;

export type RosConversionPath = {
  id: string;
  label: string;
  probability: number;
  pending: number;
  completed: number;
  value: number;
};

export type RosRecommendation = {
  title: string;
  detail: string;
  priority: "High" | "Medium" | "Low";
};

export type RosBusinessProfile = {
  products: string[];
  services: string[];
  pricing: Record<string, unknown>;
  guarantees: string[];
  policies: string[];
  brandVoice: Record<string, unknown>;
  offers: string[];
  successStories: string[];
  sourceSummary: string;
  confidence: number;
};

export type RevenueOperatingSummary = {
  tableReady: boolean;
  warnings: string[];
  metrics: {
    prospects: number;
    hotProspects: number;
    decisions: number;
    averageConfidence: number;
    pendingOutcomes: number;
    wonRevenue: number;
    pipelineValue: number;
    conversionEvents: number;
  };
  businessProfile: RosBusinessProfile;
  conversionPaths: RosConversionPath[];
  recommendations: RosRecommendation[];
  recentDecisions: RosRow[];
  recentProspects: RosRow[];
  recentOutcomes: RosRow[];
  recentEvents: RosRow[];
  learningSummary: {
    summary: string;
    conversionPatterns: RosRow[];
    objections: RosRow[];
    recommendations: RosRecommendation[];
    metrics: Record<string, unknown>;
    strategyAdaptations: RosRow[];
    computedAt: string;
  };
};

const outcomeLabels: Record<string, string> = {
  follow_creator: "Follow creator",
  join_newsletter: "Join newsletter",
  book_call: "Book call",
  start_trial: "Start trial",
  purchase_product: "Purchase product",
  upgrade_plan: "Upgrade plan",
  recover_abandoned_cart: "Recover cart",
  renew_subscription: "Renew subscription",
  collect_testimonial: "Collect testimonial",
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
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeRows(value: unknown): RosRow[] {
  return Array.isArray(value) ? value.filter((item): item is RosRow => Boolean(item && typeof item === "object")) : [];
}

async function selectRows(
  label: string,
  warnings: string[],
  query: PromiseLike<{ data: unknown; error: unknown }>
) {
  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) {
      warnings.push(`${label} table is not ready.`);
      return [];
    }

    throw error;
  }

  return normalizeRows(data);
}

const knowledgeFieldLabels = [
  "Product name",
  "Service name",
  "Plan or package",
  "Business name",
  "Knowledge Base Category",
  "Category",
  "Price",
  "Pricing",
  "Description",
  "What is included",
  "Payment methods",
  "Deposit or advance payment",
  "Delivery charges",
  "Refund or exchange note",
  "Location",
  "Opening hours",
  "Contact",
  "Offer",
  "Discount",
  "Bonus",
];

function normalizeInsightFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(yes|please|share|provide|customer|customers|can|will|also|the|and|with|for|your|our|their|this|that)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanInsightText(value: string, maxLength = 150) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^(yes|sure|please)[,.\s]+/i, "")
    .replace(/^manual update:\s*/i, "")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function uniqueStrings(values: string[], limit = 8) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const cleaned = cleanInsightText(value);
    const fingerprint = normalizeInsightFingerprint(cleaned);

    if (!cleaned || !fingerprint || seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    unique.push(cleaned);

    if (unique.length >= limit) {
      break;
    }
  }

  return unique;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getKnowledgeField(text: string, label: string) {
  const otherLabels = knowledgeFieldLabels.filter((item) => item !== label).map(escapeRegExp).join("|");
  const pattern = new RegExp(`${escapeRegExp(label)}\\s*:\\s*([\\s\\S]*?)(?=\\s+(?:${otherLabels})\\s*:|$)`, "i");
  const match = text.match(pattern);

  return cleanInsightText(match?.[1] || "", 120);
}

function getSentenceMatches(text: string, pattern: RegExp) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8 && pattern.test(sentence))
    .map((sentence) => cleanInsightText(sentence, 140));
}

function collectKnowledgeFacts(sources: KnowledgeSourceIndex[], pattern: RegExp, fields: string[], limit = 8) {
  const facts: string[] = [];

  for (const source of sources) {
    const sourceText = [
      source.title,
      ...source.categories,
      ...source.qaPairs.flatMap((pair) => [pair.question, pair.answer]),
      ...source.chunks.map((chunk) => chunk.text),
    ].join("\n");

    if (!pattern.test(sourceText)) {
      continue;
    }

    for (const text of [source.title, ...source.qaPairs.map((pair) => pair.answer), ...source.chunks.map((chunk) => chunk.text)]) {
      const normalizedText = text.replace(/\s+/g, " ").trim();

      for (const field of fields) {
        const value = getKnowledgeField(normalizedText, field);

        if (value) {
          facts.push(value);
        }
      }

      facts.push(...getSentenceMatches(normalizedText, pattern));
    }
  }

  return uniqueStrings(facts, limit);
}

function buildBusinessProfileFromKnowledge(sources: KnowledgeSourceIndex[]): RosBusinessProfile {
  const activeSources = sources.filter((source) => source.active !== false);
  const products = collectKnowledgeFacts(
    activeSources,
    /\b(product|products|package|course|program|plan|kit|item|collection|catalog)\b/i,
    ["Product name", "Plan or package"],
    6
  );
  const services = collectKnowledgeFacts(
    activeSources,
    /\b(service|services|coaching|consult|booking|call|session|done for you|styling|recommendation)\b/i,
    ["Service name", "What is included"],
    6
  );
  const pricingLines = collectKnowledgeFacts(
    activeSources,
    /\b(price|pricing|cost|fee|\$|usd|pkr|rs|payment|deposit|checkout)\b/i,
    ["Price", "Pricing", "Payment methods", "Deposit or advance payment"],
    6
  );
  const guarantees = collectKnowledgeFacts(
    activeSources,
    /\b(guarantee|refund|warranty|risk[- ]free|exchange|return)\b/i,
    ["Refund or exchange note"],
    5
  );
  const policies = collectKnowledgeFacts(
    activeSources,
    /\b(policy|policies|cancel|reschedule|terms|delivery|shipping|hours|location)\b/i,
    ["Delivery charges", "Location", "Opening hours"],
    6
  );
  const offers = collectKnowledgeFacts(
    activeSources,
    /\b(offer|bonus|discount|deal|checkout|trial|newsletter|testimonial|bundle|occasion)\b/i,
    ["Offer", "Discount", "Bonus", "Product name", "Plan or package"],
    6
  );
  const sourceTitles = activeSources.map((source) => source.title).slice(0, 5);
  const confidence = Math.min(100, Math.max(20, activeSources.length * 18 + pricingLines.length * 6 + products.length * 4));

  return {
    products,
    services,
    pricing: {
      detected: pricingLines,
      sourceCount: activeSources.length,
    },
    guarantees,
    policies,
    brandVoice: {
      style: "Use the creator's saved knowledge, concise DM language, and conversion-focused CTAs.",
      sources: sourceTitles,
    },
    offers,
    successStories: collectKnowledgeFacts(activeSources, /\b(case study|testimonial|result|success|before|after)\b/i, ["Description"], 5),
    sourceSummary:
      activeSources.length > 0
        ? `${activeSources.length} knowledge source${activeSources.length === 1 ? "" : "s"} indexed: ${sourceTitles.join(", ")}`
        : "No knowledge source has been indexed yet.",
    confidence,
  };
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function getBusinessProfileFromRow(row: RosRow | undefined): RosBusinessProfile | null {
  if (!row) {
    return null;
  }

  return {
    products: normalizeStringList(row.products),
    services: normalizeStringList(row.services),
    pricing: asRecord(row.pricing),
    guarantees: normalizeStringList(row.guarantees),
    policies: normalizeStringList(row.policies),
    brandVoice: asRecord(row.brand_voice),
    offers: normalizeStringList(row.offers),
    successStories: normalizeStringList(row.success_stories),
    sourceSummary: asString(row.source_summary),
    confidence: asNumber(row.confidence),
  };
}

async function loadExistingBusinessProfile(
  supabase: SupabaseServiceClient,
  userId: string,
  warnings: string[]
) {
  const rows = await selectRows(
    "Business profile",
    warnings,
    supabase.from("ros_business_profiles").select("*").eq("user_id", userId).limit(1)
  );

  return getBusinessProfileFromRow(rows[0]);
}

async function upsertBusinessProfile(
  supabase: SupabaseServiceClient,
  userId: string,
  profile: RosBusinessProfile,
  warnings: string[]
) {
  const { error } = await (supabase.from("ros_business_profiles") as any).upsert(
    {
      user_id: userId,
      products: profile.products,
      services: profile.services,
      pricing: profile.pricing,
      guarantees: profile.guarantees,
      policies: profile.policies,
      brand_voice: profile.brandVoice,
      offers: profile.offers,
      success_stories: profile.successStories,
      source_summary: profile.sourceSummary,
      confidence: profile.confidence,
      last_extracted_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      warnings.push("Business profile table is not ready.");
      return;
    }

    throw error;
  }
}

function buildConversionPaths(
  decisions: RosRow[],
  outcomes: RosRow[],
  outcomeProviders: RevenueOutcomeProviderSettings | undefined
): RosConversionPath[] {
  const probabilities: Record<string, number[]> = {};

  for (const decision of decisions) {
    const outcomeProbabilities = asRecord(decision.outcome_probabilities);

    for (const [key, value] of Object.entries(outcomeProbabilities)) {
      probabilities[key] = [...(probabilities[key] || []), asNumber(value)];
    }
  }

  const activeKeys = new Set<string>([
    ...Object.keys(probabilities),
    ...outcomes.map((o) => asString(o.outcome_type)).filter(Boolean),
  ]);

  return Array.from(activeKeys)
    .filter((id) => {
      // Always exclude unknown dummy paths if they aren't part of the default outcome labels
      if (!outcomeLabels[id]) return false;

      // Ensure this provider is actually enabled by the user in settings
      const provider = outcomeProviders?.providers?.find((p) => p.outcomeType === id);
      return provider ? provider.enabled : false;
    })
    .map((id) => {
      const label = outcomeLabels[id] || id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
      const relatedOutcomes = outcomes.filter((outcome) => asString(outcome.outcome_type) === id);
      const completed = relatedOutcomes.filter((outcome) => ["won", "completed"].includes(asString(outcome.status))).length;
      const pending = relatedOutcomes.filter((outcome) => asString(outcome.status) === "pending").length;
      const value = relatedOutcomes.reduce((total, outcome) => total + asNumber(outcome.value), 0);
      const probabilityScores = probabilities[id] || [];
      const probability =
        probabilityScores.length > 0
          ? Math.round(probabilityScores.reduce((total, score) => total + score, 0) / probabilityScores.length)
          : 0;

      return {
        id,
        label,
        probability,
        pending,
        completed,
        value,
      };
    })
    .sort((a, b) => b.probability - a.probability);
}

function countByValue(rows: RosRow[], key: string) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const value = asString(row[key]) || "Unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((first, second) => second.count - first.count);
}

function getPayloadObjections(decisions: RosRow[]) {
  const objections = new Map<string, number>();

  for (const decision of decisions) {
    const payload = asRecord(decision.payload);
    const conversation = asRecord(payload.conversationIntelligence);
    const revenue = asRecord(payload.revenueIntelligence);
    const objection = asString(conversation.objection) || asString(revenue.objection);

    if (objection && objection !== "none") {
      objections.set(objection, (objections.get(objection) || 0) + 1);
    }
  }

  return Array.from(objections.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((first, second) => second.count - first.count);
}

function buildRecommendations({
  prospects,
  decisions,
  outcomes,
  conversionPaths,
}: {
  prospects: RosRow[];
  decisions: RosRow[];
  outcomes: RosRow[];
  conversionPaths: RosConversionPath[];
}): RosRecommendation[] {
  const recommendations: RosRecommendation[] = [];
  const pendingPurchases = outcomes.filter(
    (outcome) => asString(outcome.outcome_type) === "purchase_product" && asString(outcome.status) === "pending"
  ).length;
  const topObjection = getPayloadObjections(decisions)[0];
  const bestPath = [...conversionPaths].sort((first, second) => second.probability - first.probability)[0];
  const hotProspects = prospects.filter((prospect) => asNumber(prospect.last_confidence) >= 75).length;

  if (pendingPurchases > 0) {
    recommendations.push({
      title: "Follow up on pending checkouts",
      detail: `${pendingPurchases} purchase outcome${pendingPurchases === 1 ? "" : "s"} still need confirmation, payment, or recovery.`,
      priority: "High",
    });
  }

  if (topObjection?.value) {
    recommendations.push({
      title: `Handle ${topObjection.value} earlier`,
      detail: `${topObjection.count} recent decision${topObjection.count === 1 ? "" : "s"} included this objection. Add proof, guarantee, or a smaller next step before pricing.`,
      priority: topObjection.count >= 3 ? "High" : "Medium",
    });
  }

  if (bestPath?.probability) {
    recommendations.push({
      title: `Prioritize ${bestPath.label.toLowerCase()}`,
      detail: `ROS currently rates this path at ${bestPath.probability}/100 based on recent decisions.`,
      priority: bestPath.probability >= 80 ? "High" : "Medium",
    });
  }

  if (hotProspects > 0) {
    recommendations.push({
      title: "Review hot prospects daily",
      detail: `${hotProspects} prospect${hotProspects === 1 ? "" : "s"} have high readiness or decision confidence.`,
      priority: "Medium",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Collect more revenue events",
      detail: "Keep AI takeover running so ROS can learn from decisions, confirmations, payments, and missed opportunities.",
      priority: "Low",
    });
  }

  return recommendations.slice(0, 5);
}

async function upsertLearningSummary(
  supabase: SupabaseServiceClient,
  userId: string,
  summary: RevenueOperatingSummary["learningSummary"],
  warnings: string[]
) {
  const { error } = await (supabase.from("ros_learning_summaries") as any).upsert(
    {
      user_id: userId,
      summary: summary.summary,
      conversion_patterns: summary.conversionPatterns,
      objections: summary.objections,
      recommendations: summary.recommendations,
      metrics: summary.metrics,
      computed_at: summary.computedAt,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      warnings.push("Learning summary table is not ready.");
      return;
    }

    throw error;
  }
}

export async function buildRevenueOperatingSummary({
  supabase,
  userId,
  outcomeProviders,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  outcomeProviders?: RevenueOutcomeProviderSettings;
}): Promise<RevenueOperatingSummary> {
  const warnings: string[] = [];
  const [prospects, decisions, outcomes, events] = await Promise.all([
    selectRows(
      "Prospects",
      warnings,
      supabase.from("ros_prospects").select("*").eq("user_id", userId).order("last_seen_at", { ascending: false }).limit(50)
    ),
    selectRows(
      "Decisions",
      warnings,
      supabase.from("ros_revenue_decisions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(75)
    ),
    selectRows(
      "Outcomes",
      warnings,
      supabase.from("ros_revenue_outcomes").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(75)
    ),
    selectRows(
      "Conversion events",
      warnings,
      supabase.from("ros_conversion_events").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(75)
    ),
  ]);
  const sources = await listKnowledgeSourceIndexes(supabase, userId).catch(() => []);
  const existingBusinessProfile = sources.length === 0 ? await loadExistingBusinessProfile(supabase, userId, warnings) : null;
  const businessProfile = existingBusinessProfile || buildBusinessProfileFromKnowledge(sources);

  if (!existingBusinessProfile || sources.length > 0) {
    await upsertBusinessProfile(supabase, userId, businessProfile, warnings);
  }

  const conversionPaths = buildConversionPaths(decisions, outcomes, outcomeProviders);
  const averageConfidence =
    decisions.length > 0
      ? Math.round(decisions.reduce((total, decision) => total + asNumber(decision.confidence), 0) / decisions.length)
      : 0;
  const wonRevenue = outcomes
    .filter((outcome) => ["won", "completed"].includes(asString(outcome.status)))
    .reduce((total, outcome) => total + asNumber(outcome.value), 0);
  const pipelineValue = outcomes
    .filter((outcome) => asString(outcome.status) === "pending")
    .reduce((total, outcome) => total + asNumber(outcome.value), 0);
  const metrics = {
    prospects: prospects.length,
    hotProspects: prospects.filter((prospect) => asNumber(prospect.last_confidence) >= 75 || asString(prospect.readiness) === "high").length,
    decisions: decisions.length,
    averageConfidence,
    pendingOutcomes: outcomes.filter((outcome) => asString(outcome.status) === "pending").length,
    wonRevenue,
    pipelineValue,
    conversionEvents: events.length,
  };
  const recommendations = buildRecommendations({ prospects, decisions, outcomes, conversionPaths });
  const strategyAdaptations = await refreshRevenueLearningModel({ supabase, userId }).catch(() => []);
  const objections = getPayloadObjections(decisions);
  const conversionPatterns = countByValue(events, "event_type");
  const computedAt = new Date().toISOString();
  const learningSummary = {
    summary:
      decisions.length > 0
        ? `ROS analyzed ${decisions.length} decision${decisions.length === 1 ? "" : "s"}, ${outcomes.length} outcome${outcomes.length === 1 ? "" : "s"}, and ${events.length} conversion event${events.length === 1 ? "" : "s"}.`
        : "ROS is ready. It will learn once conversations create decisions and outcomes.",
    conversionPatterns,
    objections,
    recommendations,
    metrics,
    strategyAdaptations,
    computedAt,
  };

  await upsertLearningSummary(supabase, userId, learningSummary, warnings);

  return {
    tableReady: warnings.length === 0,
    warnings,
    metrics,
    businessProfile,
    conversionPaths,
    recommendations,
    recentDecisions: decisions.slice(0, 12),
    recentProspects: prospects.slice(0, 12),
    recentOutcomes: outcomes.slice(0, 12),
    recentEvents: events.slice(0, 12),
    learningSummary,
  };
}
