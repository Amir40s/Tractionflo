import type { createSupabaseServiceClient } from "@/lib/supabase";
import type { ConversationEscalation } from "@/lib/conversation-escalation";
import { buildRevenueOutcomeAction } from "@/lib/revenue-outcome-actions";
import type { RevenueOutcomeProviderSettings } from "@/lib/revenue-outcome-providers";
import { executeRevenueOutcomeProvider } from "@/lib/revenue-provider-execution";
import { recordPlatformAnalyticsEvent } from "@/lib/platform-analytics";
import { refreshRevenueLearningModel } from "@/lib/revenue-learning";
import { createSupportTicket } from "@/lib/support-tickets";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type RosParticipant = {
  id?: string;
  name?: string;
  username?: string;
};

type RosMessage = {
  from?: "me" | "user" | "note";
  text?: string;
};

type RosLeadSnapshot = {
  score: number;
  stage: string;
  urgency: "Low" | "Medium" | "High";
  intent: string;
  summary: string;
  signals: string[];
  missing: string[];
  recommendedAction: string;
  cta: string;
};

export type RevenueOperatingSnapshot = {
  conversationIntelligence: {
    intent: string;
    sentiment: string;
    emotion: string;
    objection: string;
    buyingSignal: string;
    urgencySignal: string;
    stage: string;
    questions: string[];
    signals: string[];
  };
  buyerIntelligence: {
    goal: string;
    problem: string;
    budget: string;
    authority: string;
    need: string;
    timeline: string;
    behavior: string;
    readiness: string;
    missing: string[];
  };
  revenueIntelligence: {
    framework: string;
    method: string;
    nextQuestion: string;
    objection: string;
    salesStage: string;
    recommendation: string;
  };
  tacticIntelligence: {
    tactics: string[];
    sequence: string[];
    primaryTactic: string;
    usedBeforePricing: string[];
    pricingPresented: boolean;
  };
  outcomeProbabilities: Record<string, number>;
  decision: {
    bestNextAction: string;
    confidence: number;
    rationale: string;
  };
  memory: {
    objections: string[];
    questionsAsked: string[];
    offersPresented: string[];
    followUpNeeded: boolean;
  };
  layerStatuses?: {
    layer1: "pending" | "in_progress" | "completed";
    layer2: "pending" | "in_progress" | "completed";
    layer3: "pending" | "in_progress" | "completed";
    layer4: "pending" | "in_progress" | "completed";
    layer5: "pending" | "in_progress" | "completed";
    layer6: "pending" | "in_progress" | "completed";
    layer7: "pending" | "in_progress" | "completed";
    layer8: "pending" | "in_progress" | "completed";
    layer9: "pending" | "in_progress" | "completed";
  };
};

export type RevenueBuyerIntelligence = RevenueOperatingSnapshot["buyerIntelligence"];
export type RevenueMemory = RevenueOperatingSnapshot["memory"];
export type RevenueTacticIntelligence = RevenueOperatingSnapshot["tacticIntelligence"];

export type RevenueMemoryContext = {
  memory: RevenueMemory;
  lastObjection: string;
  lastBestNextAction: string;
  recentConversationHistory: string[];
  recentOutcomes: string[];
  recentPurchases: string[];
  followUpHistory: string[];
  preferences: string[];
};

export type PersistRevenueOperatingSnapshotParams = {
  supabase: SupabaseServiceClient;
  userId: string;
  participant?: RosParticipant;
  conversationId?: string;
  messages?: RosMessage[];
  snapshot: RevenueOperatingSnapshot;
  escalation?: ConversationEscalation | null;
  outcomeProviders?: RevenueOutcomeProviderSettings;
  source?: string;
  reply?: string;
  starter?: string;
  lead?: any;
};

export type RosCommerceOrderLike = {
  id?: string;
  userId?: string;
  instagramSenderId?: string;
  conversationId?: string | null;
  productTitle?: string;
  amount?: number | null;
  currency?: string | null;
  status?: string;
  paymentStatus?: string;
  metadata?: Record<string, unknown> | null;
};

export type RecordRevenueConversionEventParams = {
  supabase: SupabaseServiceClient;
  userId: string;
  instagramSenderId?: string;
  conversationId?: string | null;
  eventType: string;
  outcomeType: string;
  status?: "recorded" | "pending" | "completed" | "won" | "lost" | "failed" | "cancelled" | "refunded";
  value?: number | null;
  currency?: string | null;
  commerceOrder?: RosCommerceOrderLike | null;
  metadata?: Record<string, unknown>;
};

const defaultOutcomeKeys = [
  "follow_creator",
  "join_newsletter",
  "book_call",
  "start_trial",
  "purchase_product",
  "upgrade_plan",
  "recover_abandoned_cart",
  "renew_subscription",
  "collect_testimonial",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function pickValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return undefined;
}

function normalizeText(value: unknown, fallback = "", maxLength = 500) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeScore(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 8);
}

function getEmptyBuyerIntelligence(): RevenueBuyerIntelligence {
  return {
    goal: "",
    problem: "",
    budget: "",
    authority: "",
    need: "",
    timeline: "",
    behavior: "",
    readiness: "",
    missing: [],
  };
}

function normalizeBuyerText(value: unknown, fallback = "", maxLength = 500) {
  const normalized = normalizeText(value, "", maxLength);
  const emptyLike = /^(unknown|none|n\/a|na|not provided|not known|empty string|null|undefined)$/i;
  return normalized && !emptyLike.test(normalized) ? normalized : fallback;
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

function getEmptyRevenueMemory(): RevenueMemory {
  return {
    objections: [],
    questionsAsked: [],
    offersPresented: [],
    followUpNeeded: false,
  };
}

function getEmptyRevenueTacticIntelligence(): RevenueTacticIntelligence {
  return {
    tactics: [],
    sequence: [],
    primaryTactic: "",
    usedBeforePricing: [],
    pricingPresented: false,
  };
}

export function normalizeRevenueMemory(value: unknown, fallback: RevenueMemory = getEmptyRevenueMemory()): RevenueMemory {
  const memory = isRecord(value) ? value : {};

  return {
    objections: normalizeList(pickValue(memory, ["objections"]), fallback.objections),
    questionsAsked: normalizeList(pickValue(memory, ["questionsAsked", "questions_asked"]), fallback.questionsAsked),
    offersPresented: normalizeList(pickValue(memory, ["offersPresented", "offers_presented"]), fallback.offersPresented),
    followUpNeeded: normalizeBoolean(pickValue(memory, ["followUpNeeded", "follow_up_needed"]), fallback.followUpNeeded),
  };
}

export function mergeRevenueMemoryProfiles(previous: unknown, incoming: unknown): RevenueMemory {
  const previousMemory = normalizeRevenueMemory(previous);
  const incomingMemory = normalizeRevenueMemory(incoming);

  return {
    objections: uniqueStrings([...incomingMemory.objections, ...previousMemory.objections]).slice(0, 8),
    questionsAsked: uniqueStrings([...incomingMemory.questionsAsked, ...previousMemory.questionsAsked]).slice(0, 8),
    offersPresented: uniqueStrings([...incomingMemory.offersPresented, ...previousMemory.offersPresented]).slice(0, 8),
    followUpNeeded: incomingMemory.followUpNeeded || previousMemory.followUpNeeded,
  };
}

function normalizeTacticName(value: unknown) {
  const normalized = normalizeText(value, "", 100)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const aliases: Record<string, string> = {
    ask_price: "ask_budget",
    ask_cost: "ask_budget",
    ask_decision_maker: "ask_authority",
    qualify_decision_process: "ask_authority",
    qualify_missing_fields: "diagnose_need",
    ask_missing_qualification_question: "diagnose_need",
    answer_question_and_nurture: "smaller_next_step",
    move_to_booking_or_pricing_cta: "offer_booking",
    present_offer_or_checkout: "present_offer",
    present_proposal_or_checkout: "present_offer",
    present_offer_and_close_gap: "present_offer",
    present_offer_and_confirm_interest: "present_offer",
    confirm_order_then_send_checkout: "offer_checkout",
    reframe_value_then_offer_next_step: "handle_price_objection",
    pause_ai_and_handoff_to_human: "human_handoff",
    take_over_in_inbox: "human_handoff",
  };

  return aliases[normalized] || normalized;
}

function normalizeTacticList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return uniqueStrings(value.map(normalizeTacticName).filter(Boolean)).slice(0, 12);
}

