import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Leer la URI de redirección desde la variable de entorno
    const redirectUri = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI;
    if (!redirectUri) {
      return NextResponse.json({ error: 'TikTok redirect URI not set in environment' }, { status: 500 });
    }
    const config = {
      clientKey: 'sbawn9w6d1qs6whocc',
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