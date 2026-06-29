"use client";

import { useEffect, useRef, useState } from "react";
import Pusher, { type Channel } from "pusher-js";
import { Bell, Bot, CheckCircle2, CreditCard, MessageCircle, PlugZap, TriangleAlert, UserRound, X } from "lucide-react";
import { requestBrowserNotificationPermission, showBrowserOsNotification } from "@/lib/browser-os-notifications";
import {
  notificationPreferencesChangedEvent,
  normalizeNotificationSettings,
  readNotificationSettingsFromStorage,
  settingsStateStorageKey,
  shouldDeliverRealtimeNotification,
  type NotificationSetting,
} from "@/lib/notification-preferences";
import type { RealtimeNotificationPayload, RealtimeNotificationType } from "@/lib/pusher";
import {
  mergeRealtimeNotificationHistory,
  normalizeRealtimeNotificationHistory,
  realtimeNotificationEventName,
  realtimeNotificationHistoryEventName,
  realtimeNotificationHistoryStorageKey,
} from "@/lib/realtime-notification-history";

type BootstrapResponse =
  | {
      enabled: true;
      key: string;
      cluster: string;
      eventName: string;
      channels: string[];
      preferences?: NotificationSetting[];
    }
  | {
      enabled: false;
      error?: string;
    };

type ToastNotification = RealtimeNotificationPayload & {
  visibleId: string;
};

const toastLifetimeMs = 6500;

function getNotificationIcon(type: RealtimeNotificationType) {
  switch (type) {
    case "message":
      return MessageCircle;
    case "instagram":
      return PlugZap;
    case "ai":
      return Bot;
    case "escalation":
      return TriangleAlert;
    case "billing":
      return CreditCard;
    case "agent":
      return UserRound;
    case "profile":
      return CheckCircle2;
    default:
      return Bell;
  }
}

function readNotificationHistory() {
  try {
    return normalizeRealtimeNotificationHistory(
      JSON.parse(window.localStorage.getItem(realtimeNotificationHistoryStorageKey) || "[]")
    );
  } catch {
    return [];
  }
}

function emitNotificationEvent(notification: RealtimeNotificationPayload) {
  const history = mergeRealtimeNotificationHistory(readNotificationHistory(), notification);

  try {
    window.localStorage.setItem(realtimeNotificationHistoryStorageKey, JSON.stringify(history));
  } catch {
    // Browsers can block storage in private contexts. The live event still updates the current window.
  }

  window.dispatchEvent(new CustomEvent(realtimeNotificationHistoryEventName, { detail: history }));
  window.dispatchEvent(new CustomEvent(realtimeNotificationEventName, { detail: notification }));

  // Auto-switch conversation to human takeover when the AI requested a handoff
  if (notification.metadata?.autoHumanTakeover && notification.metadata?.senderId) {
    window.dispatchEvent(
      new CustomEvent("tractionflo:human-takeover", {
        detail: { conversationId: notification.metadata.senderId },
      })
    );
  }
}

async function sendBrowserNotification(notification: RealtimeNotificationPayload) {
  const result = await showBrowserOsNotification({
    title: notification.title,
    body: notification.body,
    tag: notification.id,
    url: notification.url,
  });

  return result.delivered;
}

