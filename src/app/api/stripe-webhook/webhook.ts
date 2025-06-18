import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: Readable): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getPlanDetails(amount: number | null): { plan: string; credits: number } | null {
  if (!amount) return null;
  switch (amount) {
    case 1500:
      return { plan: 'premium', credits: 20 };
    case 3000:
      return { plan: 'pro', credits: 100 };
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await buffer(req.body as any);
    const sig = req.headers.get('stripe-signature');
    if (!sig || !endpointSecret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const eventId = event.id;
    const exists = await db.collection('transactions').doc(eventId).get();
    if (exists.exists) {
      return NextResponse.json({ received: true, message: 'Event already processed' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === 'credit_topup') {
          const credits = parseInt(session.metadata.credits || '0', 10);
          const email = session.customer_details?.email || session.customer_email;
          const userId = session.metadata?.userId;

          console.log('[Webhook] Créditos:', credits, 'Email:', email, 'UserId:', userId);

          if (credits && (email || userId)) {
            let userDoc: FirebaseFirestore.DocumentSnapshot | undefined;

            if (email) {
              const query = await db.collection('user_data').where('email', '==', email).limit(1).get();
              if (!query.empty) userDoc = query.docs[0];
            } else if (userId) {
              const ref = await db.collection('user_data').doc(userId).get();
              if (ref.exists) userDoc = ref;
            }

            if (userDoc) {
              await userDoc.ref.update({
                credits: FieldValue.increment(credits),
                lastCreditTopup: FieldValue.serverTimestamp(),
              });
              await db.collection('transactions').doc(eventId).set({
                userId: userDoc.id,
                eventId,
                type: 'credit_topup',
                amount: session.amount_total,
                currency: session.currency,
                credits,
                status: 'completed',
                createdAt: FieldValue.serverTimestamp(),
              });
            } else {
              console.warn('[Webhook] No user found for credit_topup');
            }
          }
        } else if (session.metadata?.userId) {
          const userId = session.metadata.userId;
          const planDetails = getPlanDetails(session.amount_total);
          if (!planDetails) throw new Error('Invalid plan amount');

          await db.collection('user_data').doc(userId).update({
            plan: planDetails.plan,
            credits: FieldValue.increment(planDetails.credits),
            lastPaymentDate: FieldValue.serverTimestamp(),
            subscriptionId: session.subscription || null,
          });

          await db.collection('transactions').doc(eventId).set({
            userId,
            eventId,
            type: 'subscription',
            amount: session.amount_total,
            currency: session.currency,
            plan: planDetails.plan,
            credits: planDetails.credits,
            status: 'completed',
            subscriptionId: session.subscription || null,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
        const customerId = subscription.customer as string;

        const userQuery = await db.collection('user_data').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (userQuery.empty) break;

        const userDoc = userQuery.docs[0];
        const planDetails = getPlanDetails(invoice.amount_paid);
        if (!planDetails) break;

        await userDoc.ref.update({
          credits: FieldValue.increment(planDetails.credits),
          lastPaymentDate: FieldValue.serverTimestamp(),
          subscriptionId: subscription.id,
        });

        await db.collection('transactions').doc(eventId).set({
          userId: userDoc.id,
          eventId,
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
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userQuery = await db.collection('user_data').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (userQuery.empty) break;

        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          plan: 'free',
          subscriptionId: null,
          subscriptionCancelledAt: FieldValue.serverTimestamp(),
        });

        await db.collection('transactions').doc(eventId).set({
          userId: userDoc.id,
          eventId,
          type: event.type,
          status: 'cancelled',
          subscriptionId: subscription.id,
          cancelledAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userQuery = await db.collection('user_data')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();
        if (userQuery.empty) break;

        const userDoc = userQuery.docs[0];
        const price = subscription.items.data[0]?.price.unit_amount || 0;
        const planDetails = getPlanDetails(price);
        if (!planDetails) break;

        await userDoc.ref.update({
          plan: planDetails.plan,
          credits: FieldValue.increment(planDetails.credits),
          subscriptionId: subscription.id,
          lastPaymentDate: FieldValue.serverTimestamp(),
        });

        await db.collection('transactions').doc(eventId).set({
          userId: userDoc.id,
          eventId,
          type: event.type,
          plan: planDetails.plan,
          credits: planDetails.credits,
          status: 'plan_changed',
          subscriptionId: subscription.id,
          updatedAt: FieldValue.serverTimestamp(),
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
