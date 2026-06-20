import { NextResponse } from 'next/server';
import { getFreshInstagramAccount, type StoredInstagramAccount } from '@/lib/instagram-token';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

async function getInstagramProfile(account: StoredInstagramAccount) {
  try {
    const meUrl = new URL('https://graph.instagram.com/v21.0/me');
    meUrl.searchParams.set('fields', 'id,username,name,profile_picture_url');
    meUrl.searchParams.set('access_token', account.access_token);

    const response = await fetch(meUrl.toString(), { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Could not load Instagram profile');
    }

    return {
      id: data.id || account.ig_user_id,
      username: data.username,
      name: data.name,
      profilePictureUrl: data.profile_picture_url || '',
      profile_picture_url: data.profile_picture_url || '',
      connectedAt: account.created_at || undefined,
    };
  } catch (err) {
    console.error('Instagram profile status error:', err);

    return {
      id: account.ig_user_id,
      connectedAt: account.created_at || undefined,
    };
  }
}

export async function GET() {
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
      return NextResponse.json({ connected: false, account: null, error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase, user.id);
    const account = storedAccount ? await getInstagramProfile(storedAccount) : null;

    return NextResponse.json({
      connected: Boolean(account?.id),
      account,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read Instagram status';
    console.error('Instagram status error:', err);
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}
