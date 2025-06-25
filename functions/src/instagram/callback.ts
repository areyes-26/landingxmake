import * as functions from 'firebase-functions/v1';
import { db } from '../lib/firebase-admin';
import axios from 'axios';

export const instagramCallback = functions.https.onRequest(async (req, res) => {
  const cfg = functions.config().instagram;
  const { client_id, client_secret, redirect_uri } = cfg;

  const { code, state } = req.query as { code?: string; state?: string };

  console.log('[instagramCallback] code:', code);
  console.log('[instagramCallback] state:', state);
  console.log('[instagramCallback] redirect_uri:', redirect_uri);

  if (!code || !state) {
    console.error('[ERROR] Missing code or state');
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    console.log('[STEP] Exchanging code for token...');
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id,
        client_secret,
        redirect_uri,
        code,
      },
    });

    console.log('[TOKEN RESPONSE]', tokenResponse.data);

    const access_token = tokenResponse.data.access_token;

    if (!access_token) {
      console.error('[ERROR] No access_token in tokenResponse');
      res.status(500).json({ error: 'No access_token returned' });
      return;
    }

    console.log('[STEP] Fetching user profile...');
    const meResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token,
        fields: 'id,name',
      },
    });

    console.log('[PROFILE RESPONSE]', meResponse.data);

    const { id, name } = meResponse.data;

    await db.collection('instagram_tokens').doc(id).set({
      accessToken: access_token,
      userId: id,
      name,
      createdAt: Date.now(),
    });

    console.log('[SUCCESS] Token and profile saved. Redirecting...');
    res.redirect('https://landing-videos-generator-06--landing-x-make.us-central1.web.app/instagram/success');
  } catch (error: any) {
    const raw = error.response?.data || error.message;
    console.error('[ERROR] Failed during OAuth flow:', raw);
    res.status(500).json({ error: 'Error exchanging code or retrieving profile', detail: raw });
  }
});
