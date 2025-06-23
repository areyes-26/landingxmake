import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export function useUserPlan() {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserPlan('free');
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'user_data', user.uid);
    
    // Get initial plan
    const getInitialPlan = async () => {
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserPlan(userSnap.data().plan || 'free');
        } else {
          setUserPlan('free');
        }
      } catch (error) {
        console.error('Error fetching user plan:', error);
        setUserPlan('free');
      } finally {
        setLoading(false);
      }
    };

    getInitialPlan();

    // Listen for plan changes
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserPlan(doc.data().plan || 'free');
      } else {
        setUserPlan('free');
      }
    }, (error) => {
      console.error('Error listening to user plan changes:', error);
    });

    return () => unsubscribe();
  }, [user]);

  return { userPlan, loading };
} 