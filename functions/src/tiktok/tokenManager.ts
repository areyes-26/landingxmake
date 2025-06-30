import { db } from '../lib/firebase-admin';
import axios from 'axios';
import * as functions from 'firebase-functions/v1';

const cfg = functions.config().tiktok;
const { client_key, client_secret } = cfg;

export interface TikTokTokenData {
  openId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  scope: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: number;
  userId?: string;
}

export async function refreshTikTokToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  open_id: string;
}> {
  try {
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key,
      client_secret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Error refreshing TikTok token:', error);
    throw error;
  }
}

export async function getValidTikTokToken(userId: string): Promise<string | null> {
  try {
    // Buscar token del usuario
    const tiktokQuery = await db.collection('tiktok_tokens')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (tiktokQuery.empty) {
      return null;
    }

    const tokenDoc = tiktokQuery.docs[0];
    const tokenData = tokenDoc.data() as TikTokTokenData;
    
    // Verificar si el token ha expirado (con margen de 5 minutos)
    const tokenAge = Date.now() - tokenData.createdAt;
    const tokenExpiry = tokenData.expiresIn * 1000; // Convertir a milisegundos
    const isExpired = tokenAge > (tokenExpiry - 5 * 60 * 1000); // 5 minutos de margen

    if (isExpired) {
      console.log(`[TikTok] Token expired for user ${userId}, refreshing...`);
      
      try {
        const newTokenData = await refreshTikTokToken(tokenData.refreshToken);
        
        // Actualizar en Firestore
        const updatedData = {
          ...tokenData,
          accessToken: newTokenData.access_token,
          refreshToken: newTokenData.refresh_token,
          expiresIn: newTokenData.expires_in,
          refreshExpiresIn: newTokenData.refresh_expires_in,
          createdAt: Date.now(),
        };
        
        await tokenDoc.ref.update(updatedData);
        
        return newTokenData.access_token;
      } catch (refreshError) {
        console.error(`[TikTok] Failed to refresh token for user ${userId}:`, refreshError);
        // Si falla la renovación, eliminar la conexión
        await tokenDoc.ref.delete();
        return null;
      }
    }

    return tokenData.accessToken;
  } catch (error) {
    console.error(`[TikTok] Error getting valid token for user ${userId}:`, error);
    return null;
  }
}

export async function isTikTokConnected(userId: string): Promise<boolean> {
  const token = await getValidTikTokToken(userId);
  return token !== null;
} 