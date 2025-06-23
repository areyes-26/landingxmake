'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Bell, Settings, ArrowLeft } from "lucide-react";
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
  const [notifTab, setNotifTab] = useState('videos');
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  // States for notification preferences
  const [videoNotifs, setVideoNotifs] = useState(true);
  const [systemNotifs, setSystemNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);

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
              <span className="text-white/70">My Account</span>
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
              <div className="absolute right-0 mt-2 w-96 bg-gray-900/90 border border-blue-500/20 rounded-lg shadow-lg backdrop-blur-xl text-white">
                <div className="flex justify-between items-center p-3 border-b border-blue-500/20">
                  <div className="flex items-center gap-2">
                    {showNotifSettings && (
                      <button onClick={() => setShowNotifSettings(false)} className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    <h3 className="font-semibold">{showNotifSettings ? 'Notification Settings' : 'Notifications'}</h3>
                  </div>
                  
                  {!showNotifSettings && (
                    <button onClick={() => setShowNotifSettings(true)} className="text-gray-400 hover:text-white transition-colors">
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {showNotifSettings ? (
                  <div className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label htmlFor="video-notifs" className="text-sm text-gray-300">Video Notifications</label>
                        <input type="checkbox" id="video-notifs" className="toggle-checkbox" checked={videoNotifs} onChange={() => setVideoNotifs(!videoNotifs)} />
                      </div>
                      <div className="flex justify-between items-center">
                        <label htmlFor="system-notifs" className="text-sm text-gray-300">System Updates</label>
                        <input type="checkbox" id="system-notifs" className="toggle-checkbox" checked={systemNotifs} onChange={() => setSystemNotifs(!systemNotifs)} />
                      </div>
                      <div className="flex justify-between items-center">
                        <label htmlFor="email-notifs" className="text-sm text-gray-300">Email Notifications</label>
                        <input type="checkbox" id="email-notifs" className="toggle-checkbox" checked={emailNotifs} onChange={() => setEmailNotifs(!emailNotifs)} />
                      </div>
                    </div>
                    <button className="w-full mt-6 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Save preferences
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-2 bg-gray-900/50">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setNotifTab('videos')}
                          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${notifTab === 'videos' ? 'bg-blue-600 text-white font-semibold' : 'bg-transparent text-gray-400 hover:bg-white/10'}`}
                        >
                          Videos
                        </button>
                        <button 
                          onClick={() => setNotifTab('system')}
                          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${notifTab === 'system' ? 'bg-blue-600 text-white font-semibold' : 'bg-transparent text-gray-400 hover:bg-white/10'}`}
                        >
                          System
                        </button>
                      </div>
                    </div>
                    <div className="p-2 max-h-80 overflow-y-auto">
                      {notifTab === 'videos' && <div className="p-4 text-center text-gray-500">No new video notifications.</div>}
                      {notifTab === 'system' && <div className="p-4 text-center text-gray-500">No new system notifications.</div>}
                    </div>
                  </>
                )}
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