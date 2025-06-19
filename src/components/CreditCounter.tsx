import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function CreditCounter() {
  const { user, loading } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setCredits(null);
      return;
    }
    const userRef = doc(db, 'user_data', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setCredits(docSnap.data().credits ?? 0);
      } else {
        setCredits(0);
      }
    });
    return () => unsubscribe();
  }, [user]);

  if (loading || credits === null) {
    return (
      <div className="h-9 px-4 flex items-center justify-center rounded-lg bg-[rgba(14,165,233,0.1)] text-[rgba(255,255,255,0.7)] font-medium text-base animate-pulse select-none">
        ...
      </div>
    );
  }

  return (
    <div
      className="h-9 px-4 flex items-center rounded-lg bg-[rgba(14,165,233,0.1)] text-[#0ea5e9] font-medium text-base select-none border border-[rgba(14,165,233,0.2)] gap-2"
      title="Créditos disponibles"
    >
      💎 {credits} créditos
    </div>
  );
} 