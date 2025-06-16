// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Validar explícitamente que las variables necesarias están presentes
const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`❌ Falta la variable de entorno: ${key}`);
  }
});

const firebaseConfig = {
  apiKey: requiredEnvVars.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: requiredEnvVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: requiredEnvVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);

  console.log('✅ Firebase Client initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase Client:', error);
  throw error;
}

export { app, db, auth };
