import * as functions from 'firebase-functions/v1';
import { admin, db } from '../lib/firebase-admin';
import axios from 'axios';
import { InstagramAuthResponse } from './types';

// Simple cookie parser function
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

export const instagramCallback = functions.https.onRequest(async (req: any, res: any) => {
  // Config desde Firebase - movido dentro del handler
  const cfg = (functions.config() as any).instagram;
  const CLIENT_ID = cfg.client_id as string;
  const CLIENT_SECRET = cfg.client_secret as string;
  const REDIRECT_URI = cfg.redirect_uri as string;

  const cookies = parseCookies(req.headers.cookie);
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state) {
    res.status(400).json({ error: 'Missing code or state parameter' });
    return;
  }
  if (cookies.instagram_state !== state) {
    res.status(401).json({ error: 'Invalid state parameter' });
    return;
  }

  try {
    const { data } = await axios.post<InstagramAuthResponse>(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code.toString(),
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    await db.collection('instagram_tokens').doc(data.user_id).set({
      accessToken: data.access_token,
      userId: data.user_id,
      expiresAt: Date.now() + 3_600_000,
      createdAt: Date.now(),
    });

    res.redirect('/instagram/success');
  } catch (err) {
    console.error('Instagram callback error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});
