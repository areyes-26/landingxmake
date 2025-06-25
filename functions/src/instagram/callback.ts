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
    res.status(400).json({ error: 'Missing code or state' });
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

    // Paso 2: Obtener el perfil del usuario
    const meResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token,
        fields: 'id,name',
      },
    });

    const { id, name } = meResponse.data;

    // Paso 3: Guardar en Firestore
    await db.collection('instagram_tokens').doc(id).set({
      accessToken: access_token,
      userId: id,
      name,
      createdAt: Date.now(),
    });

    // 🔁 Redirigir correctamente al frontend
    res.redirect('https://landing-videos-generator-06--landing-x-make.us-central1.web.app/instagram/success');
  } catch (error: any) {
    console.error('Error handling Instagram callback:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error exchanging code or retrieving profile' });
  }
});
