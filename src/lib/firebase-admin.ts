// lib/firebase-admin.ts
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('❌ Variables necesarias para Firebase Admin no definidas correctamente');
    throw new Error('Faltan variables de entorno para inicializar Firebase Admin');
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    projectId,
  });

  console.log('✅ Firebase Admin inicializado correctamente:', projectId);
} else {
  app = getApps()[0];
}

export const db = getFirestore(app);
export const auth = getAuth(app);
