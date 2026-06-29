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
  picture?: string | { data?: { url?: string } };
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

type NormalizedAttachment = {
  type: string;
  url: string;
  preview_url: string | undefined;
  width: number | undefined;
  height: number | undefined;
  name: string | undefined;
  mime_type: string | undefined;
};

type CatalogCarouselItem = {
  orderId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  priceText?: string;
  priceAmount?: number | null;
  currency?: string;
};

type StoredMessageRow = {
  mid?: string | null;
  user_id?: string | null;
  conversation_id?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
  direction?: string | null;
  text?: string | null;
  timestamp?: number | string | null;
  raw_event?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

type StoredConversation = {
  id: string;
  participant: { id: string; name: string; username?: string; profile_pic?: string };
  updated_time: string;
  messages: {
    id: string;
    text: string;
    attachments: NormalizedAttachment[];
    from: 'me' | 'user' | 'note';
    sender_name: string;
    sender_profile_pic?: string;
    sender_id: string;
    time: string;
    catalogItems?: CatalogCarouselItem[];
    reply_to?: {
      mid?: string;
      story?: {
        id?: string;
        url?: string;
      };
    };
  }[];
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
    .filter((attachment): attachment is NormalizedAttachment => Boolean(attachment));
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
      profile_pic: getProfilePictureUrl(data.profile_pic) || getProfilePictureUrl(data.picture) || participant.profile_pic,
    };
  } catch (err) {
    console.warn('Instagram participant profile unavailable:', err);
    return participant;
  }
}

function getMessageTimeMillis(message: Pick<StoredMessageRow, 'timestamp' | 'created_at'>) {
  if (typeof message.timestamp === 'number' && Number.isFinite(message.timestamp)) {
    return Math.round(message.timestamp);
  }

  if (typeof message.timestamp === 'string') {
    const numeric = Number(message.timestamp);
    if (Number.isFinite(numeric)) {
      return Math.round(numeric);
    }

    const parsed = Date.parse(message.timestamp);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const createdAt = message.created_at ? Date.parse(message.created_at) : Number.NaN;
  return Number.isFinite(createdAt) ? createdAt : Date.now();
}

function getMessageTimeIso(message: Pick<StoredMessageRow, 'timestamp' | 'created_at'>) {
  return new Date(getMessageTimeMillis(message)).toISOString();
}

function getStoredConversationId(message: StoredMessageRow, ownIgUserId: string) {
  const conversationId = String(message.conversation_id || '').trim();
  const senderId = String(message.sender_id || '').trim();
  const recipientId = String(message.recipient_id || '').trim();
  const ownId = String(ownIgUserId || '').trim();

  if (conversationId && conversationId !== ownId) {
    return conversationId;
  }

  if (message.direction === 'outbound') {
    return recipientId || conversationId || senderId || 'unknown';
  }

  if (senderId && senderId !== ownId) {
    return senderId;
  }

  if (recipientId && recipientId !== ownId) {
    return recipientId;
  }

  return conversationId || senderId || recipientId || 'unknown';
}

function parseStoredMessageText(text: string) {
  if (!text.startsWith('__STORY_REPLY__:') || !text.includes('__TEXT__:')) {
    return { text };
  }

  try {
    const parts = text.split('__TEXT__:', 2);
    const storyStr = parts[0].substring('__STORY_REPLY__:'.length);
    const story = JSON.parse(storyStr) as { id?: string; url?: string };
    return {
      text: parts[1] || '',
      reply_to: { story },
    };
  } catch (error) {
    console.error('Failed to parse stored story reply:', error);
    return { text };
  }
}

function getUrlMimeType(url: string) {
  const cleanUrl = url.split('?')[0].toLowerCase();

  if (/\.(png|jpe?g|gif|webp|avif)$/.test(cleanUrl)) {
    return 'image/jpeg';
  }

  if (/\.(mp4|mov|webm|m4v)$/.test(cleanUrl)) {
    return 'video/mp4';
  }

  return '';
}

function getStoredAttachmentType(label: string, url: string) {
  const lowerLabel = label.toLowerCase();
  const mimeType = getUrlMimeType(url);

  if (lowerLabel.includes('image') || mimeType.startsWith('image/')) {
    return 'image';
  }

  if (lowerLabel.includes('video') || mimeType.startsWith('video/')) {
    return 'video';
  }

  return 'file';
}

function getStoredCatalogCarouselItems(metadata?: Record<string, unknown> | null) {
  const rawItems = Array.isArray(metadata?.catalogCarouselItems) ? metadata.catalogCarouselItems : [];

  return rawItems
    .map((item): CatalogCarouselItem | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = getStringValue(record.title);

      if (!title) {
        return null;
      }

      const rawPriceAmount = record.priceAmount;
      const priceAmount = typeof rawPriceAmount === 'number' && Number.isFinite(rawPriceAmount) ? rawPriceAmount : null;

      return {
        orderId: getStringValue(record.orderId) || undefined,
        title,
        description: getStringValue(record.description) || undefined,
        imageUrl: getStringValue(record.imageUrl) || undefined,
        thumbnailUrl: getStringValue(record.thumbnailUrl) || undefined,
        permalink: getStringValue(record.permalink) || undefined,
        priceText: getStringValue(record.priceText) || undefined,
        priceAmount,
        currency: getStringValue(record.currency) || undefined,
      };
    })
    .filter((item): item is CatalogCarouselItem => Boolean(item));
}

