import { NextResponse, type NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { getInstagramAppCredentials, getInstagramAuthorizeUrl, getNormalizedAppBaseUrl } from '@/lib/instagram-oauth';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

function getAppBaseUrl(request: NextRequest) {
  return getNormalizedAppBaseUrl(request.nextUrl.origin);
}

function createStateSignature({
  nextPath,
  returnTo,
  userId,
  expectedUsername,
  secret,
}: {
  nextPath: string;
  returnTo: string;
  userId: string;
  expectedUsername: string;
  secret: string;
}) {
  return createHmac('sha256', secret)
    .update(`${userId}:${nextPath}:${returnTo}:${expectedUsername}`)
    .digest('hex');
}

function createOAuthState(nextPath: string, returnTo: string, userId: string, expectedUsername: string, secret: string) {
  return JSON.stringify({
    next: nextPath,
    returnTo,
    userId,
    expectedUsername,
    signature: createStateSignature({ nextPath, returnTo, userId, expectedUsername, secret }),
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
  const { appId, appSecret } = getInstagramAppCredentials();
  const authSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();
  
  const baseUrl = getAppBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const nextPath = getNextPath(request);
  
  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'Instagram app ID or app secret is not configured' }, { status: 500 });
  }

  if (authError || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'Log in before connecting Instagram.');
    loginUrl.searchParams.set('next', nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const usernameParam = request.nextUrl.searchParams.get('username') || '';
  const expectedUsername = usernameParam.trim().toLowerCase().replace(/^@/, '');
  
  const state = createOAuthState(nextPath, request.nextUrl.origin, user.id, expectedUsername, appSecret);

  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights'
  ].join(',');

  const authUrl = new URL(getInstagramAuthorizeUrl());
  authUrl.searchParams.append('enable_fb_login', '0');
  authUrl.searchParams.append('force_authentication', '1');
  authUrl.searchParams.append('client_id', appId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}
