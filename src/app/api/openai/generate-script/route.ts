import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';
import type { ScriptResponse, ApiError } from '../../../../types/openai';

export async function POST(req: Request) {
  try {
    console.log('[generate-script] Iniciando generación de script...');
    
    const body = await req.json();
    console.log('[generate-script] Body recibido:', JSON.stringify(body, null, 2));
    
    const { videoData, generationId } = body as { videoData: any; generationId: string };

    if (!videoData || !generationId) {
      const error: ApiError = {
        error: 'Video data and generation ID are required',
        status: 400
      };
      console.error('[generate-script] Error:', error);
      return NextResponse.json(error, { status: 400 });
    }

    // Generar script
    const promptTemplate = await readPromptTemplate('/Prompts/generate-script.txt');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      duration: videoData.duration,
      tone: videoData.tone,
      topic: videoData.topic,
      description: videoData.description,
      videoTitle: videoData.videoTitle
    });

    console.log('[generate-script] Prompt generado:', prompt);

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

    const script = completion.choices[0].message.content;
    console.log('[generate-script] Script generado:', script);

    if (!script) {
      const error: ApiError = {
        error: 'Failed to generate script',
        status: 500
      };
      console.error('[generate-script] Error:', error);
      return NextResponse.json(error, { status: 500 });
    }

    // Guardar script en completion_results_videos
    const completionRef = doc(db, 'completion_results_videos', generationId);
    await setDoc(completionRef, {
      script,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Actualizar estado en videos
    const videoRef = doc(db, 'videos', generationId);
    await setDoc(videoRef, {
      status: 'completed',
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Generar copys sociales
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      // Generar short copy
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

      if (!shortCopyResponse.ok) {
        console.error('[generate-script] Error al generar short copy:', await shortCopyResponse.text());
      }

      // Generar long copy
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

      if (!longCopyResponse.ok) {
        console.error('[generate-script] Error al generar long copy:', await longCopyResponse.text());
      }
    } catch (error) {
      console.error('[generate-script] Error al generar copys:', error);
    }

    const response: ScriptResponse = {
      script
    };
    return NextResponse.json(response);

  } catch (error) {
    console.error('[generate-script] Error inesperado:', error);
    const apiError: ApiError = {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500
    };
    return NextResponse.json(apiError, { status: 500 });
  }
} 