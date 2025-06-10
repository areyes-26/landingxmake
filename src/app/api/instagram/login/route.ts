export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    // Generate a random state string
    const state = randomBytes(16).toString('hex');
    
    // Store the state in cookies
    const cookieStore = await cookies();
    cookieStore.set('instagram_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
    });

    // Construct Instagram authorization URL
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!);
    authUrl.searchParams.set('scope', 'user_profile,user_media');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    // Redirect to Instagram authorization URL
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Instagram login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Instagram login' },
      { status: 500 }
    );
  }
}
