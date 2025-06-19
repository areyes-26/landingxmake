import * as functions from 'firebase-functions';
import { admin, db } from './lib/firebase-admin';
import OpenAI from 'openai';
import type { DocumentSnapshot } from 'firebase-functions/v1/firestore';

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tipar 'functions' como any para mantener compatibilidad con firestore
const anyFunctions = functions as any;

// Función para leer prompt template
async function readPromptTemplate(fileName: string): Promise<string> {
  // En Cloud Functions, los prompts están en el directorio de la función
  const possiblePaths = [
    '/workspace/public/Prompts/' + `${fileName}.txt`,
    '/workspace/public/prompts/' + `${fileName}.txt`,
  ];

  console.log(`[onVideoCreated] 📄 Intentando leer prompt: ${fileName}`);
  
  for (const filePath of possiblePaths) {
    try {
      const fs = require('fs').promises;
      const text = await fs.readFile(filePath, 'utf8');
      if (!text.trim()) {
        console.warn(`[onVideoCreated] ⚠️ Archivo encontrado pero vacío: ${filePath}`);
        continue;
      }
      console.log(`[onVideoCreated] ✅ Archivo leído exitosamente desde: ${filePath}`);
      return text;
    } catch (error) {
      console.log(`[onVideoCreated] ❌ No se pudo leer desde: ${filePath}`);
      continue;
    }
  }

  throw new Error(`No se pudo encontrar el archivo de prompt: ${fileName}.txt`);
}

// Función para reemplazar placeholders
function replacePromptPlaceholders(template: string, replacements: Record<string, string | undefined>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    if (value === undefined || value === null) {
      console.warn(`[onVideoCreated] ⚠️ Missing value for placeholder: ${key}`);
      continue;
    }
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export const onVideoCreated = anyFunctions.firestore
  .document('videos/{videoId}')
  .onCreate(async (snapshot: DocumentSnapshot, context: any) => {
    const videoId = context.params.videoId;
    const videoData = snapshot.data();

    if (!videoData) {
      console.error(`[onVideoCreated] ❌ No hay datos para el video ${videoId}`);
      return;
    }

    console.log(`[onVideoCreated] ✅ Trigger activado para ${videoId}`);
    console.log(`[onVideoCreated] 📦 Video creado con datos:`, videoData);

    try {
      // Generar script
      console.log(`[onVideoCreated] 🚀 Generando script...`);
      
      const promptTemplate = await readPromptTemplate('generate-script');
      const prompt = replacePromptPlaceholders(promptTemplate, {
        duration: videoData.duration,
        tone: videoData.tone,
        topic: videoData.topic,
        description: videoData.description,
        videoTitle: videoData.videoTitle
      });

      console.log(`[onVideoCreated] ✏️ Prompt generado:`, prompt);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      const script = completion.choices[0].message.content?.trim();
      if (!script) {
        throw new Error('No se pudo generar el script');
      }

      console.log(`[onVideoCreated] ✅ Script generado:`, script);

      // Guardar script en completion_results_videos
      await db.collection('completion_results_videos').doc(videoId).set({
        script,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Generar copys
      console.log(`[onVideoCreated] 🚀 Generando copys...`);
      
      // Short copy
      const shortCopyTemplate = await readPromptTemplate('copy-corto');
      const shortCopyPrompt = replacePromptPlaceholders(shortCopyTemplate, {
        script,
        tone: videoData.tone,
        topic: videoData.topic,
        description: videoData.description,
        videoTitle: videoData.videoTitle,
      });

      const shortCopyCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{ role: "user", content: shortCopyPrompt }],
        temperature: 0.7,
        max_tokens: 500
      });

      const shortCopy = shortCopyCompletion.choices[0].message.content?.trim();

      // Long copy
      const longCopyTemplate = await readPromptTemplate('copy-largo');
      const longCopyPrompt = replacePromptPlaceholders(longCopyTemplate, {
        script,
        tone: videoData.tone,
        topic: videoData.topic,
        description: videoData.description,
        videoTitle: videoData.videoTitle,
      });

      const longCopyCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{ role: "user", content: longCopyPrompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      const longCopy = longCopyCompletion.choices[0].message.content?.trim();

      // Guardar copys
      await db.collection('completion_results_videos').doc(videoId).set({
        shortCopy: {
          platform: 'TikTok/Reels',
          content: shortCopy
        },
        longCopy: {
          platform: 'Descripción extendida',
          content: longCopy
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Actualizar estado del video
      await db.collection('videos').doc(videoId).set({
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`[onVideoCreated] ✅ Generación completa exitosa para ${videoId}`);

    } catch (err) {
      console.error(`[onVideoCreated] ❌ Error al generar contenido:`, err);

      await db.collection('videos').doc(videoId).update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  });
