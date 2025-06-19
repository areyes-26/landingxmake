import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import type { DocumentSnapshot } from 'firebase-functions/v1/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Tipar 'functions' como any para mantener compatibilidad con firestore
const anyFunctions = functions as any;

export const onVideoCreated = anyFunctions.firestore
  .document('videos/{videoId}')
  .onCreate(async (snapshot: DocumentSnapshot, context: any) => {
    const videoId = context.params.videoId;
    const videoData = snapshot.data();

    const openaiCfg = (functions.config().openai || {}) as { base_url?: string };
    const baseUrl = openaiCfg.base_url;

    console.log(`[onVideoCreated] 🔧 Configuración OpenAI:`, openaiCfg);
    console.log(`[onVideoCreated] 🔧 BASE_URL extraída:`, baseUrl);

    if (!baseUrl) {
      console.error('[onVideoCreated] ❌ BASE_URL no definido en functions.config().openai');
      throw new Error('BASE_URL no está definido en functions.config().openai');
    }

    console.log(`[onVideoCreated] ✅ Trigger activado para ${videoId}`);
    console.log(`[onVideoCreated] 🌐 Usando baseUrl: ${baseUrl}`);
    console.log(`[onVideoCreated] 📦 Video creado con datos:`, videoData);

    try {
      console.log(`[onVideoCreated] 📤 Enviando request a: ${baseUrl}/api/openai/generate-script`);
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      };
      
      console.log(`[onVideoCreated] 📤 Headers que se envían:`, JSON.stringify(requestHeaders, null, 2));
      console.log(`[onVideoCreated] 📤 URL completa: ${baseUrl}/api/openai/generate-script`);
      
      const response = await axios.post(`${baseUrl}/api/openai/generate-script`, {
        generationId: videoId,
        videoData,
      }, {
        headers: requestHeaders
      });

      console.log(`[onVideoCreated] ✅ Generación exitosa:`, response.data);
    } catch (err) {
      console.error(`[onVideoCreated] ❌ Error al generar script:`, err);
      if (err.response) {
        console.error(`[onVideoCreated] ❌ Status:`, err.response.status);
        console.error(`[onVideoCreated] ❌ Data:`, err.response.data);
        console.error(`[onVideoCreated] ❌ Headers de respuesta:`, JSON.stringify(err.response.headers, null, 2));
      }

      await db.collection('videos').doc(videoId).update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  });
