'use client';

import { Button } from './button';
import { Instagram } from 'lucide-react';
import { useState } from 'react';

export function InstagramLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstagramLogin = async () => {
    setError('Función no disponible');
  };

  return (
    <Button
      onClick={handleInstagramLogin}
      disabled={true}
      className="w-full flex items-center justify-center gap-2"
    >
      <Instagram className="w-4 h-4" />
      {'Iniciar sesión con Instagram (no disponible)'}
    </Button>
  );
}
