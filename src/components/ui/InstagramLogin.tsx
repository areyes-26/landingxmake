'use client';

import { Button } from './button';
import { Instagram } from 'lucide-react';
import { signInWithInstagram } from '@/utils/instagram';
import { useState } from 'react';

export function InstagramLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstagramLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const profile = await signInWithInstagram();
      
      if (profile) {
        // Handle successful login
        console.log('Instagram login successful:', profile);
        // You can redirect or show success message here
      }
    } catch (error) {
      setError('Error signing in with Instagram');
      console.error('Instagram login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleInstagramLogin}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
      ) : (
        <Instagram className="w-4 h-4" />
      )}
      {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión con Instagram'}
    </Button>
  );
}
