export type ConversationContextMessage = {
  from?: "me" | "user" | "note";
  text?: string;
};

const monthPattern =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

const addOnLabels = {
  umpire: "Umpire",
  photography: "Photography",
  refreshments: "Refreshments",
  floodlights: "Floodlights",
  rackets: "Rackets",
  coaching: "Coaching",
} as const;

type AddOnKey = keyof typeof addOnLabels;

export type BookingMemory = {
  date?: string;
  time?: string;
  players?: string;
  matchType?: string;
  groundType?: string;
  phone?: string;
  addOns: Partial<Record<AddOnKey, "yes" | "no">>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getUserMessages(messages: ConversationContextMessage[] = []) {
  return messages.filter((message) => message.from === "user" && typeof message.text === "string" && message.text.trim());
}

function getLatestUserText(messages: ConversationContextMessage[] = []) {
  return getUserMessages(messages).at(-1)?.text?.trim() || "";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractDate(text: string) {
  const dateMatch =
    text.match(new RegExp(`\\b\\d{1,2}\\s*${monthPattern}\\s*\\d{0,4}\\b`, "i")) ||
    text.match(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/);

  return dateMatch ? normalizeWhitespace(dateMatch[0]) : "";
}

function extractTime(text: string) {
  const clockMatch = text.match(/\b(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:am|pm)\b/i) || text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/);

  if (clockMatch) {
    return normalizeWhitespace(clockMatch[0]);
  }

  const slotMatch = text.match(/\b(?:morning|afternoon|evening|night|late night)\b/i);
  return slotMatch ? titleCase(slotMatch[0].toLowerCase()) : "";
}

function extractPlayers(text: string) {
  const match = text.match(/\b(\d{1,3})\s*(?:players?|people|persons?|team members?)\b/i);
  return match ? `${match[1]} players` : "";
}

function extractMatchType(text: string) {
  const normalized = text.toLowerCase();

  if (normalized.includes("corporate")) return "Corporate match";
  if (normalized.includes("team match")) return "Team match";
  if (normalized.includes("tournament")) return "Tournament";
  if (normalized.includes("practice")) return "Practice";
  if (normalized.includes("match")) return "Match";

  return "";
}

function extractGroundType(text: string) {
  const normalized = text.toLowerCase();

  if (normalized.includes("main ground")) return "Main ground";
  if (normalized.includes("box cricket")) return "Box cricket";
  if (normalized.includes("practice net")) return "Practice nets";
  if (normalized.includes("indoor")) return "Indoor";
  if (normalized.includes("outdoor")) return "Outdoor";

  return "";
}

function extractPhone(text: string) {
  const match = text.match(/\b(?:\+92|0092|0)?3\d{2}[- ]?\d{7}\b/);
  return match ? normalizeWhitespace(match[0]) : "";
}

function addOnMentioned(text: string, addOn: AddOnKey) {
  const normalized = text.toLowerCase();

  if (addOn === "refreshments") {
    return /\brefreshments?\b/.test(normalized) || /\btea\b/.test(normalized) || /\bsnacks?\b/.test(normalized);
  }

  if (addOn === "floodlights") {
    return normalized.includes("floodlight") || normalized.includes("lights");
  }

  return normalized.includes(addOn);
}

function extractAddOnPreference(text: string, addOn: AddOnKey): "yes" | "no" | "" {
  if (!addOnMentioned(text, addOn)) {
    return "";
  }

  const normalized = text.toLowerCase();
  const negative = /\b(no|not|without|dont|don't|do not|no need|doesnt|doesn't)\b/.test(normalized);

  if (negative) {
    return "no";
  }

  const positive = /\b(yes|need|want|with|include|arrange|provide|required)\b/.test(normalized);
  return positive ? "yes" : "";
}

export function buildBookingMemory(messages: ConversationContextMessage[] = []) {
  const memory: BookingMemory = { addOns: {} };

  for (const message of getUserMessages(messages)) {
    const text = message.text || "";
    const date = extractDate(text);
    const time = extractTime(text);
    const players = extractPlayers(text);
    const matchType = extractMatchType(text);
    const groundType = extractGroundType(text);
    const phone = extractPhone(text);

    if (date) memory.date = date;
    if (time) memory.time = time;
    if (players) memory.players = players;
    if (matchType) memory.matchType = matchType;
    if (groundType) memory.groundType = groundType;
    if (phone) memory.phone = phone;

    (Object.keys(addOnLabels) as AddOnKey[]).forEach((addOn) => {
      const preference = extractAddOnPreference(text, addOn);
      if (preference) {
        memory.addOns[addOn] = preference;
      }
    });
  }

  return memory;
}

function getMissingBookingFields(memory: BookingMemory) {
  const missing: string[] = [];

  if (!memory.date) missing.push("preferred date");
  if (!memory.time) missing.push("preferred time");
  if (!memory.players) missing.push("number of players");
  if (!memory.phone) missing.push("phone number");

  return missing;
}

function hasBookingMemory(memory: BookingMemory) {
  return Boolean(
    memory.date ||
      memory.time ||
      memory.players ||
      memory.matchType ||
      memory.groundType ||
      memory.phone ||
      Object.keys(memory.addOns).length > 0
  );
}

function formatBookingSummary(memory: BookingMemory) {
  const parts = [memory.date, memory.time ? `at ${memory.time}` : "", memory.players ? `with ${memory.players}` : ""]
    .filter(Boolean)
    .join(" ");

  return parts || "your booking request";
}

function formatDeclinedAddOns(memory: BookingMemory) {
  const declined = (Object.entries(memory.addOns) as [AddOnKey, "yes" | "no"][])
    .filter(([, value]) => value === "no")
    .map(([key]) => addOnLabels[key]);

  if (declined.length === 0) {
    return "";
  }

  if (declined.length === 1) {
    return `${declined[0]} is marked as not needed.`;
  }

  return `${declined.slice(0, -1).join(", ")} and ${declined.at(-1)} are marked as not needed.`;
}

export function buildBookingFollowUpReply(messages: ConversationContextMessage[] = []) {
  const latestUserText = getLatestUserText(messages).toLowerCase();
  const memory = buildBookingMemory(messages);
  const missing = getMissingBookingFields(memory);
  const hasDetails = hasBookingMemory(memory);
  const declinedAddOns = formatDeclinedAddOns(memory);
  const addOnSentence = declinedAddOns ? ` ${declinedAddOns}` : "";

  if (!hasDetails) {
    return "";
  }

  const bookingSummary = formatBookingSummary(memory);
  const hasCoreBookingDetails = Boolean(memory.date && memory.time && memory.players);

  if (hasCoreBookingDetails && memory.phone) {
    return `Thanks, your booking request is noted for ${bookingSummary}. We have your phone number ${memory.phone}.${addOnSentence} Our team will confirm availability and share the final booking confirmation shortly.`;
  }

  if (hasCoreBookingDetails && !memory.phone) {
    return `Thanks for confirming your booking details for ${bookingSummary}.${addOnSentence} Please share your phone number to finalize the booking.`;
  }

  if (memory.phone) {
    const remainingFields = missing.filter((field) => field !== "phone number");
    return `Thanks, I have your phone number ${memory.phone}. Please share ${remainingFields.join(", ")} so we can finalize the booking.`;
  }

  if (latestUserText.includes("unsupported message")) {
    return "I could not read that message. Please send the remaining booking details in text so we can finalize it.";
  }

  return "";
}

export function buildBookingMemoryPrompt(messages: ConversationContextMessage[] = []) {
  const memory = buildBookingMemory(messages);
  const confirmed: string[] = [];
  const missing = getMissingBookingFields(memory);
  const addOns = Object.entries(memory.addOns).map(([key, value]) => `${addOnLabels[key as AddOnKey]}: ${value}`);

  if (memory.date) confirmed.push(`Preferred date: ${memory.date}`);

  if (memory.time) confirmed.push(`Preferred time: ${memory.time}`);

  if (memory.players) confirmed.push(`Number of players: ${memory.players}`);

  if (memory.matchType) confirmed.push(`Match type: ${memory.matchType}`);
  if (memory.groundType) confirmed.push(`Ground/court type: ${memory.groundType}`);
  if (memory.phone) confirmed.push(`Phone number: ${memory.phone}`);

  if (addOns.length > 0) {
    confirmed.push(...addOns);
  }

  return `Conversation memory:
- Already confirmed by the customer: ${confirmed.length > 0 ? confirmed.join("; ") : "none yet"}
- Still unknown: ${missing.join(", ") || "none from the standard booking fields"}

Rules:
- Do not ask again for any already confirmed detail.
- If the customer says no need / without / do not need an add-on, treat that add-on as declined and never ask for it again.
- If the user only sends a greeting (like "hi" or "hello"), respond ONLY with a friendly greeting and ask how you can help them. DO NOT ask for any booking or menu details in this message.
- If the latest user message supplies a missing detail, acknowledge it and move to the next missing step, availability check, quote, or phone number.
- Do not repeat the same question from the previous business reply.`;
}

export function shouldUseConversationAwareReply(messages: ConversationContextMessage[] = []) {
  const latestUserText = getLatestUserText(messages).toLowerCase();
  const hasBusinessReply = messages.some((message) => message.from === "me");
  const memory = buildBookingMemory(messages);

  if (!hasBusinessReply || !latestUserText) {
    return false;
  }

  if (hasBookingMemory(memory)) {
    return true;
  }

  return (
    /\b(no need|without|dont|don't|do not|ok|okay|yes|team match|players?|morning|afternoon|evening|night|unsupported message)\b/.test(latestUserText) ||
    Boolean(extractPhone(latestUserText)) ||
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/.test(latestUserText) ||
    new RegExp(`\\b\\d{1,2}\\s*${monthPattern}`, "i").test(latestUserText)
  );
}
