'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFirestoreDate } from '@/utils/date';

interface Avatar {
  id: string;
  prompt: string;
  gender: string;
  style: string;
  avatarUrl: string;
  status: string;
  createdAt: any;
  source: string;
}

export default function AvatarsPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'avatars'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const avatarList: Avatar[] = [];
      snapshot.forEach((doc) => {
        avatarList.push({
          id: doc.id,
          ...doc.data(),
        } as Avatar);
      });
      setAvatars(avatarList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-6">Cargando avatares...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Avatares Creados</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {avatars.map((avatar) => (
          <Card key={avatar.id}>
            <CardHeader>
              <CardTitle>Avatar #{avatar.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <img 
                  src={avatar.avatarUrl} 
                  alt={`Avatar ${avatar.id}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="space-y-2">
                  <p><strong>Prompt:</strong> {avatar.prompt}</p>
                  <p><strong>Género:</strong> {avatar.gender}</p>
                  <p><strong>Estilo:</strong> {avatar.style}</p>
                  <p><strong>Estado:</strong> {avatar.status}</p>
                  <p><strong>Fuente:</strong> {avatar.source}</p>
                  <p><strong>Creado:</strong> {formatFirestoreDate(avatar.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 