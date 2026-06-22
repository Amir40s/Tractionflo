"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Bot,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  PlugZap,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserOsNotification,
  type BrowserNotificationPermission,
} from "@/lib/browser-os-notifications";
import { shouldSuppressRealtimeNotification } from "@/lib/notification-preferences";
import type { RealtimeNotificationPayload, RealtimeNotificationType } from "@/lib/pusher";
import {
  mergeRealtimeNotificationHistory,
  normalizeRealtimeNotificationHistory,
  realtimeNotificationEventName,
  realtimeNotificationHistoryEventName,
  realtimeNotificationHistoryStorageKey,
} from "@/lib/realtime-notification-history";

type NotificationBellProps = {
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  iconSize?: number;
  dropdownClassName?: string;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

const defaultButtonClassName =
  "relative flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#e0e4ef] bg-white shadow-[0_12px_36px_rgba(20,28,53,0.025)] transition hover:bg-[#f6f7fb]";

function getNotificationIcon(type: RealtimeNotificationType): LucideIcon {
  switch (type) {
    case "message":
      return MessageCircle;
    case "instagram":
      return PlugZap;
    case "ai":
      return Bot;
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
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return normalizeRealtimeNotificationHistory(
      JSON.parse(window.localStorage.getItem(realtimeNotificationHistoryStorageKey) || "[]")
    ).filter((notification) => !shouldSuppressRealtimeNotification(notification));
  } catch {
    return [];
  }
}

function saveNotificationHistory(notifications: RealtimeNotificationPayload[]) {
  try {
    window.localStorage.setItem(realtimeNotificationHistoryStorageKey, JSON.stringify(notifications));
  } catch {
    // Storage can be unavailable in private browsing; the in-memory dropdown still works.
  }
}

function formatNotificationTime(createdAt: string) {
  const timestamp = Date.parse(createdAt);

  if (!Number.isFinite(timestamp)) {
    return "now";
  }

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (seconds < 60) {
    return "now";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round(hours / 24)}d`;
}

function getPermissionCopy(permission: BrowserNotificationPermission) {
  if (permission === "granted") {
    return {
      label: "OS notifications enabled",
      detail: "New realtime updates can appear as system notifications.",
      tone: "bg-[#eafaf0] text-[#13a84f]",
    };
  }

  if (permission === "denied") {
    return {
      label: "OS notifications blocked",
      detail: "Allow notifications for localhost:3000 in Chrome and macOS settings.",
      tone: "bg-[#fff0f3] text-[#df405b]",
    };
  }

  if (permission === "unsupported") {
    return {
      label: "OS notifications unavailable",
      detail: "This browser does not support system notifications.",
      tone: "bg-[#fff3e6] text-[#c07800]",
    };
  }

  return {
    label: "OS notifications need permission",
    detail: "Enable once, then new Pusher updates can show in the OS.",
    tone: "bg-[#f0edff] text-[#4b3cff]",
  };
}

async function sendPermissionTestNotification() {
  return showBrowserOsNotification({
    title: "TractionFlo OS notifications enabled",
    body: "Realtime Pusher updates can now appear on your desktop.",
    tag: `tractionflo-os-notifications-enabled-${Date.now()}`,
  });
}

export default function NotificationBell({
  ariaLabel = "Notifications",
  className = "",
  buttonClassName = defaultButtonClassName,
  iconSize = 18,
  dropdownClassName = "",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const [notifications, setNotifications] = useState<RealtimeNotificationPayload[]>(() => readNotificationHistory());
  const [unreadCount, setUnreadCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState<BrowserNotificationPermission>(() => getBrowserNotificationPermission());
  const [testStatus, setTestStatus] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    function handleNotification(event: Event) {
      const notification = (event as CustomEvent<RealtimeNotificationPayload>).detail;

      if (!notification?.id) {
        return;
      }

      if (shouldSuppressRealtimeNotification(notification)) {
        return;
      }

      setNotifications((current) => {
        const alreadyExists = current.some((item) => item.id === notification.id);
        const nextNotifications = mergeRealtimeNotificationHistory(current, notification);
        saveNotificationHistory(nextNotifications);

        if (!alreadyExists && !openRef.current) {
          setUnreadCount((count) => Math.min(9, count + 1));
        }

        return nextNotifications;
      });
    }

    function handleHistory(event: Event) {
      const history = normalizeRealtimeNotificationHistory(
        (event as CustomEvent<RealtimeNotificationPayload[]>).detail
      ).filter((notification) => !shouldSuppressRealtimeNotification(notification));

      setNotifications(history);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === realtimeNotificationHistoryStorageKey) {
        setNotifications(readNotificationHistory());
      }
    }

    window.addEventListener(realtimeNotificationEventName, handleNotification);
    window.addEventListener(realtimeNotificationHistoryEventName, handleHistory);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(realtimeNotificationEventName, handleNotification);
      window.removeEventListener(realtimeNotificationHistoryEventName, handleHistory);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updateDropdownPosition = () => {
      const buttonBox = wrapperRef.current?.getBoundingClientRect();

      if (!buttonBox) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const width = Math.min(360, Math.max(260, viewportWidth - 32));
      const left = Math.min(Math.max(16, buttonBox.right - width), Math.max(16, viewportWidth - width - 16));
      const top = Math.min(buttonBox.bottom + 10, window.innerHeight - 80);

      setDropdownPosition({ top, left, width });
    };

    updateDropdownPosition();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  function clearNotifications() {
    setNotifications([]);
    setUnreadCount(0);
    saveNotificationHistory([]);
    window.dispatchEvent(new CustomEvent(realtimeNotificationHistoryEventName, { detail: [] }));
  }

  async function requestOsNotificationPermission() {
    const nextPermission = await requestBrowserNotificationPermission();
    setBrowserPermission(nextPermission);

    if (nextPermission === "granted") {
      await sendPermissionTestNotification();
    }
  }

  async function sendRealtimeTestNotification() {
    setTestStatus("Sending...");

    try {
      if (getBrowserNotificationPermission() === "default") {
        await requestOsNotificationPermission();
      }

      const osNotificationResult = await showBrowserOsNotification({
        title: "TractionFlo test notification",
        body: "If you can see this, Chrome can show OS notifications for TractionFlo.",
        tag: `tractionflo-os-test-${Date.now()}`,
      });
      const didSendLocalNotification = osNotificationResult.delivered;

      if (!didSendLocalNotification) {
        setBrowserPermission(getBrowserNotificationPermission());
      }

      const response = await fetch("/api/notifications/test", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not send test notification");
      }

      const osMethodLabel = osNotificationResult.method === "service-worker" ? "service worker" : "browser";
      setTestStatus(didSendLocalNotification ? `OS test sent by ${osMethodLabel}` : "Pusher test sent");
      window.setTimeout(() => setTestStatus(""), 2200);
    } catch (error) {
      setTestStatus(error instanceof Error ? error.message : "Could not send test");
    }
  }

  const permissionCopy = getPermissionCopy(browserPermission);

  const dropdown = open && dropdownPosition && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={dropdownRef}
          className={`fixed z-[9998] overflow-hidden rounded-[12px] border border-[#dde3ee] bg-white shadow-[0_24px_70px_rgba(20,28,53,0.18)] ${dropdownClassName}`}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          <div className="flex items-center justify-between border-b border-[#edf0f6] px-4 py-3">
            <div>
              <h3 className="text-[13px] font-extrabold text-black">Notifications</h3>
              <p className="mt-0.5 text-[11px] font-semibold text-[#697083]">Latest 5 realtime updates</p>
            </div>
            {notifications.length > 0 ? (
              <button
                type="button"
                onClick={clearNotifications}
                className="flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[11px] font-extrabold text-[#596175] hover:bg-[#f6f7fb] hover:text-black"
              >
                <X size={13} strokeWidth={2.4} />
                Clear
              </button>
            ) : null}
          </div>

          <div className="border-b border-[#edf0f6] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold ${permissionCopy.tone}`}>
                  {permissionCopy.label}
                </span>
                <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-[#697083]">{permissionCopy.detail}</p>
                {testStatus ? <p className="mt-1 text-[10px] font-extrabold text-[#4b3cff]">{testStatus}</p> : null}
              </div>
              {browserPermission === "default" ? (
                <button
                  type="button"
                  onClick={() => void requestOsNotificationPermission()}
                  className="shrink-0 rounded-[8px] bg-[#3044ff] px-3 py-2 text-[11px] font-extrabold text-white shadow-[0_12px_24px_rgba(48,68,255,0.2)]"
                >
                  Enable
                </button>
              ) : browserPermission === "granted" ? (
                <button
                  type="button"
                  onClick={() => void sendRealtimeTestNotification()}
                  className="shrink-0 rounded-[8px] border border-[#dde3ee] bg-white px-3 py-2 text-[11px] font-extrabold text-black shadow-[0_12px_24px_rgba(20,28,53,0.04)] hover:bg-[#f6f7fb]"
                >
                  Send test
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => {
                const Icon = getNotificationIcon(notification.type);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      if (notification.url) {
                        window.location.assign(notification.url);
                      }
                    }}
                    className="flex w-full items-start gap-3 rounded-[9px] px-2 py-2.5 text-left hover:bg-[#f6f7fb]"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#f0edff] text-[#4b3cff]">
                      <Icon size={17} strokeWidth={2.35} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-start justify-between gap-3">
                        <span className="line-clamp-1 text-[12px] font-extrabold text-black">{notification.title}</span>
                        <span className="shrink-0 text-[10px] font-bold text-[#8b92a6]">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 text-[11px] font-semibold leading-relaxed text-[#596175]">
                        {notification.body}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto text-[#4b3cff]" size={24} strokeWidth={2.35} />
                <p className="mt-3 text-[12px] font-extrabold text-black">No realtime notifications yet</p>
                <p className="mx-auto mt-1 max-w-[220px] text-[11px] font-semibold leading-relaxed text-[#697083]">
                  New Pusher notifications will appear here as they arrive.
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => {
          setBrowserPermission(getBrowserNotificationPermission());

          setOpen((current) => {
            const nextOpen = !current;

            if (nextOpen) {
              setUnreadCount(0);
            }

            return nextOpen;
          });
        }}
        className={buttonClassName}
      >
        <Bell size={iconSize} strokeWidth={2.25} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#3044ff] px-1 text-[10px] font-extrabold text-white">
            {unreadCount}
          </span>
        ) : notifications.length > 0 ? (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#3044ff]" />
        ) : null}
      </button>
      {dropdown}
    </div>
  );
}
