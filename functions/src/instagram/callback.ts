import * as functions from 'firebase-functions/v1';
import { db } from '../lib/firebase-admin';
import axios from 'axios';

// Cookie parser
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

export const instagramCallback = functions.https.onRequest(async (req, res) => {
  const cfg = functions.config().instagram;
  const { client_id, client_secret, redirect_uri } = cfg;

  const cookies = parseCookies(req.headers.cookie);
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state) {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  if (cookies.instagram_state !== state) {
    res.status(403).json({ error: 'Invalid state value' });
    return;
  }

  try {
    // Paso 1: Intercambiar el code por un access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id,
        client_secret,
        redirect_uri,
        code,
      },
    });

    const { access_token } = tokenResponse.data;

    // Paso 2: Obtener la cuenta de usuario vinculada al token
    const meResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token,
        fields: 'id,name',
      },
    });

    const { id, name } = meResponse.data;

    // Paso 3: Guardar token y datos en Firestore
    await db.collection('instagram_tokens').doc(id).set({
      accessToken: access_token,
      userId: id,
      name,
      createdAt: Date.now(),
    });

    res.redirect('/instagram/success'); // O la ruta que desees
  } catch (error: any) {
    console.error('Error handling Instagram callback:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error exchanging code or retrieving profile' });
  }
});
