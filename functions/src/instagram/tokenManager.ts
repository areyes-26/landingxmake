// functions/src/instagram/tokenManager.ts

import * as functions from 'firebase-functions/v1';
import { admin, db } from '../lib/firebase-admin';
import axios from 'axios';
import { InstagramToken, InstagramAuthResponse, COLLECTIONS } from './types';

export class TokenManager {
  private tokensCollection = db.collection('app_tokens');

  async createToken(
    userId: string,
    authResponse: InstagramAuthResponse
  ): Promise<InstagramToken> {
    const tokenData: InstagramToken = {
      id:        authResponse.user_id,
      userId:    authResponse.user_id,
      accessToken: authResponse.access_token,
      expiresAt:   new Date(Date.now() + 3600 * 1000),
      createdAt:   new Date(),
      lastUsedAt:  new Date(),
      status:      'active',
      scopes:      ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
    };

    await this.tokensCollection.doc(userId).collection('instagram').doc('connection').set(tokenData);
    return tokenData;
  }

  async getToken(userId: string): Promise<InstagramToken | null> {
    const snap = await this.tokensCollection.doc(userId).collection('instagram').doc('connection').get();
    if (!snap.exists) return null;
    
    const data = snap.data();
    const token: InstagramToken = {
      id: data.firebaseUid || userId,
      userId: data.firebaseUid || userId,
      accessToken: data.accessToken,
      expiresAt: data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : new Date(Date.now() + 3600 * 1000),
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      lastUsedAt: new Date(),
      status: 'active',
      scopes: data.scopes || ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
      pageAccessToken: data.pageAccessToken,
      instagramBusinessAccount: data.instagramBusinessAccount,
    };
    
    // Verificar si el token ha expirado
    if (token.expiresAt && new Date() > token.expiresAt) {
      console.log('Token expired, attempting refresh...');
      return await this.refreshToken(userId);
    }
    
    return token;
  }

  async getPageAccessToken(userId: string): Promise<string | null> {
    const snap = await this.tokensCollection.doc(userId).collection('instagram').doc('connection').get();
    if (!snap.exists) return null;
    
    const data = snap.data();
    return data.pageAccessToken || null;
  }

  async getInstagramBusinessAccountId(userId: string): Promise<string | null> {
    const snap = await this.tokensCollection.doc(userId).collection('instagram').doc('connection').get();
    if (!snap.exists) return null;
    
    const data = snap.data();
    return data.instagramBusinessAccount?.id || null;
  }

  async refreshToken(userId: string): Promise<InstagramToken | null> {
    // Config movido dentro del método
    const facebookCfg = functions.config().facebook;
    
    const snap = await this.tokensCollection.doc(userId).collection('instagram').doc('connection').get();
    if (!snap.exists) return null;
    const token = snap.data() as InstagramToken;

    try {
      // Usamos client_id y client_secret de functions.config()
      const resp = await axios.post<{ access_token: string; expires_in: number }>(
        'https://graph.facebook.com/v19.0/oauth/access_token',
        {
          grant_type:       'fb_exchange_token',
          client_id:        facebookCfg.client_id,
          client_secret:    facebookCfg.client_secret,
          fb_exchange_token: token.accessToken,
        }
      );

      const { access_token, expires_in } = resp.data;
      const newExpiry = new Date(Date.now() + expires_in * 1000);

      await this.tokensCollection.doc(userId).collection('instagram').doc('connection').update({
        accessToken: access_token,
        expiresAt:   newExpiry,
        lastUsedAt:  new Date(),
        status:      'active',
      });

      return {
        ...token,
        accessToken: access_token,
        expiresAt:   newExpiry,
        lastUsedAt:  new Date(),
        status:      'active',
      };
    } catch (e) {
      console.error('Error refreshing token:', e);
      await this.invalidateToken(userId);
      return null;
    }
  }

  async invalidateToken(userId: string): Promise<void> {
    await this.tokensCollection.doc(userId).collection('instagram').doc('connection').update({
      status: 'expired',
      lastUsedAt: new Date(),
    });
  }

  async deleteToken(userId: string): Promise<void> {
    await this.tokensCollection.doc(userId).collection('instagram').doc('connection').delete();
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    // Buscar en todas las subcolecciones de Instagram
    const usersSnap = await this.tokensCollection.get();
    const batch = db.batch();
    
    for (const userDoc of usersSnap.docs) {
      const instagramSnap = await userDoc.ref.collection('instagram').doc('connection').get();
      if (instagramSnap.exists) {
        const data = instagramSnap.data();
        if (data && data.expiresAt && new Date(data.expiresAt) < now && data.status === 'active') {
          batch.update(instagramSnap.ref, { status: 'expired', lastUsedAt: new Date() });
        }
      }
    }
    
    await batch.commit();
  }

  async cleanupInactiveTokens(days = 90): Promise<void> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // Buscar en todas las subcolecciones de Instagram
    const usersSnap = await this.tokensCollection.get();
    const batch = db.batch();
    
    for (const userDoc of usersSnap.docs) {
      const instagramSnap = await userDoc.ref.collection('instagram').doc('connection').get();
      if (instagramSnap.exists) {
        const data = instagramSnap.data();
        if (data && data.lastUsedAt && new Date(data.lastUsedAt) < cutoff && data.status === 'active') {
          batch.update(instagramSnap.ref, { status: 'inactive', lastUsedAt: new Date() });
        }
      }
    }
    
    await batch.commit();
  }
}
