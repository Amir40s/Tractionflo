import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type StoredInstagramAccount = {
  ig_user_id: string;
  access_token: string;
  created_at?: string | null;
};

type InstagramTokenExchangeResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
  };
};

// Instagram long-lived tokens last about 60 days. Refresh before that window closes,
// but not on every inbox poll.
const TOKEN_REFRESH_AFTER_MS = 1000 * 60 * 60 * 24 * 45;

function getTokenAgeMs(createdAt?: string | null) {
  if (!createdAt) {
    return Number.POSITIVE_INFINITY;
  }

  const createdTime = new Date(createdAt).getTime();

  if (!Number.isFinite(createdTime)) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.now() - createdTime;
}

function shouldRefreshToken(account: StoredInstagramAccount) {
  return getTokenAgeMs(account.created_at) >= TOKEN_REFRESH_AFTER_MS;
}

async function parseInstagramTokenResponse(response: Response, fallbackMessage: string) {
  const data = (await response.json()) as InstagramTokenExchangeResponse;

  if (!response.ok || data.error || !data.access_token) {
    throw new Error(data.error?.message || fallbackMessage);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

export async function exchangeInstagramTokenForLongLivedToken({
  accessToken,
  appSecret,
}: {
  accessToken: string;
  appSecret: string;
}) {
  const exchangeUrl = new URL("https://graph.instagram.com/access_token");
  exchangeUrl.searchParams.set("grant_type", "ig_exchange_token");
  exchangeUrl.searchParams.set("client_secret", appSecret);
  exchangeUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(exchangeUrl.toString(), { cache: "no-store" });
  return parseInstagramTokenResponse(response, "Could not create a long-lived Instagram token.");
}

export async function refreshLongLivedInstagramToken(accessToken: string) {
  const refreshUrl = new URL("https://graph.instagram.com/refresh_access_token");
  refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
  refreshUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(refreshUrl.toString(), { cache: "no-store" });
  return parseInstagramTokenResponse(response, "Could not refresh Instagram token.");
}

export async function saveInstagramAccountToken(
  supabase: SupabaseServiceClient,
  account: Pick<StoredInstagramAccount, "ig_user_id" | "access_token">
) {
  const { error } = await supabase.from("instagram_accounts").upsert(
    {
      ig_user_id: account.ig_user_id,
      access_token: account.access_token,
      created_at: new Date().toISOString(),
    },
    { onConflict: "ig_user_id" }
  );

  if (error) {
    throw new Error(`Could not save Instagram token: ${error.message}`);
  }
}

export async function getStoredInstagramAccount(supabase: SupabaseServiceClient) {
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, access_token, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<StoredInstagramAccount>();

  if (error) {
    throw error;
  }

  if (!data?.access_token) {
    return null;
  }

  return data;
}

export async function getFreshInstagramAccount(supabase: SupabaseServiceClient) {
  const account = await getStoredInstagramAccount(supabase);

  if (!account || !shouldRefreshToken(account)) {
    return account;
  }

  try {
    const refreshedToken = await refreshLongLivedInstagramToken(account.access_token);
    await saveInstagramAccountToken(supabase, {
      ig_user_id: account.ig_user_id,
      access_token: refreshedToken.accessToken,
    });

    return {
      ...account,
      access_token: refreshedToken.accessToken,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Instagram token refresh error:", error);
    return account;
  }
}
