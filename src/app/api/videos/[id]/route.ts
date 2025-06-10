import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const videoRef = doc(db, 'videos', params.id);
    const videoDoc = await getDoc(videoRef);

    if (!videoDoc.exists()) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoData = videoDoc.data();

    // Obtener datos de completion_results_videos
    const completionRef = doc(db, 'completion_results_videos', params.id);
    const completionDoc = await getDoc(completionRef);
    const completionData = completionDoc.exists() ? completionDoc.data() : null;

    // Combinar los datos
    const response = {
      ...videoData,
      script: completionData?.script || null,
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

    // Validar que el documento existe
    const videoRef = doc(db, 'videos', videoId);
    const videoDoc = await getDoc(videoRef);

    if (!videoDoc.exists()) {
      return NextResponse.json(
        { error: 'Video no encontrado' },
        { status: 404 }
      );
    }

    // Separar los datos del video y los datos generados
    const { script, socialContent, ...videoData } = body;

    // Actualizar el documento principal en la colección videos
    await updateDoc(videoRef, {
      ...videoData,
      updatedAt: serverTimestamp()
    });

    // Actualizar o crear el documento en completion_results_videos
    const completionRef = doc(db, 'completion_results_videos', videoId);
    const completionDoc = await getDoc(completionRef);

    if (completionDoc.exists()) {
      // Actualizar solo los campos que se han modificado
      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if (script) updateData.script = script;
      if (socialContent) updateData.socialContent = socialContent;

      await updateDoc(completionRef, updateData);
    } else {
      // Crear nuevo documento si no existe
      await setDoc(completionRef, {
        videoId,
        script: script || '',
        socialContent: socialContent || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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