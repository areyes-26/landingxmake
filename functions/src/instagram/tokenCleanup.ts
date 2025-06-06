import { TokenManager } from './tokenManager';
import { admin } from '../index';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const cleanupTokens = onSchedule('every 24 hours', async (event) => {
  try {
    const tokenManager = new TokenManager();
    await tokenManager.cleanupExpiredTokens();
    await tokenManager.cleanupInactiveTokens();
    console.log('Successfully cleaned up expired and inactive tokens');
  } catch (error) {
    console.error('Error during token cleanup:', error);
    throw error;
  }
});
