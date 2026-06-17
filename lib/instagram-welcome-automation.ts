export type InstagramWelcomeAutomationSettings = {
  enabled: boolean;
  message: string;
  trigger: "first_dm";
};

export const instagramWelcomeAutomationMetadataKey = "instagram_welcome_automation";

export const defaultInstagramWelcomeAutomation: InstagramWelcomeAutomationSettings = {
  enabled: false,
  message:
    "Hey {first_name}, thanks for messaging us. How can I help you today?",
  trigger: "first_dm",
};

function sanitizeWelcomeMessage(value: unknown) {
  if (typeof value !== "string") {
    return defaultInstagramWelcomeAutomation.message;
  }

  const trimmed = value.trim();
  return trimmed
    ? trimmed.slice(0, 500)
    : defaultInstagramWelcomeAutomation.message;
}

export function normalizeInstagramWelcomeAutomation(
  value: unknown
): InstagramWelcomeAutomationSettings {
  const settings =
    value && typeof value === "object"
      ? (value as Partial<InstagramWelcomeAutomationSettings>)
      : {};

  return {
    enabled:
      typeof settings.enabled === "boolean"
        ? settings.enabled
        : defaultInstagramWelcomeAutomation.enabled,
    message: sanitizeWelcomeMessage(settings.message),
    trigger: "first_dm",
  };
}

export function renderInstagramWelcomeMessage({
  template,
  username,
  name,
}: {
  template: string;
  username?: string;
  name?: string;
}) {
  const displayName = name || username || "there";
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const handle = username ? `@${username}` : displayName;

  return sanitizeWelcomeMessage(template)
    .replaceAll("{first_name}", firstName)
    .replaceAll("{name}", displayName)
    .replaceAll("{instagram_handle}", handle);
}
