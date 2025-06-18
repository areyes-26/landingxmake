import { db } from './firebase';
<<<<<<< HEAD
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
=======
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
>>>>>>> e30b17602a7ba8208f0ff9391968a8b3d4daa822
import { User } from 'firebase/auth';

/**
 * Inicializa el documento de user_data para un usuario si no existe.
 * Solo crea el documento, no lo actualiza si ya existe.
 * @param user User - Objeto de usuario de Firebase Auth
 */
export async function initializeUserData(user: User) {
  if (!user?.uid) throw new Error('user.uid is required');
  
  const userRef = doc(db, 'user_data', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Crear nuevo documento user_data solo si no existe
    await setDoc(userRef, {
      userId: user.uid, // Campo userId para webhooks y referencias
      email: user.email,
      credits: 0,
      plan: 'free',
      createdAt: serverTimestamp(),
      isEmailVerified: user.emailVerified || false,
      provider: user.providerData.length > 0 ? user.providerData[0].providerId : 'email',
    });
    console.log('user_data creado para:', user.uid);
  } else {
    console.log('user_data ya existe para:', user.uid);
  }
}

/**
 * Verifica si un usuario tiene user_data y lo crea si no existe.
 * Esta función es útil para usuarios existentes que no tienen user_data.
 * @param userId string - ID del usuario
 * @param userData User - Datos del usuario (opcional, se usará para completar información)
 */
export async function ensureUserDataExists(userId: string, userData?: User) {
  if (!userId) throw new Error('userId is required');
  
  const userRef = doc(db, 'user_data', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Crear user_data con información mínima
    const userDataToSet: any = {
<<<<<<< HEAD
      userId: userId,
=======
      userId: userId, // Campo userId para webhooks y referencias
>>>>>>> e30b17602a7ba8208f0ff9391968a8b3d4daa822
      credits: 0,
      plan: 'free',
      createdAt: serverTimestamp(),
    };
    
    // Agregar información del usuario si está disponible
    if (userData) {
      userDataToSet.email = userData.email;
      userDataToSet.isEmailVerified = userData.emailVerified || false;
      userDataToSet.provider = userData.providerData.length > 0 ? userData.providerData[0].providerId : 'email';
    }
    
    await setDoc(userRef, userDataToSet);
    console.log('user_data creado para usuario existente:', userId);
    return true;
  }
  
  return false; // Ya existía
}

/**
 * Migra usuarios existentes que no tienen user_data.
 * Esta función debe ejecutarse una sola vez para usuarios existentes.
 * @param users User[] - Array de usuarios de Firebase Auth
 */
export async function migrateExistingUsers(users: User[]) {
  console.log(`[migrateExistingUsers] Iniciando migración para ${users.length} usuarios`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      const wasCreated = await ensureUserDataExists(user.uid, user);
      if (wasCreated) {
        created++;
        console.log(`[migrateExistingUsers] user_data creado para: ${user.uid}`);
      } else {
        skipped++;
        console.log(`[migrateExistingUsers] user_data ya existía para: ${user.uid}`);
      }
    } catch (error) {
      errors++;
      console.error(`[migrateExistingUsers] Error al migrar usuario ${user.uid}:`, error);
    }
  }
  
  console.log(`[migrateExistingUsers] Migración completada. Creados: ${created}, Omitidos: ${skipped}, Errores: ${errors}`);
  
  return { created, skipped, errors };
}

/**
 * Inicializa el documento de user_data para un usuario por ID (versión legacy).
 * @param userId string - ID del usuario (Firebase Auth)
 * @deprecated Use initializeUserData(user: User) instead
 */
export async function initializeUserDataById(userId: string) {
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