export type EscalationConversationMessage = {
  from?: "me" | "user" | "note";
  text?: string;
};

export type ConversationEscalation = {
  intent: "human_handoff" | "refund_request" | "complaint";
  reply: string;
  summary: string;
  recommendedAction: string;
  signals: string[];
  urgency: "Medium" | "High";
};

function getLatestUserText(messages: EscalationConversationMessage[] = []) {
  return [...messages]
    .reverse()
    .find((message) => message.from === "user" && typeof message.text === "string" && message.text.trim())
    ?.text?.trim() || "";
}

export function detectConversationEscalation(messages: EscalationConversationMessage[] = []): ConversationEscalation | null {
  const latestUserText = getLatestUserText(messages);
  const normalized = latestUserText.toLowerCase();

  if (!normalized) {
    return null;
  }

  const asksForHuman =
    /\b(human|real person|person|agent|representative|manager|support team|customer service)\b/.test(normalized) ||
    /\b(talk|speak|chat)\s+(?:to|with)\s+(?:a|an|the)?\s*(?:human|person|agent|manager|representative)\b/.test(normalized);
  const asksForRefund = /\b(refund|money back|return my money|give me my money|chargeback|cancel(?:lation)?|cancel my)\b/.test(normalized);
  const isComplaint =
    /\b(disappointed|not happy|unhappy|angry|upset|complaint|complain|bad service|poor service|terrible|worst|scam|issue|problem)\b/.test(
      normalized
    );

  if (asksForHuman) {
    return {
      intent: "human_handoff",
      reply: "Of course. I’ll have a team member take over from here so they can help you directly.",
      summary: "Customer asked to speak with a human.",
      recommendedAction: "Switch this conversation to human takeover and respond personally.",
      signals: ["Human requested"],
      urgency: asksForRefund || isComplaint ? "High" : "Medium",
    };
  }

  if (asksForRefund) {
    return {
      intent: "refund_request",
      reply: "I’m sorry about that. I’ll have a team member review your refund request and help you directly.",
      summary: "Customer requested a refund or money back.",
      recommendedAction: "Pause AI auto-send, review the order or booking, and handle the refund request manually.",
      signals: ["Refund requested"],
      urgency: "High",
    };
  }

  if (isComplaint) {
    return {
      intent: "complaint",
      reply: "I’m sorry you had that experience. I’ll have a team member review this and help you directly.",
      summary: "Customer expressed dissatisfaction or a service complaint.",
      recommendedAction: "Pause AI auto-send and let a human resolve the complaint.",
      signals: ["Customer complaint"],
      urgency: "High",
    };
  }

  return null;
}
