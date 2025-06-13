// src/app/api/heygen/image-to-avatar/route.ts

import { NextResponse } from 'next/server';
import { getHeyGenClient } from '@/lib/heygen';
import { db } from '@/lib/firebase-admin'; // ✅ SDK Admin
import { Timestamp } from 'firebase-admin/firestore'; // ✅ para timestamps

export async function POST(request: Request) {
  if (!process.env.HEYGEN_API_KEY) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing HEYGEN_API_KEY' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    if (!image) {
      return NextResponse.json({ error: 'La imagen es requerida' }, { status: 400 });
    }

    const heygen = getHeyGenClient();
    const result = await heygen.createAvatarFromImages({ images: [image] });

    const docRef = await db.collection('avatars').add({
      type: 'image',
      avatarUrl: result.avatarUrl,
      allUrls: result.allUrls,
      generationId: result.generationId,
      groupId: result.groupId,
      groupName: result.groupName,
      looks: result.looks,
      createdAt: Timestamp.now(), // 🔁 usamos timestamp del admin
    });

    return NextResponse.json({
      success: true,
      avatarUrl: result.avatarUrl,
      allUrls: result.allUrls,
      generationId: result.generationId,
      firestoreId: docRef.id,
    });
  } catch (err: any) {
    console.error('Error en image-to-avatar:', err);
    return NextResponse.json(
      { error: err.message || 'Error al generar el avatar' },
      { status: 500 }
    );
  }
}
