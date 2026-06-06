import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getRedirectUrl(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next');

  if (next?.startsWith('/')) {
    return new URL(next, request.url);
  }

  const referer = request.headers.get('referer');

  if (referer) {
    const refererUrl = new URL(referer);

    if (refererUrl.origin === request.nextUrl.origin) {
      return refererUrl;
    }
  }

  return new URL('/settings', request.url);
}

function withDisconnectedCookie(response: NextResponse) {
  response.cookies.delete('ig_access_token');
  return response;
}

function wantsJson(request: NextRequest) {
  return request.headers.get('accept')?.includes('application/json');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .not('ig_user_id', 'is', null);

    if (error) {
      throw error;
    }

    if (wantsJson(request)) {
      return withDisconnectedCookie(NextResponse.json({ disconnected: true }));
    }

    return withDisconnectedCookie(NextResponse.redirect(getRedirectUrl(request), { status: 303 }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect Instagram';
    console.error('Instagram disconnect error:', err);

    if (wantsJson(request)) {
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const redirectUrl = getRedirectUrl(request);
    redirectUrl.searchParams.set('ig_error', message);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
