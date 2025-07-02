import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

// TikTok endpoints
const TIKTOK_UPLOAD_URL = 'https://open.tiktokapis.com/v2/video/upload/';
const TIKTOK_PUBLISH_URL = 'https://open.tiktokapis.com/v2/video/publish/';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar usuario autenticado
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Leer datos del body
    const { videoUrl, title, description, privacy } = await req.json();
    if (!videoUrl || !title) {
      return NextResponse.json({ error: 'Missing videoUrl or title' }, { status: 400 });
    }

    // 3. Obtener access_token de Firestore
    const tiktokRef = db.collection('app_tokens').doc(userId).collection('tiktok').doc('connection');
    const tiktokDoc = await tiktokRef.get();
    if (!tiktokDoc.exists) {
      return NextResponse.json({ error: 'TikTok account not connected' }, { status: 401 });
    }
    const { accessToken } = tiktokDoc.data() || {};
    if (!accessToken) {
      return NextResponse.json({ error: 'No TikTok access token found' }, { status: 401 });
    }

    // 4. Descargar el video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    // 5. Solicitar upload_url a TikTok
    const uploadUrlRes = await fetch(TIKTOK_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'FILE_UPLOAD' })
    });
    const uploadUrlData = await uploadUrlRes.json();
    if (!uploadUrlRes.ok || !uploadUrlData.data?.upload_url || !uploadUrlData.data?.video_id) {
      return NextResponse.json({ error: 'Failed to get TikTok upload URL', detail: uploadUrlData }, { status: 500 });
    }
    const { upload_url, video_id } = uploadUrlData.data;

    // 6. Subir el video al upload_url
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: videoBuffer
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: 'Failed to upload video to TikTok', detail: err }, { status: 500 });
    }

    // 7. Publicar el video
    const publishRes = await fetch(TIKTOK_PUBLISH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id,
        title,
        description: description || '',
        visibility: privacy || 'public', // 'public', 'private', 'draft'
      })
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return NextResponse.json({ error: 'Failed to publish video to TikTok', detail: publishData }, { status: 500 });
    }

    // 8. Retornar resultado
    return NextResponse.json({ success: true, video_id, publish: publishData });
  } catch (err: any) {
    console.error('TikTok upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
} 