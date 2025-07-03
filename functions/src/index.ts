// functions/src/index.ts

import * as functions from 'firebase-functions/v1';
import { admin, db } from './lib/firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import { facebookCallback } from './instagram/callback';
import { checkVideoStatus } from './instagram/videoStatusChecker';
import { HeyGenAPI } from './lib/heygen';

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

// === POLLING UNIFICADO: Solo para HeyGen (Creatomate usa webhooks) ===
export const videoPolling = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    console.log('[Video Polling] 🔄 Verificando videos en proceso (HeyGen)...');
    
    try {
      // Solo buscar videos que están en proceso con HeyGen
      const videosSnapshot = await db.collection('videos')
        .where('status', '==', 'processing')
        .get();

      if (videosSnapshot.empty) {
        console.log('[Video Polling] ✅ No hay videos en proceso con HeyGen - skipping');
        return null;
      }

      console.log(`[Video Polling] 📋 Encontrados ${videosSnapshot.size} videos en proceso con HeyGen`);

      const heygen = new HeyGenAPI();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://visiora.ai';

      // Procesar cada video
      for (const doc of videosSnapshot.docs) {
        const videoId = doc.id;
        const videoData = doc.data();
        
        console.log(`[Video Polling] 🔍 Procesando video ${videoId} (HeyGen)`);

        try {
          await pollHeyGenVideo(videoId, videoData, heygen, baseUrl);
        } catch (error) {
          console.error(`[Video Polling] ❌ Error procesando video ${videoId}:`, error);
          // Continuar con el siguiente video
        }
      }

      console.log('[Video Polling] ✅ Polling de HeyGen completado');
      return null;
    } catch (error) {
      console.error('[Video Polling] ❌ Error en polling:', error);
      throw error;
    }
  });

// Función unificada para polling de videos (solo HeyGen)
async function pollVideoStatus(videoId: string, videoData: any, heygen?: HeyGenAPI, baseUrl?: string) {
  if (!heygen) {
    heygen = new HeyGenAPI();
  }
  if (!baseUrl) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://visiora.ai';
  }

  console.log(`[Video Polling] 🔍 Polling video ${videoId} (status: ${videoData.status})`);

  try {
    if (videoData.status === 'processing') {
      // Solo polling de HeyGen (Creatomate usa webhooks)
      await pollHeyGenVideo(videoId, videoData, heygen, baseUrl);
    }
    // No más polling de Creatomate - usa webhooks
  } catch (error) {
    console.error(`[Video Polling] ❌ Error en polling de video ${videoId}:`, error);
    throw error;
  }
}

// Función auxiliar para polling de HeyGen
async function pollHeyGenVideo(videoId: string, videoData: any, heygen: HeyGenAPI, baseUrl: string) {
  const taskId = videoData.heygenResults?.taskId || videoData.heygenResults?.videoId || videoId;
  
  if (!taskId) {
    console.warn(`[Automatic Polling] ⚠️ Video ${videoId} no tiene taskId`);
    return;
  }

  console.log(`[Video Polling] 🎬 Verificando HeyGen para video ${videoId} (taskId: ${taskId})`);
  
  const status = await heygen.checkVideoStatus(taskId);
  console.log(`[Video Polling] 📊 Estado HeyGen para ${videoId}: ${status.status}`);

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
    console.log(`[Video Polling] ✅ HeyGen completado para ${videoId}: ${status.videoUrl}`);
    
    // Enviar automáticamente a Creatomate
    try {
      console.log(`[Video Polling] 🎨 Enviando ${videoId} a Creatomate...`);
      const creatomateResponse = await axios.post(`${baseUrl}/api/creatomate/generate-video`, {
        videoId
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (creatomateResponse.status === 200) {
        console.log(`[Video Polling] ✅ ${videoId} enviado a Creatomate exitosamente`);
        // El estado se actualizará automáticamente a 'editing' por el endpoint de Creatomate
      } else {
        console.error(`[Video Polling] ❌ Falló al enviar ${videoId} a Creatomate`);
        // Si falla Creatomate, marcar como error y enviar notificación
        updateData.status = 'error';
        updateData.error = 'Error al enviar video a Creatomate para edición';
        
        // Enviar notificación de error
        if (videoData.userId) {
          try {
            await require('./lib/notifications').sendNotificationToUser(videoData.userId, {
              type: 'video_error',
              message: 'There was an error processing your video. Please try again.',
              videoId
            });
            console.log(`[Video Polling] ❌ Error notification sent for video ${videoId}`);
          } catch (notifError) {
            console.error(`[Video Polling] ❌ Error sending error notification for video ${videoId}:`, notifError);
          }
        }
      }
    } catch (creatomateError) {
      console.error(`[Video Polling] ❌ Error enviando ${videoId} a Creatomate:`, creatomateError);
      // Si falla Creatomate, marcar como error y enviar notificación
      updateData.status = 'error';
      updateData.error = 'Error al enviar video a Creatomate para edición';
      
      // Enviar notificación de error
      if (videoData.userId) {
        try {
          await require('./lib/notifications').sendNotificationToUser(videoData.userId, {
            type: 'video_error',
            message: 'There was an error processing your video. Please try again.',
            videoId
          });
          console.log(`[Video Polling] ❌ Error notification sent for video ${videoId}`);
        } catch (notifError) {
          console.error(`[Video Polling] ❌ Error sending error notification for video ${videoId}:`, notifError);
        }
      }
    }
  } else if (status.status === 'error') {
    updateData.status = 'error';
    updateData.error = status.error || 'Error al generar el video';
    updateData.heygenResults.error = status.error;
    console.log(`[Video Polling] ❌ ${videoId} marcado como error: ${status.error}`);
    
    // Enviar notificación de error
    if (videoData.userId) {
      try {
        await require('./lib/notifications').sendNotificationToUser(videoData.userId, {
          type: 'video_error',
          message: 'There was an error generating your video. Please try again.',
          videoId
        });
        console.log(`[Video Polling] ❌ Error notification sent for video ${videoId}`);
      } catch (notifError) {
        console.error(`[Video Polling] ❌ Error sending error notification for video ${videoId}:`, notifError);
      }
    }
  }

  await db.collection('videos').doc(videoId).update(updateData);
  console.log(`[Video Polling] 💾 Firestore actualizado para ${videoId}`);
}

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