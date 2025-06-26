import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

interface AvatarLook {
  look_id: string;
  look_name: string;
  preview_url: string;
  avatar_type: 'standard' | 'premium' | 'talking_photo';
  gender: string;
  premium: boolean;
}

interface AvatarGroup {
  base_name: string;
  base_type: 'standard' | 'premium' | 'talking_photo';
  gender: string;
  premium: boolean;
  looks: AvatarLook[];
}

function extractBaseName(name: string): string {
  // Usa guion como separador principal, si no hay, usa el primer espacio
  if (name.includes('-')) {
    return name.split('-')[0].trim();
  }
  return name.split(' ')[0].trim();
}

function getPlanLimits(plan: string) {
  switch (plan) {
    case 'pro':
      return { standard: { groups: Infinity, looks: Infinity }, talking_photo: { groups: Infinity, looks: Infinity }, premium: { groups: Infinity, looks: Infinity } };
    case 'premium':
      return { standard: { groups: 20, looks: Infinity }, talking_photo: { groups: 20, looks: Infinity }, premium: { groups: 5, looks: Infinity } };
    case 'basic':
    case 'free':
    default:
      return { standard: { groups: 5, looks: Infinity }, talking_photo: { groups: 5, looks: Infinity }, premium: { groups: 1, looks: Infinity } };
  }
}

export async function GET(request: NextRequest) {
  try {
    const plan = request.nextUrl.searchParams.get('plan') || 'basic';
    const limits = getPlanLimits(plan);

    // Get all avatars from HeyGen using the correct endpoint
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      method: 'GET',
      headers: {
        'x-api-key': process.env.HEYGEN_API_KEY!,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // Correctly access avatars and talking_photos from data
    const avatars = data.data?.avatars || [];
    const talkingPhotos = data.data?.talking_photos || [];

    // Agrupar todos los looks por baseName y tipo
    const grouped: Record<string, AvatarGroup> = {};

    // Avatares normales
    for (const avatar of avatars) {
      // No filtrar por is_public, incluir todos los avatares que devuelve la API
      const baseName = extractBaseName(avatar.avatar_name);
      const type: 'standard' | 'premium' = avatar.premium ? 'premium' : 'standard';
      const key = `${type}__${baseName.toLowerCase()}`;
      if (!grouped[key]) {
        grouped[key] = {
          base_name: baseName,
          base_type: type,
          gender: avatar.gender,
          premium: avatar.premium,
          looks: [],
        };
      }
      grouped[key].looks.push({
        look_id: avatar.avatar_id,
        look_name: avatar.avatar_name,
        preview_url: avatar.preview_image_url,
        avatar_type: type,
        gender: avatar.gender,
        premium: avatar.premium,
      });
    }

    // Talking photos
    for (const photo of talkingPhotos) {
      const baseName = extractBaseName(photo.talking_photo_name);
      const key = `talking_photo__${baseName.toLowerCase()}`;
      if (!grouped[key]) {
        grouped[key] = {
          base_name: baseName,
          base_type: 'talking_photo',
          gender: 'unknown',
          premium: false,
          looks: [],
        };
      }
      grouped[key].looks.push({
        look_id: photo.talking_photo_id,
        look_name: photo.talking_photo_name,
        preview_url: photo.preview_image_url,
        avatar_type: 'talking_photo',
        gender: 'unknown',
        premium: false,
      });
    }

    // Solo incluir grupos con más de un look
    let avatarGroups: AvatarGroup[];
    if (plan === 'pro') {
      avatarGroups = Object.values(grouped); // pro ve todos los grupos, incluso los de 1 look
    } else {
      avatarGroups = Object.values(grouped).filter(g => g.looks.length > 1);
    }

    // Ordenar los looks alfabéticamente dentro de cada grupo
    avatarGroups.forEach(g => g.looks.sort((a, b) => a.look_name.localeCompare(b.look_name)));

    // Filtrado según plan
    if (plan === 'pro') {
      // Sin límite, todos los grupos, todos los looks
      return NextResponse.json({
        avatar_groups: avatarGroups,
        stats: {
          total_groups: avatarGroups.length,
          total_looks: avatarGroups.reduce((acc, g) => acc + g.looks.length, 0),
          plan,
          limits,
        },
      });
    }

    // Para basic/premium: limitar cantidad de grupos por tipo
    const filteredGroups: AvatarGroup[] = [];
    (['standard', 'talking_photo', 'premium'] as const).forEach(type => {
      // Para basic/free, ocultar premium
      let groupsOfType = avatarGroups.filter(g => g.base_type === type);
      if (plan === 'basic' || plan === 'free' || !plan) {
        if (type === 'premium') {
          groupsOfType = [];
        }
      }
      // Limitar cantidad de grupos
      const limitedGroups = groupsOfType.slice(0, limits[type].groups);
      // Limitar cantidad de looks por grupo
      limitedGroups.forEach(g => filteredGroups.push({ ...g, looks: g.looks.slice(0, limits[type].looks) }));
    });

    return NextResponse.json({
      avatar_groups: filteredGroups,
      stats: {
        total_groups: filteredGroups.length,
        total_looks: filteredGroups.reduce((acc, g) => acc + g.looks.length, 0),
        plan,
        limits,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 