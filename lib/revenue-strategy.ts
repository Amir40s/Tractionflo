import type { ConversationEscalation } from "@/lib/conversation-escalation";
import type { RevenueOperatingSnapshot } from "@/lib/revenue-intelligence";

export type RevenueStrategyFramework =
  | "SPIN"
  | "Challenger"
  | "MEDDIC"
  | "BANT"
  | "Gap Selling"
  | "Consultative Selling"
  | "LAER"
  | "Jobs To Be Done";

export type RevenueStrategyInput = {
  latestText?: string;
  hasCatalogOffer?: boolean;
  hasPendingOrder?: boolean;
  escalation?: ConversationEscalation | null;
};

type StrategyDecision = {
  framework: RevenueStrategyFramework;
  method: RevenueOperatingSnapshot["revenueIntelligence"]["method"];
  nextQuestion: string;
  recommendation: string;
  bestNextAction: string;
  rationale: string;
  confidenceDelta: number;
  outcomeAdjustments: Partial<Record<keyof RevenueOperatingSnapshot["outcomeProbabilities"], number>>;
};

function normalizeText(value = "") {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function getMissing(snapshot: RevenueOperatingSnapshot) {
  const missing = new Set(snapshot.buyerIntelligence.missing.map((item) => item.toLowerCase()));

  if (!snapshot.buyerIntelligence.budget) missing.add("budget");
  if (!snapshot.buyerIntelligence.timeline) missing.add("timeline");
  if (!snapshot.buyerIntelligence.authority) missing.add("authority");
  if (!snapshot.buyerIntelligence.need) missing.add("need");
  if (!snapshot.buyerIntelligence.goal) missing.add("goal");
  if (!snapshot.buyerIntelligence.problem) missing.add("problem");

  return missing;
}

function chooseStrategy(snapshot: RevenueOperatingSnapshot, input: RevenueStrategyInput): StrategyDecision {
  const text = normalizeText(input.latestText);
  const missing = getMissing(snapshot);
  const objection = normalizeText(snapshot.conversationIntelligence.objection || snapshot.revenueIntelligence.objection);
  const readiness = normalizeText(snapshot.buyerIntelligence.readiness);
  const hasPriceObjection = objection.includes("cost") || objection.includes("price") || hasAny(text, [/\bexpensive\b/, /\btoo much\b/, /\bcost\b/, /\bprice\b/]);
  const hasEnterpriseSignal = hasAny(text, [/\bteam\b/, /\bcompany\b/, /\benterprise\b/, /\bagency\b/, /\bproposal\b/, /\bcontract\b/]);

  if (input.escalation && ["refund_request", "complaint", "human_handoff", "complex_question"].includes(input.escalation.intent)) {
    return {
      framework: "LAER",
      method: "escalate",
      nextQuestion: "",
      recommendation: input.escalation.recommendedAction,
      bestNextAction: "pause_ai_and_handoff_to_human",
      rationale: "Risk or trust-sensitive language requires listening, acknowledgement, exploration, and human resolution.",
      confidenceDelta: 8,
      outcomeAdjustments: { purchase_product: -25, collect_testimonial: -10 },
    };
  }

  if (input.hasPendingOrder) {
    return {
      framework: "Consultative Selling",
      method: "present_offer",
      nextQuestion: "Can you confirm this order so I can send the payment step?",
      recommendation: "Confirm the order and send the checkout or payment link.",
      bestNextAction: "confirm_order_then_send_checkout",
      rationale: "The buyer is already in the checkout path, so the highest-value move is removing friction from payment.",
      confidenceDelta: 10,
      outcomeAdjustments: { purchase_product: 95, recover_abandoned_cart: 35 },
    };
  }

  if (hasEnterpriseSignal || readiness === "high" && snapshot.decision.confidence >= 80) {
    return {
      framework: "MEDDIC",
      method: missing.has("authority") || missing.has("budget") ? "ask" : "present_offer",
      nextQuestion: missing.has("authority")
        ? "Who else should be involved before you decide?"
        : missing.has("budget")
          ? "What budget range should we keep this within?"
          : "",
      recommendation: "Confirm decision criteria, budget, authority, pain, and timeline before moving to proposal or payment.",
      bestNextAction: missing.has("authority") || missing.has("budget") ? "qualify_decision_process" : "present_proposal_or_checkout",
      rationale: "High-value or team-based opportunities need decision criteria and authority before closing.",
      confidenceDelta: 6,
      outcomeAdjustments: { book_call: 88, purchase_product: 82 },
    };
  }

  if (hasPriceObjection) {
    return {
      framework: "Challenger",
      method: "handle_objection",
      nextQuestion: "What outcome would make this feel worth the investment for you?",
      recommendation: "Reframe price around value, proof, guarantee, or a smaller next step before repeating the price.",
      bestNextAction: "reframe_value_then_offer_next_step",
      rationale: "Price resistance needs value insight and proof, not a generic discount response.",
      confidenceDelta: 5,
      outcomeAdjustments: { join_newsletter: 76, book_call: 70, purchase_product: 58 },
    };
  }

  if (missing.has("budget") || missing.has("timeline") || missing.has("authority")) {
    return {
      framework: "BANT",
      method: "ask",
      nextQuestion: missing.has("budget")
        ? "What budget range are you trying to stay within?"
        : missing.has("timeline")
          ? "When are you hoping to get this started?"
          : "Are you the person making the final decision on this?",
      recommendation: "Ask one qualification question before pushing a close.",
      bestNextAction: "ask_missing_qualification_question",
      rationale: "Budget, authority, need, and timeline determine whether to sell, nurture, or route to a call.",
      confidenceDelta: 4,
      outcomeAdjustments: { book_call: 68, purchase_product: 52 },
    };
  }

  if (missing.has("problem") || missing.has("need")) {
    return {
      framework: "SPIN",
      method: "ask",
      nextQuestion: "What are you trying to solve or improve right now?",
      recommendation: "Clarify situation, problem, implication, and need-payoff before presenting the offer.",
      bestNextAction: "diagnose_need_before_offer",
      rationale: "The buyer has not clearly stated the pain or need, so discovery should come before selling.",
      confidenceDelta: 2,
      outcomeAdjustments: { join_newsletter: 72, book_call: 48 },
    };
  }

  if (missing.has("goal")) {
    return {
      framework: "Jobs To Be Done",
      method: "ask",
      nextQuestion: "What are you hoping this helps you accomplish?",
      recommendation: "Identify the job the buyer wants done, then match the next step to that job.",
      bestNextAction: "identify_job_to_be_done",
      rationale: "A clear desired outcome makes the response more conversion-oriented.",
      confidenceDelta: 2,
      outcomeAdjustments: { join_newsletter: 70, book_call: 45 },
    };
  }

  if (input.hasCatalogOffer || readiness === "high") {
    return {
      framework: "Gap Selling",
      method: "present_offer",
      nextQuestion: "",
      recommendation: "Connect the current pain to the desired outcome, then present the most relevant offer or checkout step.",
      bestNextAction: "present_offer_and_close_gap",
      rationale: "The buyer has enough intent to move from diagnosis to a clear revenue step.",
      confidenceDelta: 7,
      outcomeAdjustments: { purchase_product: 84, book_call: 78 },
    };
  }

  return {
    framework: "Consultative Selling",
    method: "explain",
    nextQuestion: "Would you like the best option for your situation?",
    recommendation: "Answer the question, personalize the guidance, and offer one low-friction next step.",
    bestNextAction: "answer_and_offer_low_friction_next_step",
    rationale: "The safest revenue move is useful guidance plus a small next step.",
    confidenceDelta: 0,
    outcomeAdjustments: { follow_creator: 62, join_newsletter: 65 },
  };
}

function mergeOutcomeProbabilities(
  current: RevenueOperatingSnapshot["outcomeProbabilities"],
  adjustments: StrategyDecision["outcomeAdjustments"]
) {
  const nextAdjustments = Object.fromEntries(
    Object.entries(adjustments).map(([key, value]) => {
      const currentValue = current[key] || 0;
      const numericValue = Number(value) || 0;
      const nextValue = numericValue < 0 ? currentValue + numericValue : Math.max(currentValue, numericValue);

      return [key, Math.max(0, Math.min(100, Math.round(nextValue)))];
    })
  );

  return Object.fromEntries(
    Object.entries({
      ...current,
      ...nextAdjustments,
    }).map(([key, value]) => [key, Math.max(0, Math.min(100, Math.round(Number(value) || 0)))])
  );
}

export function applyRevenueStrategy(
  snapshot: RevenueOperatingSnapshot,
  input: RevenueStrategyInput = {}
): RevenueOperatingSnapshot {
  const strategy = chooseStrategy(snapshot, input);
  const confidence = Math.max(0, Math.min(100, snapshot.decision.confidence + strategy.confidenceDelta));

  return {
    ...snapshot,
    revenueIntelligence: {
      ...snapshot.revenueIntelligence,
      framework: strategy.framework,
      method: strategy.method,
      nextQuestion: strategy.nextQuestion,
      objection: snapshot.revenueIntelligence.objection || snapshot.conversationIntelligence.objection,
      recommendation: strategy.recommendation,
    },
    outcomeProbabilities: mergeOutcomeProbabilities(snapshot.outcomeProbabilities, strategy.outcomeAdjustments),
    decision: {
      ...snapshot.decision,
      bestNextAction: strategy.bestNextAction || snapshot.decision.bestNextAction,
      confidence,
      rationale: strategy.rationale || snapshot.decision.rationale,
    },
  };
}
