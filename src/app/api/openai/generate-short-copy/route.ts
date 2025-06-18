import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';
import { auth } from '@/lib/firebase-admin/auth'; // Asegúrate de tener esto configurado

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

    const internalCall = req.headers.get('x-internal-call') === 'true';
    let authUser = null;

    if (!internalCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      const idToken = authHeader.split('Bearer ')[1];
      try {
        authUser = await auth.verifyIdToken(idToken);
      } catch (err) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
      }
    }

    const body = await req.json();
    console.log('[generate-short-copy] Body recibido:', JSON.stringify(body, null, 2));

    const { videoId, script } = body as { videoId: string; script: string };

    if (!videoId || !script || script.trim() === '') {
      const error: ApiError = {
        error: !videoId || !script ? 'Video ID and script are required' : 'Script cannot be empty',
        status: 400
      };
      console.error('[generate-short-copy] Error de validación:', error);
      return NextResponse.json(error, { status: 400 });
    }

    const videoDoc = await db.collection('videos').doc(videoId).get();
    if (!videoDoc.exists) {
      const error: ApiError = {
        error: 'Video document not found',
        status: 404
      };
      return NextResponse.json(error, { status: 404 });
    }

    const videoData = videoDoc.data();

    const promptTemplate = await readPromptTemplate('copy-corto');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      script,
      tone: videoData?.tone,
      topic: videoData?.topic,
      description: videoData?.description,
      videoTitle: videoData?.videoTitle,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    const shortCopy = completion.choices[0].message.content?.trim();
    if (!shortCopy) {
      const error: ApiError = {
        error: 'Failed to generate short copy',
        status: 500
      };
      return NextResponse.json(error, { status: 500 });
    }

    await db.collection('completion_results_videos').doc(videoId).set({
      shortCopy: {
        platform: 'TikTok/Reels',
        content: shortCopy
      },
      updatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({
      shortCopy: {
        platform: 'TikTok/Reels',
        content: shortCopy
      }
    });

  } catch (error) {
    console.error('[generate-short-copy] Error inesperado:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500
    }, { status: 500 });
  }
}
