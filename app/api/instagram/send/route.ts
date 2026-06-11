import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ATTACHMENT_BUCKET = 'instagram-attachments';
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type InstagramMessagePayload =
  | { text: string }
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
    name: string;
    mime_type: string;
  };
};

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

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Instagram could not send this message.');
  }

  return data;
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
) {
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
    const supabase = createSupabaseServiceClient();
    const { data: accounts, error: dbError } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    const accessToken = accounts?.[0]?.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let recipientId = '';
    let text = '';
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      recipientId = String(formData.get('recipientId') || '').trim();
      text = String(formData.get('text') || '').trim();
      files = formData.getAll('files').filter(isUploadFile);
    } else {
      const body = (await request.json()) as { recipientId?: string; text?: string };
      recipientId = String(body.recipientId || '').trim();
      text = String(body.text || '').trim();
    }

    if (!recipientId) {
      return NextResponse.json({ error: 'A recipient is required.' }, { status: 400 });
    }

    if (!text && files.length === 0) {
      return NextResponse.json({ error: 'Type a message or attach an image/video.' }, { status: 400 });
    }

    const sent: InstagramSendResult[] = [];

    if (text) {
      const result = await sendInstagramMessage(accessToken, recipientId, { text });
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

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send Instagram message';
    console.error('Instagram send error:', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
