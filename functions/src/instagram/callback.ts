import * as functions from 'firebase-functions/v1';
import { db } from '../lib/firebase-admin';
import axios from 'axios';

export const facebookCallback = functions.https.onRequest(async (req, res) => {
  const cfg = functions.config().facebook;
  const { client_id, client_secret, redirect_uri } = cfg;

  const { code, state } = req.query as { code?: string; state?: string };

  console.log('[instagramCallback] code:', code);
  console.log('[instagramCallback] state:', state);
  console.log('[DEBUG] client_id:', client_id);
  console.log('[DEBUG] client_secret exists:', !!client_secret);
  console.log('[DEBUG] redirect_uri:', redirect_uri);

  if (!code || !state) {
    console.error('[ERROR] Missing code or state');
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    console.log('[STEP] Exchanging code for access token...');
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id,
        client_secret,
        redirect_uri,
        code,
      },
    });

    const tokenData = tokenRes.data;
    const { access_token, token_type, expires_in } = tokenData;
    console.log('[TOKEN RESPONSE]', tokenData);
    if (!access_token) {
      console.error('Error en intercambio de código:', tokenData);
      res.status(500).json({ error: 'No access_token returned' });
      return;
    }

    console.log('[STEP] Getting user info...');
    const userRes = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: {
        access_token: access_token,
        fields: 'id,name,email'
      }
    });

    const userId = userRes.data.id;
    const userEmail = userRes.data.email ?? null;
    console.log('[USER INFO]', userRes.data);

    console.log('[STEP] Getting user pages...');
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: {
        access_token: access_token,
        fields: 'id,name,access_token,instagram_business_account'
      }
    });

    const pages = pagesRes.data.data;
    console.log('[PAGES RESPONSE]', pages);

    let instagramBusinessAccount = null;
    let pageId = null;
    let pageAccessToken = null;

    // Buscar página con cuenta de Instagram Business
    for (const page of pages) {
      if (page.instagram_business_account) {
        console.log('[STEP] Getting Instagram Business Account details...');
        const igAccountRes = await axios.get(`https://graph.facebook.com/v19.0/${page.instagram_business_account.id}`, {
          params: {
            access_token: page.access_token,
            fields: 'id,username,name,profile_picture_url'
          }
        });

        instagramBusinessAccount = igAccountRes.data;
        pageId = page.id;
        pageAccessToken = page.access_token;
        break;
      }
    }

    // Eliminar documentos previos para evitar duplicados
    const igConnRef = db.collection('app_tokens').doc(state).collection('instagram').doc('connection');
    const igProfileRef = db.collection('app_tokens').doc(state).collection('instagram').doc('profile');
    await igConnRef.delete();
    await igProfileRef.delete();

    // Fechas legibles
    const now = new Date();
    const createdAt = now.toISOString();
    const updatedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + expires_in * 1000).toISOString();

    // Guardar información completa en Firestore usando el firebaseUid (state)
    const connectionData = {
      accessToken: access_token,
      tokenType: token_type,
      expiresIn: expires_in,
      createdAt,
      updatedAt,
      expiresAt,
      firebaseUid: state,
      userId: userId,
      userEmail: userEmail ?? null,
      pageId: pageId || null,
      pageAccessToken: pageAccessToken || null,
      instagramBusinessAccount: instagramBusinessAccount || null,
      pages: pages || [],
      scopes: ['pages_show_list', 'instagram_basic', 'pages_read_engagement', 'instagram_content_publish']
    };

    await igConnRef.set(connectionData);
    
    // También guardar el perfil para mostrar en la UI
    const profileData = {
      id: userId,
      name: (instagramBusinessAccount && instagramBusinessAccount.name) ? instagramBusinessAccount.name : 'Instagram User',
      email: userEmail || null,
      profile_picture: (instagramBusinessAccount && instagramBusinessAccount.profile_picture_url) ? instagramBusinessAccount.profile_picture_url : null,
      access_token: access_token,
      refresh_token: null, // Instagram no usa refresh tokens
      token_expires_at: expiresAt,
      createdAt,
      updatedAt
    };
    
    await igProfileRef.set(profileData);

    console.log('[SUCCESS] Complete Instagram connection saved. Redirecting...');
    res.redirect('https://visiora.ai/account-setting?section=connections');
  } catch (error: any) {
    const raw = error.response?.data || error.message;
    console.error('[ERROR] Failed during OAuth flow:', raw);
    res.status(500).json({ error: 'Error exchanging code', detail: raw });
  }
});
