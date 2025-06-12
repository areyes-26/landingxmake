// src/app/api/heygen/image-to-avatar/route.ts

import { NextResponse } from 'next/server';
import { getHeyGenClient }  from '@/lib/heygen';
import { db }               from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  // 1) Asegurarnos que Secret Manager ya puso HEYGEN_API_KEY
  if (!process.env.HEYGEN_API_KEY) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing HEYGEN_API_KEY' },
      { status: 500 }
    );
  }

  try {
    // 2) Extraer la imagen
    const formData = await request.formData();
    const image = formData.get('image') as File;
    if (!image) {
      return NextResponse.json({ error: 'La imagen es requerida' }, { status: 400 });
    }

    // 3) Crear cliente y llamar API
    const heygen = getHeyGenClient();
    const result = await heygen.createAvatarFromImages({ images: [image] });

    // 4) Guardar en Firestore
    const docRef = await addDoc(collection(db, 'avatars'), {
      type:         'image',
      avatarUrl:    result.avatarUrl,
      allUrls:      result.allUrls,
      generationId: result.generationId,
      groupId:      result.groupId,
      groupName:    result.groupName,
      looks:        result.looks,
      createdAt:    new Date().toISOString(),
    });

    // 5) Devolver
    return NextResponse.json({
      success:      true,
      avatarUrl:    result.avatarUrl,
      allUrls:      result.allUrls,
      generationId: result.generationId,
      firestoreId:  docRef.id,
    });
  } catch (err: any) {
    console.error('Error en image-to-avatar:', err);
    return NextResponse.json(
      { error: err.message || 'Error al generar el avatar' },
      { status: 500 }
    );
  }
}
