import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // 🔁 usamos el SDK Admin
import { getHeyGenClient } from '@/lib/heygen';
import { Timestamp } from 'firebase-admin/firestore'; // 🔁 reemplaza serverTimestamp

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      videoId,
      script,
      videoTitle,
      voiceId,
      avatarId,
      tone,
      duration,
    } = body;

    if (!videoId || !script || !videoTitle || !voiceId || !avatarId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const heygen = getHeyGenClient();

    // Simulación de respuesta (deberías reemplazarlo por la integración real)
    const result = {
      taskId: `heygen-task-${Date.now()}`,
      status: 'generating',
    };

    // ✅ Guardar usando SDK Admin
    await db.collection('videos').doc(videoId).set(
      {
        status: 'generating',
        heygenResults: {
          status: 'generating',
          taskId: result.taskId,
          generatedAt: Timestamp.now(),
        },
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Video enviado a HeyGen para generación',
      heygenTaskId: result.taskId,
    });
  } catch (error) {
    console.error('[HeyGen Generate Video] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al enviar el video a HeyGen',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
