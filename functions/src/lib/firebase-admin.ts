import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Singleton initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

export const db = getFirestore();
export { admin };
