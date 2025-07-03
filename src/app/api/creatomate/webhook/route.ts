import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendNotificationToUser } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creatomate webhook received:', body);

    // Verificar que el webhook sea de Creatomate
    const { render_id, status, url, error, metadata } = body;

    if (!render_id) {
      return NextResponse.json(
        { error: 'Missing render_id in webhook' },
        { status: 400 }
      );
    }

    let videoId: string;
    let currentData: any;

    // Usar metadata si está disponible (más eficiente)
    if (metadata) {
      console.log(`Using metadata to find video: ${metadata}`);
      const videoDoc = await db.collection('videos').doc(metadata).get();
      
      if (!videoDoc.exists) {
        console.log(`No video found for metadata: ${metadata}`);
        return NextResponse.json(
          { error: 'Video not found for this metadata' },
          { status: 404 }
        );
      }
      
      videoId = metadata;
      currentData = videoDoc.data();
    } else {
      // Fallback: buscar por render_id (menos eficiente)
      console.log(`Metadata not available, searching by render_id: ${render_id}`);
      const videosRef = db.collection('videos');
      const query = videosRef.where('creatomateResults.renderId', '==', render_id);
      const querySnapshot = await query.get();

      if (querySnapshot.empty) {
        console.log(`No video found for Creatomate render_id: ${render_id}`);
        return NextResponse.json(
          { error: 'Video not found for this render_id' },
          { status: 404 }
        );
      }

      const videoDoc = querySnapshot.docs[0];
      videoId = videoDoc.id;
      currentData = videoDoc.data();
    }

    console.log(`Updating video ${videoId} with Creatomate status: ${status}`);

    // Actualizar el estado en Firestore usando Admin SDK
    const updateData: any = {
      updatedAt: Timestamp.now(),
      creatomateResults: {
        ...currentData.creatomateResults,
        status: status,
        generatedAt: Timestamp.now(),
        renderId: render_id, // Guardar el render_id para referencia
      }
    };

    if (status === 'completed' && url) {
      updateData.status = 'completed';
      updateData.creatomateResults.videoUrl = url;
      updateData.videoUrl = url; // Actualizar también el campo principal
      console.log(`Creatomate video ${videoId} completed with URL: ${url}`);
      
      // Enviar notificación de video listo
      if (currentData.userId) {
        try {
          await sendNotificationToUser(currentData.userId, {
            type: 'video_ready',
            message: 'Your video is ready! Click to view it in your dashboard.',
            videoId
          });
          console.log(`[Creatomate Webhook] ✅ Video ready notification sent for video ${videoId}`);
        } catch (notifError) {
          console.error(`[Creatomate Webhook] ❌ Error sending video ready notification for video ${videoId}:`, notifError);
        }
      }
    } else if (status === 'failed') {
      updateData.status = 'error';
      updateData.error = error || 'Error al editar el video con Creatomate';
      updateData.creatomateResults.error = error;
      console.log(`Creatomate video ${videoId} failed: ${error}`);
      
      // Enviar notificación de error
      if (currentData.userId) {
        try {
          await sendNotificationToUser(currentData.userId, {
            type: 'video_error',
            message: 'There was an error editing your video. Please try again.',
            videoId
          });
          console.log(`[Creatomate Webhook] ❌ Error notification sent for video ${videoId}`);
        } catch (notifError) {
          console.error(`[Creatomate Webhook] ❌ Error sending error notification for video ${videoId}:`, notifError);
        }
      }
    }

    // Usar Admin SDK para actualizar - esto evita problemas de permisos
    await db.collection('videos').doc(videoId).update(updateData);
    console.log(`Firestore updated successfully for video ${videoId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Creatomate Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 