import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/api/youtube/callback'
    : 'https://landing-videos-generator-06--landing-x-make.us-central1.web.app/api/youtube/callback';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

async function exchangeCodeForTokens(code: string) {
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', GOOGLE_CLIENT_ID!);
  params.append('client_secret', GOOGLE_CLIENT_SECRET!);
  params.append('redirect_uri', REDIRECT_URI);
  params.append('grant_type', 'authorization_code');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Failed to exchange code for tokens');
  return res.json();
}

async function getYouTubeProfile(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch YouTube profile');
  return res.json();
}

async function getUserIdFromSession(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) throw new Error('No session cookie');
  const decoded = await auth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/account-setting?section=connections&error=access_denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/account-setting?section=connections&error=missing_code`);
  }

  try {
    // 1. Intercambiar el code por tokens
    const tokenData = await exchangeCodeForTokens(code);
    const { access_token, refresh_token, expires_in, id_token } = tokenData;

    // 2. Obtener perfil de usuario de Google
    const profile = await getYouTubeProfile(access_token);

    // 3. Obtener el userId autenticado
    const userId = await getUserIdFromSession(req);

    // 4. Guardar en Firestore - colección centralizada app_tokens
    await db.collection('app_tokens').doc(userId).collection('youtube').doc('connection').set({
      access_token,
      refresh_token,
      expires_in,
      id_token,
      updatedAt: new Date(),
    });
    
    // Fechas legibles
    const now = new Date();
    const createdAt = now.toISOString();
    const updatedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + expires_in * 1000).toISOString();

    // También guardar el perfil para mostrar en la UI
    await db.collection('app_tokens').doc(userId).collection('youtube').doc('profile').set({
      id: profile.id || null,
      name: profile.name || null,
      email: profile.email || null,
      picture: profile.picture || null,
      access_token,
      refresh_token,
      token_expires_at: expiresAt,
      createdAt,
      updatedAt
    });

    // 5. Redirigir a la sección de conexiones con éxito
    return NextResponse.redirect('https://visiora.ai/account-setting?section=connections&success=youtube_connected');
  } catch (err) {
    console.error('YouTube OAuth callback error:', err);
    return NextResponse.redirect('https://visiora.ai/account-setting?section=connections&error=youtube_oauth');
  }
}
