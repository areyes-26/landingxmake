import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getCreatomateClient } from '@/lib/creatomate';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Obtener el video de Firestore
    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: 'Video no encontrado' },
        { status: 404 }
      );
    }

    const videoData = videoDoc.data();
    
    if (!videoData) {
      return NextResponse.json(
        { error: 'Datos del video no encontrados' },
        { status: 404 }
      );
    }
    
    // Verificar que el video esté completado (tanto HeyGen como Creatomate)
    if (!videoData.heygenResults?.videoUrl || videoData.heygenResults?.status !== 'completed') {
      return NextResponse.json(
        { error: 'El video de HeyGen no está listo para re-editar' },
        { status: 400 }
      );
    }

    // Obtener el script
    const completionRef = db.collection('completion_results_videos').doc(videoId);
    const completionDoc = await completionRef.get();
    const completionData = completionDoc.exists ? completionDoc.data() : {};
    const script = completionData?.script || '';

    if (!script) {
      return NextResponse.json(
        { error: 'No se encontró el script del video' },
        { status: 400 }
      );
    }

    const creatomate = getCreatomateClient();

    // Configurar webhook URL para notificaciones
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/creatomate/webhook`;

    // Crear el render en Creatomate
    const result = await creatomate.createVideoFromHeyGen(
      videoData.heygenResults.videoUrl,
      script,
      videoData.videoTitle || 'Video',
      webhookUrl,
      undefined, // videoDuration
      videoId // Pasar el videoId como metadata
    );

    // Actualizar el estado en Firestore
    const updateData = {
      status: 'editing',
      creatomateResults: {
        status: 'rendering',
        renderId: result.id,
        generatedAt: Timestamp.now(),
        // Mantener el video anterior como backup
        previousVideoUrl: videoData.creatomateResults?.videoUrl,
      },
      updatedAt: Timestamp.now(),
    };

    console.log('Re-editando video con Creatomate:', updateData);

    await videoRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Video enviado a Creatomate para re-edición',
      creatomateRenderId: result.id,
    });
  } catch (error) {
    console.error('[Creatomate Re-edit] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al re-editar el video con Creatomate',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 