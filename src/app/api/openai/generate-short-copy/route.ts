import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // ✅ SDK Admin
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

    if (!videoId || !script) {
      const error: ApiError = {
        error: 'Video ID and script are required',
        status: 400
      };
      console.error('[generate-short-copy] Error:', error);
      return NextResponse.json(error, { status: 400 });
    }

    // 🔁 SDK Admin: Referencia y obtención del documento
    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      const error: ApiError = {
        error: 'Video document not found',
        status: 404
      };
      console.error('[generate-short-copy] Error:', error);
      return NextResponse.json(error, { status: 404 });
    }

    const videoData = videoDoc.data();

    // Leer y procesar prompt
    const promptTemplate = await readPromptTemplate('/Prompts/copy-corto.txt');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      script,
      tone: videoData?.tone,
      topic: videoData?.topic,
      description: videoData?.description,
      videoTitle: videoData?.videoTitle
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
      console.error('[generate-short-copy] Error:', error);
      return NextResponse.json(error, { status: 500 });
    }

    // 🔁 Guardar en Firestore Admin
    const completionRef = db.collection('completion_results_videos').doc(videoId);
    console.log('[generate-short-copy] Guardando en Firestore...');

    await completionRef.set({
      shortCopy: {
        platform: 'TikTok/Reels',
        content: shortCopy
      },
      updatedAt: new Date() // ✅ Con firebase-admin usamos `new Date()` en lugar de `serverTimestamp()`
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
