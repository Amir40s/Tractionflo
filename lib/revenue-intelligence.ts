import type { createSupabaseServiceClient } from "@/lib/supabase";
import type { ConversationEscalation } from "@/lib/conversation-escalation";
import { buildRevenueOutcomeAction } from "@/lib/revenue-outcome-actions";
import type { RevenueOutcomeProviderSettings } from "@/lib/revenue-outcome-providers";
import { executeRevenueOutcomeProvider } from "@/lib/revenue-provider-execution";
import { recordPlatformAnalyticsEvent } from "@/lib/platform-analytics";
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

  return {
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
      followUpNeeded: lead.score < 75,
    },
  };
}

export function normalizeRevenueOperatingSnapshot(value: unknown, fallback: RevenueOperatingSnapshot): RevenueOperatingSnapshot {
  const root = isRecord(value) ? value : {};
  const conversation = getNestedRecord(root, ["conversationIntelligence", "conversation_intelligence"]);
  const buyer = getNestedRecord(root, ["buyerIntelligence", "buyer_intelligence"]);
  const revenue = getNestedRecord(root, ["revenueIntelligence", "revenue_intelligence"]);
  const decision = getNestedRecord(root, ["decision"]);
  const memory = getNestedRecord(root, ["memory", "revenueMemory", "revenue_memory"]);
  const outcomeProbabilities = pickValue(root, ["outcomeProbabilities", "outcome_probabilities"]);

  return {
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
      goal: normalizeText(pickValue(buyer, ["goal", "goals"]), fallback.buyerIntelligence.goal, 160),
      problem: normalizeText(pickValue(buyer, ["problem", "problems"]), fallback.buyerIntelligence.problem, 160),
      budget: normalizeText(pickValue(buyer, ["budget"]), fallback.buyerIntelligence.budget, 80),
      authority: normalizeText(pickValue(buyer, ["authority"]), fallback.buyerIntelligence.authority, 120),
      need: normalizeText(pickValue(buyer, ["need"]), fallback.buyerIntelligence.need, 160),
      timeline: normalizeText(pickValue(buyer, ["timeline"]), fallback.buyerIntelligence.timeline, 120),
      behavior: normalizeText(pickValue(buyer, ["behavior"]), fallback.buyerIntelligence.behavior, 260),
      readiness: normalizeText(pickValue(buyer, ["readiness", "purchaseReadiness", "purchase_readiness"]), fallback.buyerIntelligence.readiness, 80),
      missing: normalizeList(pickValue(buyer, ["missing"]), fallback.buyerIntelligence.missing),
    },
    revenueIntelligence: {
      framework: normalizeText(pickValue(revenue, ["framework"]), fallback.revenueIntelligence.framework, 160),
      method: normalizeText(pickValue(revenue, ["method"]), fallback.revenueIntelligence.method, 160),
      nextQuestion: normalizeText(pickValue(revenue, ["nextQuestion", "next_question"]), fallback.revenueIntelligence.nextQuestion, 260),
      objection: normalizeText(pickValue(revenue, ["objection"]), fallback.revenueIntelligence.objection, 120),
      salesStage: normalizeText(pickValue(revenue, ["salesStage", "sales_stage"]), fallback.revenueIntelligence.salesStage, 120),
      recommendation: normalizeText(pickValue(revenue, ["recommendation"]), fallback.revenueIntelligence.recommendation, 260),
    },
    outcomeProbabilities: normalizeOutcomeProbabilities(outcomeProbabilities, fallback.outcomeProbabilities),
    decision: {
      bestNextAction: normalizeText(pickValue(decision, ["bestNextAction", "best_next_action"]), fallback.decision.bestNextAction, 180),
      confidence: normalizeScore(pickValue(decision, ["confidence"]), fallback.decision.confidence),
      rationale: normalizeText(pickValue(decision, ["rationale"]), fallback.decision.rationale, 500),
    },
    memory: {
      objections: normalizeList(pickValue(memory, ["objections"]), fallback.memory.objections),
      questionsAsked: normalizeList(pickValue(memory, ["questionsAsked", "questions_asked"]), fallback.memory.questionsAsked),
      offersPresented: normalizeList(pickValue(memory, ["offersPresented", "offers_presented"]), fallback.memory.offersPresented),
      followUpNeeded: normalizeBoolean(pickValue(memory, ["followUpNeeded", "follow_up_needed"]), fallback.memory.followUpNeeded),
    },
  };
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

  const payload = {
    user_id: userId,
    instagram_sender_id: senderId || null,
    instagram_username: username || null,
    display_name: displayName || null,
    buyer_profile: snapshot.buyerIntelligence,
    readiness: snapshot.buyerIntelligence.readiness || null,
    last_intent: snapshot.conversationIntelligence.intent || null,
    last_objection: snapshot.conversationIntelligence.objection || snapshot.revenueIntelligence.objection || null,
    last_best_next_action: snapshot.decision.bestNextAction,
    last_confidence: snapshot.decision.confidence,
    last_seen_at: new Date().toISOString(),
  };

  if (senderId) {
    const { data: existing, error: lookupError } = await supabase
      .from("ros_prospects")
      .select("id")
      .eq("user_id", userId)
      .eq("instagram_sender_id", senderId)
      .limit(1);

    if (lookupError) {
      throw lookupError;
    }

    if (existing?.[0]?.id) {
      const { data, error } = await supabase
        .from("ros_prospects")
        .update(payload)
        .eq("id", existing[0].id)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data?.id || null;
    }
  }

  const { data, error } = await supabase
    .from("ros_prospects")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id || null;
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
}: PersistRevenueOperatingSnapshotParams) {
  const prospectId = await upsertRosProspect({ supabase, userId, participant, snapshot });
  const senderId = participant?.id?.trim() || "";
  const latestMessage = getLatestUserText(messages);

  await supabase.from("ros_conversation_insights").insert({
    user_id: userId,
    prospect_id: prospectId,
    conversation_id: conversationId || null,
    instagram_sender_id: senderId || null,
    message_count: messages.length,
    latest_message: latestMessage || null,
    conversation_intelligence: snapshot.conversationIntelligence,
    buyer_intelligence: snapshot.buyerIntelligence,
    revenue_intelligence: snapshot.revenueIntelligence,
    memory: snapshot.memory,
  });

  const { data: decision, error: decisionError } = await supabase
    .from("ros_revenue_decisions")
    .insert({
      user_id: userId,
      prospect_id: prospectId,
      conversation_id: conversationId || null,
      instagram_sender_id: senderId || null,
      source,
      best_next_action: snapshot.decision.bestNextAction,
      confidence: snapshot.decision.confidence,
      rationale: snapshot.decision.rationale || null,
      cta: snapshot.revenueIntelligence.recommendation || null,
      outcome_probabilities: snapshot.outcomeProbabilities,
      payload: snapshot,
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

  const dominantOutcome = Object.entries(snapshot.outcomeProbabilities)
    .filter(([key]) => defaultOutcomeKeys.includes(key))
    .sort(([, firstScore], [, secondScore]) => secondScore - firstScore)[0];

  if (dominantOutcome) {
    const outcomeAction = buildRevenueOutcomeAction(snapshot, dominantOutcome[0], outcomeProviders);

    const { data: outcome, error: outcomeError } = await supabase.from("ros_revenue_outcomes").insert({
      user_id: userId,
      prospect_id: prospectId,
      decision_id: decision?.id || null,
      conversation_id: conversationId || null,
      outcome_type: dominantOutcome[0],
      status: "pending",
      metadata: {
        probability: dominantOutcome[1],
        bestNextAction: snapshot.decision.bestNextAction,
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
      snapshot,
      providerSettings: outcomeProviders,
      source,
      autoOnly: true,
    }).catch(() => undefined);
  }

  await supabase.from("ros_learning_events").insert({
    user_id: userId,
    prospect_id: prospectId,
    decision_id: decision?.id || null,
    event_type: "decision_created",
    signal: snapshot.decision.bestNextAction,
    impact_score: snapshot.decision.confidence,
    metadata: {
      outcomeProbabilities: snapshot.outcomeProbabilities,
      rationale: snapshot.decision.rationale,
    },
  });

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
      confidence: snapshot.decision.confidence,
      bestNextAction: snapshot.decision.bestNextAction,
      framework: snapshot.revenueIntelligence.framework,
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

  return {
    prospectId,
    decisionId,
    outcomeId,
  };
}
