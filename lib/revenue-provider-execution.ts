import type { createSupabaseServiceClient } from "@/lib/supabase";
import type { RevenueOperatingSnapshot } from "@/lib/revenue-intelligence";
import type { RevenueOutcomeAction } from "@/lib/revenue-outcome-actions";
import {
  normalizeRevenueOutcomeProviderSettings,
  type RevenueOutcomeProviderConfig,
  type RevenueOutcomeProviderSettings,
} from "@/lib/revenue-outcome-providers";
import { recordPlatformAnalyticsEvent } from "@/lib/platform-analytics";
import { createSupportTicket } from "@/lib/support-tickets";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type ProviderConnectionRow = {
  outcome_type?: string | null;
  provider?: string | null;
  enabled?: boolean | null;
  auto_execute?: boolean | null;
  action_url?: string | null;
  cta?: string | null;
  execution_mode?: string | null;
  webhook_url?: string | null;
  api_endpoint?: string | null;
  secret_token?: string | null;
  last_status?: string | null;
  last_error?: string | null;
  last_sync_at?: string | null;
};

export type RevenueProviderSecretInput = {
  outcomeType: string;
  secretToken?: string;
  clearSecret?: boolean;
};

export type ExecuteRevenueOutcomeProviderParams = {
  supabase: SupabaseServiceClient;
  userId: string;
  prospectId?: string | null;
  decisionId?: string | null;
  outcomeId?: string | null;
  conversationId?: string | null;
  instagramSenderId?: string | null;
  participant?: {
    id?: string;
    name?: string;
    username?: string;
  };
  messages?: Array<{ from?: string; text?: string }>;
  action: RevenueOutcomeAction;
  snapshot?: RevenueOperatingSnapshot;
  providerSettings?: RevenueOutcomeProviderSettings;
  source?: string;
  autoOnly?: boolean;
};

function isMissingTableError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("does not exist") || message.includes("schema cache") || message.includes("not found");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getConnectionEndpoint(provider: RevenueOutcomeProviderConfig) {
  if (provider.executionMode === "webhook") {
    return provider.webhookUrl;
  }

  if (provider.executionMode === "api") {
    return provider.apiEndpoint;
  }

  return "";
}

function isNativeOutcomeRoute(outcomeType: string) {
  return outcomeType === "follow_creator" || outcomeType === "purchase_product";
}

async function readResponsePayload(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { body: text.slice(0, 2000) };
  }
}

export async function listRevenueProviderConnectionRows(supabase: SupabaseServiceClient, userId: string) {
  const { data, error } = await (supabase as any)
    .from("ros_provider_connections")
    .select("outcome_type, provider, enabled, auto_execute, action_url, cta, execution_mode, webhook_url, api_endpoint, secret_token, last_status, last_error, last_sync_at")
    .eq("user_id", userId);

  if (error) {
    if (isMissingTableError(error)) {
      return [] as ProviderConnectionRow[];
    }

    throw error;
  }

  return (Array.isArray(data) ? data : []) as ProviderConnectionRow[];
}

export function mergeRevenueProviderConnections(
  settings: RevenueOutcomeProviderSettings,
  rows: ProviderConnectionRow[]
): RevenueOutcomeProviderSettings {
  const mergedProviders = settings.providers.map((provider) => {
    const row = rows.find((item) => item.outcome_type === provider.outcomeType);

    if (!row) {
      return provider;
    }

    return {
      ...provider,
      enabled: row.enabled ?? provider.enabled,
      autoExecute: row.auto_execute ?? provider.autoExecute,
      provider: row.provider || provider.provider,
      actionUrl: row.action_url || provider.actionUrl,
      cta: row.cta || provider.cta,
      executionMode: row.execution_mode === "webhook" || row.execution_mode === "api" ? row.execution_mode : provider.executionMode,
      webhookUrl: row.webhook_url || provider.webhookUrl,
      apiEndpoint: row.api_endpoint || provider.apiEndpoint,
      secretSaved: Boolean(row.secret_token),
      lastStatus: row.last_status || "",
      lastSyncAt: row.last_sync_at || "",
    };
  });

  return normalizeRevenueOutcomeProviderSettings({ providers: mergedProviders });
}