function getTacticsBeforePricing(sequence: string[]) {
  const pricingIndex = sequence.indexOf("present_pricing");

  if (pricingIndex <= 0) {
    return [];
  }

  return sequence.slice(0, pricingIndex).filter((tactic) => tactic !== "present_pricing");
}

export function normalizeRevenueTacticIntelligence(
  value: unknown,
  fallback: RevenueTacticIntelligence = getEmptyRevenueTacticIntelligence()
): RevenueTacticIntelligence {
  const tactic = isRecord(value) ? value : {};
  const sequence = uniqueStrings([
    ...normalizeTacticList(pickValue(tactic, ["sequence", "orderedTactics", "ordered_tactics"]), []),
    ...fallback.sequence,
  ]).slice(0, 12);
  const tactics = uniqueStrings([
    ...normalizeTacticList(pickValue(tactic, ["tactics", "tacticNames", "tactic_names"]), []),
    ...sequence,
    ...fallback.tactics,
  ]).slice(0, 12);
  const primaryTactic =
    normalizeTacticName(pickValue(tactic, ["primaryTactic", "primary_tactic", "mainTactic", "main_tactic"])) ||
    fallback.primaryTactic ||
    sequence[0] ||
    tactics[0] ||
    "";
  const pricingPresented =
    normalizeBoolean(pickValue(tactic, ["pricingPresented", "pricing_presented"]), fallback.pricingPresented) ||
    tactics.includes("present_pricing") ||
    sequence.includes("present_pricing");
  const usedBeforePricing = uniqueStrings([
    ...normalizeTacticList(pickValue(tactic, ["usedBeforePricing", "used_before_pricing"]), []),
    ...fallback.usedBeforePricing,
    ...getTacticsBeforePricing(sequence),
  ]).slice(0, 8);

  return {
    tactics,
    sequence,
    primaryTactic,
    usedBeforePricing,
    pricingPresented,
  };
}

const tacticPatterns: Array<[string, RegExp[]]> = [
  ["show_case_study", [/\bcase stud(y|ies)\b/, /\bsuccess stor(y|ies)\b/, /\bbefore and after\b/]],
  ["use_social_proof", [/\btestimonial(s)?\b/, /\breview(s)?\b/, /\bclient result(s)?\b/, /\bsocial proof\b/, /\bproof\b/]],
  ["state_guarantee", [/\bguarantee\b/, /\brefund\b/, /\brisk[-\s]?free\b/, /\btrial\b/]],
  ["handle_price_objection", [/\bexpensive\b/, /\btoo much\b/, /\bprice concern\b/, /\bcost objection\b/]],
  ["present_pricing", [/\bprice\b/, /\bpricing\b/, /\bcost\b/, /\binvestment\b/, /\bpayment\b/, /\bhow much\b/]],
  ["ask_budget", [/\bbudget\b/, /\bprice range\b/, /\bafford\b/]],
  ["ask_timeline", [/\btimeline\b/, /\bwhen\b/, /\bstart\b/, /\bthis month\b/, /\btoday\b/, /\btomorrow\b/, /\basap\b/, /\burgent\b/]],
  ["ask_authority", [/\bauthority\b/, /\bdecision maker\b/, /\bdecider\b/, /\bapproval\b/, /\bwho else\b/, /\bfinal decision\b/]],
  ["diagnose_need", [/\bproblem\b/, /\bneed\b/, /\bpain\b/, /\bgoal\b/, /\bsolve\b/, /\bimprove\b/, /\btrying to\b/]],
  ["present_offer", [/\boffer\b/, /\bpackage\b/, /\bprogram\b/, /\bproduct\b/, /\bproposal\b/, /\bbest option\b/]],
  ["offer_checkout", [/\bcheckout\b/, /\bpayment link\b/, /\bpay\b/, /\border\b/, /\bconfirm order\b/, /\bpurchase\b/, /\bbuy\b/]],
  ["offer_booking", [/\bbook\b/, /\bbooking\b/, /\bcall\b/, /\bappointment\b/, /\bschedule\b/]],
  ["smaller_next_step", [/\bsmaller next step\b/, /\blow[-\s]?friction\b/, /\bfollow\b/, /\bnewsletter\b/, /\bsmall next step\b/]],
  ["human_handoff", [/\bhandoff\b/, /\bhuman\b/, /\btake over\b/, /\bescalate\b/, /\bsupport\b/]],
  ["follow_up", [/\bfollow up\b/, /\bfollow-up\b/, /\bcircle back\b/, /\bcheck back\b/]],
];

function addInferredTactic(
  matches: Array<{ tactic: string; index: number }>,
  tactic: string,
  index: number
) {
  const normalized = normalizeTacticName(tactic);

  if (!normalized) {
    return;
  }

  matches.push({
    tactic: normalized,
    index,
  });
}

function getSnapshotTacticText(snapshot: RevenueOperatingSnapshot) {
  const parts = [
    snapshot.conversationIntelligence.intent,
    snapshot.conversationIntelligence.sentiment,
    snapshot.conversationIntelligence.emotion,
    snapshot.conversationIntelligence.objection,
    snapshot.conversationIntelligence.buyingSignal,
    snapshot.conversationIntelligence.urgencySignal,
    snapshot.conversationIntelligence.stage,
    ...snapshot.conversationIntelligence.questions,
    ...snapshot.conversationIntelligence.signals,
    snapshot.buyerIntelligence.goal,
    snapshot.buyerIntelligence.problem,
    snapshot.buyerIntelligence.budget,
    snapshot.buyerIntelligence.authority,
    snapshot.buyerIntelligence.need,
    snapshot.buyerIntelligence.timeline,
    snapshot.buyerIntelligence.behavior,
    snapshot.buyerIntelligence.readiness,
    ...snapshot.buyerIntelligence.missing,
    snapshot.revenueIntelligence.framework,
    snapshot.revenueIntelligence.method,
    snapshot.revenueIntelligence.nextQuestion,
    snapshot.revenueIntelligence.objection,
    snapshot.revenueIntelligence.salesStage,
    snapshot.revenueIntelligence.recommendation,
    snapshot.decision.bestNextAction,
    snapshot.decision.rationale,
    ...snapshot.memory.objections,
    ...snapshot.memory.questionsAsked,
    ...snapshot.memory.offersPresented,
    snapshot.memory.followUpNeeded ? "follow up needed" : "",
  ];

  return parts.filter(Boolean).join(" | ").toLowerCase();
}

