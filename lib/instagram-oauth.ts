export function getInstagramAppCredentials() {
  return {
    appId: process.env.INSTAGRAM_APP_ID?.trim() || process.env.META_APP_ID?.trim() || "",
    appSecret: process.env.INSTAGRAM_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim() || "",
  };
}

export function getInstagramAuthorizeUrl() {
  return process.env.INSTAGRAM_OAUTH_AUTHORIZE_URL?.trim() || "https://api.instagram.com/oauth/authorize";
}

export function getNormalizedAppBaseUrl(origin: string) {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || origin).replace(/\/+$/, "");
}
