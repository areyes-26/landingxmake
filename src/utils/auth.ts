import { auth } from '../firebase/client';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  updateProfile,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

export async function login(email: string, password: string) {
  try {
    console.log('Attempting to login with:', { email });
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user as User;
    
    console.log('Login successful:', { uid: user.uid });
    
    // Check if email is verified
    if (!user.emailVerified) {
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

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}

// Optional: Add profile update functionality
export async function updateUserProfile(name: string) {
  try {
    await updateProfile(auth.currentUser!, {
      displayName: name
    });
  } catch (error) {
    throw error;
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    throw new Error('Error al iniciar sesión con Google');
  }
}