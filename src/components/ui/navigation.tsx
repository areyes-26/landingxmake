'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './button';
import { useAuth } from '@/components/providers/AuthProvider';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import CreditCounter from '@/components/CreditCounter';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      console.log('[Navigation] handleLogout: cerrando sesión');
      await fetch('/api/sessionLogout', { method: 'POST' });
      await signOut(auth);
      toast.success('Sesión cerrada exitosamente');
      router.push('/inicio');
      router.refresh();
    } catch (error) {
      console.error('[Navigation] Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  // Cerrar el dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Cerrar el dropdown de notificaciones si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  // Log de render para debug
  console.log('[Navigation] Render: user:', user);
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
            {user ? (
              <>
                <div className="mx-2 flex items-center">
                  <CreditCounter />
                </div>
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary">
                  Dashboard
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => setDropdownOpen((open) => !open)}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    Mi cuenta
                    <svg className="ml-2 w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </Button>
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 bg-card border border-muted-foreground/20 rounded-md shadow-lg z-50"
                    >
                      <Link
                        href="/account-setting"
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted-foreground/10 hover:text-primary"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Account settings
                      </Link>
                      <Link
                        href="/account-setting/credit-topup"
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted-foreground/10 hover:text-primary"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Recharge credits
                      </Link>
                      <button
                        onClick={() => { setDropdownOpen(false); handleLogout(); }}
                        className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted-foreground/10 hover:text-primary"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
                {user.photoURL && (
                  <div className="mx-2 flex items-center">
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary shadow"
                    />
                  </div>
                )}
                <div className="relative" ref={notifRef}>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-primary p-2"
                    onClick={() => setNotifOpen((open) => !open)}
                    aria-label="Ver notificaciones"
                  >
                    <Bell className="w-5 h-5" />
                  </Button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-card border border-muted-foreground/20 rounded-md shadow-lg z-50 p-4">
                      <h4 className="font-bold mb-2">Notificaciones</h4>
                      <div className="text-muted-foreground text-sm">
                        Aquí podrás gestionar tus notificaciones.
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
