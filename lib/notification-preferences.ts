import type { RealtimeNotificationPayload } from "@/lib/pusher";

export type NotificationSetting = {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
};

export const settingsStateStorageKey = "tractionflo_settings_state";
export const notificationPreferencesChangedEvent = "tractionflo:notification-preferences-changed";

export const defaultNotificationSettings: NotificationSetting[] = [
  { id: "email", label: "Email notifications", value: "All important updates", enabled: true },
  { id: "push", label: "Push notifications", value: "On", enabled: true },
  { id: "digest", label: "Daily digest", value: "Every morning", enabled: true },
  { id: "escalation", label: "Escalation alerts", value: "Instant", enabled: true },
];

export function getDefaultNotificationValue(id: string) {
  if (id === "email") {
    return "All important updates";
  }

  if (id === "digest") {
    return "Every morning";
  }

  if (id === "escalation") {
    return "Instant";
  }

  return "On";
}

export function getNotificationOptions(id: string) {
  if (id === "email") {
    return ["Off", "All important updates", "Security and billing only", "Conversation summaries"];
  }

  if (id === "push") {
    return ["Off", "On", "Only urgent alerts"];
  }

  if (id === "digest") {
    return ["Off", "Every morning", "Every evening", "Weekly summary"];
  }

  if (id === "escalation") {
    return ["Off", "Instant", "Every 15 minutes", "Hourly"];
  }

  return ["Off", "Instant", "On"];
}

function isNotificationSetting(value: unknown): value is Partial<NotificationSetting> {
  return Boolean(value && typeof value === "object" && "id" in value);
}

export function normalizeNotificationSettings(value: unknown): NotificationSetting[] {
  const stored = Array.isArray(value) ? value.filter(isNotificationSetting) : [];

  return defaultNotificationSettings.map((defaultSetting) => {
    const storedSetting = stored.find((item) => item.id === defaultSetting.id);
    const options = getNotificationOptions(defaultSetting.id);
    const nextValue =
      typeof storedSetting?.value === "string" && options.includes(storedSetting.value)
        ? storedSetting.value
        : defaultSetting.value;
    const enabled =
      typeof storedSetting?.enabled === "boolean"
        ? storedSetting.enabled && nextValue !== "Off"
        : defaultSetting.enabled && nextValue !== "Off";

    return {
      ...defaultSetting,
      label: typeof storedSetting?.label === "string" && storedSetting.label ? storedSetting.label : defaultSetting.label,
      value: enabled ? nextValue : "Off",
      enabled,
    };
  });
}

export function readNotificationSettingsFromStorage() {
  if (typeof window === "undefined") {
    return defaultNotificationSettings;
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);

    if (!storedValue) {
      return defaultNotificationSettings;
    }

    const parsed = JSON.parse(storedValue) as { notifications?: unknown };
    return normalizeNotificationSettings(parsed.notifications);
  } catch {
    return defaultNotificationSettings;
  }
}

export function dispatchNotificationPreferencesChanged(notifications: NotificationSetting[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(notificationPreferencesChangedEvent, {
      detail: normalizeNotificationSettings(notifications),
    })
  );
}

function getSettingValue(settings: NotificationSetting[], id: string) {
  return (
    normalizeNotificationSettings(settings).find((setting) => setting.id === id) ||
    defaultNotificationSettings.find((setting) => setting.id === id) || {
      id,
      label: id,
      value: "Off",
      enabled: false,
    }
  );
}

function isUrgentNotification(notification: RealtimeNotificationPayload) {
  const metadata = notification.metadata || {};
  const urgency = typeof metadata.urgency === "string" ? metadata.urgency.toLowerCase() : "";
  const priority = typeof metadata.priority === "string" ? metadata.priority.toLowerCase() : "";

  return (
    metadata.urgent === true ||
    urgency === "high" ||
    priority === "high" ||
    notification.type === "message" ||
    notification.type === "billing" ||
    notification.type === "agent" ||
    notification.type === "system"
  );
}

function isEscalationNotification(notification: RealtimeNotificationPayload) {
  const metadata = notification.metadata || {};
  const category = typeof metadata.category === "string" ? metadata.category.toLowerCase() : "";
  const urgency = typeof metadata.urgency === "string" ? metadata.urgency.toLowerCase() : "";
  const title = notification.title.toLowerCase();

  return (
    category.includes("escalation") ||
    urgency === "high" ||
    title.includes("escalation") ||
    title.includes("handoff")
  );
}

function getEscalationThrottleMs(value: string) {
  if (value === "Every 15 minutes") {
    return 15 * 60 * 1000;
  }

  if (value === "Hourly") {
    return 60 * 60 * 1000;
  }

  return 0;
}

export function shouldDeliverRealtimeNotification({
  notification,
  settings,
  now = Date.now(),
  lastEscalationAt = 0,
}: {
  notification: RealtimeNotificationPayload;
  settings: NotificationSetting[];
  now?: number;
  lastEscalationAt?: number;
}) {
  const push = getSettingValue(settings, "push");
  const escalation = getSettingValue(settings, "escalation");

  if (!push.enabled || push.value === "Off") {
    return { deliver: false, lastEscalationAt };
  }

  if (push.value === "Only urgent alerts" && !isUrgentNotification(notification)) {
    return { deliver: false, lastEscalationAt };
  }

  if (isEscalationNotification(notification)) {
    if (!escalation.enabled || escalation.value === "Off") {
      return { deliver: false, lastEscalationAt };
    }

    const throttleMs = getEscalationThrottleMs(escalation.value);

    if (throttleMs > 0 && now - lastEscalationAt < throttleMs) {
      return { deliver: false, lastEscalationAt };
    }

    return { deliver: true, lastEscalationAt: now };
  }

  return { deliver: true, lastEscalationAt };
}
