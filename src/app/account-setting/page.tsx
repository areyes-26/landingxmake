"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import "./stripe-buy-button-fix.css";
import { useAuth } from "@/hooks/useAuth";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from 'sonner';
import './account-setting.css';
import { Instagram, Power } from 'lucide-react';
import { SiYoutube } from 'react-icons/si';

const AccountSettings = ({ user, handlePasswordReset, showPasswordAlert }: any) => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [profession, setProfession] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            const userRef = doc(db, "user_data", user.uid);
            getDoc(userRef).then(userSnap => {
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setFirstName(data.firstName || "");
                    setLastName(data.lastName || "");
                    setProfession(data.profession || "");
                }
            });
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error("You must be logged in to save changes.");
            return;
        }
        setIsSaving(true);
        const userRef = doc(db, "user_data", user.uid);
        try {
            await updateDoc(userRef, { firstName, lastName, profession });
            toast.success("Account settings saved successfully!");
        } catch (error) {
            console.error("Error updating user data:", error);
            toast.error("Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="content-section active" id="account">
            <h2 className="section-title">Account Settings</h2>
            <p className="section-description">Manage your account information and personal preferences.</p>
            <form className="settings-form" onSubmit={handleSave}>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="firstName" className="form-label">First name</label>
                        <input type="text" id="firstName" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lastName" className="form-label">Last name</label>
                        <input type="text" id="lastName" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="email" className="form-label">E-mail</label>
                    <input type="email" id="email" className="form-input" value={user?.email || ''} disabled />
                </div>
                <div className="form-group">
                    <label className="form-label">Password</label>
                    <button type="button" onClick={handlePasswordReset} className="change-password-btn">Change password</button>
                    {showPasswordAlert && <p className="text-green-500 text-sm mt-2">Password reset email sent! Please check your inbox.</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="profession" className="form-label">Profession</label>
                    <input type="text" id="profession" className="form-input" value={profession} onChange={e => setProfession(e.target.value)} placeholder="Enter your profession" />
                </div>
                <button type="submit" className="save-btn" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save changes'}
                </button>
            </form>
        </section>
    );
};

const Pricing = ({ user, userPlan, isLoading, handleStripeCheckout, handleSelectFree, showConfirmFree, setShowConfirmFree, confirmChangeToFree, pendingFree }: any) => {
    
    const plans = [
        {
            id: 'free',
            name: 'Free Plan',
            price: '$0',
            features: [
                '~1 minute with Avatar Pro',
                '~2 minutes with Avatar Classic',
                '720p 30fps videos',
                '10 Classic Avatars',
                '3 Pro Avatars',
                'Watermark included',
                '2 editing templates'
            ],
            buttonText: 'Get Started Free',
            buttonClass: 'secondary'
        },
        {
            id: 'premium',
            name: 'Basic Plan',
            price: '$24.99',
            badge: 'Most Popular',
            features: [
                '~10 minutes with Avatar Premium',
                '~20 minutes with Avatar Classic',
                '720p 60fps videos',
                '30+ Classic Avatars',
                '10+ Pro Avatars',
                '10+ languages',
                'Basic support (Email)',
                'Basic video templates'
            ],
            buttonText: 'Upgrade to Basic',
            buttonClass: 'primary'
        },
        {
            id: 'pro',
            name: 'Pro Plan',
            price: '$69.99',
            features: [
                '~25 minutes with Avatar Premium',
                '~50 minutes with Avatar Classic',
                '1080p 60fps videos',
                '100+ Classic Avatars',
                '50+ Pro Avatars',
                '50+ languages',
                'Priority support',
                'Custom brand logo in videos',
                'Premium video templates',
                'Access for 2 users'
            ],
            buttonText: 'Upgrade to Pro',
            buttonClass: 'primary'
        }
    ];

    return(
    <section className="content-section active" id="pricing">
        <h2 className="section-title">Plans and Pricing</h2>
        <p className="section-description">Manage your billing plan and benefits here.</p>
        <div className="pricing-grid">
            {plans.map(plan => (
                <div key={plan.id} className={`pricing-card ${userPlan === plan.id ? 'featured' : ''}`}>
                    {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                    <h3 className="plan-name">{plan.name}</h3>
                    <div className="plan-price">
                        <span className="price-amount">{plan.price}</span>
                        <div className="price-period">/month</div>
                    </div>
                    <ul className="plan-features">
                        {plan.features.map((feature, index) => (
                            <li key={index} className="feature-item"><span className="feature-check">✓</span> {feature}</li>
                        ))}
                    </ul>
                    <button 
                        className={`plan-button ${userPlan === plan.id ? 'current' : plan.buttonClass}`}
                        onClick={() => userPlan !== plan.id && (plan.id === 'free' ? handleSelectFree() : handleStripeCheckout(plan.id))}
                        disabled={isLoading || userPlan === plan.id}
                    >
                        {userPlan === plan.id ? 'Current plan' : plan.buttonText}
                    </button>
                </div>
            ))}
        </div>
        {showConfirmFree && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                <div className="bg-card rounded-lg p-6 max-w-sm w-full shadow-lg flex flex-col items-center text-white">
                    <p className="mb-4 text-center">Are you sure to change your plan to free? You will lose your {userPlan} functions.</p>
                    <div className="flex gap-4 w-full justify-center">
                        <button className="plan-button secondary" onClick={() => setShowConfirmFree(false)} disabled={pendingFree}>Cancel</button>
                        <button className="plan-button primary" onClick={confirmChangeToFree} disabled={pendingFree}>
                            {pendingFree ? 'Saving...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </section>
)};

// Handler para conectar Instagram (migrado desde export-view)
const handleInstagramConnect = () => {
    const state = crypto.randomUUID();
    localStorage.setItem('instagram_oauth_state', state);
    const clientId = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;
    const redirectUri = encodeURIComponent('https://us-central1-landing-x-make.cloudfunctions.net/facebookCallbackFn');
    const scope = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish'
    ].join(',');
    const authUrl =
        `https://www.facebook.com/v19.0/dialog/oauth` +
        `?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}` +
        `&scope=${scope}` +
        `&response_type=code` +
        `&state=${state}`;
    window.location.href = authUrl;
};

const handleYouTubeConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const isLocal = process.env.NODE_ENV === 'development';
  
    const redirectUri = encodeURIComponent(
      isLocal
        ? 'http://localhost:3000/api/youtube/callback'
        : 'https://landing-videos-generator-06--landing-x-make.us-central1.web.app/api/youtube/callback' // dominio real de producción
    );
  
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile'
    );
  
    const state = crypto.randomUUID();
  
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;
  
    window.location.href = authUrl;
  };
  

const badgeBase = {
    padding: '0.25rem 0.9rem',
    borderRadius: '999px',
    fontSize: '0.95rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    border: '1px solid',
    minWidth: 120,
    justifyContent: 'center',
    letterSpacing: 0.2,
};

const Connections = () => {
    const { user } = useAuth();
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [youtubeProfile, setYoutubeProfile] = useState<any>(null);
    // Instagram: placeholder
    const [instagramConnected, setInstagramConnected] = useState(false);
    const [instagramProfile, setInstagramProfile] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        // YouTube: consultar Firestore
        const fetchYouTube = async () => {
            const ytRef = doc(db, "youtube_tokens", user.uid);
            const ytSnap = await getDoc(ytRef);
            if (ytSnap.exists()) {
                setYoutubeConnected(true);
                setYoutubeProfile(ytSnap.data().profile || null);
            } else {
                setYoutubeConnected(false);
                setYoutubeProfile(null);
            }
        };
        fetchYouTube();
        
        // Instagram: consultar endpoint de estado
        const fetchInstagram = async () => {
            try {
                const token = await user.getIdToken();
                const response = await fetch('/api/instagram/status', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.connected) {
                        setInstagramConnected(true);
                        setInstagramProfile(data.instagramBusinessAccount);
                    } else {
                        setInstagramConnected(false);
                        setInstagramProfile(null);
                    }
                } else {
                    setInstagramConnected(false);
                    setInstagramProfile(null);
                }
            } catch (error) {
                console.error('Error fetching Instagram status:', error);
                setInstagramConnected(false);
                setInstagramProfile(null);
            }
        };
        fetchInstagram();
    }, [user]);

    const handleYouTubeDisconnect = async () => {
        if (!user) return;
        await deleteDoc(doc(db, "youtube_tokens", user.uid));
        setYoutubeConnected(false);
        setYoutubeProfile(null);
        toast.success("YouTube disconnected!");
    };

    // Instagram: desconexión real
    const handleInstagramDisconnect = async () => {
        if (!user) return;
        await deleteDoc(doc(db, "instagram_tokens", user.uid));
        setInstagramConnected(false);
        setInstagramProfile(null);
        toast.success("Instagram disconnected!");
    };

    // Estilos inline para el rediseño
    const infoStyle = { display: 'flex', flexDirection: 'column' as const, gap: 2 };
    const titleStyle = { display: 'flex', alignItems: 'center', fontWeight: 500, fontSize: 18, gap: 8 };
    const accountStyle = { fontSize: 13, color: '#a3a3a3', marginLeft: 2 };
    const actionsStyle = { display: 'flex', alignItems: 'center', gap: 12 };
    const badgeConnected = {
        background: '#23263a',
        color: '#4ade80',
        border: '1px solid #4ade80',
        borderRadius: '999px',
        padding: '0.18rem 0.8rem',
        fontSize: '0.92rem',
        fontWeight: 500,
    };
    const disconnectBtn = {
        background: 'transparent',
        color: '#ef4444',
        border: '1.5px solid #ef4444',
        borderRadius: 8,
        padding: '0.35rem 1.1rem',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'background 0.2s, color 0.2s',
        cursor: 'pointer',
    };
    const disconnectBtnHover = {
        background: '#ef4444',
        color: '#fff',
    };

    return (
        <section className="content-section active" id="connections">
            <h2 className="section-title">Connections</h2>
            <p className="section-description">Connect your social media accounts and other platforms.</p>
            <div className="integrations-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 500 }}>
                {/* Instagram (placeholder, preparado para futuro) */}
                <div className="integration-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#181c2a', padding: '1rem', borderRadius: 12, flexWrap: 'wrap', gap: 12 }}>
                    <div style={infoStyle}>
                        <span style={titleStyle}>
                            <Instagram style={{ color: '#E1306C' }} className="w-6 h-6" /> Instagram
                        </span>
                        {instagramConnected && (
                            <span style={accountStyle}>
                                Account: <b>{instagramProfile?.name || 'Instagram User'}</b>
                            </span>
                        )}
                    </div>
                    <div style={actionsStyle}>
                        {instagramConnected ? (
                            <>
                                <span style={badgeConnected}>Connected</span>
                                <button
                                    style={disconnectBtn}
                                    onClick={handleInstagramDisconnect}
                                    onMouseOver={e => Object.assign(e.currentTarget.style, disconnectBtnHover)}
                                    onMouseOut={e => Object.assign(e.currentTarget.style, disconnectBtn)}
                                >
                                    <Power size={16} style={{ marginRight: 4 }} /> Disconnect
                                </button>
                            </>
                        ) : (
                            <button
                                className="integration-btn"
                                style={{
                                    background: 'linear-gradient(90deg,#1a2980,#26d0ce)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '0.5rem 1.2rem',
                                    fontWeight: 500,
                                    minWidth: 100,
                                    cursor: 'pointer',
                                }}
                                onClick={handleInstagramConnect}
                            >
                                Connect
                            </button>
                        )}
                    </div>
                </div>
                {/* YouTube */}
                <div className="integration-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#181c2a', padding: '1rem', borderRadius: 12, flexWrap: 'wrap', gap: 12 }}>
                    <div style={infoStyle}>
                        <span style={titleStyle}>
                            <SiYoutube style={{ color: '#FF0000' }} className="w-6 h-6" /> YouTube
                        </span>
                        {youtubeConnected && youtubeProfile && (
                            <span style={accountStyle}>
                                Account: <b>{youtubeProfile.name || youtubeProfile.email || youtubeProfile.id}</b>
                            </span>
                        )}
                    </div>
                    <div style={actionsStyle}>
                        {youtubeConnected ? (
                            <>
                                <span style={badgeConnected}>Connected</span>
                                <button
                                    style={disconnectBtn}
                                    onClick={handleYouTubeDisconnect}
                                    onMouseOver={e => Object.assign(e.currentTarget.style, disconnectBtnHover)}
                                    onMouseOut={e => Object.assign(e.currentTarget.style, disconnectBtn)}
                                >
                                    <Power size={16} style={{ marginRight: 4 }} /> Disconnect
                                </button>
                            </>
                        ) : (
                            <button
                                className="integration-btn"
                                style={{
                                    background: 'linear-gradient(90deg,#232526,#414345)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '0.5rem 1.2rem',
                                    fontWeight: 500,
                                    minWidth: 100,
                                    cursor: 'pointer',
                                }}
                                onClick={() => {
                                    handleYouTubeConnect();
                                }}
                            >
                                Connect
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

function formatDate(date: Date | string | number) {
  const d = new Date(date);
  return d.toLocaleString();
}

function HistorySection({ user }: { user: any }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      setLoading(true);
      // Fetch credit topups
      const topupQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('type', '==', 'credit_topup'),
        orderBy('createdAt', 'desc')
      );
      const topupSnap = await getDocs(topupQuery);
      const topups = topupSnap.docs.map(doc => ({
        id: doc.id,
        type: 'topup',
        credits: doc.data().credits,
        amount: doc.data().amount,
        currency: doc.data().currency,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
      }));
      console.log('Topups:', topups);
      // Fetch video spends
      const videoQuery = query(
        collection(db, 'videos'),
        where('userId', '==', user.uid),
        orderBy('fechaCreacion', 'desc')
      );
      const videoSnap = await getDocs(videoQuery);
      const spends = videoSnap.docs.map(doc => ({
        id: doc.id,
        type: 'spend',
        credits: doc.data().creditsUsed,
        title: doc.data().videoTitle || 'Video',
        createdAt: doc.data().fechaCreacion?.toDate ? doc.data().fechaCreacion.toDate() : new Date(),
      }));
      console.log('Spends:', spends);
      // Merge and sort
      const merged = [...topups, ...spends].sort((a, b) => b.createdAt - a.createdAt);
      console.log('Merged history:', merged);
      setHistory(merged);
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  return (
    <section className="content-section active" id="history">
      <h2 className="section-title">History</h2>
      <p className="section-description">Track your credit top-ups and video spending.</p>
      {loading ? (
        <div>Loading history...</div>
      ) : history.length === 0 ? (
        <div>No history found.</div>
      ) : (
        <div className="history-list">
          {history.map(item => (
            <div className="history-row" key={item.id}>
              <div className="history-date">{formatDate(item.createdAt)}</div>
              <div className="history-type">{item.type === 'topup' ? 'Top-up' : 'Spend'}</div>
              <div className={`history-credits ${item.type === 'topup' ? 'plus' : 'minus'}`}>{item.type === 'topup' ? '+' : '-'}{item.credits}</div>
              <div className="history-details">
                {item.type === 'topup'
                  ? `${item.amount ? `$${(item.amount / 100).toFixed(2)} ${item.currency?.toUpperCase() || ''}` : ''}`
                  : item.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AccountSettingPageContent() {
    const searchParams = useSearchParams();
    const initialSection = searchParams.get('section') || 'account';
    const [section, setSection] = useState(initialSection);
    const { user } = useAuth();
    const [userPlan, setUserPlan] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmFree, setShowConfirmFree] = useState(false);
    const [pendingFree, setPendingFree] = useState(false);
    const [showPasswordAlert, setShowPasswordAlert] = useState(false);

    useEffect(() => {
        if (user) {
            const fetchUserData = async () => {
                const userRef = doc(db, "user_data", user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setUserPlan(userSnap.data().plan || 'free');
                } else {
                    setUserPlan('free');
                }
            };
            fetchUserData();
        }
    }, [user]);

    const handleStripeCheckout = async (plan: string) => {
        if (!user) {
            toast.error("You must be logged in to purchase a plan.");
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/create-stripe-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, plan }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error('Error creating payment session.');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error processing payment.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFree = () => {
        if (userPlan === "premium" || userPlan === "pro") {
            setShowConfirmFree(true);
        }
    };

    const confirmChangeToFree = async () => {
        if (!user) return;
        setPendingFree(true);
        const userRef = doc(db, "user_data", user.uid);
        try {
            await updateDoc(userRef, { plan: 'free' });
            setUserPlan('free');
            toast.success("Your plan has been changed to Free.");
        } catch (error) {
            toast.error("Failed to change plan. Please try again.");
            console.error(error);
        } finally {
            setPendingFree(false);
            setShowConfirmFree(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!user || !user.email) {
            toast.error("You must be logged in to reset your password.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, user.email);
            setShowPasswordAlert(true);
            setTimeout(() => setShowPasswordAlert(false), 5000);
        } catch (error) {
            console.error("Error sending password reset email:", error);
            toast.error("Failed to send reset email. Please try again.");
        }
    };

    return (
        <div className="main-container">
            <aside className="sidebar">
                <h1 className="sidebar-title">Settings</h1>
                <ul className="sidebar-nav">
                    <li className="nav-item">
                        <a href="#account" className={`nav-link ${section === 'account' ? 'active' : ''}`} onClick={(e) => {e.preventDefault(); setSection('account')}}>
                            Account settings
                        </a>
                    </li>
                    <li className="nav-item">
                        <a href="#pricing" className={`nav-link ${section === 'pricing' ? 'active' : ''}`} onClick={(e) => {e.preventDefault(); setSection('pricing')}}>
                            Plans and Pricing
                        </a>
                    </li>
                    <li className="nav-item">
                        <a href="#connections" className={`nav-link ${section === 'connections' ? 'active' : ''}`} onClick={(e) => {e.preventDefault(); setSection('connections')}}>
                            Connections
                        </a>
                    </li>
                    <li className="nav-item">
                        <a href="#history" className={`nav-link ${section === 'history' ? 'active' : ''}`} onClick={(e) => {e.preventDefault(); setSection('history')}}>
                            History
                        </a>
                    </li>
                </ul>
            </aside>
            <main className="content">
                {section === 'account' && (
                    <AccountSettings 
                        user={user}
                        handlePasswordReset={handlePasswordReset}
                        showPasswordAlert={showPasswordAlert}
                    />
                )}
                {section === 'pricing' && (
                    <Pricing 
                        user={user}
                        userPlan={userPlan}
                        isLoading={isLoading}
                        handleStripeCheckout={handleStripeCheckout}
                        handleSelectFree={handleSelectFree}
                        showConfirmFree={showConfirmFree}
                        setShowConfirmFree={setShowConfirmFree}
                        confirmChangeToFree={confirmChangeToFree}
                        pendingFree={pendingFree}
                    />
                )}
                {section === 'connections' && (
                    <Connections />
                )}
                {section === 'history' && (
                    <HistorySection user={user} />
                )}
            </main>
        </div>
    );
}

export default function AccountSettingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AccountSettingPageContent />
        </Suspense>
    );
} 