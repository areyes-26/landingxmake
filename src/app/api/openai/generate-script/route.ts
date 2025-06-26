import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    console.log('[generate-script] 🚀 Iniciando generación de script...');
    
    // Debug: Log all headers
    console.log('[generate-script] 🔍 Headers recibidos:', Object.fromEntries(req.headers.entries()));
    
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    console.log('[generate-script] 🔍 isInternalCall:', isInternalCall);
    
    let authUser = null;

    if (!isInternalCall) {
      console.log('[generate-script] ⚠️ No es llamada interna, verificando autenticación...');
      const authHeader = req.headers.get('Authorization');
      console.log('[generate-script] 🔍 Authorization header:', authHeader);
      
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('[generate-script] ❌ No hay Authorization header válido');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      const idToken = authHeader.split('Bearer ')[1];
      try {
        authUser = await auth.verifyIdToken(idToken);
        console.log('[generate-script] ✅ Token verificado para usuario:', authUser.email);
      } catch (err) {
        console.log('[generate-script] ❌ Error verificando token:', err);
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
      }
    } else {
      console.log('[generate-script] ✅ Llamada interna detectada, saltando autenticación');
    }

    const body = await req.json();
    console.log('[generate-script] 📦 Body recibido:', JSON.stringify(body, null, 2));

    const { videoData, generationId } = body as { videoData: any; generationId: string };

    if (!videoData || !generationId) {
      return NextResponse.json({
        error: 'Video data and generation ID are required',
        status: 400
      }, { status: 400 });
    }

    // Leer datos completos del video desde Firestore para obtener los campos CTA
    console.log('[generate-script] 🔍 Leyendo datos completos del video desde Firestore...');
    const videoDoc = await db.collection('videos').doc(generationId).get();
    
    if (!videoDoc.exists) {
      console.error('[generate-script] ❌ No se encontró el documento del video en Firestore');
      return NextResponse.json({
        error: 'Video not found in Firestore',
        status: 404
      }, { status: 404 });
    }
    
    const completeVideoData = videoDoc.data();
    console.log('[generate-script] 📋 Datos completos del video:', completeVideoData);
    
    // Combinar datos del frontend con datos completos de Firestore
    const finalVideoData = {
      ...videoData,
      callToAction: completeVideoData?.callToAction,
      specificCallToAction: completeVideoData?.specificCallToAction
    };
    
    console.log('[generate-script] 📋 Datos finales para el prompt:', finalVideoData);

    const promptTemplate = await readPromptTemplate('generate-script');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      duration: finalVideoData.duration,
      tone: finalVideoData.tone,
      topic: finalVideoData.topic,
      description: finalVideoData.description,
      videoTitle: finalVideoData.videoTitle,
      cta: finalVideoData.callToAction,
      specificcta: finalVideoData.specificCallToAction
    });

    console.log('[generate-script] ✏️ Prompt generado:', prompt);

    let script: string | null = null;
    let openaiError: string | null = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });
      script = completion.choices[0].message.content?.trim() || null;
      console.log('[generate-script] ✅ Script generado:', script);
    } catch (err) {
      openaiError = err instanceof Error ? err.message : String(err);
      console.error('[generate-script] ❌ Error de OpenAI:', openaiError);
    }

    if (!script) {
      return NextResponse.json({
        error: 'Failed to generate script',
        details: openaiError,
        status: 500
      }, { status: 500 });
    }

    await db.collection('completion_results_videos').doc(generationId).set({
      script,
      updatedAt: new Date()
    }, { merge: true });

    await db.collection('videos').doc(generationId).set({
      status: 'completed',
      updatedAt: new Date()
    }, { merge: true });

    // Generar copys
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    let socialCopyErrors: string[] = [];

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      };

      const shortCopyResponse = await fetch(`${baseUrl}/api/openai/generate-short-copy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ videoId: generationId, script }),
      });

      if (!shortCopyResponse.ok) {
        const text = await shortCopyResponse.text();
        console.error('[generate-script] ❌ Error short copy:', text);
        socialCopyErrors.push('ShortCopy: ' + text);
      }

      const longCopyResponse = await fetch(`${baseUrl}/api/openai/generate-long-copy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ videoId: generationId, script }),
      });

      if (!longCopyResponse.ok) {
        const text = await longCopyResponse.text();
        console.error('[generate-script] ❌ Error long copy:', text);
        socialCopyErrors.push('LongCopy: ' + text);
      }

    } catch (err) {
      const e = err instanceof Error ? err.message : String(err);
      console.error('[generate-script] ❌ Error general generando copys:', e);
      socialCopyErrors.push(e);
    }

    return NextResponse.json({
      script,
      socialCopyErrors: socialCopyErrors.length > 0 ? socialCopyErrors : undefined
    });

  } catch (error) {
    console.error('[generate-script] 🔥 Error inesperado:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unexpected error',
      details: error instanceof Error ? error.stack : String(error),
      status: 500
    }, { status: 500 });
  }
}
