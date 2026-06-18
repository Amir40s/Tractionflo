import { settingsStateStorageKey } from "./notification-preferences";

export type QuickReplySetting = {
  id: string;
  label: string;
  text: string;
  enabled: boolean;
};

export type WelcomeMessageSetting = {
  text: string;
  enabled: boolean;
};

export type SavedReplySetting = {
  id: string;
  text: string;
  enabled: boolean;
};

export const quickRepliesChangedEvent = "tractionflo:quick-replies-changed";
export const welcomeMessageChangedEvent = "tractionflo:welcome-message-changed";
export const savedRepliesChangedEvent = "tractionflo:saved-replies-changed";
export const welcomeMessageLabel = "Welcome Message";

export const defaultQuickReplies: QuickReplySetting[] = [
  {
    id: "book-call",
    label: "Book a call",
    text: "Would you like to book a quick call? I can send over a time.",
    enabled: true,
  },
  {
    id: "send-pricing",
    label: "Send pricing",
    text: "Here is the pricing info. Which option are you interested in?",
    enabled: true,
  },
  {
    id: "share-program-info",
    label: "Share program info",
    text: "Here is the program info. Tell me what you want to know first.",
    enabled: true,
  },
];

export const defaultWelcomeMessage: WelcomeMessageSetting = {
  text: "Hi! Welcome. How can I help you today?",
  enabled: true,
};

export const defaultSavedReplies: SavedReplySetting[] = [
  {
    id: "thanks-reaching-out",
    text: "Thanks for reaching out! How can I help you today? 😊",
    enabled: true,
  },
  {
    id: "send-details",
    text: "Absolutely, I can send the details here.",
    enabled: true,
  },
  {
    id: "pricing-info",
    text: "Here is the pricing info. Which option are you interested in?",
    enabled: true,
  },
  {
    id: "more-detail",
    text: "Can you send a little more detail so I can point you the right way?",
    enabled: true,
  },
];

function cleanQuickReplyText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 600) || fallback : fallback;
}

function buildFallbackLabel(text: string) {
  const compactText = text.replace(/\s+/g, " ").trim();
  return compactText.length > 28 ? `${compactText.slice(0, 28).trim()}...` : compactText || "Quick reply";
}

function isStoredQuickReply(value: unknown): value is Partial<QuickReplySetting> {
  return Boolean(value && typeof value === "object" && "id" in value);
}

function isStoredSavedReply(value: unknown): value is Partial<SavedReplySetting> {
  return Boolean(value && typeof value === "object" && "id" in value);
}

export function normalizeQuickReplies(value: unknown): QuickReplySetting[] {
  if (!Array.isArray(value)) {
    return defaultQuickReplies;
  }

  return value
    .filter(isStoredQuickReply)
    .filter((reply): reply is Partial<QuickReplySetting> & { id: string } => typeof reply.id === "string" && Boolean(reply.id.trim()))
    .map((reply) => {
      const defaultReply = defaultQuickReplies.find((item) => item.id === reply.id);
      const text = cleanQuickReplyText(reply.text, defaultReply?.text || "");
      const label = cleanQuickReplyText(reply.label, defaultReply?.label || buildFallbackLabel(text));

      return {
        id: reply.id.trim(),
        label,
        text,
        enabled: typeof reply.enabled === "boolean" ? reply.enabled : defaultReply?.enabled ?? true,
      };
    })
    .filter((reply): reply is QuickReplySetting => Boolean(reply.label || reply.text));
}

export function normalizeWelcomeMessage(value: unknown): WelcomeMessageSetting {
  const settings = value && typeof value === "object" ? (value as Partial<WelcomeMessageSetting>) : {};

  return {
    text: typeof settings.text === "string" ? settings.text.slice(0, 600) : defaultWelcomeMessage.text,
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : defaultWelcomeMessage.enabled,
  };
}

export function normalizeSavedReplies(value: unknown): SavedReplySetting[] {
  if (!Array.isArray(value)) {
    return defaultSavedReplies;
  }

  return value
    .filter(isStoredSavedReply)
    .filter((reply): reply is Partial<SavedReplySetting> & { id: string } => typeof reply.id === "string" && Boolean(reply.id.trim()))
    .map((reply) => {
      const defaultReply = defaultSavedReplies.find((item) => item.id === reply.id);

      return {
        id: reply.id.trim(),
        text: typeof reply.text === "string" ? reply.text.slice(0, 600) : defaultReply?.text || "",
        enabled: typeof reply.enabled === "boolean" ? reply.enabled : defaultReply?.enabled ?? true,
      };
    });
}

export function readQuickRepliesFromStorage() {
  if (typeof window === "undefined") {
    return defaultQuickReplies;
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);

    if (!storedValue) {
      return defaultQuickReplies;
    }

    const parsed = JSON.parse(storedValue) as { quickReplies?: unknown };
    return normalizeQuickReplies(parsed.quickReplies);
  } catch {
    return defaultQuickReplies;
  }
}

export function readSavedRepliesFromStorage() {
  if (typeof window === "undefined") {
    return defaultSavedReplies;
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);

    if (!storedValue) {
      return defaultSavedReplies;
    }

    const parsed = JSON.parse(storedValue) as { savedReplies?: unknown };
    return normalizeSavedReplies(parsed.savedReplies);
  } catch {
    return defaultSavedReplies;
  }
}

export function readWelcomeMessageFromStorage() {
  if (typeof window === "undefined") {
    return defaultWelcomeMessage;
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);

    if (!storedValue) {
      return defaultWelcomeMessage;
    }

    const parsed = JSON.parse(storedValue) as { welcomeMessage?: unknown };
    return normalizeWelcomeMessage(parsed.welcomeMessage);
  } catch {
    return defaultWelcomeMessage;
  }
}

export function dispatchQuickRepliesChanged(quickReplies: QuickReplySetting[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(quickRepliesChangedEvent, {
      detail: normalizeQuickReplies(quickReplies),
    })
  );
}

export function dispatchSavedRepliesChanged(savedReplies: SavedReplySetting[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(savedRepliesChangedEvent, {
      detail: normalizeSavedReplies(savedReplies),
    })
  );
}

export function dispatchWelcomeMessageChanged(welcomeMessage: WelcomeMessageSetting) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(welcomeMessageChangedEvent, {
      detail: normalizeWelcomeMessage(welcomeMessage),
    })
  );
}
