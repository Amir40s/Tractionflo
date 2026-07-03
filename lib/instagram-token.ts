import type { createSupabaseServiceClient } from "@/lib/supabase";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type StoredInstagramAccount = {
  id?: string;
  user_id?: string | null;
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
    type?: string;
    code?: number;
  };
  error_message?: string;
};

function normalizeInstagramAccessToken(token: string | null | undefined) {
  let normalized = String(token || "").trim();

  if (!normalized) {
    return "";
  }

  normalized = normalized.replace(/^Bearer\s+/i, "").trim();
  normalized = normalized.replace(/^['"]|['"]$/g, "").trim();

  if (normalized.includes("access_token=")) {
    const tokenParam = normalized.split("access_token=").pop() || "";
    normalized = tokenParam.split("&")[0].trim();
  }

  if (normalized.includes("\n")) {
    normalized = normalized.split("\n")[0].trim();
  }

  if (normalized.includes(" ")) {
    normalized = normalized.split(" ")[0].trim();
  }

  return normalized;
}

class InstagramTokenResponseError extends Error {
  constructor(message: string, readonly data: InstagramTokenExchangeResponse) {
    super(message);
    this.name = "InstagramTokenResponseError";
  }
}

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
  const data = (await response.json().catch(() => ({}))) as InstagramTokenExchangeResponse;

  if (!response.ok || data.error || !data.access_token) {
    throw new InstagramTokenResponseError(data.error?.message || data.error_message || fallbackMessage, data);
  }

  return {
    accessToken: normalizeInstagramAccessToken(data.access_token),
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

function isUnsupportedGetTokenError(error: unknown) {
  return (
    error instanceof InstagramTokenResponseError &&
    /unsupported request/i.test(error.message) &&
    /method type:\s*get/i.test(error.message)
  );
}

async function fetchInstagramTokenWithGetPostFallback(url: URL, fallbackMessage: string) {
  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    return await parseInstagramTokenResponse(response, fallbackMessage);
  } catch (error) {
    if (!isUnsupportedGetTokenError(error)) {
      throw error;
    }

    const body = new URLSearchParams(url.searchParams);
    const response = await fetch(`${url.origin}${url.pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    return parseInstagramTokenResponse(response, fallbackMessage);
  }
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
  exchangeUrl.searchParams.set("access_token", normalizeInstagramAccessToken(accessToken));

  return fetchInstagramTokenWithGetPostFallback(exchangeUrl, "Could not create a long-lived Instagram token.");
}

export async function refreshLongLivedInstagramToken(accessToken: string) {
  const refreshUrl = new URL("https://graph.instagram.com/refresh_access_token");
  refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
  refreshUrl.searchParams.set("access_token", normalizeInstagramAccessToken(accessToken));

  return fetchInstagramTokenWithGetPostFallback(refreshUrl, "Could not refresh Instagram token.");
}

export async function saveInstagramAccountToken(
  supabase: SupabaseServiceClient,
  account: Pick<StoredInstagramAccount, "ig_user_id" | "access_token"> & { user_id: string }
) {
  const payload = {
    user_id: account.user_id,
    ig_user_id: account.ig_user_id,
    access_token: normalizeInstagramAccessToken(account.access_token),
    created_at: new Date().toISOString(),
  };

  const { data: existingForUser, error: existingForUserError } = await supabase
    .from("instagram_accounts")
    .select("id, user_id")
    .eq("user_id", account.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<StoredInstagramAccount, "id" | "user_id">>();

  if (existingForUserError) {
    throw new Error(`Could not inspect existing Instagram token: ${existingForUserError.message}`);
  }

  const { data: existingForInstagram, error: existingForInstagramError } = await supabase
    .from("instagram_accounts")
    .select("id, user_id")
    .eq("ig_user_id", account.ig_user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<StoredInstagramAccount, "id" | "user_id">>();

  if (existingForInstagramError) {
    throw new Error(`Could not inspect Instagram account ownership: ${existingForInstagramError.message}`);
  }

  if (
    existingForInstagram?.user_id &&
    existingForInstagram.user_id !== account.user_id
  ) {
    throw new Error("This Instagram account is already connected to another TractionFlo user.");
  }

  if (existingForUser?.id && existingForInstagram?.id && existingForUser.id !== existingForInstagram.id) {
    const { error: deleteError } = await supabase
      .from("instagram_accounts")
      .delete()
      .eq("id", existingForUser.id);

    if (deleteError) {
      throw new Error(`Could not replace existing Instagram token: ${deleteError.message}`);
    }
  }

  const rowId =
    existingForInstagram?.id ||
    existingForUser?.id;
  const { error } = rowId
    ? await (supabase.from("instagram_accounts") as any).update(payload).eq("id", rowId)
    : await (supabase.from("instagram_accounts") as any).insert(payload);

  if (error) {
    throw new Error(`Could not save Instagram token: ${error.message}`);
  }
}

async function updateInstagramAccountAccessToken(
  supabase: SupabaseServiceClient,
  account: StoredInstagramAccount,
  accessToken: string
) {
  const payload = {
    access_token: normalizeInstagramAccessToken(accessToken),
    created_at: new Date().toISOString(),
  };
  const query = (supabase.from("instagram_accounts") as any).update(payload);

  if (account.id) {
    return query.eq("id", account.id);
  }

  if (account.user_id) {
    return query.eq("user_id", account.user_id).eq("ig_user_id", account.ig_user_id);
  }

  return query.eq("ig_user_id", account.ig_user_id);
}

export async function getStoredInstagramAccount(supabase: SupabaseServiceClient, userId: string) {
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("id, user_id, ig_user_id, access_token, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<StoredInstagramAccount>();

  if (error) {
    throw error;
  }

  if (!data?.access_token) {
    return null;
  }

  return {
    ...data,
    access_token: normalizeInstagramAccessToken(data.access_token),
  };
}

export async function getStoredInstagramAccountByIgUserId(supabase: SupabaseServiceClient, igUserId: string) {
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("id, user_id, ig_user_id, access_token, created_at")
    .eq("ig_user_id", igUserId)
    .not("user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<StoredInstagramAccount>();

  if (error) {
    throw error;
  }

  if (!data?.access_token) {
    return null;
  }

  return {
    ...data,
    access_token: normalizeInstagramAccessToken(data.access_token),
  };
}

async function refreshAccountIfNeeded(supabase: SupabaseServiceClient, account: StoredInstagramAccount | null) {

  if (!account || !shouldRefreshToken(account)) {
    return account;
  }

  try {
    const refreshedToken = await refreshLongLivedInstagramToken(account.access_token);
    const { error } = await updateInstagramAccountAccessToken(supabase, account, refreshedToken.accessToken);

    if (error) {
      throw error;
    }

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

export async function getFreshInstagramAccount(supabase: SupabaseServiceClient, userId: string) {
  return refreshAccountIfNeeded(supabase, await getStoredInstagramAccount(supabase, userId));
}

export async function getFreshInstagramAccountByIgUserId(supabase: SupabaseServiceClient, igUserId: string) {
  return refreshAccountIfNeeded(supabase, await getStoredInstagramAccountByIgUserId(supabase, igUserId));
}
