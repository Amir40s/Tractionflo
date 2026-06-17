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
  accepted?: boolean;
  method?: "service-worker" | "notification";
  reason?: string;
};

type BrowserNotificationOptions = NotificationOptions & {
  renotify?: boolean;
  silent?: boolean;
  timestamp?: number;
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

function openNotificationUrl(url?: string) {
  if (!url) {
    window.focus();
    return;
  }

  window.focus();
  window.location.assign(url);
}

async function showDirectBrowserNotification(
  title: string,
  notificationOptions: BrowserNotificationOptions,
  url?: string,
): Promise<ShowBrowserOsNotificationResult> {
  try {
    const browserNotification = new Notification(title, notificationOptions);

    if (url) {
      browserNotification.onclick = () => openNotificationUrl(url);
    }

    const result = await new Promise<ShowBrowserOsNotificationResult>((resolve) => {
      let settled = false;
      const settle = (value: ShowBrowserOsNotificationResult) => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(value);
      };

      browserNotification.onshow = () => {
        console.info("OS notification shown:", { method: "notification", title: notificationOptions.tag });
        settle({ delivered: true, accepted: true, method: "notification" });
      };

      browserNotification.onerror = () => {
        settle({ delivered: false, accepted: false, method: "notification", reason: "direct-notification-error" });
      };

      window.setTimeout(() => {
        settle({ delivered: false, accepted: true, method: "notification", reason: "direct-notification-not-confirmed" });
      }, 1400);
    });

    return result;
  } catch (error) {
    console.info("Direct OS notification failed:", error);
    return { delivered: false, accepted: false, method: "notification", reason: "direct-notification-failed" };
  }
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

  if (!window.isSecureContext) {
    console.info("OS notification skipped:", { reason: "insecure-context", title });
    return { delivered: false, reason: "insecure-context" };
  }

  if (Notification.permission !== "granted") {
    console.info("OS notification skipped:", { reason: Notification.permission, title });
    return { delivered: false, reason: Notification.permission };
  }

  const notificationOptions: BrowserNotificationOptions = {
    body,
    icon: "/favicon.ico",
    tag,
    data: { url },
    requireInteraction,
    renotify: true,
    silent: false,
    timestamp: Date.now(),
  };

  const directResult = await showDirectBrowserNotification(title, notificationOptions, url);

  if (directResult.delivered) {
    return directResult;
  }

  try {
    const registration = await getNotificationServiceWorker();

    if (registration) {
      await registration.showNotification(title, notificationOptions);
      console.info("OS notification accepted by service worker:", { method: "service-worker", title, tag });
      return {
        delivered: false,
        accepted: true,
        method: "service-worker",
        reason: directResult.reason || "service-worker-accepted-not-confirmed",
      };
    }
  } catch (error) {
    console.info("Service worker OS notification failed:", error);
  }

  return directResult.accepted
    ? directResult
    : { delivered: false, accepted: false, reason: directResult.reason || "not-displayed" };
}
