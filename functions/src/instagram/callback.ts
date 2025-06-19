import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import { ParsedQs } from 'qs';
import { InstagramAuthResponse } from './types';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Config desde Firebase
const cfg = (functions.config() as any).instagram;
const CLIENT_ID = cfg.client_id as string;
const CLIENT_SECRET = cfg.client_secret as string;
const REDIRECT_URI = cfg.redirect_uri as string;

const parseCookies = cookieParser();

export const instagramCallback = functions.https.onRequest((req: any, res: any) => {
  // ✅ casteo doble para evitar error TS2352
  const typedReq = req as unknown as Request;
  const typedRes = res as unknown as Response;

  parseCookies(typedReq, typedRes, async () => {
    const enrichedReq = typedReq as unknown as {
      query: ParsedQs & { code?: string; state?: string };
      cookies: { instagram_state?: string };
    };

    const { code, state } = enrichedReq.query;

    if (!code || !state) {
      typedRes.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }
    if (enrichedReq.cookies.instagram_state !== state) {
      typedRes.status(401).json({ error: 'Invalid state parameter' });
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

      typedRes.redirect('/instagram/success');
    } catch (err) {
      console.error('Instagram callback error:', err);
      typedRes.status(500).json({
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  });
});
