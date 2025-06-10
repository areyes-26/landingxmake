import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';
import type { LongCopyResponse, ApiError } from '../../../../types/openai';

export async function POST(req: Request) {
  try {
    console.log('[generate-long-copy] Iniciando generación de long copy...');
    
    const body = await req.json();
    console.log('[generate-long-copy] Body recibido:', JSON.stringify(body, null, 2));
    
    const { videoId, script } = body as { videoId: string; script: string };

    if (!videoId || !script) {
      const error: ApiError = {
        error: 'Video ID and script are required',
        status: 400
      };
      console.error('[generate-long-copy] Error:', error);
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
      console.error('[generate-long-copy] Error:', error);
      return NextResponse.json(error, { status: 404 });
    }

    const videoData = videoDoc.data();

    // Generar long copy
    const promptTemplate = await readPromptTemplate('/Prompts/copy-largo.txt');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      script,
      tone: videoData.tone,
      topic: videoData.topic,
      description: videoData.description,
      videoTitle: videoData.videoTitle
    });

    console.log('[generate-long-copy] Prompt generado:', prompt);

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

    const longCopy = completion.choices[0].message.content;
    console.log('[generate-long-copy] Long copy generado:', longCopy);

    if (!longCopy) {
      const error: ApiError = {
        error: 'Failed to generate long copy',
        status: 500
      };
      console.error('[generate-long-copy] Error:', error);
      return NextResponse.json(error, { status: 500 });
    }

    // Guardar long copy en completion_results_videos
    const completionRef = doc(db, 'completion_results_videos', videoId);
    await setDoc(completionRef, {
      longCopy: {
        platform: 'Facebook/LinkedIn',
        content: longCopy
      },
      updatedAt: serverTimestamp()
    }, { merge: true });

    const response: LongCopyResponse = {
      longCopy: {
        platform: 'Facebook/LinkedIn',
        content: longCopy
      }
    };
    return NextResponse.json(response);

  } catch (error) {
    console.error('[generate-long-copy] Error inesperado:', error);
    const apiError: ApiError = {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500
    };
    return NextResponse.json(apiError, { status: 500 });
  }
} 