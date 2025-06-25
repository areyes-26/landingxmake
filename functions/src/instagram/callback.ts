import * as functions from 'firebase-functions/v1';
import { db } from '../lib/firebase-admin';
import axios from 'axios';

export const instagramCallback = functions.https.onRequest(async (req, res) => {
  const cfg = functions.config().instagram;
  const { client_id, client_secret, redirect_uri } = cfg;

  const { code, state } = req.query as { code?: string; state?: string };

  console.log('[instagramCallback] code:', code);
  console.log('[instagramCallback] state:', state);

  if (!code || !state) {
    console.error('[ERROR] Missing code or state');
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    console.log('[STEP] Exchanging code for access token...');
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id,
        client_secret,
        redirect_uri,
        code,
      },
    });

    const { access_token, token_type, expires_in } = tokenRes.data;
    console.log('[TOKEN RESPONSE]', tokenRes.data);

    if (!access_token) {
      console.error('[ERROR] No access_token received');
      res.status(500).json({ error: 'No access_token returned' });
      return;
    }

    // Guardamos token básico asociado a un ID de sesión (por ahora sin perfil)
    await db.collection('instagram_tokens').doc(state).set({
      accessToken: access_token,
      tokenType: token_type,
      expiresIn: expires_in,
      createdAt: Date.now(),
    });

    console.log('[SUCCESS] Token saved. Redirecting...');
    res.redirect('https://landing-videos-generator-06--landing-x-make.us-central1.web.app/instagram/success');
  } catch (error: any) {
    const raw = error.response?.data || error.message;
    console.error('[ERROR] Failed during OAuth flow:', raw);
    res.status(500).json({ error: 'Error exchanging code', detail: raw });
  }
});