function parseStoredMessageContent(rawText: string, metadata?: Record<string, unknown> | null) {
  const storyParsed = parseStoredMessageText(rawText);
  const catalogItems = getStoredCatalogCarouselItems(metadata);

  if (catalogItems.length > 0) {
    return { ...storyParsed, text: '', attachments: [] as NormalizedAttachment[], catalogItems };
  }

  const text = storyParsed.text.trim();
  const attachmentMatch = text.match(/^\[([^\]]+)\]\s+(https?:\/\/\S+)\s*$/i);
  const plainUrlMatch = text.match(/^(https?:\/\/\S+)\s*$/i);
  const attachmentUrl = attachmentMatch?.[2] || plainUrlMatch?.[1] || '';

  if (!attachmentUrl) {
    return { ...storyParsed, text: storyParsed.text, attachments: [] as NormalizedAttachment[], catalogItems: [] as CatalogCarouselItem[] };
  }

  const type = getStoredAttachmentType(attachmentMatch?.[1] || '', attachmentUrl);

  if (type === 'file' && !attachmentMatch) {
    return { ...storyParsed, text: storyParsed.text, attachments: [] as NormalizedAttachment[], catalogItems: [] as CatalogCarouselItem[] };
  }

  return {
    ...storyParsed,
    text: attachmentMatch ? '' : storyParsed.text,
    attachments: [
      {
        type,
        url: attachmentUrl,
        preview_url: type === 'image' ? attachmentUrl : undefined,
        width: undefined,
        height: undefined,
        name: type === 'image' ? 'Instagram image attachment' : type === 'video' ? 'Instagram video attachment' : 'Instagram attachment',
        mime_type: getUrlMimeType(attachmentUrl),
      },
    ],
    catalogItems: [] as CatalogCarouselItem[],
  };
}

function getStoredMessageKey(row: StoredMessageRow) {
  return row.mid || `${row.conversation_id || ''}:${row.sender_id || ''}:${row.recipient_id || ''}:${row.timestamp || ''}`;
}

function getClosestStoredCatalogRow(
  rows: StoredMessageRow[],
  createdTime: string,
  usedKeys: Set<string>,
  maxDistanceMs = 5 * 60_000
) {
  const targetTime = Date.parse(createdTime);

  if (!Number.isFinite(targetTime)) {
    return null;
  }

  let closestRow: StoredMessageRow | null = null;
  let closestDistance = maxDistanceMs + 1;

  for (const row of rows) {
    const key = getStoredMessageKey(row);

    if (usedKeys.has(key) || getStoredCatalogCarouselItems(row.metadata).length === 0) {
      continue;
    }

    const distance = Math.abs(getMessageTimeMillis(row) - targetTime);

    if (distance <= maxDistanceMs && distance < closestDistance) {
      closestRow = row;
      closestDistance = distance;
    }
  }

  return closestRow;
}

function getRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getProfilePictureUrl(value: unknown) {
  const directUrl = getStringValue(value);

  if (directUrl) {
    return directUrl;
  }

  const record = getRecord(value);
  const data = getRecord(record.data);
  return getStringValue(data.url) || getStringValue(record.url);
}

function getFallbackParticipantName(participantId: string) {
  const id = participantId.trim();
  const suffix = id && id !== 'unknown' ? id.slice(-6) : '';
  return suffix ? `Instagram user ${suffix}` : 'Instagram user';
}

function getStoredParticipantCandidate(row: StoredMessageRow, conversationId: string) {
  const metadataParticipant = getRecord(row.metadata?.participant);
  const rawSender = getRecord(row.raw_event?.sender);
  const rawFrom = getRecord(row.raw_event?.from);
  const rawParticipant = getRecord(row.raw_event?.participant);

  const id =
    getStringValue(metadataParticipant.id) ||
    getStringValue(rawParticipant.id) ||
    getStringValue(rawSender.id) ||
    getStringValue(rawFrom.id) ||
    conversationId;
  const username =
    getStringValue(metadataParticipant.username) ||
    getStringValue(rawParticipant.username) ||
    getStringValue(rawSender.username) ||
    getStringValue(rawFrom.username);
  const name =
    getStringValue(metadataParticipant.name) ||
    getStringValue(rawParticipant.name) ||
    getStringValue(rawSender.name) ||
    getStringValue(rawFrom.name);
  const profilePic =
    getStringValue(metadataParticipant.profile_pic) ||
    getProfilePictureUrl(metadataParticipant.picture) ||
    getStringValue(rawParticipant.profile_pic) ||
    getProfilePictureUrl(rawParticipant.picture) ||
    getStringValue(rawSender.profile_pic) ||
    getProfilePictureUrl(rawSender.picture) ||
    getStringValue(rawFrom.profile_pic) ||
    getProfilePictureUrl(rawFrom.picture);

  return {
    id,
    username,
    name,
    profile_pic: profilePic,
  };
}

function getStoredParticipant(rows: StoredMessageRow[], conversationId: string) {
  for (const row of rows) {
    const candidate = getStoredParticipantCandidate(row, conversationId);

    if (candidate.username || candidate.name || candidate.profile_pic) {
      return {
        id: candidate.id,
        username: candidate.username || undefined,
        name: candidate.name || candidate.username || getFallbackParticipantName(candidate.id),
        profile_pic: candidate.profile_pic || undefined,
      };
    }
  }

  return {
    id: conversationId,
    name: getFallbackParticipantName(conversationId),
  };
}

