// functions/src/instagram/tokencleanup.ts

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { TokenManager } from './tokenManager';

// Inicializa Admin SDK sólo una vez
if (!admin.apps.length) {
  admin.initializeApp();
}

export const cleanupTokens = functions
  .pubsub
  .schedule('every 24 hours')      // ejecuta cada 24h
  .timeZone('UTC')                 // opcional: ajusta zona horaria si lo necesitas
  .onRun(async (context) => {
    try {
      const tokenManager = new TokenManager();
      await tokenManager.cleanupExpiredTokens();
      await tokenManager.cleanupInactiveTokens();
      console.log('Successfully cleaned up expired and inactive tokens');
    } catch (error) {
      console.error('Error during token cleanup:', error);
      // Re-lanzar para que Cloud Logging lo marque como fallo si hace falta
      throw error;
    }
  });
