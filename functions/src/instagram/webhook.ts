import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as crypto from 'crypto';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

interface InstagramWebhookRequest {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
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
    }>;
  }>;
}

// Constants
const COLLECTIONS = {
  WEBHOOK_EVENTS: 'instagram_webhook_events',
  MEDIA: 'instagram_media'
} as const;

// Helper function to log webhook events
function logWebhookEvent(eventType: string, data: any, error?: Error) {
  const db = admin.firestore();
  const event = {
    type: eventType,
    data,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    error: error?.message
  };
  
  db.collection(COLLECTIONS.WEBHOOK_EVENTS).add(event)
    .catch(err => console.error('Error logging webhook event:', err));
}

// Helper function to process media
async function processMedia(mediaData: InstagramWebhookRequest['entry'][number]['changes'][number]['value']) {
  const db = admin.firestore();
  try {
    const mediaRef = db.collection(COLLECTIONS.MEDIA).doc(mediaData.media_id);
    const mediaDoc = await mediaRef.get();

    if (!mediaDoc.exists) {
      // Store new media
      await mediaRef.set({
        ...mediaData,
        processed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing media if needed
      await mediaRef.update({
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Log successful media processing
    logWebhookEvent('media_processed', mediaData);
  } catch (error) {
    console.error('Error processing media:', error);
    logWebhookEvent('media_processing_error', mediaData, error instanceof Error ? error : undefined);
  }
}

export const instagramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Log incoming request
    logWebhookEvent('webhook_received', {
      method: req.method,
      timestamp: new Date().toISOString(),
      headers: {
        'x-hub-signature-256': req.headers['x-hub-signature-256']
      }
    });

    // Handle GET request for webhook verification
    if (req.method === 'GET') {
      const VERIFY_TOKEN = functions.config('instagram')?.verify_token;
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (!mode || !token || !challenge) {
        logWebhookEvent('verification_error', { error: 'Missing parameters' });
        res.status(400).send('Missing required parameters');
        return;
      }

      if (mode !== 'subscribe') {
        logWebhookEvent('verification_error', { error: 'Invalid mode' });
        res.status(403).send('Invalid mode');
        return;
      }

      if (token !== VERIFY_TOKEN) {
        logWebhookEvent('verification_error', { error: 'Token mismatch' });
        res.status(403).send('Verification token mismatch');
        return;
      }

      logWebhookEvent('verification_success', { challenge });
      res.status(200).send(challenge);
      return;
    }

    // Handle POST request for webhook events
    if (req.method === 'POST') {
      // Verify the request signature
      const signature = Array.isArray(req.headers['x-hub-signature-256'])
        ? req.headers['x-hub-signature-256'][0]
        : req.headers['x-hub-signature-256'];
      
      if (!signature) {
        logWebhookEvent('signature_error', { error: 'Missing signature' });
        res.status(401).send('Unauthorized');
        return;
      }

      const [algorithm, hash] = signature?.split('=') || [];
      if (algorithm !== 'sha256') {
        logWebhookEvent('signature_error', { error: 'Invalid algorithm' });
        res.status(401).send('Unsupported signature algorithm');
        return;
      }

      const appSecret = functions.config('meta')?.app_secret;
      if (!appSecret) {
        logWebhookEvent('configuration_error', { error: 'Missing app secret' });
        res.status(500).send('Internal server error');
        return;
      }

      // Verify body exists
      if (!req.body) {
        logWebhookEvent('payload_error', { error: 'Missing request body' });
        res.status(400).send('Missing request body');
        return;
      }

      // Calculate and verify signature
      const bodyString = JSON.stringify(req.body);
      const expectedHash = crypto
        .createHmac('sha256', appSecret)
        .update(bodyString)
        .digest('hex');

      if (hash !== expectedHash) {
        logWebhookEvent('signature_error', { error: 'Invalid signature', body: req.body });
        res.status(401).send('Unauthorized');
        return;
      }

      // Process the webhook event
      const body = req.body as InstagramWebhookRequest;
      
      // Always respond first to acknowledge receipt
      res.status(200).send('EVENT_RECEIVED');

      // Process events asynchronously
      try {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            logWebhookEvent('event_received', {
              media_id: change.value.media_id,
              field: change.field,
              timestamp: change.value.timestamp
            });

            // Handle different types of changes
            switch (change.field) {
              case 'media':
                await processMedia(change.value);
                break;
              case 'comments':
                // TODO: Implement comment processing
                logWebhookEvent('comment_received', change.value);
                break;
              case 'likes':
                // TODO: Implement like processing
                logWebhookEvent('like_received', change.value);
                break;
              default:
                logWebhookEvent('unknown_event', {
                  field: change.field,
                  value: change.value
                });
            }
          }
        }
      } catch (error) {
        console.error('Error processing webhook events:', error);
        logWebhookEvent('processing_error', body, error instanceof Error ? error : undefined);
      }
    } else {
      // Handle unsupported methods
      res.status(405).send('Method not allowed');
    }
  } catch (error) {
    console.error('Webhook error:', error);
    logWebhookEvent('webhook_error', { error });
    res.status(500).send('Internal server error');
  }
});
