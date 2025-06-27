'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function InstagramSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [instagramData, setInstagramData] = useState<any>(null);

  useEffect(() => {
    const fetchInstagramToken = async () => {
      const state = localStorage.getItem('instagram_oauth_state');
      if (!state) {
        setStatus('error');
        return;
      }

      try {
        const docRef = doc(db, 'instagram_tokens', state);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setInstagramData(data);
          setStatus('done');

          // Limpiar el state temporal
          localStorage.removeItem('instagram_oauth_state');

          // Redirigir automáticamente
          setTimeout(() => {
            router.push('/account-setting');
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Error fetching Instagram token:', err);
        setStatus('error');
      }
    };

    fetchInstagramToken();
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h1 className="text-xl font-semibold">Conectando con Instagram...</h1>
        <p className="text-muted-foreground">Un momento, por favor.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h1 className="text-xl font-bold text-red-600">❌ Error al conectar con Instagram</h1>
        <p className="text-muted-foreground">Intenta nuevamente más tarde.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4">
      <h1 className="text-3xl font-bold mb-4">✅ Cuenta conectada</h1>
      <p className="text-muted-foreground mb-2">
        Bienvenido, {instagramData?.userName || 'usuario'}.
      </p>
      {instagramData?.instagramBusinessAccount && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800 font-medium">
            Instagram Business: @{instagramData.instagramBusinessAccount.username}
          </p>
          <p className="text-green-600 text-sm">
            {instagramData.instagramBusinessAccount.name}
          </p>
        </div>
      )}
      <p className="text-muted-foreground">Serás redirigido en unos segundos...</p>
    </div>
  );
}
