import { admin, functions } from '../index';
import { InstagramToken, COLLECTIONS } from './types';
import { InstagramAuthResponse } from './types';
import axios from 'axios';
import { DocumentSnapshot } from 'firebase-admin/firestore';
import { URLSearchParams } from 'url';

// Helper function to check if we need to commit the batch
function shouldCommitBatch(snapshot: DocumentSnapshot[]): boolean {
  return snapshot.length > 0;
}

export class TokenManager {
  private db = admin.firestore();
  private tokensCollection = this.db.collection(COLLECTIONS.TOKENS);

  async createToken(userId: string, authResponse: InstagramAuthResponse): Promise<InstagramToken> {
    const tokenData: InstagramToken = {
      id: authResponse.user_id,
      userId: authResponse.user_id,
      accessToken: authResponse.access_token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // Default 1 hour
      createdAt: new Date(),
      lastUsedAt: new Date(),
      status: 'active',
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'] // Required scopes for content publishing
    };

    await this.tokensCollection.doc(tokenData.id).set(tokenData);
    return tokenData;
  }

  async getToken(userId: string): Promise<InstagramToken | null> {
    const tokenDoc = await this.tokensCollection.doc(userId).get();
    if (!tokenDoc.exists) return null;

    const token = tokenDoc.data() as InstagramToken;
    if (this.isTokenExpired(token)) {
      // Try to refresh the token before invalidating
      const refreshedToken = await this.refreshToken(userId);
      if (refreshedToken) {
        return refreshedToken;
      }
      await this.invalidateToken(userId);
      return null;
    }

    // Update lastUsedAt
    await this.tokensCollection.doc(userId).update({ lastUsedAt: new Date() });
    return token;
  }

  async invalidateToken(userId: string): Promise<void> {
    await this.tokensCollection.doc(userId).update({
      status: 'expired',
      lastUsedAt: new Date()
    });
  }

  async refreshToken(userId: string): Promise<InstagramToken | null> {
    const tokenDoc = await this.tokensCollection.doc(userId).get();
    if (!tokenDoc.exists) return null;

    const token = tokenDoc.data() as InstagramToken;
    if (!token.accessToken) return null;

    try {
      const response = await axios.post('https://graph.facebook.com/v18.0/oauth/access_token', {
        grant_type: 'fb_exchange_token',
        client_id: functions.config('instagram').client_id!,
        client_secret: functions.config('instagram').client_secret!,
        fb_exchange_token: token.accessToken
      });

      const { access_token, expires_in } = response.data;
      
      // Update token in Firestore
      await this.tokensCollection.doc(userId).update({
        accessToken: access_token,
        expiresAt: new Date(Date.now() + (expires_in * 1000)),
        lastUsedAt: new Date(),
        status: 'active'
      });

      // Return updated token
      return {
        ...token,
        accessToken: access_token,
        expiresAt: new Date(Date.now() + (expires_in * 1000)),
        lastUsedAt: new Date(),
        status: 'active'
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      await this.invalidateToken(userId);
      return null;
    }
  }

  async refreshTokenOld(userId: string, refreshToken: string): Promise<InstagramToken | null> {
    try {
      // Here you would implement the actual refresh token API call
      // This is a placeholder for the actual Meta API refresh endpoint
      const response = await axios.post<InstagramAuthResponse>(
        'https://api.instagram.com/oauth/access_token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.INSTAGRAM_CLIENT_ID!,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
          refresh_token: refreshToken
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const token = await this.createToken(userId, response.data);
      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await this.invalidateToken(userId);
      return null;
    }
  }

  private isTokenExpired(token: InstagramToken): boolean {
    return token.status === 'expired' || 
           token.status === 'revoked' ||
           token.expiresAt < new Date();
  }

  async cleanupExpiredTokens(): Promise<void> {
    const expiredTokensQuery = this.tokensCollection
      .where('expiresAt', '<', new Date())
      .where('status', '==', 'active');

    const snapshot = await expiredTokensQuery.get();
    const batch = this.db.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'expired',
        lastUsedAt: new Date()
      });
    });

    // Check if we need to commit the batch
    if (snapshot.docs.length > 0) {
      await batch.commit();
    }
  }

  async cleanupInactiveTokens(days: number = 90): Promise<void> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const inactiveTokensQuery = this.tokensCollection
      .where('lastUsedAt', '<', cutoffDate)
      .where('status', '==', 'active');

    const snapshot = await inactiveTokensQuery.get();
    const batch = this.db.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'inactive',
        lastUsedAt: new Date()
      });
    });

    // Check if we need to commit the batch
    if (snapshot.docs.length > 0) {
      await batch.commit();
    }
  }
}

// Type for the context parameter
interface Context {
  timestamp: Date;
}