export function inferRevenueTacticIntelligence(snapshot: RevenueOperatingSnapshot): RevenueTacticIntelligence {
  const text = getSnapshotTacticText(snapshot);
  const matches: Array<{ tactic: string; index: number }> = [];

  for (const [tactic, patterns] of tacticPatterns) {
    for (const pattern of patterns) {
      const index = text.search(pattern);

      if (index >= 0) {
        addInferredTactic(matches, tactic, index);
        break;
      }
    }
  }

  const actionTactic = normalizeTacticName(snapshot.decision.bestNextAction);

  if (actionTactic && actionTactic !== snapshot.decision.bestNextAction) {
    addInferredTactic(matches, actionTactic, text.length + 1);
  }

  const method = normalizeTacticName(snapshot.revenueIntelligence.method);

  if (method === "ask") {
    addInferredTactic(matches, "diagnose_need", text.length + 2);
  } else if (method === "handle_objection") {
    addInferredTactic(matches, "handle_price_objection", text.length + 2);
  } else if (method === "present_offer") {
    addInferredTactic(matches, "present_offer", text.length + 2);
  } else if (method === "escalate") {
    addInferredTactic(matches, "human_handoff", text.length + 2);
  } else if (method === "follow_up") {
    addInferredTactic(matches, "follow_up", text.length + 2);
  }

  for (const missing of snapshot.buyerIntelligence.missing) {
    const normalizedMissing = missing.toLowerCase();

    if (/\bbudget|price|cost\b/.test(normalizedMissing)) {
      addInferredTactic(matches, "ask_budget", text.length + 3);
    }

    if (/\btimeline|when|start\b/.test(normalizedMissing)) {
      addInferredTactic(matches, "ask_timeline", text.length + 4);
    }

    if (/\bauthority|decision|approval\b/.test(normalizedMissing)) {
      addInferredTactic(matches, "ask_authority", text.length + 5);
    }

    if (/\bneed|problem|goal|fit\b/.test(normalizedMissing)) {
      addInferredTactic(matches, "diagnose_need", text.length + 6);
    }
  }

  if (snapshot.memory.followUpNeeded) {
    addInferredTactic(matches, "follow_up", text.length + 7);
  }

  const sequence = uniqueStrings(
    matches
      .sort((first, second) => first.index - second.index)
      .map((match) => match.tactic)
  ).slice(0, 12);
  const tactics = uniqueStrings(sequence).slice(0, 12);

  return {
    tactics,
    sequence,
    primaryTactic: sequence[0] || tactics[0] || "",
    usedBeforePricing: getTacticsBeforePricing(sequence).slice(0, 8),
    pricingPresented: tactics.includes("present_pricing") || sequence.includes("present_pricing"),
  };
}

export function withRevenueTacticIntelligence(snapshot: RevenueOperatingSnapshot): RevenueOperatingSnapshot {
  const current = normalizeRevenueTacticIntelligence(snapshot.tacticIntelligence);
  const inferred = inferRevenueTacticIntelligence(snapshot);
  const sequence = uniqueStrings([...current.sequence, ...inferred.sequence]).slice(0, 12);
  const tactics = uniqueStrings([...current.tactics, ...inferred.tactics, ...sequence]).slice(0, 12);
  const pricingPresented = current.pricingPresented || inferred.pricingPresented || tactics.includes("present_pricing");

  return {
    ...snapshot,
    tacticIntelligence: {
      tactics,
      sequence,
      primaryTactic: current.primaryTactic || inferred.primaryTactic || sequence[0] || tactics[0] || "",
      usedBeforePricing: uniqueStrings([
        ...current.usedBeforePricing,
        ...inferred.usedBeforePricing,
        ...getTacticsBeforePricing(sequence),
      ]).slice(0, 8),
      pricingPresented,
    },
  };
}

function buildSnapshotRevenueMemory(snapshot: RevenueOperatingSnapshot): RevenueMemory {
  return mergeRevenueMemoryProfiles(snapshot.memory, {
    objections: [
      snapshot.conversationIntelligence.objection,
      snapshot.revenueIntelligence.objection,
      ...snapshot.memory.objections,
    ].filter(Boolean),
    questionsAsked: [
      ...snapshot.conversationIntelligence.questions,
      snapshot.revenueIntelligence.nextQuestion,
      ...snapshot.memory.questionsAsked,
    ].filter(Boolean),
    offersPresented: snapshot.memory.offersPresented,
    followUpNeeded: snapshot.memory.followUpNeeded,
  });
}

function getEmptyRevenueMemoryContext(): RevenueMemoryContext {
  return {
    memory: getEmptyRevenueMemory(),
    lastObjection: "",
    lastBestNextAction: "",
    recentConversationHistory: [],
    recentOutcomes: [],
    recentPurchases: [],
    followUpHistory: [],
    preferences: [],
  };
}

function getParticipantLookup(participant?: RosParticipant) {
  const senderId = participant?.id?.trim() || "";
  const username = participant?.username?.trim() || "";
  const displayName = participant?.name?.trim() || username || "";

  return {
    senderId,
    username,
    displayName,
    hasLookup: Boolean(senderId || username || displayName),
  };
}

function applyProspectLookup<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  lookup: ReturnType<typeof getParticipantLookup>
) {
  if (lookup.senderId) {
    return query.eq("instagram_sender_id", lookup.senderId);
  }

  if (lookup.username) {
    return query.eq("instagram_username", lookup.username);
  }

  return query.eq("display_name", lookup.displayName);
}

function applyMemoryLookup<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  prospectId: string,
  senderId: string
) {
  if (prospectId) {
    return query.eq("prospect_id", prospectId);
  }

  return query.eq("instagram_sender_id", senderId);
}

function missingFactIsCovered(missingFact: string, profile: RevenueBuyerIntelligence) {
  const text = missingFact.toLowerCase();
  const checks: Array<[keyof Omit<RevenueBuyerIntelligence, "missing">, RegExp]> = [
    ["goal", /\b(goal|goals|outcome|accomplish|trying to achieve)\b/],
    ["problem", /\b(problem|problems|pain|challenge|issue|solve|improve)\b/],
    ["budget", /\b(budget|price|pricing|cost|range|payment|afford)\b/],
    ["authority", /\b(authority|decision|decider|approval|owner|final decision)\b/],
    ["need", /\b(need|needs|requirement|fit|looking for)\b/],
    ["timeline", /\b(timeline|when|date|deadline|start|urgency|purchase timeline)\b/],
    ["behavior", /\b(behavior|engagement|activity)\b/],
    ["readiness", /\b(readiness|ready|purchase readiness)\b/],
  ];

  return checks.some(([field, pattern]) => Boolean(profile[field]) && pattern.test(text));
}

