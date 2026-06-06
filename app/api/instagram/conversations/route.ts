import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Get the stored Instagram access token from Supabase
    const supabase = createSupabaseServiceClient();
    const { data: accounts, error: dbError } = await supabase
      .from('instagram_accounts')
      .select('ig_user_id, access_token')
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No Instagram account connected', conversations: [] }, { status: 200 });
    }

    const { ig_user_id, access_token } = accounts[0];

    // 2. Fetch real Instagram ID for this token
    const meRes = await fetch(`https://graph.instagram.com/v21.0/me?access_token=${access_token}`);
    const meData = await meRes.json();
    const real_ig_user_id = meData.id || ig_user_id;

    // 3. Fetch conversations from Instagram Graph API
    const convsUrl = new URL(`https://graph.instagram.com/v21.0/me/conversations`);
    convsUrl.searchParams.set('platform', 'instagram');
    convsUrl.searchParams.set('fields', 'id,participants,updated_time,message_count');
    convsUrl.searchParams.set('access_token', access_token);

    const convsRes = await fetch(convsUrl.toString());
    const convsData = await convsRes.json();

    if (convsData.error) {
      console.error('Instagram Graph API error (conversations):', convsData.error);
      return NextResponse.json({ error: convsData.error.message, conversations: [] }, { status: 200 });
    }

    const rawConversations = convsData.data || [];

    // 4. Fetch messages for each conversation (up to 10 convs)
    const conversations = await Promise.all(
      rawConversations.slice(0, 10).map(async (conv: { id: string; participants?: { data: { id: string; name: string; username?: string }[] }; updated_time?: string }) => {
        const msgsUrl = new URL(`https://graph.instagram.com/v21.0/${conv.id}`);
        msgsUrl.searchParams.set('fields', 'messages{id,message,from,to,created_time}');
        msgsUrl.searchParams.set('access_token', access_token);

        const msgsRes = await fetch(msgsUrl.toString());
        const msgsData = await msgsRes.json();

        const messages = msgsData.messages?.data || [];

        // Find the other participant (not the page/ig user)
        const otherParticipant = conv.participants?.data?.find(
          (p: { id: string; name: string; username?: string }) => p.id !== real_ig_user_id
        );

        return {
          id: conv.id,
          participant: otherParticipant || { id: 'unknown', name: 'Instagram User' },
          updated_time: conv.updated_time,
          messages: messages.map((m: { id: string; message: string; from: { id: string; name: string }; created_time: string }) => ({
            id: m.id,
            text: m.message,
            from: m.from?.id === real_ig_user_id ? 'me' : 'user',
            sender_name: m.from?.name,
            sender_id: m.from?.id,
            time: m.created_time,
          })),
        };
      })
    );

    return NextResponse.json({ conversations, ig_user_id: real_ig_user_id });
  } catch (err) {
    console.error('Instagram conversations fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations', conversations: [] }, { status: 200 });
  }
}
