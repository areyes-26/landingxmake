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

    // Buscar conexión de TikTok para este usuario
    const tiktokQuery = await db.collection('tiktok_tokens')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (tiktokQuery.empty) {
      return NextResponse.json({ connected: false });
    }

    const tiktokData = tiktokQuery.docs[0].data();
    
    // Verificar si el token ha expirado (simplificado por ahora)
    const tokenAge = Date.now() - tiktokData.createdAt;
    const tokenExpiry = tiktokData.expiresIn * 1000; // Convertir a milisegundos
    const isExpired = tokenAge > (tokenExpiry - 5 * 60 * 1000); // 5 minutos de margen
    
    if (isExpired) {
      return NextResponse.json({ connected: false, reason: 'token_expired' });
    }
    
    return NextResponse.json({
      connected: true,
      openId: tiktokData.openId,
      displayName: tiktokData.displayName,
      avatarUrl: tiktokData.avatarUrl,
      scope: tiktokData.scope
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

    // Buscar la conexión temporal por state
    const tempDoc = await db.collection('tiktok_tokens').doc(state).get();
    
    if (!tempDoc.exists) {
      return NextResponse.json({ error: 'Invalid state or expired' }, { status: 400 });
    }

    const tempData = tempDoc.data();
    
    if (!tempData) {
      return NextResponse.json({ error: 'Invalid data in temporary document' }, { status: 400 });
    }
    
    // Actualizar con el userId
    await db.collection('tiktok_tokens').doc(tempData.openId).update({
      userId: userId
    });

    // Eliminar el documento temporal
    await db.collection('tiktok_tokens').doc(state).delete();

    return NextResponse.json({ 
      success: true, 
      message: 'TikTok account linked successfully' 
    });

  } catch (error) {
    console.error('Error linking TikTok account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 