export function normalizeBuyerIntelligenceProfile(
  value: unknown,
  fallback: RevenueBuyerIntelligence = getEmptyBuyerIntelligence()
): RevenueBuyerIntelligence {
  const buyer = isRecord(value) ? value : {};

  return {
    goal: normalizeBuyerText(pickValue(buyer, ["goal", "goals"]), fallback.goal, 160),
    problem: normalizeBuyerText(pickValue(buyer, ["problem", "problems"]), fallback.problem, 160),
    budget: normalizeBuyerText(pickValue(buyer, ["budget"]), fallback.budget, 80),
    authority: normalizeBuyerText(pickValue(buyer, ["authority"]), fallback.authority, 120),
    need: normalizeBuyerText(pickValue(buyer, ["need"]), fallback.need, 160),
    timeline: normalizeBuyerText(pickValue(buyer, ["timeline"]), fallback.timeline, 120),
    behavior: normalizeBuyerText(pickValue(buyer, ["behavior"]), fallback.behavior, 260),
    readiness: normalizeBuyerText(
      pickValue(buyer, ["readiness", "purchaseReadiness", "purchase_readiness"]),
      fallback.readiness,
      80
    ),
    missing: normalizeList(pickValue(buyer, ["missing"]), fallback.missing),
  };
}

export function mergeBuyerIntelligenceProfiles(previous: unknown, incoming: unknown): RevenueBuyerIntelligence {
  const previousProfile = normalizeBuyerIntelligenceProfile(previous);
  const incomingProfile = normalizeBuyerIntelligenceProfile(incoming);
  const merged: RevenueBuyerIntelligence = {
    goal: incomingProfile.goal || previousProfile.goal,
    problem: incomingProfile.problem || previousProfile.problem,
    budget: incomingProfile.budget || previousProfile.budget,
    authority: incomingProfile.authority || previousProfile.authority,
    need: incomingProfile.need || previousProfile.need,
    timeline: incomingProfile.timeline || previousProfile.timeline,
    behavior: incomingProfile.behavior || previousProfile.behavior,
    readiness: incomingProfile.readiness || previousProfile.readiness,
    missing: [],
  };

  merged.missing = uniqueStrings([...incomingProfile.missing, ...previousProfile.missing])
    .filter((missingFact) => !missingFactIsCovered(missingFact, merged))
    .slice(0, 8);

  return merged;
}

export function formatBuyerIntelligenceForPrompt(profile?: RevenueBuyerIntelligence | null) {
  if (!profile) {
    return "No saved buyer memory yet.";
  }

  const fields = [
    ["goal", profile.goal],
    ["problem", profile.problem],
    ["budget", profile.budget],
    ["authority", profile.authority],
    ["need", profile.need],
    ["timeline", profile.timeline],
    ["behavior", profile.behavior],
    ["readiness", profile.readiness],
  ].filter(([, value]) => value);

  if (fields.length === 0 && profile.missing.length === 0) {
    return "No saved buyer memory yet.";
  }

  return JSON.stringify(
    {
      ...Object.fromEntries(fields),
      missing: profile.missing,
    },
    null,
    2
  );
}

function getNestedRecord(value: unknown, keys: string[]) {
  const root = isRecord(value) ? value : {};
  const nested = pickValue(root, keys);
  return isRecord(nested) ? nested : {};
}

function normalizeOutcomeProbabilities(value: unknown, fallback: Record<string, number>) {
  if (!isRecord(value)) {
    return fallback;
  }

  const normalized = Object.fromEntries(
    Object.entries(value)
      .map(([key, score]) => [key.trim(), normalizeScore(score, 0)] as const)
      .filter(([key]) => key.length > 0)
  );

  return Object.keys(normalized).length > 0 ? normalized : fallback;
}

function getDefaultOutcomeProbabilities(lead: RosLeadSnapshot): Record<string, number> {
  const purchaseScore = Math.max(5, Math.min(95, lead.score));
  const bookCallScore = lead.urgency === "High" ? Math.max(70, purchaseScore - 5) : Math.max(25, purchaseScore - 15);
  const newsletterScore = lead.score < 55 ? 82 : Math.max(35, 72 - Math.round(lead.score / 4));

  return {
    follow_creator: lead.score < 35 ? 78 : 42,
    join_newsletter: newsletterScore,
    book_call: bookCallScore,
    start_trial: Math.max(10, purchaseScore - 20),
    purchase_product: purchaseScore,
    upgrade_plan: Math.max(5, purchaseScore - 35),
    recover_abandoned_cart: 0,
    renew_subscription: 0,
    collect_testimonial: 0,
  };
}

function getDefaultBestNextAction(lead: RosLeadSnapshot) {
  if (lead.urgency === "High" || lead.score >= 80) {
    return "present_offer_or_checkout";
  }

  if (lead.score >= 55) {
    return lead.missing.length > 0 ? "ask_missing_qualification_question" : "move_to_booking_or_pricing_cta";
  }

  return "answer_question_and_nurture";
}

export function buildFallbackRevenueOperatingSnapshot({
  lead,
  cta,
  escalation,
}: {
  lead: RosLeadSnapshot;
  cta?: string;
  escalation?: ConversationEscalation | null;
}): RevenueOperatingSnapshot {
  const objection = escalation?.intent === "refund_request" ? "refund" : lead.intent.toLowerCase().includes("price") ? "price" : "";

  const fallback: RevenueOperatingSnapshot = {
    conversationIntelligence: {
      intent: lead.intent || "Unknown",
      sentiment: escalation ? "needs_review" : "neutral",
      emotion: escalation?.intent === "complaint" ? "frustrated" : lead.urgency === "High" ? "ready" : "interested",
      objection,
      buyingSignal: lead.signals.find((signal) => /buy|booking|pricing|payment|order/i.test(signal)) || "",
      urgencySignal: lead.urgency,
      stage: lead.stage,
      questions: [],
      signals: lead.signals,
    },
    buyerIntelligence: {
      goal: "",
      problem: "",
      budget: lead.missing.includes("budget or price range") ? "" : "",
      authority: "",
      need: lead.intent || "",
      timeline: lead.missing.includes("purchase timeline") ? "" : lead.urgency,
      behavior: lead.summary,
      readiness: lead.score >= 75 ? "high" : lead.score >= 50 ? "medium" : "low",
      missing: lead.missing,
    },
    revenueIntelligence: {
      framework: "BANT + consultative selling",
      method: lead.missing.length > 0 ? "qualify_missing_fields" : "advance_to_conversion",
      nextQuestion: lead.missing.length > 0 ? `Ask for ${lead.missing.slice(0, 2).join(" and ")}.` : "",
      objection,
      salesStage: lead.stage,
      recommendation: lead.recommendedAction,
    },
    tacticIntelligence: getEmptyRevenueTacticIntelligence(),
    outcomeProbabilities: getDefaultOutcomeProbabilities(lead),
    decision: {
      bestNextAction: getDefaultBestNextAction(lead),
      confidence: Math.max(35, Math.min(95, lead.score || 45)),
      rationale: lead.summary || lead.recommendedAction || "Use the current conversation signals to choose the next revenue step.",
    },
    memory: {
      objections: objection ? [objection] : [],
      questionsAsked: [],
      offersPresented: cta ? [cta] : [],
      followUpNeeded: true,
    },
    layerStatuses: {
      layer1: "pending",
      layer2: "pending",
      layer3: "pending",
      layer4: "pending",
      layer5: "pending",
      layer6: "pending",
      layer7: "pending",
      layer8: "pending",
      layer9: escalation ? "completed" : "pending",
    },
  };

  return withRevenueTacticIntelligence(fallback);
}