export async function loadRevenueOutcomeProviderSettings({
  supabase,
  userId,
  metadataValue,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  metadataValue: unknown;
}) {
  const settings = normalizeRevenueOutcomeProviderSettings(metadataValue);
  const rows = await listRevenueProviderConnectionRows(supabase, userId);

  return mergeRevenueProviderConnections(settings, rows);
}

export async function saveRevenueProviderConnections({
  supabase,
  userId,
  providers,
  secrets = [],
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  providers: RevenueOutcomeProviderConfig[];
  secrets?: RevenueProviderSecretInput[];
}) {
  for (const provider of providers) {
    const secret = secrets.find((item) => item.outcomeType === provider.outcomeType);
    const payload: Record<string, unknown> = {
      user_id: userId,
      outcome_type: provider.outcomeType,
      provider: provider.provider,
      enabled: provider.enabled,
      auto_execute: provider.autoExecute,
      action_url: provider.actionUrl || null,
      cta: provider.cta || null,
      execution_mode: provider.executionMode,
      webhook_url: provider.webhookUrl || null,
      api_endpoint: provider.apiEndpoint || null,
      metadata: {
        notes: provider.notes,
      },
    };

    if (secret?.clearSecret) {
      payload.secret_token = null;
    } else if (secret?.secretToken?.trim()) {
      payload.secret_token = secret.secretToken.trim();
    }

    const { error } = await (supabase as any).from("ros_provider_connections").upsert(payload, {
      onConflict: "user_id,outcome_type",
    });

    if (error && !isMissingTableError(error)) {
      throw error;
    }
  }
}

async function getProviderWithSecret({
  supabase,
  userId,
  providerSettings,
  outcomeType,
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  providerSettings?: RevenueOutcomeProviderSettings;
  outcomeType: string;
}) {
  const baseProvider = providerSettings?.providers.find((provider) => provider.outcomeType === outcomeType);
  const { data, error } = await (supabase as any)
    .from("ros_provider_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("outcome_type", outcomeType)
    .limit(1);

  if (error && !isMissingTableError(error)) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as ProviderConnectionRow | undefined) : undefined;

  if (!baseProvider && !row) {
    return null;
  }

  const merged = mergeRevenueProviderConnections(
    normalizeRevenueOutcomeProviderSettings({ providers: baseProvider ? [baseProvider] : [] }),
    row ? [row] : []
  ).providers.find((provider) => provider.outcomeType === outcomeType);

  return {
    provider: merged || baseProvider,
    secretToken: row?.secret_token || "",
  };
}

