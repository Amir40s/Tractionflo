import Pusher from "pusher";
import type { User } from "@supabase/supabase-js";

export type RealtimeNotificationType =
  | "message"
  | "instagram"
  | "ai"
  | "escalation"
  | "billing"
  | "agent"
  | "profile"
  | "system";

export type RealtimeNotificationPayload = {
  id: string;
  type: RealtimeNotificationType;
  title: string;
  body: string;
  url?: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

type PusherServerConfig = {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
};

type PusherClientConfig = {
  key: string;
  cluster: string;
};

const realtimeEventName = "notification:new";
const globalChannel = "private-tractionflo-global";
const superAdminChannel = "private-tractionflo-superadmins";

let pusherClient: Pusher | null = null;

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

export function getPusherServerConfig(): PusherServerConfig | null {
  const appId = getEnvValue("PUSHER_APP_ID");
  const key = getEnvValue("PUSHER_KEY", "NEXT_PUBLIC_PUSHER_KEY");
  const secret = getEnvValue("PUSHER_SECRET");
  const cluster = getEnvValue("PUSHER_CLUSTER", "NEXT_PUBLIC_PUSHER_CLUSTER");

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  return { appId, key, secret, cluster };
}

export function getPusherClientConfig(): PusherClientConfig | null {
  const key = getEnvValue("NEXT_PUBLIC_PUSHER_KEY", "PUSHER_KEY");
  const cluster = getEnvValue("NEXT_PUBLIC_PUSHER_CLUSTER", "PUSHER_CLUSTER");

  if (!key || !cluster) {
    return null;
  }

  return { key, cluster };
}

export function isPusherConfigured() {
  return Boolean(getPusherServerConfig() && getPusherClientConfig());
}

export function getPusherServer() {
  const config = getPusherServerConfig();

  if (!config) {
    return null;
  }

  if (!pusherClient) {
    pusherClient = new Pusher({
      appId: config.appId,
      key: config.key,
      secret: config.secret,
      cluster: config.cluster,
      useTLS: true,
    });
  }

  return pusherClient;
}

export function getUserChannel(userId: string) {
  return `private-tractionflo-user-${userId}`;
}

export function getGlobalChannel() {
  return globalChannel;
}

export function getSuperAdminChannel() {
  return superAdminChannel;
}

export function getRealtimeEventName() {
  return realtimeEventName;
}

export function getUserRoleFlags(user: User) {
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const role = typeof metadata.role === "string" ? metadata.role.toLowerCase() : "";
  const accountRole = typeof metadata.account_role === "string" ? metadata.account_role.toLowerCase() : "";
  const isSuperAdmin =
    metadata.is_superadmin === true ||
    role === "superadmin" ||
    role === "super admin" ||
    accountRole === "superadmin" ||
    user.email?.toLowerCase() === "tractionflo@gmail.com";
  const isAgent = metadata.is_agent === true || accountRole === "agent" || role === "agent";

  return { isSuperAdmin, isAgent };
}

export function getAuthorizedPusherChannels(user: User) {
  const { isSuperAdmin } = getUserRoleFlags(user);
  const channels = [getGlobalChannel(), getUserChannel(user.id)];

  if (isSuperAdmin) {
    channels.push(getSuperAdminChannel());
  }

  return channels;
}

export function canAuthorizePusherChannel(user: User, channelName: string) {
  return getAuthorizedPusherChannels(user).includes(channelName);
}

export function createRealtimeNotification(
  notification: Omit<RealtimeNotificationPayload, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): RealtimeNotificationPayload {
  return {
    ...notification,
    id: notification.id || globalThis.crypto.randomUUID(),
    createdAt: notification.createdAt || new Date().toISOString(),
  };
}

export async function triggerRealtimeNotification(
  channels: string | string[],
  notification: Omit<RealtimeNotificationPayload, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
) {
  const pusher = getPusherServer();

  if (!pusher) {
    return { sent: false, reason: "Pusher is not configured" };
  }

  const targetChannels = Array.isArray(channels) ? channels : [channels];
  const uniqueChannels = Array.from(new Set(targetChannels.filter(Boolean)));

  if (uniqueChannels.length === 0) {
    return { sent: false, reason: "No Pusher channel selected" };
  }

  await pusher.trigger(uniqueChannels, realtimeEventName, createRealtimeNotification(notification));

  return { sent: true, channels: uniqueChannels };
}

export async function notifyUser(userId: string, notification: Parameters<typeof triggerRealtimeNotification>[1]) {
  return triggerRealtimeNotification(getUserChannel(userId), notification);
}

export async function notifySuperAdmins(notification: Parameters<typeof triggerRealtimeNotification>[1]) {
  return triggerRealtimeNotification(getSuperAdminChannel(), notification);
}

export async function notifyEveryone(notification: Parameters<typeof triggerRealtimeNotification>[1]) {
  return triggerRealtimeNotification(getGlobalChannel(), notification);
}
