import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Tipar 'functions' como any para evitar error con firestore
const anyFunctions = functions as any;

export const onVideoCreated = anyFunctions.firestore
  .document('videos/{videoId}')
  .onCreate(async (snapshot, context) => {
    const videoId = context.params.videoId;
    const videoData = snapshot.data();

    const openaiCfg = (functions.config().openai || {}) as { base_url?: string };
const baseUrl = openaiCfg.base_url;

if (!baseUrl) {
  throw new Error('[onVideoCreated] ❌ BASE_URL no está definido en functions.config().openai');
}
console.log(`[onVideoCreated] Trigger activado para ${videoId}`);
    console.log(`[onVideoCreated] Usando baseUrl: ${baseUrl}`);
    console.log(`[onVideoCreated] Video creado: ${videoId}`);

    try {
      const response = await axios.post(`${baseUrl}/api/openai/generate-script`, {
        generationId: videoId,
        videoData,
      });

      console.log(`[onVideoCreated] Generación OK:`, response.data);
    } catch (err) {
      console.error(`[onVideoCreated] Error al generar script:`, err);

      await db.collection('videos').doc(videoId).update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  });