export default function RealtimeNotifications() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(() =>
    readNotificationSettingsFromStorage()
  );
  const notificationSettingsRef = useRef(notificationSettings);
  const lastEscalationAtRef = useRef(0);
  const pusherRef = useRef<Pusher | null>(null);
  const subscribedChannelsRef = useRef<Channel[]>([]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "default") {
      return;
    }

    let requested = false;
    const requestPermission = () => {
      if (requested || Notification.permission !== "default") {
        return;
      }

      requested = true;
      void requestBrowserNotificationPermission();
    };

    window.addEventListener("pointerdown", requestPermission, { once: true });
    window.addEventListener("keydown", requestPermission, { once: true });

    return () => {
      window.removeEventListener("pointerdown", requestPermission);
      window.removeEventListener("keydown", requestPermission);
    };
  }, []);

  useEffect(() => {
    function handlePreferenceEvent(event: Event) {
      const detail = (event as CustomEvent<NotificationSetting[]>).detail;
      setNotificationSettings(normalizeNotificationSettings(detail));
    }

    function handleStorageEvent(event: StorageEvent) {
      if (event.key === settingsStateStorageKey) {
        setNotificationSettings(readNotificationSettingsFromStorage());
      }
    }

    window.addEventListener(notificationPreferencesChangedEvent, handlePreferenceEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(notificationPreferencesChangedEvent, handlePreferenceEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function connect() {
      try {
        const response = await fetch("/api/notifications/bootstrap", { cache: "no-store" });
        const bootstrap = (await response.json()) as BootstrapResponse;

        if (!isMounted || !bootstrap.enabled) {
          if (bootstrap.enabled === false && bootstrap.error) {
            console.info("Realtime notifications disabled:", bootstrap.error);
          }
          return;
        }

        if (bootstrap.preferences) {
          const nextSettings = normalizeNotificationSettings(bootstrap.preferences);
          notificationSettingsRef.current = nextSettings;
          setNotificationSettings(nextSettings);
        }

        const pusher = new Pusher(bootstrap.key, {
          cluster: bootstrap.cluster,
          channelAuthorization: {
            endpoint: "/api/notifications/pusher-auth",
            transport: "ajax",
          },
        });

        pusherRef.current = pusher;
        subscribedChannelsRef.current = bootstrap.channels.map((channelName) => {
          const channel = pusher.subscribe(channelName);

          channel.bind(bootstrap.eventName, async (notification: RealtimeNotificationPayload) => {
            if (!notification?.id || !notification.title) {
              return;
            }

            const delivery = shouldDeliverRealtimeNotification({
              notification,
              settings: notificationSettingsRef.current,
              lastEscalationAt: lastEscalationAtRef.current,
            });
            lastEscalationAtRef.current = delivery.lastEscalationAt;

            if (!delivery.deliver) {
              return;
            }

            emitNotificationEvent(notification);
            const didShowBrowserNotification = await sendBrowserNotification(notification);

            if (didShowBrowserNotification) {
              return;
            }

            setToasts((current) => {
              if (current.some((toast) => toast.id === notification.id)) {
                return current;
              }

              return [
                {
                  ...notification,
                  visibleId: `${notification.id}-${Date.now()}`,
                },
                ...current,
              ].slice(0, 4);
            });

            window.setTimeout(() => {
              setToasts((current) => current.filter((toast) => toast.id !== notification.id));
            }, toastLifetimeMs);
          });

          return channel;
        });
      } catch (error) {
        console.error("Realtime notification connection error:", error);
      }
    }

    connect();

    return () => {
      isMounted = false;
      subscribedChannelsRef.current.forEach((channel) => {
        channel.unbind_all();
      });
      subscribedChannelsRef.current = [];
      pusherRef.current?.disconnect();
      pusherRef.current = null;
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(360px,calc(100vw-32px))] flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = getNotificationIcon(toast.type);
        return (
          <div
            key={toast.visibleId}
            className="pointer-events-auto overflow-hidden rounded-[8px] border border-[#e0e4ef] bg-white shadow-[0_18px_55px_rgba(20,28,53,0.18)]"
          >
            <button
              type="button"
              onClick={() => {
                if (toast.url) {
                  window.location.assign(toast.url);
                }
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0edff] text-[#4b3cff]">
                <Icon size={18} strokeWidth={2.35} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold leading-snug text-black">{toast.title}</span>
                <span className="mt-1 block text-[12px] font-semibold leading-relaxed text-[#596175]">{toast.body}</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setToasts((current) => current.filter((item) => item.id !== toast.id));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setToasts((current) => current.filter((item) => item.id !== toast.id));
                  }
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#667085] hover:bg-[#f5f6fb] hover:text-black"
                aria-label="Dismiss notification"
              >
                <X size={15} strokeWidth={2.4} />
              </span>
            </button>
            <span className="block h-1 animate-[tractionflo-toast-timer_6.5s_linear_forwards] bg-[#4b3cff]" />
          </div>
        );
      })}
    </div>
  );
}
