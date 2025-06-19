import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Singleton initialization
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = getFirestore();
export { admin };
