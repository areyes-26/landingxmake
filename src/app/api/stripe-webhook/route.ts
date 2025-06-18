import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Inicializar Stripe con la clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Función para verificar la firma del webhook
async function verifyStripeSignature(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    throw new Error('No signature found');
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    return event;
  } catch (err) {
    console.error('Error verifying signature:', err);
    throw new Error('Invalid signature');
  }
}

// Función para verificar si un evento ya fue procesado
async function isEventProcessed(eventId: string): Promise<boolean> {
  const transactionRef = db.collection('transactions').doc(eventId);
  const doc = await transactionRef.get();
  return doc.exists;
}

// Función para procesar el pago exitoso (checkout.session.completed)
async function handleSuccessfulPayment(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Recarga de créditos puntual
  if (session.metadata?.type === 'credit_topup') {
    const credits = parseInt(session.metadata.credits || '0', 10);
    const email = session.customer_email;
    if (!credits || !email) {
      throw new Error('Missing credits or customer email for credit topup');
    }
    // Buscar usuario por email
    const userQuery = await db.collection('user_data')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (userQuery.empty) {
      throw new Error(`No user found for email ${email}`);
    }
    const userId = userQuery.docs[0].id;
    const userRef = db.collection('user_data').doc(userId);
    await userRef.update({
      credits: FieldValue.increment(credits),
      lastCreditTopup: FieldValue.serverTimestamp(),
    });
    // Guardar la transacción
    await db.collection('transactions').doc(event.id).set({
      userId,
      eventId: event.id,
      type: 'credit_topup',
      amount: session.amount_total,
      currency: session.currency,
      credits,
      status: 'completed',
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  // Lógica original de suscripción
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error('No userId found in session metadata');
  }

  // Obtener el plan y los créditos según el precio
  const planDetails = getPlanDetails(session.amount_total);
  if (!planDetails) {
    throw new Error('Invalid payment amount');
  }

  // Actualizar user_data
  const userRef = db.collection('user_data').doc(userId);
  await userRef.update({
    plan: planDetails.plan,
    credits: FieldValue.increment(planDetails.credits),
    lastPaymentDate: FieldValue.serverTimestamp(),
    subscriptionId: session.subscription || null,
  });

  // Guardar la transacción
  await db.collection('transactions').doc(event.id).set({
    userId,
    eventId: event.id,
    type: event.type,
    amount: session.amount_total,
    currency: session.currency,
    plan: planDetails.plan,
    credits: planDetails.credits,
    status: 'completed',
    subscriptionId: session.subscription || null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Función para procesar renovación de suscripción (invoice.payment_succeeded)
async function handleSubscriptionRenewal(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  
  // Solo procesar facturas de suscripción
  if (!(invoice as any).subscription) {
    console.log('Invoice is not for a subscription, skipping');
    return;
  }

  // Obtener la suscripción para encontrar el customer
  const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
  const customerId = subscription.customer as string;

  // Buscar el usuario por customerId en user_data
  const userQuery = await db.collection('user_data')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) {
    console.log(`No user found for customer ${customerId}`);
    return;
  }

  const userId = userQuery.docs[0].id;
  const planDetails = getPlanDetails(invoice.amount_paid);
  
  if (!planDetails) {
    throw new Error('Invalid subscription amount');
  }

  // Actualizar user_data con nuevos créditos
  const userRef = db.collection('user_data').doc(userId);
  await userRef.update({
    credits: FieldValue.increment(planDetails.credits),
    lastPaymentDate: FieldValue.serverTimestamp(),
    subscriptionId: subscription.id,
  });

  // Guardar la transacción de renovación
  await db.collection('transactions').doc(event.id).set({
    userId,
    eventId: event.id,
    type: event.type,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    plan: planDetails.plan,
    credits: planDetails.credits,
    status: 'renewal',
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Función para procesar cancelación de suscripción (customer.subscription.deleted)
async function handleSubscriptionCancellation(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  // Buscar el usuario por customerId
  const userQuery = await db.collection('user_data')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userQuery.empty) {
    console.log(`No user found for customer ${customerId}`);
    return;
  }

  const userId = userQuery.docs[0].id;

  // Actualizar user_data - volver a plan free pero mantener créditos existentes
  const userRef = db.collection('user_data').doc(userId);
  await userRef.update({
    plan: 'free',
    subscriptionId: null,
    subscriptionCancelledAt: FieldValue.serverTimestamp(),
  });

  // Guardar la transacción de cancelación
  await db.collection('transactions').doc(event.id).set({
    userId,
    eventId: event.id,
    type: event.type,
    status: 'cancelled',
    subscriptionId: subscription.id,
    cancelledAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Función para obtener detalles del plan según el monto
function getPlanDetails(amount: number | null): { plan: string; credits: number } | null {
  if (!amount) return null;

  // Montos en centavos
  switch (amount) {
    case 1500: // $15.00
      return { plan: 'premium', credits: 20 };
    case 3000: // $30.00
      return { plan: 'pro', credits: 100 };
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verificar la firma del webhook
    const event = await verifyStripeSignature(req);

    // Verificar si el evento ya fue procesado
    if (await isEventProcessed(event.id)) {
      return NextResponse.json({ received: true, message: 'Event already processed' });
    }

    // Procesar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSuccessfulPayment(event);
        break;

      case 'invoice.payment_succeeded':
        await handleSubscriptionRenewal(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event);
        break;

      case 'payment_intent.succeeded':
        // Mantener compatibilidad con pagos únicos
        await handleSuccessfulPayment(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
} 