function dedupeStoredMessages(rows: StoredMessageRow[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key =
      row.mid ||
      [
        row.conversation_id || '',
        row.sender_id || '',
        row.recipient_id || '',
        row.direction || '',
        Math.floor(getMessageTimeMillis(row) / 120_000),
        normalizeDedupeText(row.text || ''),
      ].join(':');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeDedupeText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function getConversationMessageTimeMillis(message: { time?: string }) {
  const parsed = message.time ? Date.parse(message.time) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function getAttachmentSignature(attachments?: NormalizedAttachment[]) {
  return (attachments || [])
    .map((attachment) => `${attachment.type}:${attachment.url || attachment.preview_url || attachment.name || ''}`)
    .filter(Boolean)
    .sort()
    .join('|');
}

function getCatalogSignature(items?: CatalogCarouselItem[]) {
  return (items || [])
    .map((item) => `${item.title}:${item.permalink || item.imageUrl || item.thumbnailUrl || item.priceText || ''}`)
    .filter(Boolean)
    .sort()
    .join('|');
}

function dedupeConversationMessages<T extends StoredConversation['messages'][number]>(messages: T[]) {
  const seenIds = new Set<string>();
  const seenContent = new Map<string, number>();

  return messages.filter((message) => {
    if (message.id && seenIds.has(message.id)) {
      return false;
    }

    if (message.id) {
      seenIds.add(message.id);
    }

    const contentSignature = [
      normalizeDedupeText(message.text || ''),
      getAttachmentSignature(message.attachments),
      getCatalogSignature(message.catalogItems),
    ]
      .filter(Boolean)
      .join('|');

    if (!contentSignature) {
      return true;
    }

    const senderSignature = `${message.from}:${message.sender_id || ''}:${contentSignature}`;
    const timestamp = getConversationMessageTimeMillis(message);
    const previousTimestamp = seenContent.get(senderSignature);

    if (previousTimestamp !== undefined && Math.abs(previousTimestamp - timestamp) <= 120_000) {
      return false;
    }

    seenContent.set(senderSignature, timestamp);
    return true;
  });
}

async function loadStoredMessagesForInbox({
  supabase,
  userId,
  ownIgUserId,
}: {
  supabase: ReturnType<typeof createSupabaseServiceClient>;
  userId: string;
  ownIgUserId: string;
}) {
  const selectFields =
    'mid,user_id,conversation_id,sender_id,recipient_id,direction,text,timestamp,raw_event,metadata,created_at';
  const rows: StoredMessageRow[] = [];

  const { data: ownedRows, error: ownedError } = await supabase
    .from('messages')
    .select(selectFields)
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(250);

  if (!ownedError && ownedRows) {
    rows.push(...(ownedRows as StoredMessageRow[]));
  } else if (ownedError) {
    console.error('Stored Instagram messages lookup error:', ownedError);
  }

  const knownConversationIds = Array.from(
    new Set(
      rows
        .map((row) => getStoredConversationId(row, ownIgUserId))
        .filter((id) => id && id !== 'unknown' && id !== ownIgUserId)
    )
  ).slice(0, 100);

  const legacyQueries = [];

  if (ownIgUserId) {
    legacyQueries.push(
      supabase
        .from('messages')
        .select(selectFields)
        .eq('recipient_id', ownIgUserId)
        .order('timestamp', { ascending: false })
        .limit(250)
    );
  }

  if (knownConversationIds.length > 0) {
    legacyQueries.push(
      supabase
        .from('messages')
        .select(selectFields)
        .in('sender_id', knownConversationIds)
        .order('timestamp', { ascending: false })
        .limit(250)
    );
  }

  const legacyResults = await Promise.all(legacyQueries);
  for (const result of legacyResults) {
    if (!result.error && result.data) {
      rows.push(...(result.data as StoredMessageRow[]));
    }
  }

  return dedupeStoredMessages(rows);
}

async function buildStoredConversations({
  supabase,
  userId,
  ownIgUserId,
  permissions,
  limit,
}: {
  supabase: ReturnType<typeof createSupabaseServiceClient>;
  userId: string;
  ownIgUserId: string;
  permissions: ReturnType<typeof getUserPermissionProfile>;
  limit: number;
}) {
  const storedRows = await loadStoredMessagesForInbox({ supabase, userId, ownIgUserId });
  const grouped = new Map<string, StoredMessageRow[]>();

  for (const row of storedRows) {
    const conversationId = getStoredConversationId(row, ownIgUserId);
    if (!conversationId || conversationId === 'unknown') {
      continue;
    }

    const existing = grouped.get(conversationId) || [];
    existing.push(row);
    grouped.set(conversationId, existing);
  }

  const storedConversations = await Promise.all(
    Array.from(grouped.entries()).map(async ([conversationId, rows]) => {
      const sortedRows = [...rows].sort((first, second) => getMessageTimeMillis(second) - getMessageTimeMillis(first));
      const latest = sortedRows[0];
      const participantProfile = getStoredParticipant(sortedRows, conversationId);

      return {
        id: conversationId,
        participant: {
          id: participantProfile.id || conversationId,
          name: participantProfile.name || participantProfile.username || getFallbackParticipantName(conversationId),
          username: participantProfile.username,
          profile_pic: participantProfile.profile_pic,
        },
        updated_time: getMessageTimeIso(latest),
        messages: dedupeConversationMessages(sortedRows.map((message, index) => {
          const parsed = parseStoredMessageContent(message.text || '', message.metadata);
          const isMe =
            message.direction === 'outbound' ||
            (ownIgUserId && message.sender_id === ownIgUserId && message.direction !== 'inbound');

          return {
            id: message.mid || `${conversationId}-${message.timestamp || index}`,
            text: parsed.text,
            attachments: parsed.attachments,
            catalogItems: parsed.catalogItems,
            from: isMe ? 'me' : 'user',
            sender_name: isMe
              ? 'You'
              : participantProfile.name || participantProfile.username || getFallbackParticipantName(conversationId),
            sender_profile_pic: isMe ? undefined : participantProfile.profile_pic,
            sender_id: message.sender_id || (isMe ? ownIgUserId : conversationId),
            time: getMessageTimeIso(message),
            reply_to: parsed.reply_to,
          };
        })),
      } satisfies StoredConversation;
    })
  );

  return filterAssignedConversations(
    storedConversations.sort((first, second) => Date.parse(second.updated_time) - Date.parse(first.updated_time)),
    permissions
  ).slice(0, limit);
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
    const authResult = await authSupabase.auth.getUser().catch((error) => ({
      data: { user: null },
      error,
    }));
    const {
      data: { user },
      error: authError,
    } = authResult;

    if (authError) {
      return NextResponse.json(
        {
          error: 'Please log in again to load Instagram conversations.',
          conversations: [],
          conversation_count: 0,
        },
        { status: 401 }
      );
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
      const storedConversations = await buildStoredConversations({
        supabase,
        userId: user.id,
        ownIgUserId: real_ig_user_id,
        permissions,
        limit: conversationLimit,
      });

      return NextResponse.json(
        {
          error: storedConversations.length > 0 ? undefined : convsData.error.message,
          conversations: countOnly ? [] : storedConversations,
          conversation_count: storedConversations.length,
          ig_user_id: real_ig_user_id,
          account,
          assistant_id: assistantId,
          assistantId,
        },
        { status: 200 }
      );
    }

    const rawConversations: InstagramConversation[] = convsData.data || [];
    const visibleConversations = filterAssignedConversations(rawConversations, permissions);
    const storedConversations = visibleConversations.length === 0
      ? await buildStoredConversations({
          supabase,
          userId: user.id,
          ownIgUserId: real_ig_user_id,
          permissions,
          limit: conversationLimit,
        })
      : [];

    if (countOnly) {
      return NextResponse.json({
        conversation_count: visibleConversations.length || storedConversations.length,
        ig_user_id: real_ig_user_id,
        account,
        assistant_id: assistantId,
        assistantId,
      });
    }

    if (visibleConversations.length === 0 && storedConversations.length > 0) {
      return NextResponse.json({
        conversations: storedConversations,
        conversation_count: storedConversations.length,
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
        const dbMessagesMap: Record<string, { text: string; metadata?: Record<string, unknown> | null }> = {};
        if (mids.length > 0) {
          const { data: dbMessages, error: dbError } = await supabase
            .from('messages')
            .select('mid, text, metadata')
            .in('mid', mids);

          if (!dbError && dbMessages) {
            for (const dbMsg of dbMessages) {
              dbMessagesMap[dbMsg.mid] = {
                text: dbMsg.text || '',
                metadata: dbMsg.metadata && typeof dbMsg.metadata === 'object' ? dbMsg.metadata : null,
              };
            }
          }
        }

        // Find the other participant (not the page/ig user)
        const otherParticipant = participants.find(
          (p) => p.id !== ownParticipantId && p.username !== meData.username
        );
        const otherParticipantProfile = await getParticipantProfile(otherParticipant, access_token);
        const otherParticipantProfileId = otherParticipantProfile?.id || otherParticipant?.id || conv.id;
        const otherParticipantProfilePic = otherParticipantProfile?.profile_pic;
        const participantFallbackName = getFallbackParticipantName(otherParticipantProfileId);
        const participantProfile = otherParticipantProfile
          ? {
              ...otherParticipantProfile,
              name: otherParticipantProfile.name || otherParticipantProfile.username || participantFallbackName,
            }
          : { id: otherParticipantProfileId, name: participantFallbackName };
        const participantUsername = 'username' in participantProfile ? participantProfile.username : '';
        const storedConversationIds = [...new Set([otherParticipantProfileId, conv.id].filter(Boolean))];
        const { data: storedConversationRows } =
          storedConversationIds.length > 0
            ? await supabase
                .from('messages')
                .select('mid,user_id,conversation_id,sender_id,recipient_id,direction,text,timestamp,raw_event,metadata,created_at')
                .eq('user_id', user.id)
                .in('conversation_id', storedConversationIds)
                .order('timestamp', { ascending: false })
                .limit(80)
            : { data: [] };
        const storedRows = (storedConversationRows || []) as StoredMessageRow[];
        const storedCatalogRows = storedRows.filter(
          (row) => getStoredCatalogCarouselItems(row.metadata).length > 0
        );
        const usedStoredCatalogKeys = new Set<string>();

        const graphMessages = messages.map((m) => {
          let text = m.message || '';
          let reply_to = m.reply_to;
          const normalizedAttachments = normalizeAttachments(m.attachments);

          let dbMessage = dbMessagesMap[m.id];
          if (!dbMessage && !text && normalizedAttachments.length === 0) {
            const storedCatalogRow = getClosestStoredCatalogRow(storedCatalogRows, m.created_time, usedStoredCatalogKeys);

            if (storedCatalogRow) {
              usedStoredCatalogKeys.add(getStoredMessageKey(storedCatalogRow));
              dbMessage = {
                text: storedCatalogRow.text || '',
                metadata: storedCatalogRow.metadata || null,
              };
            }
          }
          const dbText = dbMessage?.text || '';
          const parsedStored = dbMessage ? parseStoredMessageContent(dbText, dbMessage.metadata) : null;
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
          if (parsedStored?.catalogItems?.length) {
            text = parsedStored.text;
          }

          const isMe = m.from?.id === ownParticipantId || m.from?.username === meData.username;

          return {
            id: m.id,
            text,
            attachments: parsedStored?.catalogItems?.length ? [] : normalizedAttachments,
            catalogItems: parsedStored?.catalogItems || [],
            from: isMe ? 'me' as const : 'user' as const,
            sender_name: m.from?.name || m.from?.username || (isMe ? 'You' : participantProfile.name),
            sender_profile_pic: m.from?.id === otherParticipantProfileId ? otherParticipantProfilePic : undefined,
            sender_id: m.from?.id || (isMe ? ownParticipantId : otherParticipantProfileId),
            time: m.created_time,
            reply_to,
          };
        });
        const storedSupplementMessages = storedRows.map((message, index) => {
          const parsed = parseStoredMessageContent(message.text || '', message.metadata);
          const isMe =
            message.direction === 'outbound' ||
            (real_ig_user_id && message.sender_id === real_ig_user_id && message.direction !== 'inbound');

          return {
            id: message.mid || `${conv.id}-${message.timestamp || index}`,
            text: parsed.text,
            attachments: parsed.attachments,
            catalogItems: parsed.catalogItems,
            from: isMe ? 'me' as const : 'user' as const,
            sender_name: isMe ? 'You' : participantProfile.name || participantUsername || 'Instagram user',
            sender_profile_pic: isMe ? undefined : otherParticipantProfilePic,
            sender_id: message.sender_id || (isMe ? real_ig_user_id : otherParticipantProfileId),
            time: getMessageTimeIso(message),
            reply_to: parsed.reply_to,
          };
        });

        return {
          id: conv.id,
          participant: participantProfile,
          updated_time: conv.updated_time,
          messages: dedupeConversationMessages([...graphMessages, ...storedSupplementMessages]),
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
