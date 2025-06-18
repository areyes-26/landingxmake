import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // Obtener la cookie de sesión
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session cookie' }, { status: 401 });
    }

    // Verificar la sesión
    const decodedClaims = await auth.verifySessionCookie(sessionCookie);
    
    // Obtener los datos del usuario
    const user = await auth.getUser(decodedClaims.uid);

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }
    });
  } catch (error) {
    console.error('[api/me] Error al verificar sesión:', error);
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
