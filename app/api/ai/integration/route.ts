import { NextResponse } from 'next/server';
import { resolvePlatformAiConfig } from '@/lib/platform-ai-config';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return { user };
}

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      integration: (await resolvePlatformAiConfig()).integration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load AI integration';
    console.error('AI integration load error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await request.json().catch(() => ({}));
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'AI Integration is managed once by the superadmin for all creator accounts.' },
      { status: 403 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save AI integration';
    console.error('AI integration save error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
