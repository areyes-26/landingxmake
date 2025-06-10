import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';
import type { ShortCopyResponse, ApiError } from '../../../../types/openai';

export async function POST(req: Request) {
  try {
    console.log('[generate-short-copy] Iniciando generación de short copy...');
    
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

    // Obtener datos del video
    const videoRef = doc(db, 'videos', videoId);
    const videoDoc = await getDoc(videoRef);
    
    if (!videoDoc.exists()) {
      const error: ApiError = {
        error: 'Video document not found',
        status: 404
      };
      console.error('[generate-short-copy] Error:', error);
      return NextResponse.json(error, { status: 404 });
    }

    const videoData = videoDoc.data();

    // Generar short copy
    const promptTemplate = await readPromptTemplate('/Prompts/copy-corto.txt');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      script,
      tone: videoData.tone,
      topic: videoData.topic,
      description: videoData.description,
      videoTitle: videoData.videoTitle
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

    const shortCopy = completion.choices[0].message.content;
    console.log('[generate-short-copy] Short copy generado:', shortCopy);

    if (!shortCopy) {
      const error: ApiError = {
        error: 'Failed to generate short copy',
        status: 500
      };
      console.error('[generate-short-copy] Error:', error);
      return NextResponse.json(error, { status: 500 });
    }

    // Guardar short copy en completion_results_videos
    const completionRef = doc(db, 'completion_results_videos', videoId);
    await setDoc(completionRef, {
      shortCopy: {
        platform: 'TikTok/Reels',
        content: shortCopy
      },
      updatedAt: serverTimestamp()
    }, { merge: true });

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