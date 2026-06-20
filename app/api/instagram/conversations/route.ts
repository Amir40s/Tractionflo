import { NextResponse } from 'next/server';
import { canAccessPage, filterAssignedConversations, getUserPermissionProfile } from '@/lib/agent-permissions';
import { getFreshInstagramAccount } from '@/lib/instagram-token';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type InstagramParticipant = {
  id: string;
  name?: string;
  username?: string;
  profile_pic?: string;
};

type InstagramAttachment = {
  image_data?: {
    url?: string;
    preview_url?: string;
    width?: number;
    height?: number;
  };
  video_data?: {
    url?: string;
    preview_url?: string;
    width?: number;
    height?: number;
  };
  file_url?: string;
  mime_type?: string;
  name?: string;
  type?: string;
};

type InstagramMessage = {
  id: string;
  message?: string;
  from?: InstagramParticipant;
  created_time: string;
  attachments?: {
    data?: InstagramAttachment[];
  };
  reply_to?: {
    mid?: string;
    story?: {
      id?: string;
      url?: string;
    };
  };
};

type InstagramConversation = {
  id: string;
  participants?: { data: InstagramParticipant[] };
  updated_time?: string;
};

function normalizeAttachments(attachments?: { data?: InstagramAttachment[] }) {
  return (attachments?.data || [])
    .map((attachment) => {
      const imageUrl = attachment.image_data?.url || attachment.image_data?.preview_url;
      const videoUrl = attachment.video_data?.url || attachment.video_data?.preview_url;
      const fileUrl = attachment.file_url;
      const url = imageUrl || videoUrl || fileUrl;

      if (!url) {
        return null;
      }

      return {
        type: imageUrl ? 'image' : videoUrl ? 'video' : attachment.type || 'file',
        url,
        preview_url: attachment.image_data?.preview_url || attachment.video_data?.preview_url,
        width: attachment.image_data?.width || attachment.video_data?.width,
        height: attachment.image_data?.height || attachment.video_data?.height,
        name: attachment.name,
        mime_type: attachment.mime_type,
      };
    })
    .filter(Boolean);
}

