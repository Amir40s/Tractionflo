import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isEmailConfigured } from "@/lib/mailer";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PlatformTone = "green" | "amber" | "red" | "purple";

type ServiceRow = {
  name: string;
  detail: string;
  status: string;
  tone: PlatformTone;
  latency: string;
  config: string;
  incidents: string;
  owner: string;
};

type QueueRow = {
  name: string;
  detail: string;
  queue: string;
  pending: string;
  oldest: string;
  retries: string;
  worker: string;
  status: string;
  tone: PlatformTone;
};

function getMetadata(user: User) {
  return (user.user_metadata || {}) as Record<string, unknown>;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function isSuperAdminUser(user: User) {
  const metadata = getMetadata(user);
  const role = getMetadataString(metadata, "role").toLowerCase();
  const accountRole = getMetadataString(metadata, "account_role").toLowerCase();

  return (
    metadata.is_superadmin === true ||
    role === "superadmin" ||
    role === "super admin" ||
    accountRole === "superadmin" ||
    user.email?.toLowerCase() === "tractionflo@gmail.com"
  );
}

function formatRelativeTime(value?: string | number | null) {
  if (!value) {
    return "No activity";
  }

  const timestamp = typeof value === "number" ? value : new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "No activity";
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getServiceTone(status: string): PlatformTone {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("healthy") || normalizedStatus.includes("configured") || normalizedStatus.includes("live")) {
    return "green";
  }

  if (normalizedStatus.includes("issue") || normalizedStatus.includes("failed") || normalizedStatus.includes("error")) {
    return "red";
  }

  return "amber";
}

async function getTableCount(tableName: string) {
  const supabase = createSupabaseServiceClient();
  const startedAt = performance.now();
  const { count, error } = await supabase.from(tableName).select("*", { count: "exact", head: true });
  const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));

  return {
    count: count || 0,
    error: error?.message || "",
    latencyMs,
  };
}

