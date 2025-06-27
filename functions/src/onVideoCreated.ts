import * as functions from 'firebase-functions/v1';
import { admin, db } from './lib/firebase-admin';
import OpenAI from 'openai';
import type { DocumentSnapshot } from 'firebase-functions/v1/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { sendNotificationToUser } from './lib/notifications';

// Función para crear el cliente OpenAI solo cuando se necesite
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }
  return new OpenAI({ apiKey });
}

// Función para leer prompt template desde archivos
async function readPromptTemplate(fileName: string): Promise<string> {
  // Prompts detallados hardcodeados como fallback (y principal)
  const detailedPrompts: Record<string, string> = {
    'generate-script': `Quiero que generes un guion para un video que será narrado por un avatar virtual. El guion debe ser claro, natural y adaptado al siguiente tono: **{{tone}}**.

🧠 Condiciones:
- Duración estimada: {{duration}} segundos.
- Ritmo: calmado. Calculá las palabras necesarias (~70 para 30s, ~120 para 60s, ~180 para 90s).
- Estilo: directo, conversacional y sin rodeos.
- No se permiten emojis ni frases genéricas de apertura (ej: "Hola, hoy te contaré…").

🧩 Estructura obligatoria:
1. **Gancho (Hook)**: captá la atención en los primeros 3 segundos.
2. **Desarrollo**: explicá el contenido de forma atractiva, fluida y sin relleno.
3. **Cierre**: el usuario seleccionó este Call to action para redirigir la atención de los espectadores: "{{cta}}". Basate en ese CTA y personalizalo basándote en lo ingresado por el usuario en {{specificcta}}.

📌 Tema: {{topic}}
📌 Descripción base: {{description}}
📌 Título del video: {{videoTitle}}

🎯 Resultado: Generá solo el guion (sin explicaciones, sin encabezados).
Recuerda respetar la estructura propuesta para el video, para que tenga coherencia.`,
    
    'copy-corto': `[REDES_SOCIALES]

Generá un copy para promocionar este video en redes sociales:

**Copy corto (para TikTok, Reels, Shorts):**  
   - Máximo 140–200 caracteres.  
   - Estilo atrapante y directo.  
   - Incluir algunos emojis relevantes al tema (no más de 2 o 3).  
   - Incluir hasta 3 hashtags eficaces, sin repetir palabras clave evidentes.
   - Los hashtags deben ubicarse al final del copy.  
   - Ideal para atraer visualmente y generar interacción orgánica.

El copy generado debe mantener coherencia con el **tono de voz elegido por el usuario: {{tone}}**.

**Script del video:**
{{script}}

Otros datos útiles para el contenido:
- Tema del video: {{topic}}
- Descripción del video: {{description}}
- Título sugerido: {{videoTitle}}

Evitá repetir las palabras clave como hashtags. No incluyas ningún tipo de explicación o encabezado, solo el texto final directamente utilizable para redes.`,
    
    'copy-largo': `[REDES_SOCIALES]

Generá un copy para promocionar este video en redes sociales:

**Copy largo (para Facebook, LinkedIn, etc):**  
   - Entre 200 y 350 caracteres.  
   - Estructura más desarrollada, pero sin perder naturalidad.  
   - Tono un poco más serio o profesional, sin ser robótico.  
   - Usar emojis solo si aportan claridad visual (máximo 1 o 2).  
   - Máximo 5 hashtags que ayuden a posicionar el contenido en redes.
   - Los hashtags deben ubicarse al final del copy.

El copy generado debe mantener coherencia con el **tono de voz elegido por el usuario: {{tone}}**.

**Script del video:**
{{script}}

Otros datos útiles para el contenido:
- Tema del video: {{topic}}
- Descripción del video: {{description}}
- Título sugerido: {{videoTitle}}

Evitá repetir las palabras clave como hashtags. No incluyas ningún tipo de explicación o encabezado, solo el texto final directamente utilizable para redes.`
  };

  try {
    // Intentar leer desde functions/lib/public/Prompts/ (archivos copiados durante build)
    const promptPath = path.join(__dirname, 'public', 'Prompts', `${fileName}.txt`);
    console.log(`[onVideoCreated] 📄 Intentando leer prompt desde: ${promptPath}`);
    console.log(`[onVideoCreated] 📄 __dirname: ${__dirname}`);
    console.log(`[onVideoCreated] 📄 fileName: ${fileName}`);
    
    if (fs.existsSync(promptPath)) {
      console.log(`[onVideoCreated] ✅ Archivo encontrado en: ${promptPath}`);
      const content = fs.readFileSync(promptPath, 'utf8');
      if (content.trim()) {
        console.log(`[onVideoCreated] ✅ Prompt leído exitosamente desde archivo: ${fileName}`);
        console.log(`[onVideoCreated] 📝 Contenido del prompt (primeras 100 chars): ${content.substring(0, 100)}...`);
        return content;
      } else {
        console.log(`[onVideoCreated] ⚠️ Archivo encontrado pero vacío: ${promptPath}`);
      }
    } else {
      console.log(`[onVideoCreated] ❌ Archivo no encontrado en: ${promptPath}`);
    }
    
    console.log(`[onVideoCreated] 🔄 Usando prompt detallado hardcodeado para: ${fileName}`);
    return detailedPrompts[fileName] || `Prompt para ${fileName}`;
    
  } catch (error) {
    console.warn(`[onVideoCreated] ⚠️ Error al leer prompt ${fileName}:`, error);
    console.log(`[onVideoCreated] 🔄 Usando prompt detallado hardcodeado para: ${fileName}`);
    return detailedPrompts[fileName] || `Prompt para ${fileName}`;
  }
}

