'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    sendEmailVerification 
} from 'firebase/auth';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { doc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { loading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const redirectPath = searchParams.get('redirect') ? decodeURIComponent(searchParams.get('redirect')!) : '/dashboard';

    // --- Animación máquina de escribir para .AI (igual que en la navbar) ---
    const [aiText, setAiText] = useState('');
    const [typing, setTyping] = useState(true);
    const [showStatic, setShowStatic] = useState(false);
    const aiFull = '.AI';
    const showCursor = !showStatic && (typing || aiText.length !== aiFull.length);

    useEffect(() => {
        if (showStatic) {
            setAiText(aiFull);
            return;
        }
        let timeout: NodeJS.Timeout;
        if (typing) {
            if (aiText.length < aiFull.length) {
                timeout = setTimeout(() => setAiText(aiFull.slice(0, aiText.length + 1)), 1333);
            } else {
                timeout = setTimeout(() => setTyping(false), 60000);
            }
        } else {
            if (aiText.length > 0) {
                timeout = setTimeout(() => setAiText(aiFull.slice(0, aiText.length - 1)), 1000);
            } else {
                timeout = setTimeout(() => setTyping(true), 2000);
            }
        }
        return () => clearTimeout(timeout);
    }, [aiText, typing, showStatic]);

    useEffect(() => {
        if (searchParams.get('mode') === 'signup') {
            setIsLogin(false);
        }
    }, [searchParams]);

    const handleSessionLogin = async (idToken: string) => {
        const res = await fetch('/api/sessionLogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
        
        if (!res.ok) {
            throw new Error('No se pudo establecer la sesión segura.');
        }

        // Forzar redirección completa
        window.location.href = redirectPath;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        
        try {
            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                if (!user.emailVerified) {
                    await auth.signOut();
                    throw new Error('Por favor, verifica tu correo electrónico antes de iniciar sesión.');
                }
                
                const idToken = await user.getIdToken(true);
                await handleSessionLogin(idToken);
            } else {
                if (password !== confirmPassword) {
                    toast.error('Las contraseñas no coinciden');
                    return;
                }
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                await sendEmailVerification(user);
                toast.success('Account created successfully. Please check your email to verify.');
                const idToken = await user.getIdToken(true);
                await handleSessionLogin(idToken);
                setIsLogin(true);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            let errorMessage = 'Ocurrió un error';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este email ya está registrado';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Usuario no encontrado';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Contraseña incorrecta';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
        } finally {
            setFormLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const idToken = await user.getIdToken(true);
            await handleSessionLogin(idToken);
        } catch (error) {
            console.error('[AuthPage] Error al iniciar sesión con Google:', error);
            toast.error('Error al iniciar sesión con Google');
            setGoogleLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 min-h-screen w-full bg-[#0c0d1f] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin w-10 h-10 text-[#0ea5e9] mx-auto mb-4" />
                    <p className="text-white/70">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 min-h-screen w-full bg-[#0c0d1f] flex flex-col items-center justify-center relative">
            <button
                onClick={() => router.push('/')}
                className="absolute top-8 left-8 text-white/70 hover:text-white flex items-center gap-2 transition-colors"
            >
                <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                >
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to home
            </button>

            <div className="w-full max-w-[95vw] mx-auto p-12 bg-[#0c0d1f] rounded-2xl shadow-[0_8px_40px_rgba(14,165,233,0.15)] border border-[rgba(14,165,233,0.15)]
                sm:p-2
                md:max-w-lg md:p-8
                lg:max-w-2xl lg:p-12
            ">
                <div className="flex justify-center mb-12">
                    <button type="button" onClick={() => setShowStatic(true)} className="flex items-center gap-2 text-4xl font-extrabold tracking-tight select-none focus:outline-none">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight select-none">
                            Visiora
                            <span className="ml-1 font-black drop-shadow-lg text-[#0ea5e9] transition-all duration-300" style={{minWidth: '2.5ch'}}>{aiText}</span>
                        </span>
                    </button>
                </div>

                <div className="flex justify-center mb-12">
                    <div className="inline-flex rounded-lg p-1 bg-[rgba(255,255,255,0.03)]">
                        <button
                            type="button"
                            className={`px-8 py-3 text-lg rounded-md transition-all duration-300 ${isLogin ? 'bg-[#0ea5e9] text-white shadow-[0_4px_15px_rgba(14,165,233,0.3)]' : 'text-white/50 hover:text-white/70'}`}
                            onClick={() => setIsLogin(true)}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            className={`px-8 py-3 text-lg rounded-md transition-all duration-300 ${!isLogin ? 'bg-[#0ea5e9] text-white shadow-[0_4px_15px_rgba(14,165,233,0.3)]' : 'text-white/50 hover:text-white/70'}`}
                            onClick={() => setIsLogin(false)}
                        >
                            Sign up
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-base font-medium text-white/70 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 text-lg rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white/90 focus:outline-none focus:border-[#0ea5e9] transition-colors"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-base font-medium text-white/70 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 text-lg rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white/90 focus:outline-none focus:border-[#0ea5e9] transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {!isLogin && password && (
                        <div>
                            <label className="block text-base font-medium text-white/70 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-5 py-4 text-lg rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white/90 focus:outline-none focus:border-[#0ea5e9] transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={formLoading}
                        className="w-full py-4 px-6 mt-4 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white rounded-lg shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)] transition-all duration-300 text-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {formLoading ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5 mr-2 inline" />
                                {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                            </>
                        ) : (
                            isLogin ? 'Login' : 'Sign up'
                        )}
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-[rgba(255,255,255,0.1)]" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0c0d1f] px-2 text-white/50">
                                OR CONTINUE WITH
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="w-full py-4 px-6 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {googleLoading ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5 mr-2 inline" />
                                Conectando...
                            </>
                        ) : (
                            <>
                                <svg className="mr-2 h-5 w-5 inline" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Google
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center mt-8 space-y-2">
                    {isLogin && (
                    <p className="text-sm text-white/50">
                        Forgot your password?{' '}
                        <button
                            onClick={() => router.push('/auth/forgot-password')}
                            className="text-[#0ea5e9] hover:underline"
                        >
                            Recover password
                        </button>
                    </p>
                    )}
                </div>
            </div>
        </div>
    );
} 