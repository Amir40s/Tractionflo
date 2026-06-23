import { NextResponse, type NextRequest } from 'next/server';
import { canAccessConversation, canAccessPage, getUserPermissionProfile } from '@/lib/agent-permissions';
import { createPendingCommerceOrder, normalizeCommerceOrderDraft, type CommerceOrderDraft } from '@/lib/commerce-orders';
import { storeInstagramMessage } from '@/lib/instagram-message-store';
import { getFreshInstagramAccount } from '@/lib/instagram-token';
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const ATTACHMENT_BUCKET = 'instagram-attachments';
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type RemoteInstagramAttachmentInput = {
  type?: string;
  url?: string;
  name?: string;
  mime_type?: string;
  preview_url?: string;
};

type NormalizedInstagramAttachment = {
  type: 'image' | 'video';
  url: string;
  name: string;
  mime_type: string;
};

type InstagramQuickReply = {
  content_type: 'text';
  title: string;
  payload: string;
};

type InstagramMessagePayload =
  | { text: string; quick_replies?: InstagramQuickReply[] }
  | {
      attachment: {
        type: 'image' | 'video';
        payload: {
          url: string;
        };
      };
    };

type InstagramSendResult = {
  recipient_id?: string;
  message_id?: string;
  text?: string;
  attachment?: {
    type: 'image' | 'video';
    url: string;
    name?: string;
    mime_type?: string;
  };
};

const confirmOrderQuickReplies: InstagramQuickReply[] = [
  {
    content_type: 'text',
    title: 'Confirm order',
    payload: 'CONFIRM_ORDER',
  },
];

type InstagramGraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

class InstagramSendError extends Error {
  status: number;
  code: string;
  graphError?: InstagramGraphError;

  constructor(
    message: string,
    options: { status?: number; code?: string; graphError?: InstagramGraphError } = {}
  ) {
    super(message);
    this.name = 'InstagramSendError';
    this.status = options.status || 502;
    this.code = options.code || 'instagram_send_failed';
    this.graphError = options.graphError;
  }
}

function isMessagingWindowError(error?: InstagramGraphError) {
  const message = (error?.message || '').toLowerCase();

  return (
    message.includes('allowed window') ||
    message.includes('allowed time') ||
    message.includes('permitted time') ||
    (message.includes('outside') && message.includes('window')) ||
    (message.includes('24') && message.includes('hour')) ||
    (message.includes('اجازت') && message.includes('مدت'))
  );
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return typeof value !== 'string' && value.size > 0 && typeof value.arrayBuffer === 'function';
}

function getAttachmentType(file: File): 'image' | 'video' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';

  throw new Error('Only image and video attachments can be sent to Instagram right now.');
}

function getSafeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120) || 'attachment';
}

function parseRemoteAttachmentInput(value: unknown): RemoteInstagramAttachmentInput[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    if (!value.trim()) {
      return [];
    }

    try {
      return parseRemoteAttachmentInput(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is RemoteInstagramAttachmentInput => Boolean(item && typeof item === 'object'));
  }

  if (typeof value === 'object') {
    return [value as RemoteInstagramAttachmentInput];
  }

  return [];
}

