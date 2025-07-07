import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendNotificationToUser } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Creatomate][webhook] Webhook recibido:', body);

    // Verificar que el webhook sea de Creatomate
    const render_id = body.render_id || body.id;
    const { status, url, error, metadata, modifications, output_format, render_scale, width, height, frame_rate, duration, file_size } = body;

    if (!render_id) {
      console.warn('[Creatomate][webhook] Faltante render_id en webhook:', body);
      return NextResponse.json(
        { error: 'Missing render_id in webhook' },
        { status: 400 }
      );
    }

    let videoId: string;
    let currentData: any;

    // Usar metadata si está disponible (más eficiente)
    if (metadata) {
      console.log(`[Creatomate][webhook] Buscando video por metadata: ${metadata}`);
      const videoDoc = await db.collection('videos').doc(metadata).get();
      
      if (!videoDoc.exists) {
        console.warn(`[Creatomate][webhook] No se encontró video para metadata: ${metadata}`);
        return NextResponse.json(
          { error: 'Video not found for this metadata' },
          { status: 404 }
        );
      }
      
      videoId = metadata;
      currentData = videoDoc.data();
    } else {
      // Fallback: buscar por render_id (menos eficiente)
      console.log(`[Creatomate][webhook] Buscando video por render_id: ${render_id}`);
      const videosRef = db.collection('videos');
      const query = videosRef.where('creatomateResults.renderId', '==', render_id);
      const querySnapshot = await query.get();

      if (querySnapshot.empty) {
        console.warn(`[Creatomate][webhook] No se encontró video para render_id: ${render_id}`);
        return NextResponse.json(
          { error: 'Video not found for this render_id' },
          { status: 404 }
        );
      }

      const videoDoc = querySnapshot.docs[0];
      videoId = videoDoc.id;
      currentData = videoDoc.data();
    }

    console.log(`[Creatomate][webhook] Actualizando video ${videoId} con status: ${status}, render_id: ${render_id}`);

    // Actualizar el estado en Firestore usando Admin SDK
    const updateData: any = {
      updatedAt: Timestamp.now(),
      creatomateResults: {
        ...currentData.creatomateResults,
        status: status,
        generatedAt: Timestamp.now(),
        renderId: render_id,
      }
    };

    // Guardar información adicional del render si está disponible
    if (output_format) updateData.creatomateResults.outputFormat = output_format;
    if (render_scale) updateData.creatomateResults.renderScale = render_scale;
    if (width) updateData.creatomateResults.width = width;
    if (height) updateData.creatomateResults.height = height;
    if (frame_rate) updateData.creatomateResults.frameRate = frame_rate;
    if (duration) updateData.creatomateResults.duration = duration;
    if (file_size) updateData.creatomateResults.fileSize = file_size;
    if (modifications) updateData.creatomateResults.modifications = modifications;

    // Si el status es 'completed' o 'succeeded', marcar el video como completado
    if ((status === 'completed' || status === 'succeeded') && url) {
      updateData.status = 'completed';
      updateData.creatomateResults.videoUrl = url;
      updateData.videoUrl = url;
      console.log(`[Creatomate][webhook] Video ${videoId} COMPLETADO. URL: ${url}`);
      
      // Enviar notificación de video listo
      if (currentData.userId) {
        try {
          await sendNotificationToUser(currentData.userId, {
            type: 'video_ready',
            message: 'Your video is ready! Click to view it in your dashboard.',
            videoId,
            url: `/export-view?id=${videoId}`
          });
          console.log(`[Creatomate][webhook] Notificación de video listo enviada para video ${videoId}`);
        } catch (notifError) {
          console.error(`[Creatomate][webhook] Error enviando notificación de video listo para video ${videoId}:`, notifError);
        }
      }
    } else if (status === 'failed') {
      updateData.status = 'error';
      updateData.error = error || 'Error al editar el video con Creatomate';
      updateData.creatomateResults.error = error;
      console.warn(`[Creatomate][webhook] Video ${videoId} FALLÓ. Error: ${error}`);
      
      // Enviar notificación de error
      if (currentData.userId) {
        try {
          await sendNotificationToUser(currentData.userId, {
            type: 'video_error',
            message: 'There was an error editing your video. Please try again.',
            videoId
          });
          console.log(`[Creatomate][webhook] Notificación de error enviada para video ${videoId}`);
        } catch (notifError) {
          console.error(`[Creatomate][webhook] Error enviando notificación de error para video ${videoId}:`, notifError);
        }
      }
    }

    await db.collection('videos').doc(videoId).update(updateData);
    console.log(`[Creatomate][webhook] Firestore actualizado para video ${videoId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Creatomate][webhook] Error general:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 