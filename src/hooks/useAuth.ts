'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

let authUser: User | null = null;
let authLoading = true;

export function useAuth() {
  const [user, setUser] = useState<User | null>(authUser);
  const [loading, setLoading] = useState(authLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      authUser = firebaseUser;
      authLoading = false;
      setUser(firebaseUser);
      setLoading(false);
    });

    // Si ya tenemos el estado inicial, actualizamos inmediatamente
    if (!authLoading) {
      setUser(authUser);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
