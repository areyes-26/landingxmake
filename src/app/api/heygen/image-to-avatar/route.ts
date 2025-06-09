import { NextResponse } from 'next/server';
import { getHeyGenClient } from '@/lib/heygen';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'La imagen es requerida' },
        { status: 400 }
      );
    }

    const heygen = getHeyGenClient();
    const result = await heygen.createAvatarFromImages({
      images: [image],
    });

    // Guardar en Firestore más datos relevantes del proceso
    const docRef = await addDoc(collection(db, 'avatars'), {
      type: 'image',
      avatarUrl: result.avatarUrl,
      allUrls: result.allUrls,
      generationId: result.generationId,
      groupId: result.groupId,
      groupName: result.groupName,
      looks: result.looks,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      avatarUrl: result.avatarUrl,
      allUrls: result.allUrls,
      generationId: result.generationId,
      firestoreId: docRef.id,
    });
  } catch (error: any) {
    console.error('Error en image-to-avatar:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar el avatar' },
      { status: 500 }
    );
  }
} 