// Función para reemplazar placeholders (simplificada)
function replacePromptPlaceholders(template: string, replacements: Record<string, string | undefined>): string {
  let result = template;
  console.log(`[replacePromptPlaceholders] 🔍 Template original:`, template);
  console.log(`[replacePromptPlaceholders] 🔍 Replacements recibidos:`, replacements);
  
  for (const [key, value] of Object.entries(replacements)) {
    console.log(`[replacePromptPlaceholders] 🔄 Procesando placeholder: {{${key}}} = "${value}"`);
    if (value === undefined || value === null) {
      console.warn(`[replacePromptPlaceholders] ⚠️ Missing value for placeholder: ${key}`);
      continue;
    }
    const regex = new RegExp(`{{${key}}}`, 'g');
    const beforeReplace = result;
    result = result.replace(regex, value);
    console.log(`[replacePromptPlaceholders] ✅ Reemplazado {{${key}}} por "${value}"`);
    console.log(`[replacePromptPlaceholders] 📝 Resultado parcial:`, result.substring(0, 200) + '...');
  }
  
  console.log(`[replacePromptPlaceholders] 🎯 Resultado final:`, result);
  return result;
}

export const onVideoCreated = functions.firestore
  .document('videos/{videoId}')
  .onCreate(async (snapshot: DocumentSnapshot, context: any) => {
    const videoId = context.params.videoId;
    
    // Leer datos directamente de Firestore para evitar problemas de timing
    console.log(`[onVideoCreated] 🔍 Leyendo datos directamente de Firestore para ${videoId}`);
    const videoDoc = await db.collection('videos').doc(videoId).get();
    
    if (!videoDoc.exists) {
      console.error(`[onVideoCreated] ❌ No se encontró el documento ${videoId} en Firestore`);
      return;
    }
    
    const videoData = videoDoc.data();
    if (!videoData) {
      console.error(`[onVideoCreated] ❌ No hay datos para el video ${videoId}`);
      return;
    }

    console.log(`[onVideoCreated] ✅ Trigger activado para ${videoId}`);
    console.log(`[onVideoCreated] 📦 Video creado con datos:`, videoData);

    // Validar que los campos CTA existan
    if (!videoData.callToAction || !videoData.specificCallToAction) {
      console.warn(`[onVideoCreated] ⚠️ Campos CTA faltantes para ${videoId}:`);
      console.warn(`[onVideoCreated] ⚠️ callToAction: "${videoData.callToAction}"`);
      console.warn(`[onVideoCreated] ⚠️ specificCallToAction: "${videoData.specificCallToAction}"`);
      
      // Esperar un poco y reintentar una vez más
      console.log(`[onVideoCreated] ⏳ Esperando 2 segundos y reintentando...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const retryDoc = await db.collection('videos').doc(videoId).get();
      if (retryDoc.exists) {
        const retryData = retryDoc.data();
        if (retryData?.callToAction && retryData?.specificCallToAction) {
          console.log(`[onVideoCreated] ✅ Campos CTA encontrados en reintento`);
          videoData.callToAction = retryData.callToAction;
          videoData.specificCallToAction = retryData.specificCallToAction;
        } else {
          console.error(`[onVideoCreated] ❌ Campos CTA siguen faltando después del reintento`);
          return;
        }
      }
    }

    try {
      // Crear cliente OpenAI solo cuando se necesite
      const openai = getOpenAIClient();

      // Generar script
      console.log(`[onVideoCreated] 🚀 Generando script...`);
      
      // Log específico para CTA
      console.log(`[onVideoCreated] 📋 CTA values from videoData:`);
      console.log(`[onVideoCreated] 📋 callToAction: "${videoData.callToAction}"`);
      console.log(`[onVideoCreated] 📋 specificCallToAction: "${videoData.specificCallToAction}"`);
      
      const promptTemplate = await readPromptTemplate('generate-script');
      const prompt = replacePromptPlaceholders(promptTemplate, {
        duration: videoData.duration,
        tone: videoData.tone,
        topic: videoData.topic,
        description: videoData.description,
        videoTitle: videoData.videoTitle,
        cta: videoData.callToAction,
        specificcta: videoData.specificCallToAction
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
