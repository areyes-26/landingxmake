// lib/firebase-admin.ts
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Verificar que las variables necesarias estén definidas
if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID no está definido en las variables de entorno');
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
  throw new Error('FIREBASE_CLIENT_EMAIL no está definido en las variables de entorno');
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('FIREBASE_PRIVATE_KEY no está definido en las variables de entorno');
}

// Configuración de Firebase Admin
const firebaseConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Asegurarse de que la private key tenga el formato correcto
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  // Añadir el projectId explícitamente
  projectId: process.env.FIREBASE_PROJECT_ID,
};

// Inicializar la app solo si no hay ninguna instancia existente
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Exportar las instancias de Firestore y Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Log para verificar la inicialización
console.log('Firebase Admin inicializado con projectId:', process.env.FIREBASE_PROJECT_ID);
