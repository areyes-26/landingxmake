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
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
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

    console.log('[STEP] Getting user info...');
    const userRes = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: {
        access_token: access_token,
        fields: 'id,name,email'
      }
    });

    const userId = userRes.data.id;
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

    // Guardar información completa en Firestore usando el user ID real
    const connectionData = {
      accessToken: access_token,
      tokenType: token_type,
      expiresIn: expires_in,
      createdAt: Date.now(),
      userId: userId,
      userName: userRes.data.name,
      userEmail: userRes.data.email,
      pageId: pageId,
      pageAccessToken: pageAccessToken,
      instagramBusinessAccount: instagramBusinessAccount,
      pages: pages,
      scopes: ['pages_show_list', 'instagram_basic', 'pages_read_engagement', 'instagram_content_publish']
    };

    // Guardar usando el user ID real
    await db.collection('instagram_tokens').doc(userId).set(connectionData);

    // También guardar temporalmente con el state para la página de éxito
    await db.collection('instagram_tokens').doc(state).set({
      ...connectionData,
      tempState: true
    });

    console.log('[SUCCESS] Complete Instagram connection saved. Redirecting...');
    res.redirect('https://landing-videos-generator-06--landing-x-make.us-central1.web.app/instagram/success');
  } catch (error: any) {
    const raw = error.response?.data || error.message;
    console.error('[ERROR] Failed during OAuth flow:', raw);
    res.status(500).json({ error: 'Error exchanging code', detail: raw });
  }
});
