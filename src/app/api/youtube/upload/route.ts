import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export const runtime = 'nodejs'; // Asegura que se use Node para manejar blobs grandes

async function getUserIdFromSession(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) throw new Error('No session cookie');
  const decoded = await auth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

async function refreshYouTubeAccessToken(refresh_token: string) {
  const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!client_id || !client_secret) throw new Error('Missing Google client credentials');
  const params = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Failed to refresh access token');
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[YouTube] POST /api/youtube/upload called');
    const { videoUrl, title, description } = await req.json();
    if (!videoUrl || !title) {
      console.log('[YouTube] Missing videoUrl or title');
      return NextResponse.json({ error: 'Missing videoUrl or title' }, { status: 400 });
    }
    // 1. Verificar usuario autenticado
    let userId;
    try {
      userId = await getUserIdFromSession(req);
      console.log('[YouTube] userId:', userId);
    } catch (err) {
      console.log('[YouTube] Error getting userId:', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // 2. Obtener access_token y refresh_token de Firestore
    const ytDocRef = db.collection('youtube_tokens').doc(userId);
    const ytDoc = await ytDocRef.get();
    if (!ytDoc.exists) {
      console.log('[YouTube] No YouTube token doc for user:', userId);
      return NextResponse.json({ error: 'YouTube account not connected' }, { status: 401 });
    }
    let { access_token, refresh_token } = ytDoc.data() || {};
    if (!access_token) {
      console.log('[YouTube] No access_token for user:', userId);
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }
    // 3. Descargar el video
    let videoBuffer: Buffer;
    try {
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error('Failed to download video');
      videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      console.log('[YouTube] Video downloaded, size:', videoBuffer.length);
    } catch (err) {
      console.log('[YouTube] Error downloading video:', err);
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
    }
    // 4. Subir a YouTube
    async function uploadToYouTube(token: string) {
      const metadata = {
        snippet: { title, description: description || '' },
        status: { privacyStatus: 'private' },
      };
      const boundary = 'foo_bar_baz';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      const multipartBody = Buffer.concat([
        Buffer.from(
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: video/mp4\r\n\r\n',
          'utf-8'
        ),
        videoBuffer,
        Buffer.from(closeDelimiter, 'utf-8'),
      ]);
      return await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );
    }
    let uploadRes = await uploadToYouTube(access_token);
    if (uploadRes.status === 401 && refresh_token) {
      // Token expirado o inválido, intentar refresh
      console.log('[YouTube] Access token expired, refreshing...');
      try {
        access_token = await refreshYouTubeAccessToken(refresh_token);
        await ytDocRef.update({ access_token, updatedAt: new Date() });
        console.log('[YouTube] Access token refreshed and updated in Firestore');
        uploadRes = await uploadToYouTube(access_token);
      } catch (refreshErr) {
        console.log('[YouTube] Failed to refresh access token:', refreshErr);
        return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 });
      }
    }
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      console.log('[YouTube] Upload failed:', err);
      return NextResponse.json({ error: err.error?.message || 'YouTube upload failed' }, { status: 500 });
    }
    const data = await uploadRes.json();
    console.log('[YouTube] Upload successful, videoId:', data.id);
    return NextResponse.json({ success: true, videoId: data.id, videoUrl: `https://www.youtube.com/watch?v=${data.id}` });
  } catch (err: any) {
    console.log('[YouTube] General error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
} 