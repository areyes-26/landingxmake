// functions/src/index.ts

import * as functions from 'firebase-functions/v1';
import { admin, db } from './lib/firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import { facebookCallback } from './instagram/callback';
import { checkVideoStatus } from './instagram/videoStatusChecker';
import { HeyGenAPI } from './lib/heygen';
import { PubSub } from '@google-cloud/pubsub';

console.log('Firebase Functions loaded.');

// === Facebook Webhook ===
export const facebookWebhook = functions.https.onRequest((req: any, res: any) => {
  const cfg = functions.config() as any;
  const fbConfig = cfg.facebook || {};

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
export const facebookCallbackFn = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 60 })
  .https.onRequest(facebookCallback);

// === Instagram Webhook POST (procesa media) ===


// === Firestore Trigger: nuevo video ===
export { onVideoCreated } from './onVideoCreated';

// === Firestore Trigger: check video status ===
export { checkVideoStatus };

// === Firestore Trigger: Video status update (para notificaciones robustas) ===
// DESHABILITADO: Las notificaciones ahora se envían directamente desde los endpoints de polling
// export const onVideoStatusUpdate = functions.firestore
//   .document('videos/{videoId}')
//   .onUpdate(async (change, context) => {
//     const before = change.before.data();
//     const after = change.after.data();
//     const videoId = context.params.videoId;

//     // Solo procesar si el status cambió de algo diferente a 'completed' a 'completed'
//     if (before.status !== 'completed' && after.status === 'completed' && after.userId) {
//       console.log(`[onVideoStatusUpdate] Video ${videoId} completed. Sending notification to user ${after.userId}`);
      
//       try {
//         await require('./lib/notifications').sendNotificationToUser(after.userId, {
//           type: 'video_ready',
//           message: 'Your video is ready! Click to view it in your dashboard.',
//           videoId
//         });
//         console.log(`[onVideoStatusUpdate] Notification sent successfully for video ${videoId}`);
//       } catch (error) {
//         console.error(`[onVideoStatusUpdate] Error sending notification for video ${videoId}:`, error);
//       }
//     }
//   });

// EXPORT WEBHOOK INSTAGRAM
export { instagramWebhook } from './instagram/webhook';

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
      firstName: '',
      lastName: '',
      profession: '',
    });
    
    console.log(`[onUserCreated] Documento user_data creado exitosamente para ${user.uid}`);
  } catch (error) {
    console.error(`[onUserCreated] Error al crear user_data para ${user.uid}:`, error);
    throw error;
  }
});

export { tiktokCallback } from './tiktok/callback';

export { publishToInstagram } from './instagram/publish';

const pubsub = new PubSub();
const POLL_TOPIC = 'poll-heygen-video';
const POLL_DELAY_SECONDS = 30; // Puedes ajustar el delay según necesidad

// === Firestore Trigger: Publica en Pub/Sub cuando un video entra en 'processing' ===
export const onVideoProcessing = functions.firestore
  .document('videos/{videoId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const videoId = context.params.videoId;

    // Solo dispara si el status cambió a 'processing'
    if (before.status !== 'processing' && after.status === 'processing') {
      console.log(`[onVideoProcessing] Video ${videoId} entró en 'processing', publicando en Pub/Sub...`);
      await pubsub.topic(POLL_TOPIC).publishMessage({
        json: { videoId }
      });
    }
  });

// === Polling inteligente usando Pub/Sub ===
export const pollHeygenVideo = functions.pubsub
  .topic(POLL_TOPIC)
  .onPublish(async (message) => {
    const { videoId } = message.json;
    if (!videoId) {
      console.error('[pollHeygenVideo] No se recibió videoId');
      return;
    }
    console.log(`[pollHeygenVideo] Iniciando polling para video ${videoId}`);

    // Obtener datos del video
    const videoRef = db.collection('videos').doc(videoId);
    const videoSnap = await videoRef.get();
    if (!videoSnap.exists) {
      console.error(`[pollHeygenVideo] Video ${videoId} no existe en Firestore`);
      return;
    }
    const videoData = videoSnap.data();
    if (!videoData) return;

    const heygen = new HeyGenAPI();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://visiora.ai';
    const taskId = videoData.heygenResults?.taskId || videoData.heygenResults?.videoId || videoId;
    if (!taskId) {
      console.warn(`[pollHeygenVideo] Video ${videoId} no tiene taskId`);
      return;
    }

    // Polling a HeyGen
    const status = await heygen.checkVideoStatus(taskId);
    console.log(`[pollHeygenVideo] Estado HeyGen para ${videoId}: ${status.status}`);

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      heygenResults: {
        ...videoData.heygenResults,
        status: status.status,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    };

    if (status.status === 'completed' && status.videoUrl) {
      updateData.heygenResults.videoUrl = status.videoUrl;
      if (status.thumbnailUrl) {
        updateData.thumbnailUrl = status.thumbnailUrl;
      }
      console.log(`[pollHeygenVideo] ✅ HeyGen completado para ${videoId}: ${status.videoUrl}`);
      // Enviar automáticamente a Creatomate
      try {
        console.log(`[pollHeygenVideo] Enviando ${videoId} a Creatomate...`);
        const creatomateResponse = await axios.post(`${baseUrl}/api/creatomate/generate-video`, {
          videoId
        }, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (creatomateResponse.status === 200) {
          console.log(`[pollHeygenVideo] ${videoId} enviado a Creatomate exitosamente`);
        } else {
          console.error(`[pollHeygenVideo] Falló al enviar ${videoId} a Creatomate`);
          updateData.status = 'error';
          updateData.error = 'Error al enviar video a Creatomate para edición';
        }
      } catch (creatomateError) {
        console.error(`[pollHeygenVideo] Error enviando ${videoId} a Creatomate:`, creatomateError);
        updateData.status = 'error';
        updateData.error = 'Error al enviar video a Creatomate para edición';
      }
    } else if (status.status === 'error') {
      updateData.status = 'error';
      updateData.error = status.error || 'Error al generar el video';
      updateData.heygenResults.error = status.error;
      console.log(`[pollHeygenVideo] ❌ ${videoId} marcado como error: ${status.error}`);
    } else if (status.status === 'processing') {
      // Re-publicar mensaje en Pub/Sub para seguir el polling
      console.log(`[pollHeygenVideo] Video ${videoId} sigue en processing, re-publicando en Pub/Sub con delay...`);
      await pubsub.topic(POLL_TOPIC).publishMessage({
        json: { videoId },
        attributes: { 'scheduled-delay-seconds': POLL_DELAY_SECONDS.toString() }
      });
    }

    await videoRef.update(updateData);
    console.log(`[pollHeygenVideo] Firestore actualizado para ${videoId}`);
  });