export type EscalationConversationMessage = {
  from?: "me" | "user" | "note";
  text?: string;
  attachments?: { type?: string; name?: string }[];
  time?: string;
};

export type ConversationEscalationIntent =
  | "human_handoff"
  | "refund_request"
  | "complaint"
  | "partnership"
  | "high_ticket_lead"
  | "bulk_order"
  | "urgent_order"
  | "complex_question";

export type ConversationEscalation = {
  intent: ConversationEscalationIntent;
  label: string;
  reply: string;
  summary: string;
  recommendedAction: string;
  signals: string[];
  urgency: "Medium" | "High";
};

export type EscalationRuleSetting = {
  id: string;
  label: string;
  action: string;
  priority: string;
  enabled: boolean;
};

export const escalationRulesMetadataKey = "escalation_rules";
export const escalationRulesChangedEvent = "tractionflo:escalation-rules-changed";

export const defaultEscalationRuleSettings: EscalationRuleSetting[] = [
  { id: "refunds", label: "Refund requests", action: "Always escalate", priority: "High", enabled: true },
  { id: "complaints", label: "Complaints", action: "High priority", priority: "High", enabled: true },
  { id: "human_handoff", label: "Human handoff requests", action: "Always escalate", priority: "High", enabled: true },
];

function isEscalationRuleSetting(value: unknown): value is Partial<EscalationRuleSetting> & { id: string } {
  return Boolean(value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string");
}

export function normalizeEscalationRuleSettings(value: unknown): EscalationRuleSetting[] {
  const stored = Array.isArray(value) ? value.filter(isEscalationRuleSetting) : [];
  const defaultIds = new Set(defaultEscalationRuleSettings.map((rule) => rule.id));
  const mergedDefaults = defaultEscalationRuleSettings.map((defaultRule) => {
    const storedRule = stored.find((rule) => rule.id === defaultRule.id);

    return {
      ...defaultRule,
      label: typeof storedRule?.label === "string" && storedRule.label.trim() ? storedRule.label.trim() : defaultRule.label,
      action: typeof storedRule?.action === "string" && storedRule.action.trim() ? storedRule.action.trim() : defaultRule.action,
      priority: typeof storedRule?.priority === "string" && storedRule.priority.trim() ? storedRule.priority.trim() : defaultRule.priority,
      enabled: typeof storedRule?.enabled === "boolean" ? storedRule.enabled : defaultRule.enabled,
    };
  });
  const customRules = stored
    .filter((rule) => rule.id.startsWith("custom") && !defaultIds.has(rule.id))
    .map((rule) => ({
      id: rule.id,
      label: typeof rule.label === "string" && rule.label.trim() ? rule.label.trim() : "Custom rule",
      action: typeof rule.action === "string" && rule.action.trim() ? rule.action.trim() : "Escalate for approval",
      priority: typeof rule.priority === "string" && rule.priority.trim() ? rule.priority.trim() : "Medium",
      enabled: typeof rule.enabled === "boolean" ? rule.enabled : true,
    }));

  return [...mergedDefaults, ...customRules];
}

export function dispatchEscalationRulesChanged(rules: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(escalationRulesChangedEvent, {
      detail: normalizeEscalationRuleSettings(rules),
    })
  );
}

