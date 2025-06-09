// src/config/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAqs-L1PJQ1vJlrpILtLyK9p0tsCyzE1HM",
  authDomain: "landing-x-make.firebaseapp.com",
  projectId: "landing-x-make",
  storageBucket: "landing-x-make.appspot.com",
  messagingSenderId: "841687997036",
  appId: "1:841687997036:web:b947d2cca9ad5212911649",
  measurementId: "G-XXXXXXXXXX" // Reemplaza con tu measurementId real
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

// Inicializar Auth (opcional)
export const auth = getAuth(app);

export default firebaseConfig;