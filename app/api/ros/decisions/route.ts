import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const senderId = searchParams.get('senderId');

    if (!conversationId && !senderId) {
      return NextResponse.json({ error: 'conversationId or senderId required' }, { status: 400 });
    }

    const serviceSupabase = createSupabaseServiceClient();
    const query = serviceSupabase
      .from('ros_revenue_decisions')
      .delete()
      .eq('user_id', user.id);

    const filters: string[] = [];
    if (conversationId) filters.push(`conversation_id.eq.${conversationId}`);
    if (senderId) filters.push(`instagram_sender_id.eq.${senderId}`);

    const { error: deleteError, count } = await query
      .or(filters.join(','));

    if (deleteError) {
      logger.error('Failed to delete ROS decisions:', { error: deleteError });
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    logger.info('Cleared ROS decision cache', { userId: user.id, conversationId, senderId, count });
    return NextResponse.json({ success: true, deleted: count ?? 'unknown' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear ROS decisions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
