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
      updateData.status = 'completed';
      updateData.heygenResults.videoUrl = status.videoUrl;
      updateData.videoUrl = status.videoUrl; // Actualizar también el campo principal
      if (status.thumbnailUrl) {
        updateData.thumbnailUrl = status.thumbnailUrl;
      }
      console.log('Video completed with URL:', status.videoUrl);
    } else if (status.status === 'error') {
      updateData.status = 'error';
      updateData.error = status.error || 'Error al generar el video';
      updateData.heygenResults.error = status.error;
      console.log('Video error:', status.error);
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