async function getMessageStats() {
  try {
    const supabase = createSupabaseServiceClient();
    const totalResult = await supabase.from("messages").select("timestamp", { count: "exact" }).order("timestamp", { ascending: false }).limit(1);

    if (totalResult.error) {
      return {
        tableAvailable: false,
        totalMessages: 0,
        messagesToday: 0,
        latestMessageAt: null as number | null,
        error: totalResult.error.message,
      };
    }

    const latestMessage = totalResult.data?.[0] as { timestamp?: number | string | null } | undefined;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayResult = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", startOfDay.getTime());

    return {
      tableAvailable: true,
      totalMessages: totalResult.count || 0,
      messagesToday: todayResult.error ? 0 : todayResult.count || 0,
      latestMessageAt:
        typeof latestMessage?.timestamp === "number"
          ? latestMessage.timestamp
          : typeof latestMessage?.timestamp === "string"
            ? Number(latestMessage.timestamp)
            : null,
      error: todayResult.error?.message || "",
    };
  } catch (error) {
    return {
      tableAvailable: false,
      totalMessages: 0,
      messagesToday: 0,
      latestMessageAt: null as number | null,
      error: error instanceof Error ? error.message : "Could not read messages table",
    };
  }
}

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSuperAdminUser(user)) {
      return NextResponse.json({ error: "Only superadmins can view platform health." }, { status: 403 });
    }

    const [instagramAccounts, messages] = await Promise.all([getTableCount("instagram_accounts"), getMessageStats()]);
    const databaseHealthy = !instagramAccounts.error;
    const metaConfigured = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_VERIFY_TOKEN);
    const webhookConfigured = Boolean(process.env.META_VERIFY_TOKEN);
    const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);
    const emailConfigured = isEmailConfigured();
    const paymentConfigured = Boolean(process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    const serviceRows: ServiceRow[] = [
      {
        name: "Instagram API",
        detail: "Meta graph and messaging",
        status: metaConfigured ? (instagramAccounts.count > 0 ? "Healthy" : "No accounts") : "Not configured",
        tone: metaConfigured ? (instagramAccounts.count > 0 ? "green" : "amber") : "red",
        latency: instagramAccounts.error ? "Error" : `${instagramAccounts.latencyMs}ms`,
        config: metaConfigured ? "Configured" : "Missing env",
        incidents: instagramAccounts.error ? "1" : "0",
        owner: "Platform",
      },
      {
        name: "OpenAI API",
        detail: "Drafts and qualification",
        status: openAiConfigured ? "Configured" : "Not configured",
        tone: openAiConfigured ? "green" : "amber",
        latency: "On demand",
        config: openAiConfigured ? "Configured" : "Missing key",
        incidents: "0",
        owner: "AI",
      },
      {
        name: "Database",
        detail: "Supabase service role",
        status: databaseHealthy ? "Healthy" : "Issue",
        tone: databaseHealthy ? "green" : "red",
        latency: instagramAccounts.error ? "Error" : `${instagramAccounts.latencyMs}ms`,
        config: databaseHealthy ? "Connected" : "Query failed",
        incidents: instagramAccounts.error ? "1" : "0",
        owner: "Platform",
      },
      {
        name: "Webhook endpoint",
        detail: "Meta callback verification",
        status: webhookConfigured ? "Configured" : "Not configured",
        tone: webhookConfigured ? "green" : "amber",
        latency: "Direct",
        config: webhookConfigured ? "Verify token set" : "Missing token",
        incidents: webhookConfigured ? "0" : "1",
        owner: "Platform",
      },
      {
        name: "Email service",
        detail: "Operational notifications",
        status: emailConfigured ? "Configured" : "Not configured",
        tone: emailConfigured ? "green" : "amber",
        latency: "On demand",
        config: emailConfigured ? "Configured" : "Missing provider",
        incidents: "0",
        owner: "Support",
      },
      {
        name: "Payment service",
        detail: "Checkout provider",
        status: paymentConfigured ? "Configured" : "Metadata only",
        tone: paymentConfigured ? "green" : "amber",
        latency: "On demand",
        config: paymentConfigured ? "Stripe env set" : "No Stripe env",
        incidents: paymentConfigured ? "0" : "1",
        owner: "Billing",
      },
    ];
    const queueRows: QueueRow[] = [
      {
        name: "Webhook ingest",
        detail: messages.tableAvailable ? "Stored Instagram webhook messages" : "Messages table unavailable",
        queue: webhookConfigured ? "Direct" : "Not configured",
        pending: "0",
        oldest: messages.latestMessageAt ? formatRelativeTime(messages.latestMessageAt) : "No jobs",
        retries: "0",
        worker: webhookConfigured && databaseHealthy ? "Live" : "Needs setup",
        status: webhookConfigured && databaseHealthy ? "Healthy" : "Warning",
        tone: webhookConfigured && databaseHealthy ? "green" : "amber",
      },
      {
        name: "AI drafts",
        detail: "OpenAI reply generation",
        queue: "On demand",
        pending: "0",
        oldest: "No queued jobs",
        retries: "0",
        worker: openAiConfigured ? "Ready" : "Missing key",
        status: openAiConfigured ? "Healthy" : "Warning",
        tone: openAiConfigured ? "green" : "amber",
      },
      {
        name: "Media sync",
        detail: "Attachment fetch jobs",
        queue: "On demand",
        pending: "0",
        oldest: "No queued jobs",
        retries: "0",
        worker: instagramAccounts.count > 0 ? "Ready" : "No account",
        status: instagramAccounts.count > 0 ? "Healthy" : "Warning",
        tone: instagramAccounts.count > 0 ? "green" : "amber",
      },
    ];
    const warningServices = serviceRows.filter((service) => service.tone !== "green").length;
    const failedJobs = queueRows.filter((queue) => queue.tone === "red").length;
    const warningQueues = queueRows.filter((queue) => queue.tone !== "green").length;

    return NextResponse.json({
      metrics: {
        instagramAccounts: instagramAccounts.count,
        messagesStored: messages.totalMessages,
        messagesToday: messages.messagesToday,
        latestWebhookAt: messages.latestMessageAt,
        databaseLatencyMs: instagramAccounts.latencyMs,
        databaseHealthy,
        metaConfigured,
        webhookConfigured,
        openAiConfigured,
        emailConfigured,
        paymentConfigured,
        healthyServices: serviceRows.length - warningServices,
        warningServices,
        pendingJobs: 0,
        processedToday: messages.messagesToday,
        retries: 0,
        failedJobs,
        manualReview: failedJobs + warningQueues,
      },
      services: serviceRows.map((service) => ({
        ...service,
        tone: service.tone || getServiceTone(service.status),
      })),
      queues: queueRows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load platform health";
    console.error("Admin platform health error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
