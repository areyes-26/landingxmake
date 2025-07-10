import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUserPlan } from '@/hooks/useUserPlan';

export default function CreditCounter() {
  const { user, loading } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const { userPlan } = useUserPlan();

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
      className="h-9 px-4 flex items-center rounded-lg bg-[rgba(14,165,233,0.1)] text-[#0ea5e9] font-medium text-base select-none border border-[rgba(14,165,233,0.2)] gap-2 relative group cursor-pointer"
    >
      💎 {credits} credits
      {/* Tooltip mejorado con tabla moderna */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 min-w-[260px] px-4 py-4 bg-[rgba(18,19,36,0.92)] text-white text-xs rounded-[16px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50 border border-[rgba(14,165,233,0.2)] backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col items-center text-center"
      >
        <table className="w-full text-sm mb-3 border border-[rgba(255,255,255,0.15)] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="text-left font-semibold pb-1 px-3 py-2 border-b border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)]">Credits</th>
              <th className="text-left font-semibold pb-1 px-3 py-2 border-b border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)]">Expires</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-4 px-3 py-2 border-b border-[rgba(255,255,255,0.08)]">{credits}</td>
              <td className="px-3 py-2 border-b border-[rgba(255,255,255,0.08)]">{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('es-ES')}</td>
            </tr>
          </tbody>
        </table>
        <div className="w-full text-center text-[13px] text-white/80 mb-1">
          Need more credits?{' '}
          <a
            href="/account-setting/credit-topup"
            className="text-[#0ea5e9] underline hover:text-[#38bdf8] transition-colors font-semibold"
          >
            Charge here
          </a>
        </div>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[rgba(12,13,31,0.97)]"></div>
      </div>
    </div>
  );
} 