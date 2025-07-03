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
    
    // Verificar que el video de HeyGen esté completado
    if (!videoData.heygenResults?.videoUrl || videoData.heygenResults?.status !== 'completed') {
      return NextResponse.json(
        { error: 'El video de HeyGen no está listo para editar' },
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

    // Obtener la duración del video de HeyGen si está disponible
    const videoDuration = videoData.heygenResults?.duration ? 
      parseFloat(videoData.heygenResults.duration) : undefined;
    
    console.log(`[Creatomate] Video duration from HeyGen: ${videoDuration}s`);
    
    // Crear el render en Creatomate
    const result = await creatomate.createVideoFromHeyGen(
      videoData.heygenResults.videoUrl,
      script,
      videoData.videoTitle,
      webhookUrl,
      videoDuration,
      videoId
    );

    // Actualizar el estado en Firestore
    const updateData = {
      status: 'editing', // Nuevo estado para indicar que está siendo editado
      creatomateResults: {
        status: 'rendering',
        renderId: result.id, // Usar solo result.id
        generatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    };

    console.log('Creatomate result:', result);
    console.log('Actualizando Firestore con datos de Creatomate:', updateData);

    await videoRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Video enviado a Creatomate para edición',
      creatomateRenderId: result.id,
    });
  } catch (error) {
    console.error('[Creatomate Generate Video] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al enviar el video a Creatomate',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 