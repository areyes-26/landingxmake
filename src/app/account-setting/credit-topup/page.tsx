"use client";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CREDIT_PACKS = [
  { credits: 25, price: 10, stripePriceId: 'price_1Rb9iCQKaNQdxodokSsMazhn' },
  { credits: 50, price: 25, stripePriceId: 'price_1Rb9iQQKaNQdxodoNtRXtlR6' },
  { credits: 100, price: 50, stripePriceId: 'price_1Rb9izQKaNQdxodoKanAKcRY' },
];

export default function CreditTopupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Recharge credits</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CREDIT_PACKS.map((pack) => (
          <Card key={pack.credits} className="flex flex-col items-center p-6">
            <div className="text-4xl font-bold mb-2">{pack.credits}</div>
            <div className="text-muted-foreground mb-4">credits</div>
            <div className="text-2xl font-semibold mb-6">${pack.price} USD</div>
            <Button
              onClick={() => handleBuy(pack)}
              disabled={!!loading}
              className="w-full"
            >
              {loading === pack.credits.toString() ? 'Redirecting...' : 'Buy'}
            </Button>
          </Card>
        ))}
      </div>
      {error && <div className="text-red-500 text-center mt-6">{error}</div>}
    </div>
  );
} 