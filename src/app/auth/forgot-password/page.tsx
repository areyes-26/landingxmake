"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background">
      <div className="max-w-md w-full bg-card p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Recuperar contraseña</h2>
        <p className="mb-6 text-muted-foreground text-center">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        <form onSubmit={handleSubmit} className={loading ? 'loading' : ''}>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex h-12 w-full rounded-md border-[0.4px] border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </Button>
        </form>
        {status && (
          <div className="mt-4 text-center text-sm text-primary">
            {status}
          </div>
        )}
        <div className="mt-6 text-center">
          <Link href="/auth" className="text-muted-foreground hover:text-primary">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