export function normalizeRevenueOperatingSnapshot(value: unknown, fallback: RevenueOperatingSnapshot): RevenueOperatingSnapshot {
  const root = isRecord(value) ? value : {};
  const conversation = getNestedRecord(root, ["conversationIntelligence", "conversation_intelligence"]);
  const buyer = getNestedRecord(root, ["buyerIntelligence", "buyer_intelligence"]);
  const revenue = getNestedRecord(root, ["revenueIntelligence", "revenue_intelligence"]);
  const tactic = getNestedRecord(root, ["tacticIntelligence", "tactic_intelligence"]);
  const decision = getNestedRecord(root, ["decision"]);
  const memory = getNestedRecord(root, ["memory", "revenueMemory", "revenue_memory"]);

  const normalized: RevenueOperatingSnapshot = {
    conversationIntelligence: {
      intent: normalizeText(pickValue(conversation, ["intent"]), fallback.conversationIntelligence.intent, 120),
      sentiment: normalizeText(pickValue(conversation, ["sentiment"]), fallback.conversationIntelligence.sentiment, 80),
      emotion: normalizeText(pickValue(conversation, ["emotion", "emotionalState", "emotional_state"]), fallback.conversationIntelligence.emotion, 80),
      objection: normalizeText(pickValue(conversation, ["objection"]), fallback.conversationIntelligence.objection, 120),
      buyingSignal: normalizeText(pickValue(conversation, ["buyingSignal", "buying_signal"]), fallback.conversationIntelligence.buyingSignal, 160),
      urgencySignal: normalizeText(pickValue(conversation, ["urgencySignal", "urgency_signal"]), fallback.conversationIntelligence.urgencySignal, 120),
      stage: normalizeText(pickValue(conversation, ["stage", "conversationStage", "conversation_stage"]), fallback.conversationIntelligence.stage, 120),
      questions: normalizeList(pickValue(conversation, ["questions"]), fallback.conversationIntelligence.questions),
      signals: normalizeList(pickValue(conversation, ["signals"]), fallback.conversationIntelligence.signals),
    },
    buyerIntelligence: {
      ...normalizeBuyerIntelligenceProfile(buyer, fallback.buyerIntelligence),
    },
    revenueIntelligence: {
      framework: normalizeText(pickValue(revenue, ["framework"]), fallback.revenueIntelligence.framework, 160),
      method: normalizeText(pickValue(revenue, ["method"]), fallback.revenueIntelligence.method, 160),
      nextQuestion: normalizeText(pickValue(revenue, ["nextQuestion", "next_question"]), fallback.revenueIntelligence.nextQuestion, 260),
      objection: normalizeText(pickValue(revenue, ["objection"]), fallback.revenueIntelligence.objection, 120),
      salesStage: normalizeText(pickValue(revenue, ["salesStage", "sales_stage"]), fallback.revenueIntelligence.salesStage, 120),
      recommendation: normalizeText(pickValue(revenue, ["recommendation"]), fallback.revenueIntelligence.recommendation, 260),
    },
    tacticIntelligence: normalizeRevenueTacticIntelligence(tactic, fallback.tacticIntelligence),
    outcomeProbabilities: normalizeOutcomeProbabilities(
      pickValue(root, ["outcomeProbabilities", "outcome_probabilities"]),
      fallback.outcomeProbabilities
    ),
    decision: {
      bestNextAction: normalizeTacticName(pickValue(decision, ["bestNextAction", "best_next_action"])) || fallback.decision.bestNextAction,
      confidence: normalizeScore(pickValue(decision, ["confidence"]), fallback.decision.confidence),
      rationale: normalizeText(pickValue(decision, ["rationale"]), fallback.decision.rationale, 500),
    },
    memory: normalizeRevenueMemory(memory, fallback.memory),
    layerStatuses: fallback.layerStatuses,
  };

  return withRevenueTacticIntelligence(normalized);
}

export async function loadRosProspectBuyerProfile({
  supabase,
  userId,
  participant,
}: Pick<PersistRevenueOperatingSnapshotParams, "supabase" | "userId" | "participant">) {
  const lookup = getParticipantLookup(participant);

  if (!lookup.hasLookup) {
    return null;
  }

  const query = applyProspectLookup(
    supabase
      .from("ros_prospects")
      .select("buyer_profile,readiness")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(1),
    lookup
  );

  const { data, error } = await query;

  if (error) {
    if (isMissingRosTableError(error)) {
      return null;
    }

    throw error;
  }

  const row = data?.[0];

  if (!row) {
    return null;
  }

  const buyerProfile = isRecord(row.buyer_profile) ? row.buyer_profile : {};

  return normalizeBuyerIntelligenceProfile({
    ...buyerProfile,
    readiness: buyerProfile.readiness || row.readiness,
  });
}

function formatRevenueEventLabel(row: Record<string, unknown>) {
  const type = normalizeText(pickValue(row, ["outcome_type", "event_type"]), "revenue_event", 80).replaceAll("_", " ");
  const status = normalizeText(pickValue(row, ["status"]), "", 40);
  const value = pickValue(row, ["value"]);
  const currency = normalizeText(pickValue(row, ["currency"]), "USD", 8);
  const amount = typeof value === "number" || typeof value === "string" && value.trim()
    ? ` ${currency} ${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : "";

  return [type, status ? `(${status})` : "", amount].filter(Boolean).join(" ");
}

function formatCommerceOrderLabel(row: Record<string, unknown>) {
  const title = normalizeText(pickValue(row, ["product_title"]), "Product", 120);
  const status = normalizeText(pickValue(row, ["status"]), "", 40);
  const paymentStatus = normalizeText(pickValue(row, ["payment_status"]), "", 40);
  const priceText = normalizeText(pickValue(row, ["price_text"]), "", 80);
  const amount = pickValue(row, ["amount"]);
  const currency = normalizeText(pickValue(row, ["currency"]), "USD", 8);
  const price = priceText || (typeof amount === "number" || typeof amount === "string" && amount.trim()
    ? `${currency} ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : "");

  return [title, price, status || paymentStatus ? `(${[status, paymentStatus].filter(Boolean).join("/")})` : ""]
    .filter(Boolean)
    .join(" ");
}

