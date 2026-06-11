import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

function getAppBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
}

type InstagramOAuthState = {
  next: string;
  returnTo?: string;
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

function getOAuthState(value: string | null, callbackOrigin: string, appBaseUrl: string): InstagramOAuthState {
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

    return { next, returnTo };
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
  const oauthState = getOAuthState(searchParams.get('state'), callbackOrigin, baseUrl);
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
  const appSecret = process.env.META_APP_SECRET;
  
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
    
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;

    if (userId && accessToken) {
      // Upsert into Supabase
      const supabase = createSupabaseServiceClient();
      const { error: dbError } = await supabase.from('instagram_accounts').upsert(
        { ig_user_id: userId.toString(), access_token: accessToken },
        { onConflict: 'ig_user_id' }
      );
      if (dbError) console.error('Supabase Insert Error:', dbError);
    }

    const response = NextResponse.redirect(
      getSoftwareRedirect(redirectBaseUrl, nextPath, {
        ig_connected: 'true',
      })
    );
    
    // Keeping cookie as fallback for frontend state
    response.cookies.set('ig_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
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
