import { NextResponse, type NextRequest } from 'next/server';
import { getGlobalChannel, getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

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
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      if (wantsJson(request)) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const redirectUrl = getRedirectUrl(request);
      redirectUrl.searchParams.set('ig_error', 'Log in before disconnecting Instagram.');
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    await triggerRealtimeNotification([getUserChannel(user.id), getGlobalChannel(), getSuperAdminChannel()], {
      type: 'instagram',
      title: 'Instagram disconnected',
      body: 'An Instagram account was disconnected from TractionFlo.',
      url: '/settings',
      metadata: {
        source: 'instagram-disconnect',
        userId: user.id,
      },
    }).catch((notificationError) => {
      console.error('Realtime Instagram disconnect notification error:', notificationError);
    });

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
