'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Bell, Settings, ArrowLeft, X, PlayCircle } from "lucide-react";
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import CreditCounter from '@/components/CreditCounter';
import { useNotifications, useNotificationSettings } from '@/hooks/useNotifications';
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

  const { notifications, unreadCount, loading: notifLoading } = useNotifications();
  const { settings, loading: settingsLoading, updateSetting } = useNotificationSettings();

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
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/inicio');
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'Notifications', user.uid, 'notifications', notifId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // No mostrar la navegación solo en la página de autenticación
  if (pathname === '/auth') {
    return null;
  }

  // Navbar para landing page (/inicio) SIEMPRE visible, opciones públicas si no hay usuario
  const isLanding = pathname === '/inicio';

  return (
    <header className="w-full sticky top-0 z-50 bg-[rgba(12,13,31,0.95)] backdrop-blur-xl border-b border-[rgba(14,165,233,0.2)] px-4 sm:px-12 py-2 sm:py-3">
      {/* Single row: logo and nav options perfectly aligned */}
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex items-center h-full">
          <button 
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity"
            style={{height: '40px'}} // Ensures the icon is vertically centered
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] rounded-lg flex items-center justify-center text-base sm:text-lg shadow-[0_0_20px_rgba(14,165,233,0.3)]">
              🎬
            </div>
          </button>
        </div>
        <div className="flex flex-row justify-end items-center gap-4 w-full">
          {user && <CreditCounter />}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-sm sm:text-base"
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
          )}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5 text-white/70" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-cyan-400 rounded-full animate-pulse border-2 border-gray-900" style={{boxShadow: '0 0 8px 2px rgba(14,165,233,0.3)'}}></span>
                )}
              </button>
              {notifOpen && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[95vw] max-w-sm sm:w-96 bg-[rgba(20,22,40,0.97)] border border-blue-500/10 rounded-xl shadow-2xl backdrop-blur-md text-white transition-all duration-300 z-50" style={{maxHeight: '80vh', overflowY: 'auto'}}>
                  <div className="flex justify-between items-center p-4 border-b border-blue-500/10">
                    <span className="font-semibold text-base">Notifications</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowNotifSettings(!showNotifSettings)} className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors" aria-label="Notification settings">
                        <Settings className="w-5 h-5" />
                      </button>
                      <button onClick={() => setNotifOpen(false)} className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors" aria-label="Close notifications">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {showNotifSettings ? (
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <label htmlFor="video-notifs" className="text-sm text-gray-300">Video notifications</label>
                        <input type="checkbox" id="video-notifs" className="toggle-checkbox" checked={settings.video} onChange={() => updateSetting('video', !settings.video)} disabled={settingsLoading} />
                      </div>
                      <div className="flex justify-between items-center">
                        <label htmlFor="system-notifs" className="text-sm text-gray-300">System notifications</label>
                        <input type="checkbox" id="system-notifs" className="toggle-checkbox" checked={settings.system} onChange={() => updateSetting('system', !settings.system)} disabled={settingsLoading} />
                      </div>
                      <div className="flex justify-between items-center">
                        <label htmlFor="email-notifs" className="text-sm text-gray-300">Email notifications</label>
                        <input type="checkbox" id="email-notifs" className="toggle-checkbox" checked={settings.email} onChange={() => updateSetting('email', !settings.email)} disabled={settingsLoading} />
                      </div>
                      <button className="w-full mt-4 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors" onClick={() => setShowNotifSettings(false)}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="p-2">
                      {(notifLoading || settingsLoading) ? (
                        <div className="p-4 text-center text-gray-500">Loading notifications...</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No notifications.</div>
                      ) : (
                        <ul className="space-y-2">
                          {notifications.filter(n =>
                            (settings.video && (n.type === 'video_ready' || n.type === 'youtube_export')) ||
                            (settings.system && n.type !== 'video_ready' && n.type !== 'youtube_export')
                          ).map(n => (
                            <li key={n.id} className="relative p-3 rounded-lg bg-gray-900/60 border border-gray-800 flex flex-col gap-1 shadow-sm hover:shadow-lg transition-shadow">
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  className="text-gray-400 hover:text-red-500 transition-colors z-10"
                                  title="Delete notification"
                                  onClick={() => handleDeleteNotification(n.id)}
                                  style={{padding: 0, background: 'none', border: 'none'}}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                  {n.type === 'video_ready' || n.type === 'youtube_export' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/10">
                                      <PlayCircle className="w-4 h-4 text-cyan-300" /> Video
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-200 border border-gray-400/10">
                                      <Settings className="w-4 h-4 text-gray-300" /> System
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-white/90 mb-1">
                                {n.message}
                              </div>
                              {n.type === 'video_ready' && n.videoId && (
                                <Link href={`/videos/${n.videoId}`} className="text-xs text-cyan-400 hover:underline font-medium">View video</Link>
                              )}
                              {n.type === 'youtube_export' && n.url && (
                                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline font-medium">View on YouTube</a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {user ? null : isLanding ? (
            <>
              <Link href="#features" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">Features</Link>
              <Link href="#pricing" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">Pricing</Link>
              <Link href="#faq" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">FAQ</Link>
              <Link href="/auth" className="text-[rgba(255,255,255,0.7)] hover:text-[#0ea5e9] transition-all duration-300">Login</Link>
              <Link
                href="/auth"
                className="px-2 py-1 text-xs sm:px-5 sm:py-2 sm:text-base rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)] transition-all duration-300"
              >
                Try For Free
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
} 