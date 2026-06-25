import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getStoredOpenAiKey,
  normalizeAiIntegrationMetadata,
  type AiIntegrationSettings,
} from "@/lib/ai-integration";
import { createSupabaseServiceClient } from "@/lib/supabase";

export type PlatformAiConfigSource = "superadmin" | "environment" | "none";

export type PlatformAiConfig = {
  apiKey: string;
  integration: AiIntegrationSettings;
  source: PlatformAiConfigSource;
  ownerId: string;
  ownerEmail: string;
};

export function getUserMetadata(user?: Pick<User, "user_metadata"> | null) {
  return (user?.user_metadata || {}) as Record<string, unknown>;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

export function isSuperAdminUser(user?: Pick<User, "email" | "user_metadata"> | null) {
  if (!user) {
    return false;
  }

  const metadata = getUserMetadata(user);
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

async function listAllUsers(supabase: SupabaseClient) {
  const users: User[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    users.push(...(data.users || []));

    if (!data.users || data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function getUserUpdatedTime(user: User) {
  return new Date(user.updated_at || user.last_sign_in_at || user.created_at || 0).getTime();
}

function hasAiSettingsMetadata(user: User) {
  const metadata = getUserMetadata(user);
  return Boolean(
    getStoredOpenAiKey(metadata) ||
      metadata.openai_model ||
      metadata.ai_integration_workflows ||
      metadata.ai_behavior ||
      metadata.ai_integration_system_prompt ||
      metadata.ai_integration_lead_rules ||
      metadata.ai_integration_cta ||
      typeof metadata.ai_integration_auto_send === "boolean"
  );
}

async function findPlatformAiOwners(supabase: SupabaseClient) {
  const superAdmins = (await listAllUsers(supabase)).filter(isSuperAdminUser);
  const configuredSuperAdmins = superAdmins
    .filter((user) => Boolean(getStoredOpenAiKey(getUserMetadata(user))))
    .sort((first, second) => getUserUpdatedTime(second) - getUserUpdatedTime(first));
  const settingsSuperAdmins = superAdmins
    .filter(hasAiSettingsMetadata)
    .sort((first, second) => getUserUpdatedTime(second) - getUserUpdatedTime(first));

  return {
    settingsOwner:
      settingsSuperAdmins[0] ||
      configuredSuperAdmins[0] ||
      superAdmins.sort((first, second) => getUserUpdatedTime(second) - getUserUpdatedTime(first))[0] ||
      null,
    keyOwner: configuredSuperAdmins[0] || null,
  };
}

export async function resolvePlatformAiConfig(supabase = createSupabaseServiceClient()): Promise<PlatformAiConfig> {
  const { settingsOwner, keyOwner } = await findPlatformAiOwners(supabase);
  const owner = settingsOwner || keyOwner;
  const metadata = getUserMetadata(owner);
  const storedKey = getStoredOpenAiKey(metadata) || getStoredOpenAiKey(getUserMetadata(keyOwner));
  const environmentKey = process.env.OPENAI_API_KEY?.trim() || "";
  const apiKey = storedKey || environmentKey;
  const integration = normalizeAiIntegrationMetadata({
    ...metadata,
    ...(apiKey ? { openai_api_key: apiKey } : {}),
  });

  return {
    apiKey,
    integration: {
      ...integration,
      autoSend: true,
    },
    source: storedKey ? "superadmin" : environmentKey ? "environment" : "none",
    ownerId: owner?.id || "",
    ownerEmail: owner?.email || "",
  };
}
