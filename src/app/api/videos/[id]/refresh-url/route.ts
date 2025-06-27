import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verificar el token con Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { id } = params;
    
    // Obtener el video de Firestore
    const videoRef = db.collection('videos').doc(id);
    const videoDoc = await videoRef.get();
    
    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const videoData = videoDoc.data();
    
    // Verificar que el usuario sea el propietario del video
    if (videoData?.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verificar si tenemos un video_id de HeyGen
    const heygenVideoId = videoData?.heygenResults?.videoId;
    if (!heygenVideoId) {
      return NextResponse.json(
        { error: 'No HeyGen video ID found' },
        { status: 400 }
      );
    }

    // Llamar a la API de HeyGen para obtener el estado actual del video
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    const heygenResponse = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${heygenVideoId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': heygenApiKey,
        },
      }
    );

    if (!heygenResponse.ok) {
      console.error('HeyGen API error:', await heygenResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch video status from HeyGen' },
        { status: 500 }
      );
    }

    const heygenData = await heygenResponse.json();
    
    if (heygenData.code !== 100) {
      return NextResponse.json(
        { error: `HeyGen API error: ${heygenData.message}` },
        { status: 500 }
      );
    }

    const videoStatus = heygenData.data;
    
    // Verificar si el video está completado
    if (videoStatus.status !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Video not ready',
          status: videoStatus.status 
        },
        { status: 400 }
      );
    }

    // Actualizar el video en Firestore con el nuevo URL
    const updatedVideoData = {
      ...videoData,
      heygenResults: {
        ...videoData.heygenResults,
        videoUrl: videoStatus.video_url,
        gifUrl: videoStatus.gif_url,
        thumbnailUrl: videoStatus.thumbnail_url,
        duration: videoStatus.duration,
        status: videoStatus.status,
        lastUrlRefresh: new Date().toISOString(),
      },
      videoUrl: videoStatus.video_url, // También actualizar el URL principal
    };

    await videoRef.update(updatedVideoData);

    return NextResponse.json({
      success: true,
      videoUrl: videoStatus.video_url,
      gifUrl: videoStatus.gif_url,
      thumbnailUrl: videoStatus.thumbnail_url,
      status: videoStatus.status,
      message: 'Video URL refreshed successfully'
    });

  } catch (error) {
    console.error('Error refreshing video URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 