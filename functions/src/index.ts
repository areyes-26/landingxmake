// functions/src/index.ts
console.log('Firebase Functions loaded.');

import * as functions from 'firebase-functions/v1';   // <- Forzar versión v1
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import { instagramCallback } from './instagram/callback';
import { checkVideoStatus } from './instagram/videoStatusChecker';
import { instagramWebhook } from './instagram/webhook';


// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const cfg = functions.config() as any;

const fbConfig     = cfg.facebook   || {};
const igConfig     = cfg.instagram  || {};
const heygenConfig = cfg.heygen     || {};
const googleConfig = cfg.google     || {};
const openaiConfig = cfg.openai     || {};
const apiConfig    = cfg.api        || {};

// Validaciones
if (!heygenConfig.api_key)    throw new Error('Falta HeyGen API key en config.');
if (!igConfig.client_secret)  throw new Error('Falta Instagram client_secret en config.');
if (!googleConfig.script_url) throw new Error('Falta Google script_url en config.');
if (!openaiConfig.api_key)    throw new Error('Falta OpenAI API key en config.');
//if (!apiConfig.url)           throw new Error('Falta api.url en config.');
//if (!apiConfig.key)           throw new Error('Falta api.key en config.');

// === Facebook Webhook ===
export const facebookWebhook = functions.https.onRequest((req, res) => {
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === fbConfig.verify_token) {
      console.log('Facebook webhook verificado');
      res.status(200).send(challenge as string);
    } else {
      console.error('Verificación de Facebook Webhook fallida');
      res.status(403).send('Verification failed');
    }
    return;
  }

  if (req.method === 'POST') {
    const sigHeader = req.headers['x-hub-signature-256'];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;

    if (signature && fbConfig.app_secret) {
      const [algo, hash] = signature.split('=');
      if (algo === 'sha256') {
        const expected = crypto
          .createHmac('sha256', fbConfig.app_secret)
          .update((req as any).rawBody)
          .digest('hex');

        if (hash !== expected) {
          console.error('Firma inválida de Facebook Webhook');
          res.status(403).send('Invalid signature');
          return;
        }
      }
    }

    const payload = req.body;
    console.log('Evento de Facebook Webhook:', JSON.stringify(payload));

    if (payload.object === 'instagram' && Array.isArray(payload.entry)) {
      payload.entry.forEach((entry: any) => {
        entry.changes.forEach((change: any) => {
          if (change.field === 'media') {
            console.log('Instagram media change:', change.value);
          }
        });
      });
    }

    res.status(200).send('EVENT_RECEIVED');
    return;
  }

  res.status(405).send('Method Not Allowed');
});

// === Instagram OAuth Callback ===
export const instagramCallbackFn = instagramCallback;

// === Instagram Webhook POST (procesa media) ===
export const instagramWebhookFn = instagramWebhook;

// === Firestore Trigger: nuevo video ===
export { onVideoCreated } from './onVideoCreated';

// === Firestore Trigger: check video status ===
export { checkVideoStatus };
