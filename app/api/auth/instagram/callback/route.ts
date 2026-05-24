import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: searchParams.get('error_description') || 'Authorization failed' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  try {
     const formData = new URLSearchParams();
    formData.append('client_id', appId);
    formData.append('client_secret', appSecret);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code);

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;

    if (userId && accessToken) {
      // Upsert into Supabase
      const { error: dbError } = await supabase.from('instagram_accounts').upsert(
        { ig_user_id: userId.toString(), access_token: accessToken },
        { onConflict: 'ig_user_id' }
      );
      if (dbError) console.error('Supabase Insert Error:', dbError);
    }

    const response = NextResponse.redirect(new URL('/?ig_connected=true', baseUrl));
    
    // Keeping cookie as fallback for frontend state
    response.cookies.set('ig_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return response;
  } catch (err: any) {
    console.error('Instagram OAuth Error:', err);
    return NextResponse.json({ error: 'Failed to exchange token', details: err.message }, { status: 500 });
  }
}
