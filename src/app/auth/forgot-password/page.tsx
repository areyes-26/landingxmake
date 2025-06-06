'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { sendPasswordReset } from '@/utils/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Recuperar contraseña</h2>
        <p className="mt-2 text-muted-foreground">
          Ingresa tu correo electrónico para recibir instrucciones de recuperación
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="text-red-500 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-500 text-center">
            Hemos enviado instrucciones para recuperar tu contraseña a tu correo electrónico.
          </div>
        )}
        <div>
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex h-12 w-full rounded-md border-[0.4px] border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || success}
        >
          {isLoading ? 'Enviando...' : success ? 'Enviado' : 'Enviar instrucciones'}
        </Button>
      </form>
      <div className="text-center">
        <p className="text-sm text-center text-muted-foreground">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
