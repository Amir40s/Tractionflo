export type BrowserNotificationPermission = NotificationPermission | "unsupported";

type ShowBrowserOsNotificationOptions = {
  title: string;
  body: string;
  tag: string;
  url?: string;
  requireInteraction?: boolean;
};

type ShowBrowserOsNotificationResult = {
  delivered: boolean;
  method?: "service-worker" | "notification";
  reason?: string;
};

const notificationServiceWorkerPath = "/tractionflo-notifications-sw.js";

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" satisfies BrowserNotificationPermission;
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

async function getNotificationServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.register(notificationServiceWorkerPath, {
    scope: "/",
  });

  if (registration.active) {
    return registration;
  }

  return navigator.serviceWorker.ready;
}

export async function showBrowserOsNotification({
  title,
  body,
  tag,
  url,
  requireInteraction = true,
}: ShowBrowserOsNotificationOptions): Promise<ShowBrowserOsNotificationResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.info("OS notification skipped:", { reason: "unsupported", title });
    return { delivered: false, reason: "unsupported" };
  }

  if (Notification.permission !== "granted") {
    console.info("OS notification skipped:", { reason: Notification.permission, title });
    return { delivered: false, reason: Notification.permission };
  }

  const notificationOptions: NotificationOptions = {
    body,
    icon: "/favicon.ico",
    tag,
    data: { url },
    requireInteraction,
  };

  try {
    const registration = await getNotificationServiceWorker();

    if (registration) {
      await registration.showNotification(title, notificationOptions);
      console.info("OS notification sent:", { method: "service-worker", title, tag });
      return { delivered: true, method: "service-worker" };
    }
  } catch (error) {
    console.info("Service worker OS notification failed, using direct notification fallback:", error);
  }

  const browserNotification = new Notification(title, notificationOptions);

  if (url) {
    browserNotification.onclick = () => {
      window.focus();
      window.location.assign(url);
    };
  }

  console.info("OS notification sent:", { method: "notification", title, tag });
  return { delivered: true, method: "notification" };
}
