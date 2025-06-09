import { NextResponse } from 'next/server';
import { getHeyGenClient } from '@/lib/heygen';
import { dbInstance } from '@/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  console.log('Iniciando creación de avatar...');
  
  try {
    const body = await request.json();
    console.log('Datos recibidos:', body);

    const { prompt, gender, style, ethnicity } = body;

    if (!prompt) {
      console.log('Error: Prompt faltante');
      return NextResponse.json(
        { error: 'El prompt es requerido' },
        { status: 400 }
      );
    }

    console.log('Creando avatar con HeyGen...');
    // Crear el avatar usando HeyGen
    const heygenClient = getHeyGenClient();
    const avatarResult = await heygenClient.createAvatarFromText({
      prompt,
      gender,
      style,
      ethnicity,
    });
    console.log('Respuesta de HeyGen:', avatarResult);

    console.log('Guardando en Firestore...');
    // Guardar en Firestore
    const avatarDoc = await addDoc(collection(dbInstance, 'avatars'), {
      prompt,
      gender,
      style,
      ethnicity,
      avatarUrl: avatarResult.avatarUrl,
      status: avatarResult.status,
      source: 'text',
      createdAt: serverTimestamp(),
    });
    console.log('Documento creado en Firestore:', avatarDoc.id);

    return NextResponse.json({
      success: true,
      avatarId: avatarDoc.id,
      avatarUrl: avatarResult.avatarUrl,
      status: avatarResult.status,
    });
  } catch (error) {
    console.error('Error completo:', error);
    return NextResponse.json(
      { error: 'Error al crear el avatar' },
      { status: 500 }
    );
  }
} 