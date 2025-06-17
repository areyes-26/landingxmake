import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Coins } from 'lucide-react';

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
      <div className="h-9 px-3 flex items-center justify-center rounded-md bg-muted text-muted-foreground font-bold text-base animate-pulse select-none min-w-[48px]" style={{ minWidth: 48 }}>
        ...
      </div>
    );
  }

  return (
    <div
      className="h-9 px-3 flex items-center rounded-md bg-primary/90 text-white font-semibold text-base select-none shadow-sm gap-2 min-w-[48px]"
      style={{ minWidth: 48, cursor: 'default', pointerEvents: 'none' }}
      title="Créditos disponibles"
    >
      <Coins className="w-4 h-4 mr-1 text-yellow-400" />
      <span className="ml-1">{credits}</span>
    </div>
  );
} 