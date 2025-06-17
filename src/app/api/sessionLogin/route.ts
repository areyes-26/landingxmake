import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Falta idToken' }, { status: 400 });
    }

    // Duración de la sesión (ejemplo: 5 días)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    // Crear cookie de sesión
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    console.error('Error en sessionLogin:', error);
    return NextResponse.json({ error: 'Error al crear la sesión' }, { status: 500 });
  }
} 