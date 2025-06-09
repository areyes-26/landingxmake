'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface AvatarCreatorProps {
  onAvatarCreated?: (avatarId: string) => void;
}

interface FormData {
  name: string;
  prompt: string;
}

export function AvatarCreator({ onAvatarCreated }: AvatarCreatorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    prompt: '',
  });

  const handleTextSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/create-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el avatar');
      }

      setSuccess('Avatar creado exitosamente');
      if (onAvatarCreated && data.data?.avatar_id) {
        onAvatarCreated(data.data.avatar_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implementar la creación de avatar con imagen
    setError('Función en desarrollo');
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">Crear con Texto</TabsTrigger>
          <TabsTrigger value="image">Crear con Imagen</TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Avatar</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ingresa un nombre para tu avatar"
                required
              />
            </div>
            <div>
              <Label htmlFor="prompt">Descripción</Label>
              <Textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={handleInputChange}
                placeholder="Describe cómo quieres que se vea tu avatar..."
                required
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear Avatar'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="image">
          <form onSubmit={handleImageSubmit} className="space-y-4">
            <div>
              <Label htmlFor="image-name">Nombre del Avatar</Label>
              <Input
                id="image-name"
                name="image-name"
                placeholder="Ingresa un nombre para tu avatar"
                required
              />
            </div>
            <div>
              <Label htmlFor="avatar-image">Imagen del Avatar</Label>
              <Input
                id="avatar-image"
                name="avatar-image"
                type="file"
                accept="image/*"
                required
              />
            </div>
            <Button type="submit" disabled={true}>
              Función en Desarrollo
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
    </div>
  );
} 