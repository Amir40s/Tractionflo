import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  exchangeInstagramTokenForLongLivedToken,
  saveInstagramAccountToken,
} from '@/lib/instagram-token';
import { getGlobalChannel, getSuperAdminChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

function getAppBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
}

type InstagramOAuthState = {
  next: string;
  returnTo?: string;
  userId?: string;
  signature?: string;
};

type InstagramCodeTokenResponse = {
  access_token?: string;
  user_id?: string | number;
  error?: {
    message?: string;
  };
  error_message?: string;
};

function isSafeNextPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function isAllowedReturnOrigin(origin: string, callbackOrigin: string, appBaseUrl: string) {
  const allowedOrigins = new Set([callbackOrigin, new URL(appBaseUrl).origin]);

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://localhost:3001');
    allowedOrigins.add('http://localhost:3002');
    allowedOrigins.add('http://127.0.0.1:3000');
    allowedOrigins.add('http://127.0.0.1:3001');
    allowedOrigins.add('http://127.0.0.1:3002');
  }

  return allowedOrigins.has(origin);
}

function getStateSignature({
  nextPath,
  returnTo,
  userId,
  secret,
}: {
  nextPath: string;
  returnTo: string;
  userId: string;
  secret: string;
}) {
  return createHmac('sha256', secret)
    .update(`${userId}:${nextPath}:${returnTo}`)
    .digest('hex');
}

function isValidStateSignature({
  nextPath,
  returnTo,
  userId,
  signature,
  secret,
}: {
  nextPath: string;
  returnTo: string;
  userId: string;
  signature: string;
  secret: string;
}) {
  const expected = getStateSignature({ nextPath, returnTo, userId, secret });

  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

function getOAuthState(
  value: string | null,
  callbackOrigin: string,
  appBaseUrl: string,
  stateSecret?: string
): InstagramOAuthState {
  if (!value) {
    return { next: '/dashboard' };
  }

  if (isSafeNextPath(value)) {
    return { next: value };
  }

  try {
    const parsed = JSON.parse(value) as Partial<InstagramOAuthState>;
    const next = isSafeNextPath(parsed.next) ? parsed.next : '/dashboard';
    const returnTo =
      typeof parsed.returnTo === 'string' && isAllowedReturnOrigin(parsed.returnTo, callbackOrigin, appBaseUrl)
        ? parsed.returnTo
        : undefined;
    const userId = typeof parsed.userId === 'string' ? parsed.userId : '';
    const signature = typeof parsed.signature === 'string' ? parsed.signature : '';
    const verifiedUserId =
      userId && signature && stateSecret && isValidStateSignature({
        nextPath: next,
        returnTo: returnTo || '',
        userId,
        signature,
        secret: stateSecret,
      })
        ? userId
        : undefined;

    return { next, returnTo, userId: verifiedUserId };
  } catch {
    return { next: '/dashboard' };
  }
}

function getSafeNextPath(value: string | null) {
  if (value?.startsWith('/') && !value.startsWith('//')) {
    return value;
  }

  return '/dashboard';
}

function getSoftwareRedirect(baseUrl: string, nextPath: string, params: Record<string, string>) {
  const redirectUrl = new URL(nextPath, baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    redirectUrl.searchParams.set(key, value);
  });

  return redirectUrl;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = getAppBaseUrl(request);
  const callbackOrigin = new URL(request.url).origin;
  const appSecret = process.env.META_APP_SECRET;
  const oauthState = getOAuthState(searchParams.get('state'), callbackOrigin, baseUrl, appSecret);
  const redirectBaseUrl = oauthState.returnTo || baseUrl;
  const nextPath = getSafeNextPath(oauthState.next);

  if (error) {
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: searchParams.get('error_description') || 'Authorization failed',
      })
    );
  }

  if (!code) {
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: 'No Instagram authorization code provided',
      })
    );
  }

  const appId = process.env.META_APP_ID;
  
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: 'Server configuration missing',
      })
    );
  }

  try {
     const formData = new URLSearchParams();
    formData.append('client_id', appId);
    formData.append('client_secret', appSecret);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code);

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokenData = (await tokenResponse.json()) as InstagramCodeTokenResponse;

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token || !tokenData.user_id) {
      throw new Error(
        tokenData.error?.message || tokenData.error_message || 'Instagram did not return an access token'
      );
    }

    const oauthUserId = tokenData.user_id.toString();
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError && !oauthState.userId) {
      throw authError;
    }

    const ownerUserId = oauthState.userId || user?.id;

    if (!ownerUserId) {
      throw new Error('Log in before connecting Instagram.');
    }

    const supabase = createSupabaseServiceClient();

    // Fetch the real Instagram Business Account ID (Page ID) to match webhook events
    let igPageId = oauthUserId;
    try {
      const meUrl = new URL('https://graph.instagram.com/v21.0/me');
      meUrl.searchParams.set('fields', 'user_id,id');
      meUrl.searchParams.set('access_token', tokenData.access_token);
      const meRes = await fetch(meUrl.toString());
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user_id) {
          igPageId = meData.user_id.toString();
        } else if (meData.id) {
          igPageId = meData.id.toString();
        }
      }
    } catch (meError) {
      console.error('Failed to fetch real Instagram Page ID in OAuth callback:', meError);
    }

    // Fast-path: check if this Instagram account is already connected to another TractionFlo user
    const { data: existingConnection, error: connectionCheckError } = await supabase
      .from('instagram_accounts')
      .select('user_id')
      .eq('ig_user_id', igPageId)
      .not('user_id', 'is', null)
      .maybeSingle();

    if (connectionCheckError) {
      console.error('Error checking existing Instagram connection:', connectionCheckError);
    }

    if (existingConnection && existingConnection.user_id !== ownerUserId) {
      throw new Error('This Instagram account is already connected to another TractionFlo user.');
    }

    const longLivedToken = await exchangeInstagramTokenForLongLivedToken({
      accessToken: tokenData.access_token,
      appSecret,
    });

    const accessToken = longLivedToken.accessToken;

    await saveInstagramAccountToken(supabase, {
      user_id: ownerUserId,
      ig_user_id: igPageId,
      access_token: accessToken,
    });

    await triggerRealtimeNotification([getGlobalChannel(), getSuperAdminChannel()], {
      type: 'instagram',
      title: 'Instagram connected',
      body: 'A creator connected an Instagram account successfully.',
      url: '/settings',
      metadata: {
        userId: ownerUserId,
        igUserId: igPageId,
      },
    }).catch((notificationError) => {
      console.error('Realtime Instagram connect notification error:', notificationError);
    });

    const response = NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, '/onboarding', {
        ig_connected: 'true',
        ig_scan: 'true',
        from: nextPath.replace(/^\//, '') || 'instagram',
      })
    );
    
    // Keeping cookie as fallback for frontend state
    response.cookies.set('ig_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: longLivedToken.expiresIn || 60 * 60 * 24 * 60
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Instagram OAuth error';
    console.error('Instagram OAuth Error:', err);
    return NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_error: message,
      })
    );
  }
}
