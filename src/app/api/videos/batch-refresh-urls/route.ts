import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
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

    const { videoIds } = await request.json();
    
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'No video IDs provided' },
        { status: 400 }
      );
    }

    // Limitar a máximo 10 videos por request para evitar sobrecarga
    if (videoIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 videos allowed per request' },
        { status: 400 }
      );
    }

    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    const results = [];
    const errors = [];

    // Procesar cada video
    for (const videoId of videoIds) {
      try {
        // Obtener el video de Firestore
        const videoRef = db.collection('videos').doc(videoId);
        const videoDoc = await videoRef.get();
        
        if (!videoDoc.exists) {
          errors.push({ videoId, error: 'Video not found' });
          continue;
        }

        const videoData = videoDoc.data();
        
        // Verificar que el usuario sea el propietario del video
        if (videoData?.userId !== userId) {
          errors.push({ videoId, error: 'Unauthorized' });
          continue;
        }

        // Verificar si tenemos un video_id de HeyGen
        const heygenVideoId = videoData?.heygenResults?.videoId;
        if (!heygenVideoId) {
          errors.push({ videoId, error: 'No HeyGen video ID found' });
          continue;
        }

        // Llamar a la API de HeyGen
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
          const errorText = await heygenResponse.text();
          errors.push({ videoId, error: `HeyGen API error: ${errorText}` });
          continue;
        }

        const heygenData = await heygenResponse.json();
        
        if (heygenData.code !== 100) {
          errors.push({ videoId, error: `HeyGen API error: ${heygenData.message}` });
          continue;
        }

        const videoStatus = heygenData.data;
        
        // Solo actualizar si el video está completado
        if (videoStatus.status === 'completed') {
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
            videoUrl: videoStatus.video_url,
          };

          await videoRef.update(updatedVideoData);

          results.push({
            videoId,
            success: true,
            videoUrl: videoStatus.video_url,
            status: videoStatus.status,
          });
        } else {
          results.push({
            videoId,
            success: false,
            status: videoStatus.status,
            message: 'Video not ready',
          });
        }

      } catch (error) {
        console.error(`Error processing video ${videoId}:`, error);
        errors.push({ videoId, error: 'Internal error' });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: videoIds.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length + results.filter(r => !r.success).length,
      }
    });

  } catch (error) {
    console.error('Error in batch refresh:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 