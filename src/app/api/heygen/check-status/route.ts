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

    if (!videoId || !taskId) {
      return NextResponse.json(
        { error: 'Missing videoId or taskId parameter' },
        { status: 400 }
      );
    }

    console.log('Checking status for video:', videoId, 'task:', taskId);

    const heygen = new HeyGenAPI();
    const status = await heygen.checkVideoStatus(taskId);

    // Actualizar el estado en Firestore
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (status.status === 'completed') {
      updateData.status = 'completed';
      updateData.heygenResults = {
        status: 'completed',
        videoUrl: status.videoUrl,
        generatedAt: Timestamp.now(),
      };
    } else if (status.status === 'error') {
      updateData.status = 'error';
      updateData.error = status.error || 'Error al generar el video';
      updateData.heygenResults = {
        status: 'error',
        error: status.error,
        generatedAt: Timestamp.now(),
      };
    } else {
      updateData.heygenResults = {
        status: status.status,
        generatedAt: Timestamp.now(),
      };
    }

    await db.collection('videos').doc(videoId).update(updateData);

    return NextResponse.json(status);
  } catch (error) {
    console.error('[HeyGen Check Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error checking video status' },
      { status: 500 }
    );
  }
} 