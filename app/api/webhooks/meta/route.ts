import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Meta verification parameters
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN;

  console.log('\n--- WEBHOOK VERIFICATION ATTEMPT ---');
  console.log('Mode:', mode);
  console.log('Received Token:', token);
  console.log('Expected Token (.env):', verifyToken);
  console.log('Challenge:', challenge);

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WEBHOOK_VERIFIED SUCCESSFULLY!');
      return new Response(challenge || '', { 
        status: 200, 
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.log('❌ FORBIDDEN: Tokens do not match!');
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  console.log('❌ BAD REQUEST: Missing mode or token');
  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook Received:', JSON.stringify(body, null, 2));

    // Parse incoming messages and save to Supabase
    if (body.object === 'instagram') {
      const messagesToInsert = [];

      for (const entry of body.entry || []) {
        for (const msg of entry.messaging || []) {
          if (msg.message && msg.message.text) {
            messagesToInsert.push({
              mid: msg.message.mid,
              sender_id: msg.sender.id,
              text: msg.message.text,
              timestamp: msg.timestamp,
            });
          }
        }
      }

      if (messagesToInsert.length > 0) {
        const supabase = createSupabaseServiceClient();
        const { error: dbError } = await supabase.from('messages').insert(messagesToInsert);
        if (dbError) {
           console.error('Supabase Insert Error:', dbError);
        }
      }
    }

    // Acknowledge receipt to Meta quickly (must be within 20 seconds)
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
