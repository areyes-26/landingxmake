import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Configuración de TikTok - usar los mismos valores que Firebase Functions
    const config = {
      clientKey: 'sbawn9w6d1qs6whocc',
      redirectUri: 'https://us-central1-landing-x-make.cloudfunctions.net/tiktokCallback',
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