function normalizeText(value = "") {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function getLatestUserText(messages: EscalationConversationMessage[] = []) {
  return [...messages]
    .reverse()
    .find((message) => message.from === "user" && typeof message.text === "string" && message.text.trim())
    ?.text?.trim() || "";
}

function includesKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasHumanRequest(text: string) {
  return (
    /\b(human|real person|person|agent|representative|manager|support team|customer service)\b/.test(text) ||
    /\b(talk|speak|chat)\s+(?:to|with)\s+(?:a|an|the)?\s*(?:human|person|agent|manager|representative)\b/.test(text)
  );
}

function hasRefundRequest(text: string) {
  return /\b(refund|money back|return my money|give me my money|chargeback|cancel(?:lation)?|cancel my|reverse payment)\b/.test(text);
}

function hasComplaint(text: string) {
  return /\b(disappointed|not happy|unhappy|angry|upset|complaint|complain|bad service|poor service|terrible|worst|scam|issue|problem|broken|damaged|wrong item|wrong order|missing item)\b/.test(text);
}

function hasPartnershipDealValue(text: string) {
  const amountMatches = [
    ...text.matchAll(/\b(?:\$|usd|pkr|rs\.?)\s?([1-9][\d,]*(?:\.\d+)?)\b/g),
    ...text.matchAll(/\b([1-9][\d,]*(?:\.\d+)?)\s?(?:usd|pkr|rs)\b/g),
  ];

  return amountMatches.some((match) => {
    const amount = Number((match[1] || "").replace(/,/g, ""));
    return Number.isFinite(amount) && amount >= 2500;
  });
}

function hasPartnership(text: string) {
  const hasGeneralPartnershipLanguage = /\b(partner|partnership|collab|collaboration)\b/.test(text);
  const hasFormalDealLanguage = /\b(sponsor|sponsored|brand deal|brand collaboration|campaign|affiliate|ambassador|influencer)\b/.test(text);
  const hasDealPlanningLanguage = /\b(budget|paid|payment|rate|rates|proposal|contract|deliverables|media kit|commission)\b/.test(text);

  return hasFormalDealLanguage || (hasGeneralPartnershipLanguage && (hasDealPlanningLanguage || hasPartnershipDealValue(text)));
}

function hasBulkQuantity(text: string) {
  return /\b(?:[2-9]\d|1\d{2,}|[1-9]\d{3,})\s?(?:pairs?|pieces?|pcs|units?|items?|orders?|shirts?|t\s?-?\s?shirts?|tees?|hoodies?|sets?|boxes?|cartons?|products?)\b/.test(text);
}

function hasBulkOrder(text: string) {
  return hasBulkQuantity(text) || includesKeyword(text, ["bulk", "wholesale", "large order", "big order", "company order", "group order", "corporate order"]);
}

function hasUrgentOrder(text: string) {
  return (
    includesKeyword(text, ["urgent", "asap", "today", "tonight", "tomorrow", "rush", "immediately", "same day"]) &&
    /\b(order|buy|purchase|book|reserve|need|required|want|confirm|available|delivery|deliver)\b/.test(text)
  );
}

function hasHighTicketLead(text: string) {
  const hasLargeCurrencyAmount = /\b(?:\$|rs\.?|pkr|usd)\s?[1-9]\d{3,}\b|\b[1-9]\d{3,}\s?(?:usd|pkr|rs)\b/.test(text);

  return (
    /\b(?:ready to buy|want to buy|want to order|place order|confirm order|send payment|payment link|checkout|buy now|book now|reserve it|reserve this)\b/.test(text) ||
    hasLargeCurrencyAmount ||
    (/\b(price|pricing|quote|invoice|payment|advance|deposit)\b/.test(text) && hasBulkOrder(text))
  );
}

function hasComplexQuestion(text: string) {
  return /\b(complex|not in your knowledge|not listed|not sure|legal|medical|injury|injured|allergy|sensitive issue)\b/.test(text);
}

function getRuleIdForIntent(intent: ConversationEscalationIntent) {
  if (intent === "refund_request") return "refunds";
  if (intent === "complaint") return "complaints";
  if (intent === "partnership") return "partnerships";
  if (intent === "high_ticket_lead") return "vip";
  if (intent === "bulk_order") return "bulk_orders";
  if (intent === "urgent_order") return "urgent_orders";
  if (intent === "human_handoff" || intent === "complex_question") return "human_handoff";
  return "";
}

function isIntentEnabled(intent: ConversationEscalationIntent, rules: EscalationRuleSetting[]) {
  const ruleId = getRuleIdForIntent(intent);
  const rule = rules.find((item) => item.id === ruleId);

  if (!rule) {
    return true;
  }

  return rule.enabled && rule.action !== "Monitor only";
}

function buildEscalationsForText(normalized: string, rules: EscalationRuleSetting[]): ConversationEscalation[] {
  const escalations: ConversationEscalation[] = [];

  if (hasRefundRequest(normalized) && isIntentEnabled("refund_request", rules)) {
    escalations.push({
      intent: "refund_request",
      label: "Refund Request",
      reply: "I’m sorry about that. I’ll have a team member review your refund request and help you directly.",
      summary: "Customer requested a refund, cancellation, chargeback, or money-back help.",
      recommendedAction: "Pause AI auto-send, review the order/payment details, and handle the refund request manually.",
      signals: ["Refund or cancellation language"],
      urgency: "High",
    });
  }

  if (hasComplaint(normalized) && isIntentEnabled("complaint", rules)) {
    escalations.push({
      intent: "complaint",
      label: "Complaint",
      reply: "I’m sorry you had that experience. I’ll have a team member review this and help you directly.",
      summary: "Customer expressed dissatisfaction, product issue, or service complaint.",
      recommendedAction: "Pause AI auto-send, acknowledge the complaint, collect the order/context, and resolve it manually.",
      signals: ["Complaint or product issue language"],
      urgency: "High",
    });
  }

  if (hasBulkOrder(normalized) && isIntentEnabled("bulk_order", rules)) {
    const urgentBulkOrder = hasUrgentOrder(normalized);

    escalations.push({
      intent: "bulk_order",
      label: urgentBulkOrder ? "Urgent Bulk Order" : "Bulk / Big Order",
      reply: "Thanks for the details. This looks like a larger order, so I’ll have a team member confirm stock, timeline, pricing, and payment details with you directly.",
      summary: "Customer asked about a bulk, wholesale, custom, or large-quantity order.",
      recommendedAction: "Take over to confirm quantity, stock, customization, delivery deadline, pricing, and advance payment.",
      signals: ["Bulk or large quantity order"],
      urgency: urgentBulkOrder ? "High" : "Medium",
    });
  }

  if (hasUrgentOrder(normalized) && isIntentEnabled("urgent_order", rules)) {
    escalations.push({
      intent: "urgent_order",
      label: "Urgent Order",
      reply: "Got it. Since this is urgent, I’ll have a team member confirm availability and timing with you directly.",
      summary: "Customer needs an urgent or time-sensitive order.",
      recommendedAction: "Take over immediately to confirm availability, delivery feasibility, and payment timing.",
      signals: ["Urgent order language"],
      urgency: "High",
    });
  }

  if (hasPartnership(normalized) && isIntentEnabled("partnership", rules)) {
    escalations.push({
      intent: "partnership",
      label: "Partnership Inquiry",
      reply: "Thanks for reaching out about a partnership. I’ll have a team member review the collaboration details and follow up directly.",
      summary: "Customer asked about partnership, collaboration, sponsor, affiliate, or brand deal work.",
      recommendedAction: "Take over and ask for campaign scope, brand details, budget, deliverables, timeline, and contact information.",
      signals: ["Partnership or brand collaboration language"],
      urgency: "Medium",
    });
  }

  if (hasHighTicketLead(normalized) && isIntentEnabled("high_ticket_lead", rules)) {
    escalations.push({
      intent: "high_ticket_lead",
      label: "High-Ticket Lead",
      reply: "Thanks. This looks like a high-priority order, so I’ll have a team member confirm the next steps with you directly.",
      summary: "Customer appears ready to buy, book, pay, or discuss a high-value order.",
      recommendedAction: "Review immediately and move the conversation toward pricing, payment, booking, or checkout.",
      signals: ["High-ticket buying intent"],
      urgency: "High",
    });
  }

  if (hasHumanRequest(normalized) && isIntentEnabled("human_handoff", rules)) {
    escalations.push({
      intent: "human_handoff",
      label: "Human Requested",
      reply: "Of course. I’ll have a team member take over from here so they can help you directly.",
      summary: "Customer asked to speak with a human.",
      recommendedAction: "Switch this conversation to human takeover and respond personally.",
      signals: ["Human requested"],
      urgency: "Medium",
    });
  }

  if (hasComplexQuestion(normalized) && isIntentEnabled("complex_question", rules)) {
    escalations.push({
      intent: "complex_question",
      label: "Complex Question",
      reply: "I want to make sure you get the right answer. I’ll have a team member review this and help you directly.",
      summary: "Customer asked a complex or sensitive question that should be reviewed by a human.",
      recommendedAction: "Take over before AI continues because the request may need human judgment.",
      signals: ["Complex or sensitive question"],
      urgency: "Medium",
    });
  }

  return escalations;
}

function getEscalationMessageTime(message: EscalationConversationMessage) {
  const time = message.time ? new Date(message.time).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

export function detectConversationEscalations(
  messages: EscalationConversationMessage[] = [],
  options: { rules?: unknown } = {}
): ConversationEscalation[] {
  const rules = normalizeEscalationRuleSettings(options.rules);
  const seenIntents = new Set<ConversationEscalationIntent>();

  return messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.from === "user" && typeof message.text === "string" && message.text.trim())
    .sort((a, b) => getEscalationMessageTime(b.message) - getEscalationMessageTime(a.message) || b.index - a.index)
    .flatMap(({ message }) => buildEscalationsForText(normalizeText(message.text), rules))
    .filter((escalation) => {
      if (seenIntents.has(escalation.intent)) {
        return false;
      }

      seenIntents.add(escalation.intent);
      return true;
    });
}

export function detectConversationEscalation(
  messages: EscalationConversationMessage[] = [],
  options: { rules?: unknown } = {}
): ConversationEscalation | null {
  const latestUserText = getLatestUserText(messages);
  const normalized = normalizeText(latestUserText);
  const rules = normalizeEscalationRuleSettings(options.rules);

  if (!normalized) {
    return null;
  }

  return buildEscalationsForText(normalized, rules)[0] || null;
}

export function shouldPauseAiForEscalation(escalation: ConversationEscalation | null | undefined) {
  if (!escalation) {
    return false;
  }

  return (
    escalation.intent === "human_handoff" ||
    escalation.intent === "refund_request" ||
    escalation.intent === "complaint" ||
    escalation.intent === "complex_question"
  );
}
