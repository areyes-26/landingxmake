// Validar que las variables de entorno estén presentes
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Mostrar las variables de entorno
console.log('Firebase Environment Variables:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Present' : 'Missing',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'Present' : 'Missing',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'Present' : 'Missing',
});

// Verificar que todas las variables requeridas estén presentes
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.warn(
      `⚠️ NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} no está seteada — usando ''`
    );
  }
});

const firebaseConfig = {
  apiKey:             process.env.NEXT_PUBLIC_FIREBASE_API_KEY             || '',
  authDomain:         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || '',
  projectId:          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || '',
  storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId:  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:              process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '',
  measurementId:      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     || '',
};

export default firebaseConfig; 