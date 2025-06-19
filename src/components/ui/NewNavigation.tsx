'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Bell } from "lucide-react";
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import CreditCounter from '@/components/CreditCounter';

export function NewNavigation() {
  const router = useRouter();
  const { user } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/sessionLogout', { method: 'POST' });
      await signOut(auth);
      router.push('/inicio');
      toast.success('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/inicio');
  };

  // No mostrar la navegación en la página de autenticación
  if (pathname === '/auth') {
    return null;
  }

  return (
    <header className="flex justify-between items-center px-12 py-6 sticky top-0 z-50 bg-[rgba(12,13,31,0.95)] backdrop-blur-xl border-b border-[rgba(14,165,233,0.2)]">
      <div className="flex items-center gap-3 text-2xl font-semibold text-[#0ea5e9]">
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] rounded-lg flex items-center justify-center text-lg shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            🎬
          </div>
          <span>CreateCast</span>
        </button>
      </div>
      {user ? (
        // Navegación para usuarios autenticados
        <div className="flex items-center gap-6">
          <CreditCounter />
          
          <Link 
            href="/dashboard" 
            className={`text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300 ${pathname === '/dashboard' ? 'text-[#0ea5e9]' : ''}`}
          >
            Dashboard
          </Link>

          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <span className="text-white/70">Mi cuenta</span>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[rgba(12,13,31,0.95)] border border-[rgba(14,165,233,0.2)] rounded-lg shadow-lg backdrop-blur-xl py-2">
                <Link
                  href="/account-setting"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  Account settings
                </Link>
                <Link
                  href="/account-setting/credit-topup"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  Recharge credits
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-white/70" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[rgba(12,13,31,0.95)] border border-[rgba(14,165,233,0.2)] rounded-lg shadow-lg backdrop-blur-xl py-2">
                <div className="px-4 py-2 text-sm text-white/50">No new notifications</div>
              </div>
            )}
          </div>
        </div>
      ) : pathname === '/inicio' ? (
        // Navegación para landing page (no autenticado)
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">
            Features
          </Link>
          <Link href="#pricing" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">
            Pricing
          </Link>
          <Link href="#faq" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">
            FAQ
          </Link>
          <Link href="/auth" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">
            Login
          </Link>
          <Link
            href="/auth"
            className="px-6 py-2 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)] transition-all duration-300"
          >
            Try For Free
          </Link>
        </div>
      ) : null}
    </header>
  );
} 