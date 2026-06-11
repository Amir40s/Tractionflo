import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type InstagramAccountRow = {
  ig_user_id: string;
  access_token: string | null;
  created_at: string;
};

async function getInstagramProfile(account: InstagramAccountRow) {
  if (!account.access_token) {
    return {
      id: account.ig_user_id,
      connectedAt: account.created_at,
    };
  }

  try {
    const meUrl = new URL('https://graph.instagram.com/v21.0/me');
    meUrl.searchParams.set('fields', 'id,username,name');
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
      connectedAt: account.created_at,
    };
  } catch (err) {
    console.error('Instagram profile status error:', err);

    return {
      id: account.ig_user_id,
      connectedAt: account.created_at,
    };
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('ig_user_id, access_token, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<InstagramAccountRow>();

    if (error) {
      throw error;
    }

    const account = data ? await getInstagramProfile(data) : null;

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
