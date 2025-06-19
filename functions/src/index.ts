// functions/src/index.ts

import * as functions from 'firebase-functions/v1';
import { admin, db } from './lib/firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import { instagramCallback } from './instagram/callback';
import { checkVideoStatus } from './instagram/videoStatusChecker';
import { instagramWebhook } from './instagram/webhook';
import { HeyGenAPI } from './lib/heygen';

console.log('Firebase Functions loaded.');

const cfg = functions.config() as any;

const fbConfig     = cfg.facebook   || {};
const igConfig     = cfg.instagram  || {};
const heygenConfig = cfg.heygen     || {};
const googleConfig = cfg.google     || {};
const openaiConfig = cfg.openai     || {};
const apiConfig    = cfg.api        || {};

// Validaciones más suaves - loguear warnings en lugar de lanzar errores
if (!heygenConfig.api_key)    console.warn('⚠️ Warning: Falta HeyGen API key en config.');
if (!igConfig.client_secret)  console.warn('⚠️ Warning: Falta Instagram client_secret en config.');
if (!googleConfig.script_url) console.warn('⚠️ Warning: Falta Google script_url en config.');
if (!openaiConfig.api_key)    console.warn('⚠️ Warning: Falta OpenAI API key en config.');

// === Facebook Webhook ===
export const facebookWebhook = functions.https.onRequest((req: any, res: any) => {
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

// === Cloud Function programada para polling de videos en proceso ===
export const pollHeygenVideos = functions.pubsub.schedule('every 5 minutes').onRun(async (context: any) => {
  const heygen = new HeyGenAPI();
  const snapshot = await db.collection('videos').where('status', '==', 'processing').get();
  if (snapshot.empty) {
    console.log('[pollHeygenVideos] No hay videos en proceso.');
    return null;
  }
  console.log(`[pollHeygenVideos] Revisando ${snapshot.size} videos en proceso...`);
  for (const docSnap of snapshot.docs) {
    const videoId = docSnap.id;
    const data = docSnap.data();
    // Intentar obtener el ID de la tarea de diferentes fuentes
    const taskId = data.heygenResults?.taskId || data.heygenResults?.videoId || videoId;
    if (!taskId) {
      console.warn(`[pollHeygenVideos] Video ${videoId} no tiene taskId.`);
      continue;
    }

    try {
      console.log(`[pollHeygenVideos] Consultando estado para video ${videoId} con taskId ${taskId}`);
      const status = await heygen.checkVideoStatus(taskId);
      console.log(`[pollHeygenVideos] Estado recibido para video ${videoId}:`, status);

      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        heygenResults: {
          ...data.heygenResults,
          status: status.status,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      };

      if (status.status === 'completed' && status.videoUrl) {
        updateData.status = 'completed';
        updateData.heygenResults.videoUrl = status.videoUrl;
        updateData.videoUrl = status.videoUrl; // Actualizar también el campo principal
        if (status.thumbnailUrl) {
          updateData.thumbnailUrl = status.thumbnailUrl;
        }
        console.log(`[pollHeygenVideos] Video ${videoId} actualizado a completed con URL: ${status.videoUrl}`);
      } else if (status.status === 'error') {
        updateData.status = 'error';
        updateData.error = status.error || 'Error al generar el video';
        updateData.heygenResults.error = status.error;
        console.log(`[pollHeygenVideos] Video ${videoId} actualizado a error: ${status.error}`);
      }

      await db.collection('videos').doc(videoId).update(updateData);
    } catch (err) {
      console.error(`[pollHeygenVideos] Error al consultar Heygen para video ${videoId}:`, err);
      // Actualizar el estado a error si hay un problema de comunicación
      await db.collection('videos').doc(videoId).update({
        status: 'error',
        error: 'Error al consultar el estado del video',
        heygenResults: {
          ...data.heygenResults,
          status: 'error',
          error: err instanceof Error ? err.message : 'Error desconocido',
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  return null;
});

// === Firebase Auth Trigger: Crear user_data cuando se registra un nuevo usuario ===
export const onUserCreated = functions.auth.user().onCreate(async (user: any) => {
  try {
    console.log(`[onUserCreated] Usuario creado: ${user.uid}`);
    
    // Verificar si ya existe el documento user_data
    const userDataRef = db.collection('user_data').doc(user.uid);
    const userDataDoc = await userDataRef.get();
    
    if (userDataDoc.exists) {
      console.log(`[onUserCreated] Documento user_data ya existe para ${user.uid}`);
      return;
    }
    
    // Crear el documento user_data
    await userDataRef.set({
      userId: user.uid,
      email: user.email,
      credits: 0,
      plan: 'free',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isEmailVerified: user.emailVerified || false,
      provider: user.providerData.length > 0 ? user.providerData[0].providerId : 'email',
    });
    
    console.log(`[onUserCreated] Documento user_data creado exitosamente para ${user.uid}`);
  } catch (error) {
    console.error(`[onUserCreated] Error al crear user_data para ${user.uid}:`, error);
    throw error;
  }
});