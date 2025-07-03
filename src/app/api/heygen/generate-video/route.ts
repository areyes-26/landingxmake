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
      lookId,
      tone,
      duration,
      orientation,
      resolution,
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

    // Leer dimension del documento de Firestore
    const videoDoc = await db.collection('videos').doc(videoId).get();
    const videoData = videoDoc.data();
    const dimension = videoData?.dimension;

    console.log('Dimension from Firestore:', dimension);

    // Configurar offset y scale por defecto para videos verticales
    // Estos valores posicionan el avatar en la parte inferior del video
    const defaultOffset = { x: 0, y: 0.23 }; // Posición Y positiva mueve el avatar hacia abajo
    const defaultScale = 1.14; // Tamaño del avatar
    
    console.log('🎯 Configurando avatar con offset:', defaultOffset, 'y scale:', defaultScale);
    
    // Iniciar la generación del video con Heygen
    const result = await heygen.generateVideo({
      script,
      videoTitle,
      voiceId,
      avatarId: lookId || avatarId, // Si hay lookId, usarlo como avatarId
      lookId: undefined, // No enviar lookId separado
      tone,
      duration,
      dimension: dimension || { width: 720, height: 1280 }, // Fallback a vertical HD
      avatarOffset: defaultOffset,
      avatarScale: defaultScale
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
