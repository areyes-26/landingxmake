import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getHeyGenClient } from '@/lib/heygen';
import { Timestamp } from 'firebase-admin/firestore';
import { HeyGenAPI } from '@/lib/heygen';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const taskId = searchParams.get('taskId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      );
    }

    console.log('Checking status for video:', videoId);

    // Obtener el documento actual para preservar datos existentes
    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();
    const currentData = videoDoc.data() || {};

    // NUEVO: Si el video es un draft, no procesar
    if (currentData.status === 'draft') {
      return NextResponse.json(
        { message: 'Draft video, no status check performed.' },
        { status: 200 }
      );
    }

    // Obtener el video_id de HeyGen del documento
    const heygenVideoId = currentData.heygenResults?.videoId;
    if (!heygenVideoId) {
      return NextResponse.json(
        { error: 'No se encontró el ID de video de HeyGen' },
        { status: 400 }
      );
    }

    console.log('Using HeyGen video_id:', heygenVideoId);

    const heygen = new HeyGenAPI();
    const status = await heygen.checkVideoStatus(heygenVideoId);
    console.log('HeyGen status response:', status);

    // Actualizar el estado en Firestore
    const updateData: any = {
      updatedAt: Timestamp.now(),
      heygenResults: {
        ...currentData.heygenResults,
        status: status.status,
        generatedAt: Timestamp.now(),
        videoId: heygenVideoId, // Mantener el video_id de HeyGen
      }
    };

    if (status.status === 'completed' && status.videoUrl) {
      updateData.heygenResults.videoUrl = status.videoUrl;
      if (status.thumbnailUrl) {
        updateData.thumbnailUrl = status.thumbnailUrl;
      }
      console.log('HeyGen video completed with URL:', status.videoUrl);
      
      // Verificar si ya se envió a Creatomate para evitar duplicados
      if (currentData.creatomateResults?.renderId) {
        console.log('Video already sent to Creatomate, skipping...');
        return NextResponse.json(status);
      }
      
      // Automáticamente enviar a Creatomate para edición
      try {
        console.log('Sending video to Creatomate for editing...');
        const creatomateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/creatomate/generate-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId }),
        });
        
        if (creatomateResponse.ok) {
          const creatomateData = await creatomateResponse.json();
          console.log('Video sent to Creatomate successfully:', creatomateData);
          // El estado se actualizará automáticamente a 'editing' por el endpoint de Creatomate
        } else {
          const errorText = await creatomateResponse.text();
          console.error('Failed to send video to Creatomate:', errorText);
          // Si falla Creatomate, marcar como error y enviar notificación
          updateData.status = 'error';
          updateData.error = `Error al enviar video a Creatomate: ${errorText}`;
          
          // Enviar notificación de error
          if (currentData.userId) {
            try {
              const { sendNotificationToUser } = await import('@/lib/notifications');
              await sendNotificationToUser(currentData.userId, {
                type: 'video_error',
                message: 'There was an error processing your video. Please try again.',
                videoId
              });
              console.log('Error notification sent for video:', videoId);
            } catch (notifError) {
              console.error('Error sending error notification:', notifError);
            }
          }
        }
      } catch (creatomateError) {
        console.error('Error sending to Creatomate:', creatomateError);
        // Si falla Creatomate, marcar como error y enviar notificación
        updateData.status = 'error';
        updateData.error = `Error al enviar video a Creatomate: ${creatomateError instanceof Error ? creatomateError.message : 'Unknown error'}`;
        
        // Enviar notificación de error
        if (currentData.userId) {
          try {
            const { sendNotificationToUser } = await import('@/lib/notifications');
            await sendNotificationToUser(currentData.userId, {
              type: 'video_error',
              message: 'There was an error processing your video. Please try again.',
              videoId
            });
            console.log('Error notification sent for video:', videoId);
          } catch (notifError) {
            console.error('Error sending error notification:', notifError);
          }
        }
      }
    } else if (status.status === 'error') {
      updateData.status = 'error';
      updateData.error = status.error || 'Error al generar el video';
      updateData.heygenResults.error = status.error;
      console.log('Video error:', status.error);
      
      // Enviar notificación de error
      if (currentData.userId) {
        try {
          const { sendNotificationToUser } = await import('@/lib/notifications');
          await sendNotificationToUser(currentData.userId, {
            type: 'video_error',
            message: 'There was an error generating your video. Please try again.',
            videoId
          });
          console.log('Error notification sent for video:', videoId);
        } catch (notifError) {
          console.error('Error sending error notification:', notifError);
        }
      }
    }

    await videoRef.update(updateData);
    console.log('Firestore updated successfully');

    return NextResponse.json(status);
  } catch (error) {
    console.error('[HeyGen Check Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error checking video status' },
      { status: 500 }
    );
  }
} 