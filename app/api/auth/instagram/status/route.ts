import { NextResponse } from 'next/server';
import { getFreshInstagramAccount, type StoredInstagramAccount } from '@/lib/instagram-token';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getInstagramProfile(account: StoredInstagramAccount) {
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
    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase);
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
