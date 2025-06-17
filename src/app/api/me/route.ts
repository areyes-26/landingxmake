import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const sessionCookie = cookies().get('session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return NextResponse.json({ user: decodedClaims });
  } catch (error) {
    console.error('[api/me] Error al verificar sesión:', error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
