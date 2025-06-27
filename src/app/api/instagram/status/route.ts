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

    // Buscar la conexión de Instagram
    const instagramRef = db.collection('instagram_tokens').doc(userId);
    const instagramDoc = await instagramRef.get();

    if (!instagramDoc.exists) {
      return NextResponse.json({
        connected: false,
        message: 'No Instagram connection found'
      });
    }

    const instagramData = instagramDoc.data();
    
    return NextResponse.json({
      connected: true,
      user: {
        id: instagramData?.userId,
        name: instagramData?.userName,
        email: instagramData?.userEmail
      },
      instagramBusinessAccount: instagramData?.instagramBusinessAccount,
      pageId: instagramData?.pageId,
      scopes: instagramData?.scopes,
      createdAt: instagramData?.createdAt
    });

  } catch (error) {
    console.error('Error checking Instagram status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 