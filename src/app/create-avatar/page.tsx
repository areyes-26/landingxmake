'use client';

import { AvatarCreator } from '@/components/avatar-creator';

export default function CreateAvatarPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Crear Avatar</h1>
      <AvatarCreator />
    </div>
  );
} 