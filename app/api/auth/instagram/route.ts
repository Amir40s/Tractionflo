import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function getAppBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
}

function createOAuthState(nextPath: string, returnTo: string) {
  return JSON.stringify({
    next: nextPath,
    returnTo,
  });
}

function isSafeNextPath(value: string | null) {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
}

function getNextPath(request: NextRequest) {
  const requestedNext = request.nextUrl.searchParams.get('next');

  if (isSafeNextPath(requestedNext)) {
    return requestedNext!;
  }

  const referer = request.headers.get('referer');

  if (referer) {
    const refererUrl = new URL(referer);

    if (refererUrl.origin === request.nextUrl.origin) {
      return `${refererUrl.pathname}${refererUrl.search}`;
    }
  }

  return '/dashboard';
}

export async function GET(request: NextRequest) {
  const appId = process.env.META_APP_ID;
  
  const baseUrl = getAppBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const nextPath = getNextPath(request);
  const state = createOAuthState(nextPath, request.nextUrl.origin);
  
  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID is not configured' }, { status: 500 });
  }

   const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights'
  ].join(',');

  const authUrl = new URL('https://www.instagram.com/oauth/authorize');
  authUrl.searchParams.append('enable_fb_login', '0');
  authUrl.searchParams.append('force_authentication', '1');
  authUrl.searchParams.append('client_id', appId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}
