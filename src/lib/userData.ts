import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Inicializa el documento de user_data para un usuario si no existe.
 * @param userId string - ID del usuario (Firebase Auth)
 */
export async function initializeUserData(userId: string) {
  if (!userId) throw new Error('userId is required');
  const userRef = doc(db, 'user_data', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      credits: 0,
      plan: 'free',
      createdAt: serverTimestamp(),
    });
  }
  // Si ya existe, no hace nada
} 