'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Bell, Settings, ArrowLeft, X, PlayCircle, Menu } from "lucide-react";
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import CreditCounter from '@/components/CreditCounter';
import { useNotifications, useNotificationSettings } from '@/hooks/useNotifications';
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserPlan } from '@/hooks/useUserPlan';

export function NewNavigation() {
  const router = useRouter();
  const { user } = useAuth();
  const pathname = usePathname();
  const { userPlan } = useUserPlan();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('videos');
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // States for notification preferences
  const [videoNotifs, setVideoNotifs] = useState(true);
  const [systemNotifs, setSystemNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, loading: notifLoading } = useNotifications();
  const { settings, loading: settingsLoading, updateSetting } = useNotificationSettings();

  // --- Animación máquina de escribir para .ai ---
  const [aiText, setAiText] = useState('');
  const [typing, setTyping] = useState(true);
  const [showStatic, setShowStatic] = useState(false);
  const aiFull = '.ai';

  // Determinar si el cursor debe estar visible
  const showCursor = !showStatic && (typing || aiText.length !== aiFull.length);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estado para saber si el modal de avatar está abierto
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (showStatic) {
      setAiText(aiFull);
      return;
    }
    let timeout: NodeJS.Timeout;
    if (typing) {
      if (aiText.length < aiFull.length) {
        // 4 segundos para escribir los 3 caracteres: 4000ms / 3 ≈ 1333ms por caracter
        timeout = setTimeout(() => setAiText(aiFull.slice(0, aiText.length + 1)), 1333);
      } else {
        // Esperar 1 minuto antes de empezar a borrar
        timeout = setTimeout(() => setTyping(false), 60000);
      }
    } else {
      if (aiText.length > 0) {
        // Borrado lento: 1 segundo por caracter
        timeout = setTimeout(() => setAiText(aiFull.slice(0, aiText.length - 1)), 1000);
      } else {
        // Esperar 2 segundos antes de volver a escribir
        timeout = setTimeout(() => setTyping(true), 2000);
      }
    }
    return () => clearTimeout(timeout);
  }, [aiText, typing, showStatic]);

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

  useEffect(() => {
    // Escuchar evento global personalizado para abrir/cerrar el modal de avatar
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAvatarModalOpen(!!customEvent.detail?.open);
    };
    window.addEventListener('avatar-modal-toggle', listener);
    return () => window.removeEventListener('avatar-modal-toggle', listener);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/sessionLogout', { method: 'POST' });
      await signOut(auth);
      router.push('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowStatic(true); // Fijar .AI al hacer click
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/');
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
  if (pathname === '/auth' || pathname === '/auth/forgot-password') {
    return null;
  }

  // Navbar para landing page (/) SIEMPRE visible, opciones públicas si no hay usuario
  const isLanding = pathname === '/';

  return (
    <header
      className="w-full flex justify-center sticky top-0 z-50"
      style={{
        background: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* Blur encima de la navbar cuando el modal de avatar está abierto */}
      {avatarModalOpen && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: 100, zIndex: 60, pointerEvents: 'auto', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.25)'}}></div>
      )}
      {/* Panel flotante */}
      <div
        className="flex flex-row justify-between items-center w-full max-w-6xl"
        style={{
          background: 'rgba(12,13,31,0.9)',
          borderRadius: '2.5rem',
          boxShadow: '0 8px 32px 0 rgba(14,165,233,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.18)',
          border: '1.5px solid rgba(14,165,233,0.13)',
          marginTop: '1.2rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: '0.5rem 2.5rem',
          minHeight: '60px',
          pointerEvents: 'auto',
          maxWidth: '96rem',
        }}
      >
        {/* Single row: logo and nav options perfectly aligned */}
        <div className="flex items-center h-full">
          <button 
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity"
            style={{height: '40px'}} // Ensures the icon is vertically centered
          >
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight select-none">
              Visiora
              <span
                className="ml-1 font-black drop-shadow-lg text-[#0ea5e9] transition-all duration-300"
                style={{minWidth: '2.5ch'}}
              >
                {aiText}
              </span>
            </span>
          </button>
          {user && (
            <span
              className="ml-4 px-3 py-1 rounded-full text-xs font-semibold align-middle whitespace-nowrap cursor-pointer"
              style={{
                background: userPlan === 'pro' ? 'linear-gradient(90deg,#0ea5e9,#7c3aed)' : userPlan === 'premium' ? 'gold' : '#23243a',
                color: userPlan === 'free' ? '#b3b3b3' : '#fff',
                border: userPlan === 'premium' ? '1.5px solid #ffd700' : 'none',
                marginLeft: 12
              }}
              onClick={() => setShowUpgradeModal(true)}
            >
              {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan
            </span>
          )}
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex flex-row justify-end items-center gap-4 w-full">
          {user && <CreditCounter />}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setNotifOpen(false);
                  setDropdownOpen(!dropdownOpen);
                }}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-sm sm:text-base"
              >
                <span className="text-white/70">My Account</span>
                <ChevronDown className="w-4 h-4 text-white/70" />
              </button>

              {dropdownOpen && !notifOpen && (
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
                    Add credits
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
                onClick={() => {
                  setDropdownOpen(false);
                  setNotifOpen(false);
                  setNotifOpen(!notifOpen);
                }}
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
                            (settings.video && (n.type === 'video_ready' || n.type === 'youtube_export' || n.type === 'video_error')) ||
                            (settings.system && n.type !== 'video_ready' && n.type !== 'youtube_export' && n.type !== 'video_error')
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
                                  ) : n.type === 'video_error' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-300 border border-red-400/10">
                                      <X className="w-4 h-4 text-red-300" /> Error
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
                                <Link href={n.url || `/videos/${n.videoId}`} className="text-xs text-cyan-400 hover:underline font-medium">View video</Link>
                              )}
                              {n.type === 'youtube_export' && n.url && (
                                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline font-medium">View on YouTube</a>
                              )}
                              {n.type === 'video_error' && n.videoId && (
                                <Link href={`/videos/${n.videoId}`} className="text-xs text-red-400 hover:underline font-medium">Try again</Link>
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
                href="/auth?mode=signup"
                className="px-2 py-1 text-xs sm:px-5 sm:py-2 sm:text-base rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)] transition-all duration-300"
              >
                Try For Free
              </Link>
            </>
          ) : null}
        </div>
        {/* Mobile nav: menú hamburguesa */}
        <div className="flex md:hidden items-center ml-auto gap-2">
          {user && (
            <button
              onClick={() => {
                setDropdownOpen(false);
                setNotifOpen(false);
                setNotifOpen(!notifOpen);
              }}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5 text-white/70" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-cyan-400 rounded-full animate-pulse border-2 border-gray-900" style={{boxShadow: '0 0 8px 2px rgba(14,165,233,0.3)'}}></span>
              )}
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-7 h-7 text-white" />
          </button>
        </div>
        {/* Panel de notificaciones mobile */}
        {notifOpen && (
          <div className="md:hidden fixed inset-0 z-[999] bg-black/60 flex justify-end">
            <div className="w-64 bg-[#18192b] h-full shadow-2xl flex flex-col p-4 animate-slide-in-right overflow-y-auto">
              <button
                onClick={() => setNotifOpen(false)}
                className="self-end mb-2 p-2 rounded-full hover:bg-white/10 text-white"
                aria-label="Close notifications"
              >
                <X className="w-7 h-7" />
              </button>
              <span className="font-semibold text-base mb-4">Notifications</span>
              {(notifLoading || settingsLoading) ? (
                <div className="p-4 text-center text-gray-500">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No notifications.</div>
              ) : (
                <ul className="space-y-2">
                  {notifications.filter(n =>
                    (settings.video && (n.type === 'video_ready' || n.type === 'youtube_export' || n.type === 'video_error')) ||
                    (settings.system && n.type !== 'video_ready' && n.type !== 'youtube_export' && n.type !== 'video_error')
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
                          ) : n.type === 'video_error' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-300 border border-red-400/10">
                              <X className="w-4 h-4 text-red-300" /> Error
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
                        <Link href={n.url || `/videos/${n.videoId}`} className="text-xs text-cyan-400 hover:underline font-medium">View video</Link>
                      )}
                      {n.type === 'youtube_export' && n.url && (
                        <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline font-medium">View on YouTube</a>
                      )}
                      {n.type === 'video_error' && n.videoId && (
                        <Link href={`/videos/${n.videoId}`} className="text-xs text-red-400 hover:underline font-medium">Try again</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* Menú lateral mobile */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[999] bg-black/60 flex justify-end">
            <div className="w-64 bg-[#18192b] h-full shadow-2xl flex flex-col p-6 gap-6 animate-slide-in-right">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="self-end mb-2 p-2 rounded-full hover:bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="w-7 h-7" />
              </button>
              {user ? (
                <>
                  <Link href="/account-setting" className="text-white text-lg font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Account settings</Link>
                  <Link href="/account-setting/credit-topup" className="text-white text-lg font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Add credits</Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="text-white text-lg font-medium py-2 text-left"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="#features" className="text-white text-lg font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Features</Link>
                  <Link href="#pricing" className="text-white text-lg font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
                  <Link href="#faq" className="text-white text-lg font-medium py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
                  <Link href="/auth" className="text-white text-lg font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link
                    href="/auth?mode=signup"
                    className="mt-4 px-4 py-3 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white text-center font-semibold shadow-md text-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Try For Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
            <div className="bg-[rgba(26,27,53,0.85)] border border-[rgba(14,165,233,0.2)] rounded-[16px] shadow-[0_10px_30px_rgba(0,0,0,0.3)] p-8 max-w-[450px] w-[90%] flex flex-col items-center animate-fade-in backdrop-blur-md text-center"
            >
              {userPlan && userPlan.toLowerCase() === 'pro' ? (
                <>
                  <div className="text-lg font-semibold text-white mb-4 text-center">
                    You are already on the <span className="font-bold text-[#38bdf8]">PRO</span> plan.<br />
                    Do you need more credits?
                  </div>
                  <div className="flex gap-4 mt-2 w-full justify-center">
                    <button
                      className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white font-semibold shadow-md hover:scale-105 transition-transform"
                      onClick={() => { setShowUpgradeModal(false); router.push('/account-setting/credit-topup'); }}
                    >
                      Charge credits
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg bg-[#23243a] text-white font-semibold border border-[#23243a] hover:bg-[#23243a]/80 transition-colors"
                      onClick={() => setShowUpgradeModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold text-white mb-4 text-center">¿Do you want more features? <br/>Upgrade to pro now!</div>
                  <div className="flex gap-4 mt-2 w-full justify-center">
                    <button
                      className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white font-semibold shadow-md hover:scale-105 transition-transform"
                      onClick={() => { setShowUpgradeModal(false); router.push('/account-setting?section=pricing'); }}
                    >
                      Yes, show me
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg bg-[#23243a] text-white font-semibold border border-[#23243a] hover:bg-[#23243a]/80 transition-colors"
                      onClick={() => setShowUpgradeModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </header>
  );
} 