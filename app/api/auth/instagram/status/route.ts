import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('ig_user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      connected: Boolean(data?.ig_user_id),
      account: data ? { id: data.ig_user_id, connectedAt: data.created_at } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read Instagram status';
    console.error('Instagram status error:', err);
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}
