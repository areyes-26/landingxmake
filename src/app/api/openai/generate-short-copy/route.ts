import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';

interface ShortCopyResponse {
  shortCopy: {
    platform: string;
    content: string;
  };
}

interface ApiError {
  error: string;
  status: number;
}

export async function POST(req: Request) {
  try {
    console.log('[generate-short-copy] INICIO');
    const body = await req.json();
    console.log('[generate-short-copy] Body recibido:', JSON.stringify(body, null, 2));
    
    const { videoId, script } = body as { videoId: string; script: string };

    console.log('[generate-short-copy] videoId:', videoId);
    console.log('[generate-short-copy] script:', script);
    console.log('[generate-short-copy] script length:', script?.length);
    console.log('[generate-short-copy] script is empty:', !script || script.trim() === '');

    if (!videoId || !script) {
      const error: ApiError = {
        error: 'Video ID and script are required',
        status: 400
      };
      console.error('[generate-short-copy] Campos faltantes:', error);
      console.error('[generate-short-copy] videoId presente:', !!videoId);
      console.error('[generate-short-copy] script presente:', !!script);
      return NextResponse.json(error, { status: 400 });
    }

    if (script.trim() === '') {
      const error: ApiError = {
        error: 'Script cannot be empty',
        status: 400
      };
      console.error('[generate-short-copy] Script vacío:', error);
      return NextResponse.json(error, { status: 400 });
    }

    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      const error: ApiError = {
        error: 'Video document not found',
        status: 404
      };
      console.error('[generate-short-copy] Documento de video no encontrado:', error);
      return NextResponse.json(error, { status: 404 });
    }

    const videoData = videoDoc.data();
    console.log('[generate-short-copy] Video data encontrado:', !!videoData);

    // Leer y procesar el prompt desde archivo local
    const promptTemplate = await readPromptTemplate('copy-corto');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      script,
      tone: videoData?.tone,
      topic: videoData?.topic,
      description: videoData?.description,
      videoTitle: videoData?.videoTitle,
    });

    console.log('[generate-short-copy] Prompt generado:', prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const shortCopy = completion.choices[0].message.content?.trim();
    console.log('[generate-short-copy] Short copy generado:', shortCopy);

    if (!shortCopy) {
      const error: ApiError = {
        error: 'Failed to generate short copy',
        status: 500
      };
      console.error('[generate-short-copy] Short copy vacío:', error);
      return NextResponse.json(error, { status: 500 });
    }

    const completionRef = db.collection('completion_results_videos').doc(videoId);
    console.log('[generate-short-copy] Guardando en Firestore...');

    await completionRef.set({
      shortCopy: {
        platform: 'TikTok/Reels',
        content: shortCopy
      },
      updatedAt: new Date()
    }, { merge: true });

    console.log('[generate-short-copy] Guardado en Firestore OK');

    const response: ShortCopyResponse = {
      shortCopy: {
        platform: 'TikTok/Reels',
        content: shortCopy
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[generate-short-copy] Error inesperado:', error);
    const apiError: ApiError = {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}
