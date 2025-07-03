import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Leer la URI de redirección y el clientKey desde la variable de entorno
    const redirectUri = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI;
    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
    if (!redirectUri) {
      return NextResponse.json({ error: 'TikTok redirect URI not set in environment' }, { status: 500 });
    }
    if (!clientKey) {
      return NextResponse.json({ error: 'TikTok client key not set in environment' }, { status: 500 });
    }
    const config = {
      clientKey,
      redirectUri,
      scopes: [
        'user.info.basic',
        'video.upload',
        'video.publish'
      ]
    };
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error getting TikTok config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 