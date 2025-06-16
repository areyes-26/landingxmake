import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // ✅ SDK Admin
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    console.log('[generate-script] Iniciando generación de script...');
    
    const body = await req.json();
    console.log('[generate-script] Body recibido:', JSON.stringify(body, null, 2));
    
    const { videoData, generationId } = body as { videoData: any; generationId: string };

    if (!videoData || !generationId) {
      return NextResponse.json({
        error: 'Video data and generation ID are required',
        status: 400
      }, { status: 400 });
    }

    // Generar script
    const promptTemplate = await readPromptTemplate('generate-script');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      duration: videoData.duration,
      tone: videoData.tone,
      topic: videoData.topic,
      description: videoData.description,
      videoTitle: videoData.videoTitle
    });

    console.log('[generate-script] Prompt generado:', prompt);

    let script = null;
    let openaiError = null;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      script = completion.choices[0].message.content?.trim();
      console.log('[generate-script] Script generado:', script);
    } catch (err) {
      openaiError = err instanceof Error ? err.message : String(err);
      console.error('[generate-script] Error de OpenAI:', openaiError);
    }

    if (!script) {
      return NextResponse.json({
        error: 'Failed to generate script',
        details: openaiError,
        status: 500
      }, { status: 500 });
    }

    // Guardar script en completion_results_videos
    const completionRef = db.collection('completion_results_videos').doc(generationId);
    await completionRef.set({
      script,
      updatedAt: new Date()
    }, { merge: true });

    // Actualizar estado en videos
    const videoRef = db.collection('videos').doc(generationId);
    await videoRef.set({
      status: 'completed',
      updatedAt: new Date()
    }, { merge: true });

    // Generar copys sociales
    let socialCopyErrors: string[] = [];
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      console.log('[generate-script] Intentando generar short copy en:', `${baseUrl}/api/openai/generate-short-copy`);
      const shortCopyResponse = await fetch(`${baseUrl}/api/openai/generate-short-copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: generationId,
          script,
        }),
      });
      console.log('[generate-script] Respuesta short copy status:', shortCopyResponse.status);
      if (!shortCopyResponse.ok) {
        const text = await shortCopyResponse.text();
        socialCopyErrors.push('ShortCopy: ' + text);
        console.error('[generate-script] Error al generar short copy:', text);
      }

      console.log('[generate-script] Intentando generar long copy en:', `${baseUrl}/api/openai/generate-long-copy`);
      const longCopyResponse = await fetch(`${baseUrl}/api/openai/generate-long-copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: generationId,
          script,
        }),
      });
      console.log('[generate-script] Respuesta long copy status:', longCopyResponse.status);
      if (!longCopyResponse.ok) {
        const text = await longCopyResponse.text();
        socialCopyErrors.push('LongCopy: ' + text);
        console.error('[generate-script] Error al generar long copy:', text);
      }
    } catch (error) {
      socialCopyErrors.push(error instanceof Error ? error.message : String(error));
      console.error('[generate-script] Error al generar copys:', error);
    }

    return NextResponse.json({
      script,
      socialCopyErrors: socialCopyErrors.length > 0 ? socialCopyErrors : undefined
    });

  } catch (error) {
    console.error('[generate-script] Error inesperado:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: error instanceof Error ? error.stack : String(error),
      status: 500
    }, { status: 500 });
  }
}