async function getParticipantProfile(participant: InstagramParticipant | undefined, accessToken: string) {
  if (!participant?.id || participant.id === 'unknown') {
    return participant;
  }

  try {
    const profileUrl = new URL(`https://graph.instagram.com/v21.0/${participant.id}`);
    profileUrl.searchParams.set('fields', 'id,username,name,profile_pic');
    profileUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(profileUrl.toString(), { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Could not load Instagram participant profile');
    }

    return {
      ...participant,
      id: data.id || participant.id,
      username: data.username || participant.username,
      name: data.name || participant.name,
      profile_pic: data.profile_pic || participant.profile_pic,
    };
  } catch (err) {
    console.error('Instagram participant profile error:', err);
    return participant;
  }
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const countOnly = requestUrl.searchParams.get('countOnly') === '1';
    const scanMode = requestUrl.searchParams.get('scan') === '1';
    const conversationLimit = scanMode ? 25 : 10;
    const messageField = scanMode
      ? 'messages.limit(25){id,message,from,to,created_time,attachments,reply_to}'
      : 'messages{id,message,from,to,created_time,attachments,reply_to}';
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated', conversations: [], conversation_count: 0 }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, 'inbox')) {
      return NextResponse.json({
        error: 'Conversations are not enabled for this agent.',
        conversations: [],
        conversation_count: 0,
      });
    }

    const assistantId = user.id;

    // 1. Get the stored Instagram access token from Supabase
    const supabase = createSupabaseServiceClient();
    const storedAccount = await getFreshInstagramAccount(supabase, user.id);

    if (!storedAccount) {
      return NextResponse.json({
        error: 'No Instagram account connected',
        conversations: [],
        conversation_count: 0,
        assistant_id: assistantId,
        assistantId,
      }, { status: 200 });
    }

    const { ig_user_id, access_token } = storedAccount;

    // 2. Fetch real Instagram ID for this token
    const meUrl = new URL('https://graph.instagram.com/v21.0/me');
    meUrl.searchParams.set('fields', 'id,username,name');
    meUrl.searchParams.set('access_token', access_token);

    const meRes = await fetch(meUrl.toString());
    const meData = await meRes.json();
    const real_ig_user_id = meData.id || ig_user_id;
    const account = {
      id: real_ig_user_id,
      username: meData.username,
      name: meData.name,
      assistant_id: assistantId,
      assistantId,
    };

    // 3. Fetch conversations from Instagram Graph API
    const convsUrl = new URL(`https://graph.instagram.com/v21.0/me/conversations`);
    convsUrl.searchParams.set('platform', 'instagram');
    convsUrl.searchParams.set('fields', 'id,participants,updated_time,message_count');
    convsUrl.searchParams.set('limit', scanMode ? '50' : '25');
    convsUrl.searchParams.set('access_token', access_token);

    const convsRes = await fetch(convsUrl.toString());
    const convsData = await convsRes.json();

    if (convsData.error) {
      console.error('Instagram Graph API error (conversations):', convsData.error);
      return NextResponse.json({ error: convsData.error.message, conversations: [], conversation_count: 0 }, { status: 200 });
    }

    const rawConversations: InstagramConversation[] = convsData.data || [];
    const visibleConversations = filterAssignedConversations(rawConversations, permissions);

    if (countOnly) {
      return NextResponse.json({
        conversation_count: visibleConversations.length,
        ig_user_id: real_ig_user_id,
        account,
        assistant_id: assistantId,
        assistantId,
      });
    }

    // 4. Fetch messages for the recent conversations shown in onboarding/inbox.
    const conversations = await Promise.all(
      visibleConversations.slice(0, conversationLimit).map(async (conv) => {
        const participants = conv.participants?.data || [];
        const ownParticipant = participants.find(
          (p) => p.username && meData.username && p.username === meData.username
        );
        const ownParticipantId = ownParticipant?.id || real_ig_user_id;
        const msgsUrl = new URL(`https://graph.instagram.com/v21.0/${conv.id}`);
        msgsUrl.searchParams.set('fields', messageField);
        msgsUrl.searchParams.set('access_token', access_token);

        const msgsRes = await fetch(msgsUrl.toString());
        const msgsData = await msgsRes.json();

        const messages: InstagramMessage[] = msgsData.messages?.data || [];

        // Fetch matching stored messages from Supabase to parse story reply metadata
        const mids = messages.map((m) => m.id).filter(Boolean);
        const dbMessagesMap: Record<string, string> = {};
        if (mids.length > 0) {
          const { data: dbMessages, error: dbError } = await supabase
            .from('messages')
            .select('mid, text')
            .in('mid', mids);
          
          if (!dbError && dbMessages) {
            for (const dbMsg of dbMessages) {
              dbMessagesMap[dbMsg.mid] = dbMsg.text;
            }
          }
        }

        // Find the other participant (not the page/ig user)
        const otherParticipant = participants.find(
          (p) => p.id !== ownParticipantId && p.username !== meData.username
        );
        const otherParticipantProfile = await getParticipantProfile(otherParticipant, access_token);
        const otherParticipantProfileId = otherParticipantProfile?.id;
        const otherParticipantProfilePic = otherParticipantProfile?.profile_pic;

        return {
          id: conv.id,
          participant: otherParticipantProfile || { id: 'unknown', name: 'Instagram User' },
          updated_time: conv.updated_time,
          messages: messages.map((m) => {
            let text = m.message || '';
            let reply_to = m.reply_to;

            const dbText = dbMessagesMap[m.id];
            if (dbText && dbText.startsWith('__STORY_REPLY__:')) {
              try {
                const parts = dbText.split('__TEXT__:', 2);
                if (parts.length === 2) {
                  const storyStr = parts[0].substring('__STORY_REPLY__:'.length);
                  const story = JSON.parse(storyStr);
                  text = parts[1];
                  reply_to = {
                    ...reply_to,
                    story
                  };
                }
              } catch (e) {
                console.error('Failed to parse serialized story reply from DB:', e);
              }
            }

            return {
              id: m.id,
              text,
              attachments: normalizeAttachments(m.attachments),
              from: m.from?.id === ownParticipantId || m.from?.username === meData.username ? 'me' : 'user',
              sender_name: m.from?.name || m.from?.username,
              sender_profile_pic: m.from?.id === otherParticipantProfileId ? otherParticipantProfilePic : undefined,
              sender_id: m.from?.id,
              time: m.created_time,
              reply_to,
            };
          }),
        };
      })
    );

    return NextResponse.json({
      conversations,
      conversation_count: visibleConversations.length,
      ig_user_id: real_ig_user_id,
      account,
      assistant_id: assistantId,
      assistantId,
    });
  } catch (err) {
    console.error('Instagram conversations fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations', conversations: [], conversation_count: 0 }, { status: 200 });
  }
}
