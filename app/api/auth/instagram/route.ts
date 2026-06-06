import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const appId = process.env.META_APP_ID;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  
  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID is not configured' }, { status: 500 });
  }
  const state = Math.random().toString(36).substring(7);

   const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights'
  ].join(',');

  const authUrl = new URL('https://www.instagram.com/oauth/authorize');
  authUrl.searchParams.append('force_reauth', 'true');
  authUrl.searchParams.append('client_id', appId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}
