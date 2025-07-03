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
    // Obtener el UID real del usuario desde state
    const userId = state;

    // Validar que el UID exista en user_data
    const userDataRef = db.collection('user_data').doc(userId);
    const userDataDoc = await userDataRef.get();
    if (!userDataDoc.exists) {
      console.error(`[ERROR] UID inválido en state: ${userId}`);
      res.status(400).json({ error: 'Invalid state: user not found' });
      return;
    }

    // Intercambiar code por access_token usando OAuth v2
    const params = new URLSearchParams();
    params.append('client_key', client_key);
    params.append('client_secret', client_secret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirect_uri);

    const tokenRes = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      }
    });

    console.log('[TOKEN RESPONSE FULL]', JSON.stringify(tokenRes.data, null, 2));
    console.log('[TOKEN RESPONSE STATUS]', tokenRes.status);
    console.log('[TOKEN RESPONSE HEADERS]', tokenRes.headers);

    // Verificar si hay error en la respuesta
    if (tokenRes.data.error) {
      console.error('[TIKTOK ERROR]', tokenRes.data);
      res.status(500).json({ error: 'TikTok OAuth error', detail: tokenRes.data });
      return;
    }

    const tokenData = tokenRes.data;
    console.log('[TOKEN RESPONSE]', tokenData);
    if (!tokenData || !tokenData.access_token) {
      console.error('Error en intercambio de código:', tokenRes.data);
      res.status(500).json({ error: 'No access_token returned', detail: tokenRes.data });
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
      console.log('[USER INFO RESPONSE FULL]', JSON.stringify(userRes.data, null, 2));
      console.log('[USER INFO STATUS]', userRes.status);
      userInfo = userRes.data.data;
      console.log('[USER INFO DATA]', userInfo);
    } catch (error) {
      console.log('[WARNING] Could not fetch user info:', error);
      if (error.response) {
        console.log('[USER INFO ERROR RESPONSE]', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Eliminar documentos previos para evitar duplicados
    const tkConnRef = db.collection('app_tokens').doc(userId).collection('tiktok').doc('connection');
    const tkProfileRef = db.collection('app_tokens').doc(userId).collection('tiktok').doc('profile');
    await tkConnRef.delete();
    await tkProfileRef.delete();

    // Fechas legibles
    const now = new Date();
    const createdAt = now.toISOString();
    const updatedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + expires_in * 1000).toISOString();

    const connectionData = {
      openId: open_id || null,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      refreshExpiresIn: refresh_expires_in,
      scope,
      displayName: (userInfo && userInfo.display_name) ? userInfo.display_name : null,
      avatarUrl: (userInfo && userInfo.avatar_url) ? userInfo.avatar_url : null,
      createdAt,
      updatedAt,
      expiresAt,
      userId: userId,
    };
    console.log('[TikTok OAuth Callback] userId:', userId);
    console.log('[TikTok OAuth Callback] connectionData:', connectionData);
    await tkConnRef.set(connectionData);

    // También guardar el perfil para mostrar en la UI
    const profileData = {
      id: open_id || null,
      displayName: (userInfo && userInfo.display_name) ? userInfo.display_name : 'TikTok User',
      avatarUrl: (userInfo && userInfo.avatar_url) ? userInfo.avatar_url : null,
      access_token: access_token,
      refresh_token: refresh_token,
      token_expires_at: expiresAt,
      createdAt,
      updatedAt
    };
    console.log('[TikTok OAuth Callback] profileData:', profileData);
    await tkProfileRef.set(profileData);

    console.log('[SUCCESS] TikTok connection saved. Redirecting...');
    res.redirect(`https://visiora.ai/account-setting?section=connections&success=tiktok_connected`);
  } catch (error: any) {
    const raw = error.response?.data || error.message;
    console.error('[ERROR] Failed during TikTok OAuth flow:', raw);
    res.redirect(`https://visiora.ai/account-setting?section=connections&error=tiktok_oauth`);
  }
}); 