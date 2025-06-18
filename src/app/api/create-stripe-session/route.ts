import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// ✅ Instancia de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// ✅ Map de precios según plan
const PRICE_IDS: Record<string, string> = {
  premium: 'price_1Raj3MQKaNQdxodoehXmGkNg',
  pro: 'price_1Raj2uQKaNQdxodoqJuq7Feq',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ✅ Extraer userId para ambos casos
    const { userId } = body;

    // Recarga de créditos (pago único)
    if (body.type === 'credit_topup') {
      const { credits, stripePriceId, email } = body;
      if (!credits || !stripePriceId || !email) {
        return NextResponse.json({ error: 'Missing credits, email or stripePriceId' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account-setting/credit-topup?success=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account-setting/credit-topup?canceled=1`,
        metadata: {
          credits,
          type: 'credit_topup',
          userId, // ✅ Incluido también aquí
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // Suscripción a plan
    const { plan } = body;
    if (!userId || !plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Missing userId or invalid plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account-setting?tab=plans&success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account-setting?tab=plans&canceled=1`,
      metadata: {
        userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    return NextResponse.json({ error: 'Error creating Stripe session' }, { status: 500 });
  }
}
