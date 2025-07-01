import * as functions from 'firebase-functions/v1';
import { db } from '../lib/firebase-admin';
import axios from 'axios';

export const tiktokCallback = functions.https.onRequest(async (req, res) => {
  const cfg = functions.config().tiktok;
  const { client_key, client_secret, redirect_uri } = cfg;

  const { code, state } = req.query as { code?: string; state?: string };

  console.log('[tiktokCallback] code:', code);
  console.log('[tiktokCallback] state:', state);
  console.log('[DEBUG] client_key:', client_key);
  console.log('[DEBUG] client_secret exists:', !!client_secret);
  console.log('[DEBUG] redirect_uri:', redirect_uri);

  if (!code || !state) {
    console.error('[ERROR] Missing code or state');
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    // Intercambiar code por access_token usando OAuth v2
    const tokenRes = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key,
      client_secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      }
    });

    const tokenData = tokenRes.data.data;
    console.log('[TOKEN RESPONSE]', tokenData);
    if (!tokenData.access_token) {
      console.error('Error en intercambio de código:', tokenData);
      res.status(500).json({ error: 'No access_token returned', detail: tokenData });
      return;
    }

    // Guardar en Firestore
    const { open_id, access_token, refresh_token, expires_in, refresh_expires_in, scope } = tokenData;
    
    // Obtener información básica del usuario usando v2 API
    let userInfo = null;
    try {
      const userRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });
      userInfo = userRes.data.data;
    } catch (error) {
      console.log('[WARNING] Could not fetch user info:', error);
    }

    const connectionData = {
      openId: open_id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      refreshExpiresIn: refresh_expires_in,
      scope,
      displayName: userInfo?.display_name || null,
      avatarUrl: userInfo?.avatar_url || null,
      createdAt: Date.now(),
      state,
      // Nota: userId se agregará cuando el usuario complete el flujo
    };
    
    // Guardar en la colección centralizada app_tokens
    await db.collection('app_tokens').doc(state).collection('tiktok').doc('connection').set(connectionData);
    
    // También guardar el perfil para mostrar en la UI
    const profileData = {
      id: open_id,
      displayName: userInfo?.display_name || 'TikTok User',
      avatarUrl: userInfo?.avatar_url,
      access_token: access_token,
      refresh_token: refresh_token,
      token_expires_at: Date.now() + (expires_in * 1000),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await db.collection('app_tokens').doc(state).collection('tiktok').doc('profile').set(profileData);

    console.log('[SUCCESS] TikTok connection saved. Redirecting...');
    res.redirect(`https://landing-videos-generator-06--landing-x-make.us-central1.web.app/tiktok/success?state=${state}`);
  } catch (error: any) {
    const raw = error.response?.data || error.message;
    console.error('[ERROR] Failed during TikTok OAuth flow:', raw);
    res.status(500).json({ error: 'Error exchanging code', detail: raw });
  }
}); 