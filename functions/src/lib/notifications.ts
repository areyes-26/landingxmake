import { db, admin } from './firebase-admin';

export interface NotificationData {
  type: string;
  message: string;
  videoId?: string;
  url?: string;
}

/**
 * Verifica si ya existe una notificación para un video específico
 */
async function notificationExists(userId: string, videoId: string, type: string): Promise<boolean> {
  const snapshot = await db.collection('Notifications')
    .doc(userId)
    .collection('notifications')
    .where('videoId', '==', videoId)
    .where('type', '==', type)
    .limit(1)
    .get();
  
  return !snapshot.empty;
}

/**
 * Envía una notificación al usuario, evitando duplicados
 */
export async function sendNotificationToUser(userId: string, data: NotificationData) {
  // Si la notificación tiene videoId, verificar si ya existe
  if (data.videoId) {
    const exists = await notificationExists(userId, data.videoId, data.type);
    if (exists) {
      console.log(`[sendNotificationToUser] Notification already exists for video ${data.videoId} and type ${data.type}. Skipping.`);
      return;
    }
  }

  // Crear la notificación
  await db.collection('Notifications').doc(userId).collection('notifications').add({
    ...data,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.log(`[sendNotificationToUser] Notification created for user ${userId}, type: ${data.type}, videoId: ${data.videoId || 'N/A'}`);
} 