function inferRemoteAttachmentType(input: RemoteInstagramAttachmentInput): 'image' | 'video' {
  if (input.type === 'image' || input.type === 'video') {
    return input.type;
  }

  const url = input.url || '';

  if (/\.(mp4|mov|m4v)(?:[?#]|$)/i.test(url) || input.mime_type?.startsWith('video/')) {
    return 'video';
  }

  return 'image';
}

function normalizeRemoteAttachments(value: unknown): NormalizedInstagramAttachment[] {
  return parseRemoteAttachmentInput(value)
    .slice(0, 5)
    .map((input) => {
      const rawUrl = String(input.url || '').trim();

      if (!rawUrl) {
        throw new Error('Catalog attachment is missing a media URL.');
      }

      let url: URL;

      try {
        url = new URL(rawUrl);
      } catch {
        throw new Error('Catalog attachment URL is invalid.');
      }

      if (url.protocol !== 'https:') {
        throw new Error('Instagram can only send catalog attachments from secure public HTTPS URLs.');
      }

      const type = inferRemoteAttachmentType(input);

      return {
        type,
        url: url.toString(),
        name: String(input.name || `catalog-${type}`).slice(0, 120),
        mime_type: input.mime_type || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
      };
    });
}

async function sendInstagramMessage(
  accessToken: string,
  recipientId: string,
  message: InstagramMessagePayload
) {
  const messageUrl = new URL('https://graph.instagram.com/v21.0/me/messages');
  messageUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(messageUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as InstagramSendResult & {
    error?: InstagramGraphError;
  };

  if (!response.ok || data.error) {
    if (isMessagingWindowError(data.error)) {
      throw new InstagramSendError(
        'Instagram blocked this reply because Meta only allows API replies inside the messaging window after the customer sends a recent DM. Ask the customer to message again, then resend.',
        {
          status: 409,
          code: 'instagram_messaging_window_closed',
          graphError: data.error,
        }
      );
    }

    throw new InstagramSendError(data.error?.message || 'Instagram could not send this message.', {
      status: response.ok ? 502 : response.status,
      graphError: data.error,
    });
  }

  return data;
}

async function sendInstagramTextWithOptionalQuickReplies(
  accessToken: string,
  recipientId: string,
  text: string,
  quickReplies: InstagramQuickReply[] = []
) {
  if (quickReplies.length === 0) {
    return sendInstagramMessage(accessToken, recipientId, { text });
  }

  try {
    return await sendInstagramMessage(accessToken, recipientId, {
      text,
      quick_replies: quickReplies,
    });
  } catch (error) {
    console.warn('Instagram quick reply send failed; retrying as plain text.', error);
    return sendInstagramMessage(accessToken, recipientId, { text });
  }
}

async function ensureAttachmentBucket(supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const { data: bucket } = await supabase.storage.getBucket(ATTACHMENT_BUCKET);

  if (bucket) {
    return;
  }

  const { error } = await supabase.storage.createBucket(ATTACHMENT_BUCKET, {
    public: true,
    fileSizeLimit: MAX_ATTACHMENT_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'],
  });

  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw new Error(`Could not prepare attachment storage: ${error.message}`);
  }
}

async function uploadAttachment(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  file: File
): Promise<NormalizedInstagramAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} is too large. Keep Instagram attachments under 20MB.`);
  }

  const attachmentType = getAttachmentType(file);
  const path = `${Date.now()}-${globalThis.crypto.randomUUID()}-${getSafeFileName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Could not upload ${file.name}: ${error.message}`);
  }

  const { data } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error(`Could not create a public URL for ${file.name}.`);
  }

  return {
    type: attachmentType,
    url: data.publicUrl,
    name: file.name,
    mime_type: file.type,
  };
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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

    if (!canAccessPage(permissions, 'inbox')) {
      return NextResponse.json({ error: 'Conversations are not enabled for this agent.' }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const account = await getFreshInstagramAccount(supabase, user.id);
    const accessToken = account?.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let recipientId = '';
    let conversationId = '';
    let text = '';
    let files: File[] = [];
    let remoteAttachments: NormalizedInstagramAttachment[] = [];
    let orderDraft: CommerceOrderDraft | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      recipientId = String(formData.get('recipientId') || '').trim();
      conversationId = String(formData.get('conversationId') || '').trim();
      text = String(formData.get('text') || '').trim();
      files = formData.getAll('files').filter(isUploadFile);
      remoteAttachments = normalizeRemoteAttachments(formData.get('attachmentUrls'));
      orderDraft = normalizeCommerceOrderDraft(formData.get('orderDraft'));
    } else {
      const body = (await request.json()) as {
        recipientId?: string;
        conversationId?: string;
        text?: string;
        attachmentUrls?: unknown;
        orderDraft?: unknown;
      };
      recipientId = String(body.recipientId || '').trim();
      conversationId = String(body.conversationId || '').trim();
      text = String(body.text || '').trim();
      remoteAttachments = normalizeRemoteAttachments(body.attachmentUrls);
      orderDraft = normalizeCommerceOrderDraft(body.orderDraft);
    }

    if (!recipientId) {
      return NextResponse.json({ error: 'A recipient is required.' }, { status: 400 });
    }

    if (!text && files.length === 0 && remoteAttachments.length === 0) {
      return NextResponse.json({ error: 'Type a message or attach an image/video.' }, { status: 400 });
    }

    if (!canAccessConversation(permissions, conversationId)) {
      return NextResponse.json({ error: 'This conversation is not assigned to this agent.' }, { status: 403 });
    }

    const sent: InstagramSendResult[] = [];
    let orderId = '';
    let order: Awaited<ReturnType<typeof createPendingCommerceOrder>> = null;
    const sendOrderTextLast = Boolean(orderDraft && text && (files.length > 0 || remoteAttachments.length > 0));

    if (orderDraft) {
      order = await createPendingCommerceOrder(supabase, user.id, {
        ...orderDraft,
        conversationId: orderDraft.conversationId || conversationId,
        instagramSenderId: orderDraft.instagramSenderId || recipientId,
      }).catch((orderError) => {
        console.error('Commerce order creation before Instagram confirm send failed:', orderError);
        return null;
      });
      orderId = order?.id || '';
    }

    if (text && !sendOrderTextLast) {
      const result = await sendInstagramTextWithOptionalQuickReplies(
        accessToken,
        recipientId,
        text,
        order ? confirmOrderQuickReplies : []
      );
      sent.push({
        recipient_id: result.recipient_id,
        message_id: result.message_id,
        text,
      });
    }

    if (files.length > 0) {
      await ensureAttachmentBucket(supabase);

      for (const file of files) {
        const attachment = await uploadAttachment(supabase, file);
        const result = await sendInstagramMessage(accessToken, recipientId, {
          attachment: {
            type: attachment.type,
            payload: {
              url: attachment.url,
            },
          },
        });

        sent.push({
          recipient_id: result.recipient_id,
          message_id: result.message_id,
          attachment,
        });
      }
    }

    for (const attachment of remoteAttachments) {
      try {
        const result = await sendInstagramMessage(accessToken, recipientId, {
          attachment: {
            type: attachment.type,
            payload: {
              url: attachment.url,
            },
          },
        });

        sent.push({
          recipient_id: result.recipient_id,
          message_id: result.message_id,
          attachment,
        });
      } catch (attachmentError) {
        if (!sendOrderTextLast) {
          throw attachmentError;
        }

        console.warn('Instagram order attachment could not be sent; continuing with confirm text.', attachmentError);
      }
    }

    if (text && sendOrderTextLast) {
      const result = await sendInstagramTextWithOptionalQuickReplies(
        accessToken,
        recipientId,
        text,
        order ? confirmOrderQuickReplies : []
      );
      sent.push({
        recipient_id: result.recipient_id,
        message_id: result.message_id,
        text,
      });
    }

    await Promise.all(
      sent.map((message) =>
        storeInstagramMessage({
          supabase,
          mid: message.message_id || '',
          userId: user.id,
          conversationId,
          senderId: account.ig_user_id || user.id,
          recipientId,
          direction: 'outbound',
          text: message.text || (message.attachment ? `[${message.attachment.type} attachment] ${message.attachment.url}` : ''),
          timestamp: Date.now(),
          rawEvent: message as Record<string, unknown>,
          metadata: {
            orderId,
            source: 'manual_instagram_send',
          },
        }).catch((storeError) => {
          console.error('Could not persist outbound Instagram message:', storeError);
        })
      )
    );

    await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
      type: 'message',
      title: 'Instagram reply sent',
      body: text
        ? text.slice(0, 120)
        : `${files.length + remoteAttachments.length} attachment${files.length + remoteAttachments.length === 1 ? '' : 's'} sent.`,
      url: '/conversations',
      metadata: {
        sentCount: sent.length,
        conversationId,
        orderId,
      },
    }).catch((notificationError) => {
      console.error('Realtime Instagram send notification error:', notificationError);
    });

    return NextResponse.json({ ok: true, sent, order });
  } catch (err) {
    if (err instanceof InstagramSendError) {
      console.error('Instagram send error:', err.graphError || err);
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          graphCode: err.graphError?.code,
          graphSubcode: err.graphError?.error_subcode,
        },
        { status: err.status }
      );
    }

    const message = err instanceof Error ? err.message : 'Could not send Instagram message';
    console.error('Instagram send error:', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
