"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import "./stripe-buy-button-fix.css";
import { useAuth } from "@/hooks/useAuth";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from 'sonner';
import './account-setting.css';

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