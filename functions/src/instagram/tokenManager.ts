// functions/src/instagram/tokenManager.ts

import * as functions from 'firebase-functions/v1';
import { admin, db } from '../lib/firebase-admin';
import axios from 'axios';
import { InstagramToken, InstagramAuthResponse, COLLECTIONS } from './types';

export class TokenManager {
  private tokensCollection = db.collection(COLLECTIONS.TOKENS);

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
      scopes:      ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    };

    await this.tokensCollection.doc(tokenData.id).set(tokenData);
    return tokenData;
  }

  async getToken(userId: string): Promise<InstagramToken | null> {
    const snap = await this.tokensCollection.doc(userId).get();
    if (!snap.exists) return null;

    const token = snap.data() as InstagramToken;
    if (this.isTokenExpired(token)) {
      const refreshed = await this.refreshToken(userId);
      if (refreshed) return refreshed;
      await this.invalidateToken(userId);
      return null;
    }

    // Actualizamos lastUsedAt
    await this.tokensCollection.doc(userId).update({ lastUsedAt: new Date() });
    return token;
  }

  async invalidateToken(userId: string): Promise<void> {
    await this.tokensCollection.doc(userId).update({
      status:     'expired',
      lastUsedAt: new Date(),
    });
  }

  private isTokenExpired(token: InstagramToken): boolean {
    return (
      token.status === 'expired' ||
      token.status === 'revoked' ||
      token.expiresAt < new Date()
    );
  }

  async refreshToken(userId: string): Promise<InstagramToken | null> {
    // Config movido dentro del método
    const instagramCfg = functions.config().instagram;
    
    const snap = await this.tokensCollection.doc(userId).get();
    if (!snap.exists) return null;
    const token = snap.data() as InstagramToken;

    try {
      // Usamos client_id y client_secret de functions.config()
      const resp = await axios.post<{ access_token: string; expires_in: number }>(
        'https://graph.facebook.com/v18.0/oauth/access_token',
        {
          grant_type:       'fb_exchange_token',
          client_id:        instagramCfg.client_id,
          client_secret:    instagramCfg.client_secret,
          fb_exchange_token: token.accessToken,
        }
      );

      const { access_token, expires_in } = resp.data;
      const newExpiry = new Date(Date.now() + expires_in * 1000);

      await this.tokensCollection.doc(userId).update({
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

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    const expiredSnap = await this.tokensCollection
      .where('expiresAt', '<', now)
      .where('status', '==', 'active')
      .get();

    const batch = db.batch();
    expiredSnap.docs.forEach(d => {
      batch.update(d.ref, { status: 'expired', lastUsedAt: new Date() });
    });
    if (!expiredSnap.empty) await batch.commit();
  }

  async cleanupInactiveTokens(days = 90): Promise<void> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const inactiveSnap = await this.tokensCollection
      .where('lastUsedAt', '<', cutoff)
      .where('status', '==', 'active')
      .get();

    const batch = db.batch();
    inactiveSnap.docs.forEach(d => {
      batch.update(d.ref, { status: 'inactive', lastUsedAt: new Date() });
    });
    if (!inactiveSnap.empty) await batch.commit();
  }
}
