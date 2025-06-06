import * as functions from 'firebase-functions';
import axios from 'axios';
import { getFirestore } from 'firebase-admin/firestore';
import { ParsedQs } from 'qs';
import { InstagramAuthResponse } from './types';

const { https } = functions;

interface InstagramCallbackRequest {
  query: ParsedQs & { code: string; state: string; };
  cookies: { instagram_state: string; };
}

export const instagramCallback = https.onRequest(async (req, res) => {
  const typedReq = (req as unknown) as InstagramCallbackRequest;
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Verify state matches the one we sent
    const savedState = typedReq.cookies.instagram_state;
    if (!savedState || savedState !== state) {
      return res.status(401).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for access token
    const response = await axios.post<InstagramAuthResponse>(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!,
        code: code.toString(),
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, user_id } = response.data;

    // Store the access token in Firestore
    const db = getFirestore();
    const tokenRef = db.collection('instagram_tokens').doc(user_id);
    await tokenRef.set({
      accessToken: access_token,
      userId: user_id,
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour expiration
      createdAt: Date.now(),
    });

    // Redirect back to the app
    res.status(302).json({ Location: '/instagram/success' });

  } catch (error) {
    console.error('Instagram callback error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});
