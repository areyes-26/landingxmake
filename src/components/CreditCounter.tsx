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
      className="h-9 px-4 flex items-center rounded-lg bg-[rgba(14,165,233,0.1)] text-[#0ea5e9] font-medium text-base select-none border border-[rgba(14,165,233,0.2)] gap-2 relative group cursor-help"
      title="Available Credits"
    >
      💎 {credits} credits
      
      {/* Tooltip */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-[rgba(12,13,31,0.95)] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)] backdrop-blur-sm">
        Your credits currently do not expire
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[rgba(12,13,31,0.95)]"></div>
      </div>
    </div>
  );
} 