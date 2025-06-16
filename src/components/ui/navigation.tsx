'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './button';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-background border-b border-muted-foreground/20">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/inicio" className="text-xl font-bold">
              Landing x Make
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {pathname !== '/inicio' && (
              <Link href="/inicio" className="text-muted-foreground hover:text-primary">
                Inicio
              </Link>
            )}
            {pathname === '/inicio' && (
              <Link href="/auth/login" className="text-muted-foreground hover:text-primary">
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
