function compactText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value = "") {
  return compactText(value).toLowerCase();
}

export function hasExplicitBookingCtaRequest(text = "") {
  const normalized = normalizeText(text);

  if (!normalized) {
    return false;
  }

  return (
    /\b(?:book|schedule|set up|arrange)\b.*\b(?:call|meeting|appointment|consult|consultation|demo|zoom|chat)\b/.test(normalized) ||
    /\b(?:call|meeting|appointment|consult|consultation|demo|zoom|chat)\b.*\b(?:book|schedule|set up|arrange)\b/.test(normalized) ||
    /\b(?:can|could|may|should)\s+(?:i|we)\s+(?:talk|speak|call|chat|meet)\b/.test(normalized) ||
    /\b(?:i|we)\s+(?:want|wanna|would like|need|prefer)\s+(?:to\s+)?(?:talk|speak|call|chat|meet|discuss)\b/.test(normalized) ||
    /\b(?:talk|speak|chat)\s+(?:to|with)\s+(?:you|someone|a human|an agent|your team|sales|support)\b/.test(normalized) ||
    /\b(?:call me|call you|phone call|video call|zoom call|talk to you|speak to you|human agent|real person)\b/.test(normalized)
  );
}

export function getConditionalCtaPrompt(ctaMessage = "", latestUserText = "") {
  const cta = compactText(ctaMessage);

  if (!cta) {
    return "Preferred CTA: none configured.";
  }

  if (hasExplicitBookingCtaRequest(latestUserText)) {
    return `Preferred CTA: ${cta}
Booking/call CTA status: allowed because the latest customer message explicitly asked to talk, call, book, schedule, meet, or speak with someone.`;
  }

  return `Preferred CTA: hidden until the customer explicitly asks for a call or conversation.
Booking/call CTA status: blocked. Do not include booking links, Calendly links, call links, "book a call", "quick call", "schedule a call", or "discuss further on a call" unless the latest customer message explicitly asks to talk, call, book, schedule, meet, or speak with someone.`;
}

function containsBookingCta(text: string) {
  const normalized = normalizeText(text);

  return (
    /\bcalendly\.com\b|\bcal\.com\b|\bmeetings\.hubspot\.com\b|\bcalendar\.google\.com\b/.test(normalized) ||
    /\b(?:book|schedule|set up|arrange)\b.*\b(?:call|meeting|appointment|consult|consultation|demo|zoom|chat)\b/.test(normalized) ||
    /\b(?:quick call|book a call|schedule a call|call link|booking link|link to book|discuss further on a call)\b/.test(normalized)
  );
}

export function removeUnrequestedBookingCta(reply = "", latestUserText = "") {
  if (!reply.trim() || hasExplicitBookingCtaRequest(latestUserText)) {
    return reply;
  }

  const blocks = reply
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line && !containsBookingCta(line));

      return lines.join("\n").trim();
    })
    .filter(Boolean);

  const cleaned = blocks.join("\n\n").trim();

  if (cleaned) {
    return cleaned;
  }

  return reply
    .replace(/\[[^\]]*(?:book|schedule|call|meeting|appointment|consultation)[^\]]*\]\([^)]*(?:calendly\.com|cal\.com|meetings\.hubspot\.com|calendar\.google\.com)[^)]*\)/gi, "")
    .replace(/https?:\/\/(?:www\.)?(?:calendly\.com|cal\.com|meetings\.hubspot\.com|calendar\.google\.com)\/\S+/gi, "")
    .replace(/\b(?:here(?:'s| is)|use|tap|click|open|visit|you can use|you can book|book|schedule)\b[^.!?\n]*(?:book|schedule|call|meeting|appointment|consultation|calendly|cal\.com|booking link|call link)[^.!?\n]*[.!?]?/gi, "")
    .replace(/\b(?:Would you like to|You can|Let's|We can|I can)\b[^.!?]*(?:book|schedule|quick call|call link|booking link|discuss further on a call)[^.!?]*[.!?]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
