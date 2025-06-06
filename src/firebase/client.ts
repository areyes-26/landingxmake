// src/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebaseConfig';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export const authInstance = auth;
export const dbInstance = db;
export const appInstance = app;

// Re-export for convenience
export { auth as auth, db as db, app as app };

// Initialize Firebase on module load
if (!getApps().length) {
  initializeApp(firebaseConfig);
}