export async function loadRosProspectRevenueMemory({
  supabase,
  userId,
  participant,
}: Pick<PersistRevenueOperatingSnapshotParams, "supabase" | "userId" | "participant">): Promise<RevenueMemoryContext | null> {
  const lookup = getParticipantLookup(participant);

  if (!lookup.hasLookup) {
    return null;
  }

  const context = getEmptyRevenueMemoryContext();
  const prospectQuery = applyProspectLookup(
    supabase
      .from("ros_prospects")
      .select("id,last_objection,last_best_next_action,buyer_profile")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(1),
    lookup
  );
  const { data: prospects, error: prospectError } = await prospectQuery;

  if (prospectError) {
    if (isMissingRosTableError(prospectError)) {
      return null;
    }

    throw prospectError;
  }

  const prospect = prospects?.[0];
  const prospectId = normalizeText(prospect?.id, "", 80);

  if (!prospectId && !lookup.senderId) {
    return null;
  }

  context.lastObjection = normalizeText(prospect?.last_objection, "", 120);
  context.lastBestNextAction = normalizeText(prospect?.last_best_next_action, "", 180);
  const buyerProfile = isRecord(prospect?.buyer_profile) ? prospect.buyer_profile : {};
  context.preferences = uniqueStrings([
    normalizeText(pickValue(buyerProfile, ["need"]), "", 160),
    normalizeText(pickValue(buyerProfile, ["timeline"]), "", 120),
    normalizeText(pickValue(buyerProfile, ["budget"]), "", 80),
    normalizeText(pickValue(buyerProfile, ["behavior"]), "", 260),
  ].filter(Boolean));

  const insightQuery = applyMemoryLookup(
    supabase
      .from("ros_conversation_insights")
      .select("memory,latest_message,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    prospectId,
    lookup.senderId
  );
  const { data: insights, error: insightError } = await insightQuery;

  if (insightError && !isMissingRosTableError(insightError)) {
    throw insightError;
  }

  for (const insight of insights || []) {
    context.memory = mergeRevenueMemoryProfiles(context.memory, isRecord(insight.memory) ? insight.memory : {});
    const latestMessage = normalizeText(insight.latest_message, "", 240);

    if (latestMessage) {
      context.recentConversationHistory.push(latestMessage);
    }
  }

  const decisionQuery = applyMemoryLookup(
    supabase
      .from("ros_revenue_decisions")
      .select("best_next_action,cta,payload,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    prospectId,
    lookup.senderId
  );
  const { data: decisions, error: decisionError } = await decisionQuery;

  if (decisionError && !isMissingRosTableError(decisionError)) {
    throw decisionError;
  }

  for (const decision of decisions || []) {
    const payload = isRecord(decision.payload) ? decision.payload : {};
    const payloadMemory = isRecord(payload.memory) ? payload.memory : {};
    context.memory = mergeRevenueMemoryProfiles(context.memory, payloadMemory);
    const cta = normalizeText(decision.cta, "", 220);
    const bestNextAction = normalizeText(decision.best_next_action, "", 180);

    if (cta) {
      context.memory = mergeRevenueMemoryProfiles(context.memory, { offersPresented: [cta] });
    }

    if (/follow/i.test(bestNextAction || cta)) {
      context.followUpHistory.push(bestNextAction || cta);
    }
  }

  if (context.lastObjection) {
    context.memory = mergeRevenueMemoryProfiles(context.memory, { objections: [context.lastObjection] });
  }

  const outcomeQuery = applyMemoryLookup(
    supabase
      .from("ros_revenue_outcomes")
      .select("outcome_type,status,value,currency,metadata,occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(6),
    prospectId,
    lookup.senderId
  );
  const { data: outcomes, error: outcomeError } = await outcomeQuery;

  if (outcomeError && !isMissingRosTableError(outcomeError)) {
    throw outcomeError;
  }

  context.recentOutcomes = (outcomes || [])
    .map((row) => formatRevenueEventLabel(row as Record<string, unknown>))
    .filter(Boolean)
    .slice(0, 6);

  const eventQuery = applyMemoryLookup(
    supabase
      .from("ros_conversion_events")
      .select("event_type,outcome_type,status,value,currency,metadata,occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(6),
    prospectId,
    lookup.senderId
  );
  const { data: events, error: eventError } = await eventQuery;

  if (eventError && !isMissingRosTableError(eventError)) {
    throw eventError;
  }

  context.recentOutcomes = uniqueStrings([
    ...context.recentOutcomes,
    ...(events || []).map((row) => formatRevenueEventLabel(row as Record<string, unknown>)),
  ]).slice(0, 8);

  if (lookup.senderId) {
    const { data: orders, error: orderError } = await supabase
      .from("commerce_orders")
      .select("product_title,price_text,amount,currency,status,payment_status,created_at,paid_at")
      .eq("user_id", userId)
      .eq("instagram_sender_id", lookup.senderId)
      .order("created_at", { ascending: false })
      .limit(6);

    if (orderError && !isMissingRosTableError(orderError)) {
      throw orderError;
    }

    context.recentPurchases = (orders || [])
      .map((row) => formatCommerceOrderLabel(row as Record<string, unknown>))
      .filter(Boolean)
      .slice(0, 6);
  }

  context.recentConversationHistory = uniqueStrings(context.recentConversationHistory).slice(0, 6);
  context.followUpHistory = uniqueStrings(context.followUpHistory).slice(0, 6);

  return context;
}

export function formatRevenueMemoryForPrompt(context?: RevenueMemoryContext | null) {
  if (!context) {
    return "No saved revenue memory yet.";
  }

  const payload = {
    objections: context.memory.objections,
    questionsAsked: context.memory.questionsAsked,
    offersPresented: context.memory.offersPresented,
    followUpNeeded: context.memory.followUpNeeded,
    lastObjection: context.lastObjection,
    lastBestNextAction: context.lastBestNextAction,
    recentConversationHistory: context.recentConversationHistory,
    recentOutcomes: context.recentOutcomes,
    recentPurchases: context.recentPurchases,
    followUpHistory: context.followUpHistory,
    preferences: context.preferences,
  };
  const hasMemory = Object.values(payload).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));

  return hasMemory ? JSON.stringify(payload, null, 2) : "No saved revenue memory yet.";
}

function getLatestUserText(messages: RosMessage[] = []) {
  return [...messages]
    .reverse()
    .find((message) => message.from === "user" && typeof message.text === "string" && message.text.trim())
    ?.text?.trim() || "";
}

async function upsertRosProspect({
  supabase,
  userId,
  participant,
  snapshot,
}: Pick<PersistRevenueOperatingSnapshotParams, "supabase" | "userId" | "participant" | "snapshot">) {
  const senderId = participant?.id?.trim() || "";
  const username = participant?.username?.trim() || "";
  const displayName = participant?.name?.trim() || username || "";

  if (!senderId && !username && !displayName) {
    return null;
  }

  const buildPayload = (buyerIntelligence: RevenueBuyerIntelligence) => ({
    user_id: userId,
    instagram_sender_id: senderId || null,
    instagram_username: username || null,
    display_name: displayName || null,
    buyer_profile: buyerIntelligence,
    readiness: buyerIntelligence.readiness || null,
    last_intent: snapshot.conversationIntelligence.intent || null,
    last_objection: snapshot.conversationIntelligence.objection || snapshot.revenueIntelligence.objection || null,
    last_best_next_action: snapshot.decision.bestNextAction,
    last_confidence: snapshot.decision.confidence,
    last_seen_at: new Date().toISOString(),
  });

  const baseBuyerIntelligence = normalizeBuyerIntelligenceProfile(snapshot.buyerIntelligence);

  let lookupQuery = supabase
    .from("ros_prospects")
    .select("id,buyer_profile")
    .eq("user_id", userId)
    .limit(1);

  if (senderId) {
    lookupQuery = lookupQuery.eq("instagram_sender_id", senderId);
  } else if (username) {
    lookupQuery = lookupQuery.eq("instagram_username", username);
  } else {
    lookupQuery = lookupQuery.eq("display_name", displayName);
  }

  const { data: existing, error: lookupError } = await lookupQuery;

  if (lookupError) {
    throw lookupError;
  }

  if (existing?.[0]?.id) {
    const buyerIntelligence = mergeBuyerIntelligenceProfiles(existing[0].buyer_profile, baseBuyerIntelligence);
    const { data, error } = await supabase
      .from("ros_prospects")
      .update(buildPayload(buyerIntelligence))
      .eq("id", existing[0].id)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return {
      prospectId: data?.id || null,
      buyerIntelligence,
    };
  }

  const payload = buildPayload(baseBuyerIntelligence);
  const { data, error } = await supabase
    .from("ros_prospects")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return {
    prospectId: data?.id || null,
    buyerIntelligence: baseBuyerIntelligence,
  };
}

export async function persistRevenueOperatingSnapshot({
  supabase,
  userId,
  participant,
  conversationId = "",
  messages = [],
  snapshot,
  escalation,
  outcomeProviders,
  source = "ai_workflow",
  reply,
  starter,
  lead,
}: PersistRevenueOperatingSnapshotParams) {
  const snapshotWithTactics = withRevenueTacticIntelligence(snapshot);
  const prospectRecord = await upsertRosProspect({ supabase, userId, participant, snapshot: snapshotWithTactics });
  const prospectId = prospectRecord?.prospectId || null;
  const previousRevenueMemory = await loadRosProspectRevenueMemory({ supabase, userId, participant }).catch(() => null);
  const incomingMemory = buildSnapshotRevenueMemory(snapshotWithTactics);
  const persistedSnapshot = prospectRecord
    ? {
      ...snapshotWithTactics,
      buyerIntelligence: prospectRecord.buyerIntelligence,
      memory: mergeRevenueMemoryProfiles(previousRevenueMemory?.memory, incomingMemory),
      reply,
      starter,
      lead,
    }
    : {
      ...snapshotWithTactics,
      memory: mergeRevenueMemoryProfiles(previousRevenueMemory?.memory, incomingMemory),
      reply,
      starter,
      lead,
    };
  const senderId = participant?.id?.trim() || "";
  const latestMessage = getLatestUserText(messages);

  await supabase.from("ros_conversation_insights").insert({
    user_id: userId,
    prospect_id: prospectId,
    conversation_id: conversationId || null,
    instagram_sender_id: senderId || null,
    message_count: messages.length,
    latest_message: latestMessage || null,
    conversation_intelligence: persistedSnapshot.conversationIntelligence,
    buyer_intelligence: persistedSnapshot.buyerIntelligence,
    revenue_intelligence: persistedSnapshot.revenueIntelligence,
    memory: persistedSnapshot.memory,
  });

  const { data: decision, error: decisionError } = await supabase
    .from("ros_revenue_decisions")
    .insert({
      user_id: userId,
      prospect_id: prospectId,
      conversation_id: conversationId || null,
      instagram_sender_id: senderId || null,
      source,
      best_next_action: persistedSnapshot.decision.bestNextAction,
      confidence: persistedSnapshot.decision.confidence,
      rationale: persistedSnapshot.decision.rationale || null,
      cta: persistedSnapshot.revenueIntelligence.recommendation || null,
      outcome_probabilities: persistedSnapshot.outcomeProbabilities,
      payload: persistedSnapshot,
    })
    .select("id")
    .single();

  if (decisionError) {
    throw decisionError;
  }

  if (escalation) {
    const sourceEventId = `${userId}:${conversationId || senderId || "conversation"}:${escalation.intent}`;
    await supabase.from("ros_escalation_events").insert({
      user_id: userId,
      prospect_id: prospectId,
      conversation_id: conversationId || null,
      instagram_sender_id: senderId || null,
      intent: escalation.intent,
      urgency: escalation.urgency,
      risk_score: escalation.urgency === "High" ? 87 : 65,
      summary: escalation.summary,
      recommended_action: escalation.recommendedAction,
      signals: escalation.signals,
    });

    await createSupportTicket({
      supabase,
      userId,
      title: escalation.label,
      summary: escalation.summary,
      topic: escalation.intent === "refund_request" ? "Billing" : "Support",
      priority: escalation.urgency === "High" ? "High" : "Medium",
      assignee: escalation.intent === "refund_request" ? "Billing" : "Support",
      source: "ros_escalation",
      sourceEventId,
      conversationId,
      instagramSenderId: senderId,
      metadata: {
        recommendedAction: escalation.recommendedAction,
        signals: escalation.signals,
      },
    }).catch(() => undefined);
  }

  const dominantOutcome = Object.entries(persistedSnapshot.outcomeProbabilities)
    .filter(([key]) => defaultOutcomeKeys.includes(key))
    .sort(([, firstScore], [, secondScore]) => secondScore - firstScore)[0];

  if (dominantOutcome) {
    const outcomeAction = buildRevenueOutcomeAction(persistedSnapshot, dominantOutcome[0], outcomeProviders);

    const { data: outcome, error: outcomeError } = await supabase.from("ros_revenue_outcomes").insert({
      user_id: userId,
      prospect_id: prospectId,
      decision_id: decision?.id || null,
      conversation_id: conversationId || null,
      outcome_type: dominantOutcome[0],
      status: "pending",
      metadata: {
        probability: dominantOutcome[1],
        bestNextAction: persistedSnapshot.decision.bestNextAction,
        outcomeAction,
        source,
      },
    }).select("id").single();

    if (outcomeError) {
      throw outcomeError;
    }

    await executeRevenueOutcomeProvider({
      supabase,
      userId,
      prospectId,
      decisionId: decision?.id || null,
      outcomeId: outcome?.id || null,
      conversationId,
      instagramSenderId: senderId,
      participant,
      messages,
      action: outcomeAction,
      snapshot: persistedSnapshot,
      providerSettings: outcomeProviders,
      source,
      autoOnly: true,
    }).catch(() => undefined);
  }

  const learningEvents = [
    {
      user_id: userId,
      prospect_id: prospectId,
      decision_id: decision?.id || null,
      event_type: "decision_created",
      signal: persistedSnapshot.decision.bestNextAction,
      impact_score: persistedSnapshot.decision.confidence,
      metadata: {
        outcomeProbabilities: persistedSnapshot.outcomeProbabilities,
        tacticIntelligence: persistedSnapshot.tacticIntelligence,
        rationale: persistedSnapshot.decision.rationale,
      },
    },
    ...(persistedSnapshot.tacticIntelligence.primaryTactic
      ? [
        {
          user_id: userId,
          prospect_id: prospectId,
          decision_id: decision?.id || null,
          event_type: "tactic_used",
          signal: persistedSnapshot.tacticIntelligence.primaryTactic,
          impact_score: persistedSnapshot.decision.confidence,
          metadata: {
            tacticIntelligence: persistedSnapshot.tacticIntelligence,
            bestNextAction: persistedSnapshot.decision.bestNextAction,
          },
        },
      ]
      : []),
  ];

  await supabase.from("ros_learning_events").insert(learningEvents);

  await recordPlatformAnalyticsEvent({
    supabase,
    userId,
    eventName: "ros_decision_created",
    source,
    conversationId,
    instagramSenderId: senderId,
    metadata: {
      decisionId: decision?.id || null,
      prospectId,
      confidence: persistedSnapshot.decision.confidence,
      bestNextAction: persistedSnapshot.decision.bestNextAction,
      framework: persistedSnapshot.revenueIntelligence.framework,
      primaryTactic: persistedSnapshot.tacticIntelligence.primaryTactic,
      tactics: persistedSnapshot.tacticIntelligence.tactics,
    },
  }).catch(() => undefined);

  return {
    prospectId,
    decisionId: decision?.id || null,
  };
}

function isMissingRosTableError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("does not exist") || message.includes("schema cache") || message.includes("not found");
}

function getCommerceOrderMetadata(order?: RosCommerceOrderLike | null) {
  return order?.metadata && typeof order.metadata === "object" ? order.metadata : {};
}

function getOutcomeStatusForConversionEvent(status: RecordRevenueConversionEventParams["status"]) {
  if (status === "won" || status === "completed" || status === "lost" || status === "cancelled" || status === "refunded") {
    return status;
  }

  if (status === "failed") {
    return "lost";
  }

  return "pending";
}

export async function recordRevenueConversionEvent({
  supabase,
  userId,
  instagramSenderId = "",
  conversationId,
  eventType,
  outcomeType,
  status = "recorded",
  value,
  currency,
  commerceOrder,
  metadata = {},
}: RecordRevenueConversionEventParams) {
  const senderId = instagramSenderId || commerceOrder?.instagramSenderId || "";
  const orderMetadata = getCommerceOrderMetadata(commerceOrder);
  const eventValue = value ?? commerceOrder?.amount ?? null;
  const eventCurrency = currency || commerceOrder?.currency || "USD";
  const eventConversationId = conversationId || commerceOrder?.conversationId || senderId || null;
  let prospectId: string | null = null;
  let decisionId: string | null = null;
  let outcomeId: string | null = null;

  if (senderId) {
    const { data: prospects, error: prospectError } = await supabase
      .from("ros_prospects")
      .select("id")
      .eq("user_id", userId)
      .eq("instagram_sender_id", senderId)
      .order("last_seen_at", { ascending: false })
      .limit(1);

    if (prospectError && !isMissingRosTableError(prospectError)) {
      throw prospectError;
    }

    prospectId = prospects?.[0]?.id || null;
  }

  const decisionQuery = supabase
    .from("ros_revenue_decisions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  const decisionResult = senderId ? await decisionQuery.eq("instagram_sender_id", senderId) : await decisionQuery;

  if (decisionResult.error && !isMissingRosTableError(decisionResult.error)) {
    throw decisionResult.error;
  }

  decisionId = decisionResult.data?.[0]?.id || null;

  const outcomeQuery = supabase
    .from("ros_revenue_outcomes")
    .select("id, metadata")
    .eq("user_id", userId)
    .eq("outcome_type", outcomeType)
    .order("occurred_at", { ascending: false })
    .limit(1);
  const outcomeResult = decisionId
    ? await outcomeQuery.eq("decision_id", decisionId)
    : prospectId
      ? await outcomeQuery.eq("prospect_id", prospectId)
      : await outcomeQuery.eq("conversation_id", eventConversationId || "");

  if (outcomeResult.error && !isMissingRosTableError(outcomeResult.error)) {
    throw outcomeResult.error;
  }

  const existingOutcome = outcomeResult.data?.[0] as { id?: string; metadata?: Record<string, unknown> } | undefined;
  outcomeId = existingOutcome?.id || null;

  if (outcomeId) {
    const { error: updateOutcomeError } = await supabase
      .from("ros_revenue_outcomes")
      .update({
        status: getOutcomeStatusForConversionEvent(status),
        value: eventValue,
        currency: eventCurrency,
        metadata: {
          ...(existingOutcome?.metadata || {}),
          ...metadata,
          ...orderMetadata,
          commerceOrderId: commerceOrder?.id || metadata.commerceOrderId || null,
          eventType,
          eventStatus: status,
        },
        occurred_at: new Date().toISOString(),
      })
      .eq("id", outcomeId);

    if (updateOutcomeError && !isMissingRosTableError(updateOutcomeError)) {
      throw updateOutcomeError;
    }
  } else {
    const { data: insertedOutcome, error: insertOutcomeError } = await supabase
      .from("ros_revenue_outcomes")
      .insert({
        user_id: userId,
        prospect_id: prospectId,
        decision_id: decisionId,
        conversation_id: eventConversationId,
        outcome_type: outcomeType,
        status: getOutcomeStatusForConversionEvent(status),
        value: eventValue,
        currency: eventCurrency,
        metadata: {
          ...metadata,
          ...orderMetadata,
          commerceOrderId: commerceOrder?.id || metadata.commerceOrderId || null,
          eventType,
          eventStatus: status,
        },
      })
      .select("id")
      .single();

    if (insertOutcomeError && !isMissingRosTableError(insertOutcomeError)) {
      throw insertOutcomeError;
    }

    outcomeId = insertedOutcome?.id || null;
  }

  const { error: eventError } = await supabase.from("ros_conversion_events").insert({
    user_id: userId,
    prospect_id: prospectId,
    decision_id: decisionId,
    outcome_id: outcomeId,
    commerce_order_id: commerceOrder?.id || metadata.commerceOrderId || null,
    conversation_id: eventConversationId,
    instagram_sender_id: senderId || null,
    event_type: eventType,
    outcome_type: outcomeType,
    status,
    value: eventValue,
    currency: eventCurrency,
    metadata: {
      ...metadata,
      ...orderMetadata,
      productTitle: commerceOrder?.productTitle || metadata.productTitle || null,
      commerceOrderStatus: commerceOrder?.status || null,
      paymentStatus: commerceOrder?.paymentStatus || null,
    },
  });

  if (eventError && !isMissingRosTableError(eventError)) {
    throw eventError;
  }

  const { error: learningError } = await supabase.from("ros_learning_events").insert({
    user_id: userId,
    prospect_id: prospectId,
    decision_id: decisionId,
    event_type: eventType,
    signal: `${outcomeType}:${status}`,
    impact_score: status === "won" || status === "completed" ? 100 : status === "lost" || status === "failed" ? -25 : 50,
    metadata: {
      outcomeId,
      commerceOrderId: commerceOrder?.id || metadata.commerceOrderId || null,
      value: eventValue,
      currency: eventCurrency,
    },
  });

  if (learningError && !isMissingRosTableError(learningError)) {
    throw learningError;
  }

  await recordPlatformAnalyticsEvent({
    supabase,
    userId,
    eventName: `conversion_${status}`,
    source: "revenue_conversion",
    conversationId: eventConversationId,
    instagramSenderId: senderId,
    value: eventValue,
    currency: eventCurrency,
    metadata: {
      eventType,
      outcomeType,
      prospectId,
      decisionId,
      outcomeId,
      commerceOrderId: commerceOrder?.id || metadata.commerceOrderId || null,
    },
  }).catch(() => undefined);

  await refreshRevenueLearningModel({ supabase, userId }).catch(() => undefined);

  return {
    prospectId,
    decisionId,
    outcomeId,
  };
}
