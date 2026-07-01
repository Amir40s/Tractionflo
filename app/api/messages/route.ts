import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json([]);
    }

    const cleanedData = ((data || []) as any[]).map((m) => {
      let text = m.text || '';
      if (text.startsWith('__STORY_REPLY__:') && text.includes('__TEXT__:')) {
        const parts = text.split('__TEXT__:', 2);
        if (parts.length === 2) {
          text = parts[1];
        }
      }
      return {
        ...m,
        text,
      };
    });

    return NextResponse.json(cleanedData);
  } catch {
    return NextResponse.json([]);
  }
}