export async function executeRevenueOutcomeProvider({
  supabase,
  userId,
  prospectId,
  decisionId,
  outcomeId,
  conversationId,
  instagramSenderId,
  participant,
  messages = [],
  action,
  snapshot,
  providerSettings,
  source = "ros",
  autoOnly = false,
}: ExecuteRevenueOutcomeProviderParams) {
  const loadedProvider = await getProviderWithSecret({
    supabase,
    userId,
    providerSettings,
    outcomeType: action.outcomeType,
  });
  const provider = loadedProvider?.provider;
  const endpoint = provider ? getConnectionEndpoint(provider) : "";
  const requestPayload = {
    event: "tractionflo.revenue_outcome",
    source,
    outcomeType: action.outcomeType,
    action,
    participant,
    conversationId,
    instagramSenderId,
    messages: messages.slice(-12),
    snapshot,
    createdAt: new Date().toISOString(),
  };
  let status: "ready" | "routed" | "completed" | "failed" | "skipped" = "skipped";
  let responsePayload: Record<string, unknown> = {};
  let errorMessage = "";

  if (!provider?.enabled) {
    status = "skipped";
    errorMessage = "Provider is not enabled.";
  } else if (autoOnly && !provider.autoExecute) {
    status = "ready";
    errorMessage = "Provider is configured but auto-execution is disabled.";
  } else if (provider.executionMode === "link" || !endpoint) {
    status = provider.actionUrl || action.actionUrl || isNativeOutcomeRoute(action.outcomeType) ? "routed" : "ready";
  } else {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TractionFlo-Event": "revenue_outcome",
          ...(loadedProvider?.secretToken ? { Authorization: `Bearer ${loadedProvider.secretToken}` } : {}),
        },
        body: JSON.stringify(requestPayload),
        cache: "no-store",
      });
      responsePayload = await readResponsePayload(response);
      status = response.ok ? "completed" : "failed";
      errorMessage = response.ok ? "" : getString(responsePayload.error) || getString(responsePayload.message) || `Provider returned HTTP ${response.status}`;
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "Provider execution failed.";
    }
  }

  const executionPayload = {
    user_id: userId,
    prospect_id: prospectId || null,
    decision_id: decisionId || null,
    outcome_id: outcomeId || null,
    conversation_id: conversationId || null,
    instagram_sender_id: instagramSenderId || null,
    outcome_type: action.outcomeType,
    provider: provider?.provider || action.label,
    execution_mode: provider?.executionMode || "link",
    status,
    request_payload: requestPayload,
    response_payload: responsePayload,
    error_message: errorMessage || null,
    completed_at: status === "completed" || status === "routed" ? new Date().toISOString() : null,
  };
  const { data: execution, error: executionError } = await (supabase as any)
    .from("ros_outcome_executions")
    .insert(executionPayload)
    .select("id")
    .single();

  if (executionError && !isMissingTableError(executionError)) {
    throw executionError;
  }

  if (provider) {
    const { error: providerUpdateError } = await (supabase as any)
      .from("ros_provider_connections")
      .update({
        last_status: status,
        last_error: errorMessage || null,
        last_sync_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("outcome_type", action.outcomeType);

    if (providerUpdateError && !isMissingTableError(providerUpdateError)) {
      throw providerUpdateError;
    }
  }

  if (outcomeId) {
    const { data: rows } = await (supabase as any).from("ros_revenue_outcomes").select("metadata").eq("id", outcomeId).limit(1);
    const currentMetadata = isRecord(rows?.[0]?.metadata) ? rows?.[0]?.metadata : {};
    const { error: outcomeUpdateError } = await (supabase as any)
      .from("ros_revenue_outcomes")
      .update({
        metadata: {
          ...currentMetadata,
          providerExecution: {
            id: execution?.id || null,
            status,
            provider: provider?.provider || action.label,
            executionMode: provider?.executionMode || "link",
            errorMessage: errorMessage || null,
          },
        },
      })
      .eq("id", outcomeId);

    if (outcomeUpdateError && !isMissingTableError(outcomeUpdateError)) {
      throw outcomeUpdateError;
    }
  }

  await recordPlatformAnalyticsEvent({
    supabase,
    userId,
    eventName: `outcome_${status}`,
    source: "revenue_provider_execution",
    conversationId,
    instagramSenderId,
    metadata: {
      outcomeType: action.outcomeType,
      provider: provider?.provider || action.label,
      executionMode: provider?.executionMode || "link",
      executionId: execution?.id || null,
      errorMessage: errorMessage || null,
    },
  }).catch(() => undefined);

  if (status === "failed") {
    await createSupportTicket({
      supabase,
      userId,
      title: `${provider?.provider || action.label} outcome execution failed`,
      summary: errorMessage || "A revenue outcome provider returned an error.",
      topic: "Integrations",
      priority: "High",
      source: "revenue_provider_execution",
      sourceEventId: execution?.id || `${userId}:${action.outcomeType}:${Date.now()}`,
      conversationId,
      instagramSenderId,
      metadata: {
        outcomeType: action.outcomeType,
        provider: provider?.provider || action.label,
        responsePayload,
      },
    }).catch(() => undefined);
  }

  return {
    executionId: execution?.id || null,
    status,
    errorMessage,
    responsePayload,
  };
}
