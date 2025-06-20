"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import './credit-topup.css';


const CREDIT_PACKS = [
  { credits: 25, price: 10, stripePriceId: 'price_1Rb9iCQKaNQdxodokSsMazhn', pricePerCredit: 0.40, features: ['Perfect for testing', '~25 short videos', 'No expiration date'], popular: false },
  { credits: 50, price: 25, stripePriceId: 'price_1Rb9iQQKaNQdxodoNtRXtlR6', pricePerCredit: 0.50, features: ['Great value package', '~50 short videos', 'No expiration date', 'Priority processing'], popular: true },
  { credits: 100, price: 50, stripePriceId: 'price_1Rb9izQKaNQdxodoKanAKcRY', pricePerCredit: 0.50, features: ['Maximum value', '~100 short videos', 'No expiration date', 'Priority processing', 'Email support included'], popular: false },
];

export default function CreditTopupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingPro, setLoadingPro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleBuy = async (pack: typeof CREDIT_PACKS[0]) => {
    setLoading(pack.credits.toString());
    setError(null);
    try {
      const res = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'credit_topup',
          credits: pack.credits,
          stripePriceId: pack.stripePriceId,
          email: user?.email,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Could not start payment.');
      }
    } catch (e) {
      setError('Error connecting to Stripe.');
    } finally {
      setLoading(null);
    }
  };

  const handleUpgradeToPro = async () => {
    if (!user) {
      setError("You must be logged in to upgrade.");
      return;
    }
    setLoadingPro(true);
    setError(null);
    try {
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, plan: 'pro' }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Could not start payment for Pro plan.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error connecting to Stripe for Pro plan.');
    } finally {
      setLoadingPro(false);
    }
  };

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">Recharge credits</h1>
        <p className="hero-subtitle">Choose the perfect credit package for your content creation needs. Create more videos with AI-powered avatars.</p>
      </section>

      {/* Credit Packages */}
      <section className="packages-section">
        <div className="packages-grid">
        {CREDIT_PACKS.map((pack) => (
            <div 
              key={pack.credits} 
              className={`package-card ${pack.popular ? 'popular' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {pack.popular && <div className="popular-badge">Most Popular</div>}
              <div className="credits-amount">{pack.credits}</div>
              <div className="credits-label">credits</div>
              <div className="package-price">${pack.price} USD</div>
              <div className="price-per-credit">${pack.pricePerCredit.toFixed(2)} per credit</div>
              <ul className="package-features" style={{ flexGrow: 1 }}>
                {pack.features.map((feature, index) => (
                  <li key={index} className="feature-item">
                    <span className="feature-check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                className="buy-btn" 
              onClick={() => handleBuy(pack)}
              disabled={!!loading}
                style={{ marginTop: 'auto' }}
            >
              {loading === pack.credits.toString() ? 'Redirecting...' : 'Buy'}
              </button>
            </div>
        ))}
      </div>
      {error && <div className="text-red-500 text-center mt-6">{error}</div>}
      </section>

      {/* Upgrade to Pro Section */}
      <section className="upgrade-section">
        <div className="upgrade-content">
          <div className="upgrade-badge">Better Value</div>
          <h2 className="upgrade-title">Why not upgrade to Pro?</h2>
          <p className="upgrade-subtitle">Get unlimited credits, better video quality, more avatars, and premium features. More cost-effective than buying credits individually.</p>

          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon">🎥</div>
              <h3 className="benefit-title">Superior Quality</h3>
              <p className="benefit-description">1080p 60fps videos vs 720p. Professional-grade output for your content.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">👥</div>
              <h3 className="benefit-title">100+ Avatars</h3>
              <p className="benefit-description">Access to our complete avatar library including 50+ Pro Avatars with advanced expressions.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">⚡</div>
              <h3 className="benefit-title">Faster Processing</h3>
              <p className="benefit-description">Priority queue processing. Your videos are ready 3x faster than standard users.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">🎧</div>
              <h3 className="benefit-title">Priority Support</h3>
              <p className="benefit-description">Get help when you need it with dedicated priority support and faster response times.</p>
            </div>
          </div>

          <div className="comparison">
            <h3 className="comparison-title">💰 Price Comparison</h3>
            <div className="comparison-content">
              <div className="price-comparison">
                <div className="price-item">
                  <div className="price-label">Buying 100 Credits</div>
                  <div className="price-amount">$50.00</div>
                  <div className="price-detail">= $0.50 per credit</div>
                </div>
                <div className="vs-divider">
                  <span>VS</span>
                </div>
                <div className="price-item highlight">
                  <div className="price-label">Pro Plan (750 credits)</div>
                  <div className="price-amount">$69.99</div>
                  <div className="price-detail">= $0.09 per credit</div>
                </div>
              </div>
              <div className="savings-highlight">
                <div className="savings-badge">You save 82% per credit with Pro Plan</div>
                <div className="savings-detail">Pro Plan: Get 7.5x more value for your money</div>
              </div>
            </div>
          </div>

          <div className="upgrade-cta">
            <button onClick={handleUpgradeToPro} className="upgrade-btn" disabled={loadingPro}>
              {loadingPro ? 'Redirecting...' : '🚀 Upgrade to Pro'}
            </button>
            <a href="/account-setting?section=pricing" className="learn-more-btn">Learn More</a>
          </div>
        </div>
      </section>
    </div>
  );
} 