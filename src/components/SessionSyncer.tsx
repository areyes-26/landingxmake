"use client";
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export function SessionSyncer() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      fetch('/api/sessionLogout', { method: 'POST' });
    }
  }, [user, loading]);
  return null;
} 