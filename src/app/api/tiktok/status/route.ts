import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Buscar conexión de TikTok en la colección centralizada
    const tiktokRef = db.collection('app_tokens').doc(userId).collection('tiktok').doc('profile');
    const tiktokDoc = await tiktokRef.get();

    if (!tiktokDoc.exists) {
      return NextResponse.json({ connected: false });
    }

    const tiktokData = tiktokDoc.data();
    
    if (!tiktokData) {
      return NextResponse.json({ connected: false });
    }
    
    // Verificar si el token ha expirado (simplificado por ahora)
    const tokenAge = Date.now() - tiktokData.createdAt;
    const tokenExpiry = tiktokData.token_expires_at || (tiktokData.createdAt + 3600 * 1000); // Convertir a milisegundos
    const isExpired = tokenAge > (tokenExpiry - 5 * 60 * 1000); // 5 minutos de margen
    
    if (isExpired) {
      return NextResponse.json({ connected: false, reason: 'token_expired' });
    }
    
    return NextResponse.json({
      connected: true,
      id: tiktokData.id,
      displayName: tiktokData.displayName,
      avatarUrl: tiktokData.avatarUrl
    });

  } catch (error) {
    console.error('Error checking TikTok status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { state } = await request.json();

    if (!state) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 });
    }

    // Buscar la conexión temporal por state en la colección centralizada
    const tempDocRef = db.collection('app_tokens').doc(state).collection('tiktok').doc('connection');
    const tempDoc = await tempDocRef.get();
    
    if (!tempDoc.exists) {
      return NextResponse.json({ error: 'Invalid state or expired' }, { status: 400 });
    }

    const tempData = tempDoc.data();
    
    if (!tempData) {
      return NextResponse.json({ error: 'Invalid data in temporary document' }, { status: 400 });
    }
    
    // Actualizar con el userId
    await tempDocRef.update({
      userId: userId
    });

    // También actualizar el perfil con el userId
    const profileDocRef = db.collection('app_tokens').doc(state).collection('tiktok').doc('profile');
    const profileDoc = await profileDocRef.get();
    if (profileDoc.exists) {
      await profileDocRef.update({
        userId: userId
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'TikTok account linked successfully' 
    });

  } catch (error) {
    console.error('Error linking TikTok account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 