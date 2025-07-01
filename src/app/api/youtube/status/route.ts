import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verificar el token con Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Buscar la conexión de YouTube en la colección centralizada
    const youtubeRef = db.collection('app_tokens').doc(userId).collection('youtube').doc('profile');
    const youtubeDoc = await youtubeRef.get();

    if (!youtubeDoc.exists) {
      return NextResponse.json({
        connected: false,
        message: 'No YouTube connection found'
      });
    }

    const youtubeData = youtubeDoc.data();
    
    // Verificar si el token ha expirado
    const tokenExpiry = youtubeData?.token_expires_at;
    const isExpired = tokenExpiry && Date.now() > tokenExpiry;
    
    if (isExpired) {
      return NextResponse.json({
        connected: false,
        message: 'YouTube token expired'
      });
    }
    
    return NextResponse.json({
      connected: true,
      user: {
        id: youtubeData?.id,
        name: youtubeData?.name,
        email: youtubeData?.email
      },
      picture: youtubeData?.picture,
      createdAt: youtubeData?.createdAt
    });

  } catch (error) {
    console.error('Error checking YouTube status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 