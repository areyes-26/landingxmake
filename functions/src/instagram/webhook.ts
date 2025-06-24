// functions/src/instagram/webhook.ts

import * as functions from 'firebase-functions/v1';  // v1
import { admin, db } from '../lib/firebase-admin';
import * as crypto from 'crypto';

interface InstagramWebhookChange {
  value: {
    media_id: string;
    timestamp: number;
    content_type: string;
    media_type: string;
    media_url: string;
    thumbnail_url: string;
    caption: string;
    username: string;
  };
  field: string;
}

interface InstagramWebhookEntry {
  id: string;
  time: number;
  changes: InstagramWebhookChange[];
}

interface InstagramWebhookRequest {
  object: string;
  entry: InstagramWebhookEntry[];
}

const COLLECTIONS = {
  WEBHOOK_EVENTS: 'instagram_webhook_events',
  MEDIA: 'instagram_media',
} as const;

function logWebhookEvent(
  eventType: string,
  data: any,
  error?: Error
) {
  const event = {
    type: eventType,
    data,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    error: error?.message,
  };
  db.collection(COLLECTIONS.WEBHOOK_EVENTS)
    .add(event)
    .catch((err) => console.error('Error logging webhook event:', err));
}

async function processMedia(changeValue: InstagramWebhookChange['value']) {
  try {
    const ref = db.collection(COLLECTIONS.MEDIA).doc(changeValue.media_id);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        ...changeValue,
        processed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await ref.update({
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    logWebhookEvent('media_processed', changeValue);
  } catch (err) {
    console.error('Error processing media:', err);
    logWebhookEvent('media_processing_error', changeValue, err instanceof Error ? err : undefined);
  }
}

export const instagramWebhook = functions
    .region('us-central1')
    .runWith({ timeoutSeconds: 60 })
    .https.onRequest(async (req, res) => {
    // Config movido dentro del handler
    const cfg = functions.config().instagram;

    // Siempre registramos la llegada del webhook
    logWebhookEvent('webhook_received', {
      method: req.method,
      timestamp: new Date().toISOString(),
      headers: {
        'x-hub-signature-256': req.headers['x-hub-signature-256'],
      },
    });

    // VERIFICACIÓN (GET)
    if (req.method === 'GET') {
      const mode = String(req.query['hub.mode']);
      const token = String(req.query['hub.verify_token']);
      const challenge = String(req.query['hub.challenge']);
      console.log('mode', mode);
      console.log('token', token);
      console.log('challenge', challenge);  
      console.log('cfg.verify_token', cfg.verify_token);

      if (mode !== 'subscribe' || token !== cfg.verify_token) {
        logWebhookEvent('verification_error', { mode, token });
        console.log('verification_error', { mode, token });
        res.status(403).send('Forbidden');
        return;
      }

      logWebhookEvent('verification_success', { challenge });
      res.status(200).send(challenge as string);
      return;
    }

    // RECEPCIÓN DE EVENTOS (POST)
    if (req.method === 'POST') {
      // Firma HMAC SHA256
      const rawSignatureHeader = req.headers['x-hub-signature-256'];
      const signatureHeader = typeof rawSignatureHeader === 'string'
        ? rawSignatureHeader
        : Array.isArray(rawSignatureHeader)
          ? rawSignatureHeader[0]
          : undefined;
      console.log('signatureHeader', signatureHeader);
      const signature = signatureHeader;
      console.log('signature', signature);

      if (!signature) {
        logWebhookEvent('signature_error', { error: 'Missing signature' });
        res.status(401).send('Unauthorized');
        return;
      }

      const [algo, hash] = signature.split('=');
      if (algo !== 'sha256') {
        logWebhookEvent('signature_error', { error: 'Invalid algorithm' });
        res.status(401).send('Unsupported algorithm');
        return;
      }

      if (!cfg.app_secret) {
        logWebhookEvent('configuration_error', { error: 'Missing app secret' });
        res.status(500).send('Server error');
        return;
      }

      const bodyString = JSON.stringify(req.body);
      const expected = crypto
        .createHmac('sha256', cfg.app_secret)
        .update(bodyString)
        .digest('hex');

        if (hash !== expected) {
          logWebhookEvent('signature_error', {
            error: 'Hash mismatch',
            ...(signatureHeader && { header: signatureHeader }),
            ...(req.body && { body: req.body }),
          });
          res.status(401).send('Unauthorized');
          return;
        }

      // Acknowledge receipt
      res.status(200).send('EVENT_RECEIVED');

      // Procesamos cada change
      const payload = req.body as InstagramWebhookRequest;
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          logWebhookEvent('event_received', {
            media_id: change.value.media_id,
            field:    change.field,
            timestamp: change.value.timestamp,
          });

          switch (change.field) {
            case 'media':
              await processMedia(change.value);
              break;
            case 'comments':
              logWebhookEvent('comment_received', change.value);
              break;
            case 'likes':
              logWebhookEvent('like_received', change.value);
              break;
            default:
              logWebhookEvent('unknown_event', change);
          }
        }
      }

      return;
    }

    // Otros métodos no permitidos
    res.status(405).send('Method Not Allowed');
  });
