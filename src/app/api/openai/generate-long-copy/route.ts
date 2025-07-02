import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { openai, readPromptTemplate, replacePromptPlaceholders } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    console.log('[generate-long-copy] 🚀 Iniciando generación de long copy...');

    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    let authUser = null;

    if (!isInternalCall) {
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
    console.log('[generate-long-copy] 📦 Body recibido:', JSON.stringify(body, null, 2));

    const { videoId, script } = body as { videoId: string; script: string };

    if (!videoId || !script) {
      return NextResponse.json({
        error: 'Video ID and script are required',
        status: 400
      }, { status: 400 });
    }

    const videoDoc = await db.collection('videos').doc(videoId).get();
    if (!videoDoc.exists) {
      return NextResponse.json({
        error: 'Video document not found',
        status: 404
      }, { status: 404 });
    }

    const videoData = videoDoc.data();
    if (!videoData || !videoData.userId) {
      return NextResponse.json({
        error: 'User ID not found in video document',
        status: 500
      }, { status: 500 });
    }

    const promptTemplate = await readPromptTemplate('copy-largo');
    const prompt = replacePromptPlaceholders(promptTemplate, {
      script,
      tone: videoData?.tone,
      topic: videoData?.topic,
      description: videoData?.description,
      videoTitle: videoData?.videoTitle,
    });

    console.log('[generate-long-copy] ✏️ Prompt generado:', prompt);

    let longCopy: string | null = null;
    let openaiError: string | null = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      longCopy = completion.choices[0].message.content?.trim() || null;
      console.log('[generate-long-copy] ✅ Long copy generado');
    } catch (err) {
      openaiError = err instanceof Error ? err.message : String(err);
      console.error('[generate-long-copy] ❌ Error de OpenAI:', openaiError);
    }

    if (!longCopy) {
      return NextResponse.json({
        error: 'Failed to generate long copy',
        details: openaiError,
        status: 500
      }, { status: 500 });
    }

    await db.collection('completion_results_videos').doc(videoId).set({
      longCopy: {
        platform: 'Descripción extendida',
        content: longCopy
      },
      updatedAt: new Date(),
      userId: videoData.userId
    }, { merge: true });

    return NextResponse.json({
      longCopy: {
        platform: 'Descripción extendida',
        content: longCopy
      }
    });

  } catch (error) {
    console.error('[generate-long-copy] 🔥 Error inesperado:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unexpected error',
      details: error instanceof Error ? error.stack : String(error),
      status: 500
    }, { status: 500 });
  }
}
