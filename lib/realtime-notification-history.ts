import type { RealtimeNotificationPayload } from "@/lib/pusher";

export const realtimeNotificationEventName = "tractionflo:notification";
export const realtimeNotificationHistoryEventName = "tractionflo:notification-history";
export const realtimeNotificationHistoryStorageKey = "tractionflo:realtime-notification-history";
export const realtimeNotificationHistoryLimit = 5;

function isRealtimeNotificationPayload(value: unknown): value is RealtimeNotificationPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const notification = value as Partial<RealtimeNotificationPayload>;

  return (
    typeof notification.id === "string" &&
    typeof notification.type === "string" &&
    typeof notification.title === "string" &&
    typeof notification.body === "string" &&
    typeof notification.createdAt === "string"
  );
}

export function normalizeRealtimeNotificationHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRealtimeNotificationPayload)
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    .slice(0, realtimeNotificationHistoryLimit);
}

export function mergeRealtimeNotificationHistory(
  current: RealtimeNotificationPayload[],
  notification: RealtimeNotificationPayload
) {
  return normalizeRealtimeNotificationHistory([
    notification,
    ...current.filter((item) => item.id !== notification.id),
  ]);
}
