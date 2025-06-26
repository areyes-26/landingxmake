import { db, auth } from './firebase-admin';

export interface NotificationData {
  type: string;
  message: string;
  videoId?: string;
  url?: string;
}

export async function sendNotificationToUser(userId: string, data: NotificationData) {
  await db.collection('users').doc(userId).collection('notifications').add({
    ...data,
    read: false,
    createdAt: new Date(),
  });
} 