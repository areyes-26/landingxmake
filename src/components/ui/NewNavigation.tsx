'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Bell, Settings, ArrowLeft, X } from "lucide-react";
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import CreditCounter from '@/components/CreditCounter';
import { useNotifications } from '@/hooks/useNotifications';
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
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', notifId));
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
              >
                <Bell className="w-5 h-5 text-white/70" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-gray-900" style={{boxShadow: '0 0 8px 2px rgba(239,68,68,0.5)'}}></span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-[rgba(20,22,40,0.85)] border border-blue-500/20 rounded-lg shadow-lg backdrop-blur-md text-white transition-all duration-300">
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
                            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${notifTab === 'videos' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md' : 'bg-transparent text-blue-200 hover:bg-blue-500/10'}`}
                          >
                            Videos
                          </button>
                          <button
                            onClick={() => setNotifTab('system')}
                            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${notifTab === 'system' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-md' : 'bg-transparent text-blue-200 hover:bg-blue-500/10'}`}
                          >
                            System
                          </button>
                        </div>
                      </div>
                      <div className="p-2 max-h-80 overflow-y-auto relative">
                        <div className="transition-all duration-300 ease-in-out" style={{position: 'relative', minHeight: '120px'}}>
                          <div
                            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${notifTab === 'videos' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                          >
                            {notifTab === 'videos' && (
                              notifLoading ? (
                                <div className="p-4 text-center text-gray-500">Loading notifications...</div>
                              ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">No new video notifications.</div>
                              ) : (
                                <ul className="space-y-2">
                                  {notifications.filter(n => n.type === 'video_ready' || n.type === 'youtube_export').map(n => (
                                    <li key={n.id} className={`p-3 rounded-lg ${!n.read ? 'bg-blue-900/40' : 'bg-gray-800/40'} border border-blue-500/10 flex flex-col gap-1 relative`}>
                                      <button
                                        className="absolute left-2 top-2 text-gray-400 hover:text-red-500 transition-colors z-10"
                                        title="Delete notification"
                                        onClick={() => handleDeleteNotification(n.id)}
                                        style={{padding: 0, background: 'none', border: 'none'}}
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                      {n.createdAt?.toDate && (
                                        <span className="absolute right-2 top-2 text-xs text-gray-400 z-10">
                                          {n.createdAt.toDate().toLocaleString()}
                                        </span>
                                      )}
                                      <div className="pt-6">
                                        <span className="text-sm block mb-1">{n.message}</span>
                                        {n.type === 'video_ready' && n.videoId && (
                                          <Link href={`/videos/${n.videoId}`} className="text-xs text-blue-400 hover:underline">View video</Link>
                                        )}
                                        {n.type === 'youtube_export' && n.url && (
                                          <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:underline block">Click here to watch on YouTube</a>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )
                            )}
                          </div>
                          <div
                            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${notifTab === 'system' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                          >
                            {notifTab === 'system' && (
                              <div className="p-4 text-center text-gray-500">No new system notifications.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
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