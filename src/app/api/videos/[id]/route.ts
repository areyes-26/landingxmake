import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const videoRef = db.collection('videos').doc(params.id);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoData = videoDoc.data();

    const completionRef = db.collection('completion_results_videos').doc(params.id);
    const completionDoc = await completionRef.get();
    const completionData = completionDoc.exists ? completionDoc.data() : null;

    const response = {
      ...videoData,
      script: completionData?.script || null,
      shortCopy: completionData?.shortCopy || null,
      longCopy: completionData?.longCopy || null,
      socialContent: completionData?.socialContent || null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const videoId = params.id;

    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: 'Video no encontrado' },
        { status: 404 }
      );
    }

    const { script, socialContent, ...videoData } = body;

    // Actualizar documento principal
    await videoRef.update({
      ...videoData,
      updatedAt: Timestamp.now()
    });

    const completionRef = db.collection('completion_results_videos').doc(videoId);
    const completionDoc = await completionRef.get();

    if (completionDoc.exists) {
      const updateData: any = {
        updatedAt: Timestamp.now()
      };
      if (script) updateData.script = script;
      if (socialContent) updateData.socialContent = socialContent;

      await completionRef.update(updateData);
    } else {
      await completionRef.set({
        videoId,
        script: script || '',
        socialContent: socialContent || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Video y contenido generado actualizados correctamente'
    });
  } catch (error) {
    console.error('Error al actualizar el video:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el video' },
      { status: 500 }
    );
  }
}
