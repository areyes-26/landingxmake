import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  updateProfile,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/client';
import { initializeUserData } from '@/lib/userData'; // ✅ solo este

export async function login(email: string, password: string) {
  try {
    console.log('Attempting to login with:', { email });
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user as User;
    
    console.log('Login successful:', { uid: user.uid });
    
    // Check if email is verified
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error('Por favor, verifica tu correo electrónico antes de iniciar sesión.');
    }
    
    return user;
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.code === 'auth/wrong-password') {
      throw new Error('Contraseña incorrecta');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('Usuario no encontrado');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos de inicio de sesión. Por favor, intenta más tarde.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Credenciales inválidas. Por favor, verifica tu correo electrónico y contraseña.');
    }
    throw error;
  }
}

export async function register(email: string, password: string) {
  try {
    console.log('Attempting to create user with:', { email });
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user as User;
    
    console.log('User created successfully:', { uid: user.uid });
    
    // Send email verification
    await sendEmailVerification(user);
    console.log('Email verification sent successfully');
    
    // Inicializar user_data
    await initializeUserData(user); // ✅ esta función SÍ está disponible en el frontend
    console.log('user_data inicializado para:', user.uid);
    // Cerrar sesión tras registro para forzar verificación
    await signOut(auth);
    
    return user;
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este correo electrónico ya está registrado');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Formato de correo electrónico inválido');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('El método de autenticación no está habilitado');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    throw error;
  }
}

export async function sendPasswordReset(email: string) {
  try {
    console.log('Sending password reset email to:', email);
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent successfully');
    return true;
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    
    if (error.code === 'auth/user-not-found') {
      throw new Error('No se encontró ningún usuario con este correo electrónico');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Correo electrónico inválido');
    }
    throw error;
  }
}

export async function updateUserProfile(name: string) {
  try {
    if (!auth.currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    
    await updateProfile(auth.currentUser, {
      displayName: name
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
    console.log('Usuario deslogueado exitosamente');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}