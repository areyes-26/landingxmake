import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // 🔁 usamos el SDK Admin
import { getHeyGenClient } from '@/lib/heygen';
import { Timestamp } from 'firebase-admin/firestore'; // 🔁 reemplaza serverTimestamp

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      videoId,
      videoTitle,
      voiceId,
      avatarId,
      tone,
      duration,
    } = body;

    if (!videoId || !videoTitle || !voiceId || !avatarId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Obtener el script de completion_results_videos
    const completionRef = db.collection('completion_results_videos').doc(videoId);
    const completionDoc = await completionRef.get();

    if (!completionDoc.exists) {
      return NextResponse.json(
        { error: 'No se encontró el script del video' },
        { status: 404 }
      );
    }

    const completionData = completionDoc.data();
    const script = completionData?.script;

    if (!script) {
      return NextResponse.json(
        { error: 'El script del video está vacío' },
        { status: 400 }
      );
    }

    const heygen = getHeyGenClient();

    // Iniciar la generación del video con Heygen
    const result = await heygen.generateVideo({
      script,
      videoTitle,
      voiceId,
      avatarId,
      tone,
      duration,
    });

    // Verificar que tenemos un video_id válido
    if (!result.taskId) {
      throw new Error('No se recibió un ID de video válido de HeyGen');
    }

    // Actualizar el estado en Firestore
    const updateData = {
      status: 'processing',
      heygenResults: {
        status: 'generating',
        taskId: result.taskId,
        videoId: result.taskId,
        generatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    };

    console.log('Actualizando Firestore con:', updateData);

    await db.collection('videos').doc(videoId).update(updateData);

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
