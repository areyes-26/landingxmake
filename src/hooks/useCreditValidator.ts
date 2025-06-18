import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { 
  calculateCreditCost, 
  canAffordVideo, 
  getCostBreakdown, 
  getAffordableDurations,
  getMinimumCreditsRequired,
  type VideoOptions 
} from '@/lib/creditPricing';

export interface CreditValidationResult {
  isValid: boolean;
  cost: number;
  breakdown: ReturnType<typeof getCostBreakdown>;
  affordableDurations: string[];
  missingCredits: number;
  warning: boolean; // true if credits <= 3
}

export interface UseCreditValidatorReturn {
  userCredits: number | null;
  loading: boolean;
  validateVideo: (options: VideoOptions) => CreditValidationResult;
  canAfford: (options: VideoOptions) => boolean;
  getCost: (options: VideoOptions) => number;
  getBreakdown: (options: VideoOptions) => ReturnType<typeof getCostBreakdown>;
  affordableDurations: string[];
  minimumCreditsRequired: number;
  warning: boolean;
}

/**
 * Custom hook for credit validation and management
 * @returns Credit validation utilities and user credit state
 */
export function useCreditValidator(): UseCreditValidatorReturn {
  const { user } = useAuth();
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [affordableDurations, setAffordableDurations] = useState<string[]>([]);
  const [warning, setWarning] = useState(false);

  // Fetch user credits
  useEffect(() => {
    if (!user) {
      setUserCredits(null);
      setLoading(false);
      setAffordableDurations([]);
      setWarning(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, 'user_data', user.uid);
    
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const credits = docSnap.data().credits ?? 0;
        setUserCredits(credits);
        setAffordableDurations(getAffordableDurations(credits));
        setWarning(credits <= 3);
      } else {
        setUserCredits(0);
        setAffordableDurations([]);
        setWarning(false);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user credits:', error);
      setUserCredits(0);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Validate video options
  const validateVideo = useCallback((options: VideoOptions): CreditValidationResult => {
    if (userCredits === null) {
      return {
        isValid: false,
        cost: 0,
        breakdown: getCostBreakdown(options),
        affordableDurations: [],
        missingCredits: 0,
        warning: false
      };
    }

    const cost = calculateCreditCost(options);
    const isValid = canAffordVideo(userCredits, options);
    const missingCredits = Math.max(0, cost - userCredits);

    return {
      isValid,
      cost,
      breakdown: getCostBreakdown(options),
      affordableDurations: getAffordableDurations(userCredits),
      missingCredits,
      warning: userCredits <= 3
    };
  }, [userCredits]);

  // Check if user can afford specific options
  const canAfford = useCallback((options: VideoOptions): boolean => {
    if (userCredits === null) return false;
    return canAffordVideo(userCredits, options);
  }, [userCredits]);

  // Get cost for specific options
  const getCost = useCallback((options: VideoOptions): number => {
    return calculateCreditCost(options);
  }, []);

  // Get detailed cost breakdown
  const getBreakdown = useCallback((options: VideoOptions) => {
    return getCostBreakdown(options);
  }, []);

  return {
    userCredits,
    loading,
    validateVideo,
    canAfford,
    getCost,
    getBreakdown,
    affordableDurations,
    minimumCreditsRequired: getMinimumCreditsRequired(),
    warning
  };
}

/**
 * Hook for validating a single video configuration
 * @param options Video options to validate
 * @returns Validation result for the specific video configuration
 */
export function useVideoValidation(options: VideoOptions) {
  const { validateVideo, userCredits, loading, warning } = useCreditValidator();
  const [validation, setValidation] = useState<CreditValidationResult | null>(null);

  useEffect(() => {
    if (!loading) {
      setValidation(validateVideo(options));
    }
  }, [options, validateVideo, loading]);

  return {
    validation,
    userCredits,
    loading,
    warning
  };
} 