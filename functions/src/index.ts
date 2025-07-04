// functions/src/index.ts

import * as functions from 'firebase-functions/v1';
import { admin, db } from './lib/firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import { facebookCallback } from './instagram/callback';
import { checkVideoStatus } from './instagram/videoStatusChecker';
import { HeyGenAPI } from './lib/heygen';
import { CloudTasksClient } from '@google-cloud/tasks';

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

const tasksClient = new CloudTasksClient();
const TASK_QUEUE = process.env.CLOUD_TASKS_QUEUE || 'heygen-polling-queue';
const TASK_LOCATION = process.env.CLOUD_TASKS_LOCATION || 'us-central1';

// === Firestore Trigger: Publica en Pub/Sub cuando un video entra en 'processing' ===
export const onVideoProcessing = functions.firestore
  .document('videos/{videoId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const videoId = context.params.videoId;

    // Solo dispara si el status cambió a 'processing'
    if (before.status !== 'processing' && after.status === 'processing') {
      console.log(`[onVideoProcessing] Video ${videoId} entró en 'processing', creando tarea en Cloud Tasks...`);
      await createPollingTask(videoId, 0); // Ejecutar inmediatamente el primer polling
    }
  });

// === Nueva función HTTP para polling con Cloud Tasks ===
export const pollHeygenVideoTask = functions.https.onRequest(async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      res.status(400).json({ error: 'Missing videoId' });
      return;
    }
    console.log(`[pollHeygenVideoTask] Polling para videoId: ${videoId}`);

    // Obtener datos del video
    const videoRef = db.collection('videos').doc(videoId);
    const videoSnap = await videoRef.get();
    if (!videoSnap.exists) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    const videoData = videoSnap.data();
    if (!videoData) {
      res.status(404).json({ error: 'Video data not found' });
      return;
    }

    const heygen = new HeyGenAPI();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://visiora.ai';
    const taskId = videoData.heygenResults?.taskId || videoData.heygenResults?.videoId || videoId;
    if (!taskId) {
      console.warn(`[pollHeygenVideoTask] Video ${videoId} no tiene taskId`);
      res.status(400).json({ error: 'No taskId' });
      return;
    }

    // Polling a HeyGen
    const status = await heygen.checkVideoStatus(taskId);
    console.log(`[pollHeygenVideoTask] Estado HeyGen para ${videoId}: ${status.status}`);

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
      // 1. Actualizar Firestore primero
      try {
        await videoRef.update(updateData);
        console.log(`[pollHeygenVideoTask] Firestore actualizado para ${videoId} con:`, updateData);
      } catch (firestoreError) {
        console.error(`[pollHeygenVideoTask] Error actualizando Firestore para ${videoId}:`, firestoreError);
        res.status(500).json({ error: 'Error actualizando Firestore' });
        return;
      }
      // 2. Luego llamar a Creatomate con retry logic
      const maxRetries = 3;
      const retryDelay = 5000; // 5 segundos
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[pollHeygenVideoTask] Enviando ${videoId} a Creatomate (intento ${attempt}/${maxRetries})...`);
          const creatomateResponse = await axios.post(`${baseUrl}/api/creatomate/generate-video`, {
            videoId
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000, // 30 segundos timeout
          });
          
          if (creatomateResponse.status === 200) {
            console.log(`[pollHeygenVideoTask] ${videoId} enviado a Creatomate exitosamente`);
            break; // Éxito, salir del loop
          } else {
            console.error(`[pollHeygenVideoTask] Falló al enviar ${videoId} a Creatomate. Status:`, creatomateResponse.status, 'Data:', creatomateResponse.data);
            if (attempt === maxRetries) {
              console.error(`[pollHeygenVideoTask] Máximo número de intentos alcanzado para ${videoId}`);
            }
          }
        } catch (creatomateError: any) {
          console.error(`[pollHeygenVideoTask] Error enviando ${videoId} a Creatomate (intento ${attempt}/${maxRetries}):`, creatomateError.message);
          
          // Si es el último intento, no reintentar
          if (attempt === maxRetries) {
            console.error(`[pollHeygenVideoTask] Máximo número de intentos alcanzado para ${videoId}`);
            break;
          }
          
          // Si es un error 502/503/504 (servidor no disponible), reintentar
          const isRetryableError = creatomateError.response?.status >= 500 || 
                                  creatomateError.message.includes('502') ||
                                  creatomateError.message.includes('503') ||
                                  creatomateError.message.includes('504') ||
                                  creatomateError.message.includes('Bad Gateway');
          
          if (isRetryableError) {
            console.log(`[pollHeygenVideoTask] Error temporal detectado, reintentando en ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            console.error(`[pollHeygenVideoTask] Error no recuperable, no reintentando`);
            break;
          }
        }
      }
      res.status(200).json({ success: true });
      return;
    } else if (status.status === 'error') {
      updateData.status = 'error';
      updateData.error = status.error || 'Error al generar el video';
      updateData.heygenResults.error = status.error;
      console.log(`[pollHeygenVideoTask] ❌ ${videoId} marcado como error: ${status.error}`);
    } else if (status.status === 'processing') {
      // Reprogramar el polling en 1 minuto
      console.log(`[pollHeygenVideoTask] Video ${videoId} sigue en processing, creando nueva tarea en Cloud Tasks para 1 minuto...`);
      await createPollingTask(videoId, 60);
    }

    await videoRef.update(updateData);
    console.log(`[pollHeygenVideoTask] Firestore actualizado para ${videoId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[pollHeygenVideoTask] Error general:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper para crear una tarea en Cloud Tasks
async function createPollingTask(videoId: string, delaySeconds: number) {
  const queuePath = tasksClient.queuePath(process.env.GCLOUD_PROJECT!, TASK_LOCATION, TASK_QUEUE);
  const url = `${process.env.POLLING_FUNCTION_URL || 'https://us-central1-landing-x-make.cloudfunctions.net/pollHeygenVideoTask'}`;
  const payload = JSON.stringify({ videoId });
  const task = {
    httpRequest: {
      httpMethod: 'POST' as const,
      url,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(payload).toString('base64'),
    },
    scheduleTime: {
      seconds: Math.floor(Date.now() / 1000) + delaySeconds,
    },
  };
  await tasksClient.createTask({ parent: queuePath, task });
  console.log(`[createPollingTask] Tarea creada para videoId ${videoId} con delay de ${delaySeconds} segundos`);
}