import { NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getHeyGenClient } from '@/lib/heygen';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      videoId,
      script,
      videoTitle,
      voiceId,
      avatarId,
      tone,
      duration,
      // ...otros campos relevantes
    } = body;

    if (!videoId || !script || !videoTitle || !voiceId || !avatarId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Llamada a la API de HeyGen (placeholder, debes adaptar según la doc de HeyGen)
    const heygen = getHeyGenClient();
    // Aquí deberías usar el método real de generación de video de HeyGen
    // Por ejemplo:
    // const result = await heygen.generateVideo({ script, voiceId, avatarId, ... });

    // Simulación de respuesta de HeyGen
    const result = {
      taskId: `heygen-task-${Date.now()}`,
      status: 'generating'
    };

    // Guardar el estado en Firestore
    const videoRef = doc(db, 'videos', videoId);
    await setDoc(
      videoRef,
      {
        status: 'generating',
        heygenResults: {
          status: 'generating',
          taskId: result.taskId,
          generatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Video enviado a HeyGen para generación',
      heygenTaskId: result.taskId
    });
  } catch (error) {
    console.error('[HeyGen Generate Video] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar el video a HeyGen', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}