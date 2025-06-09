'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

export default function AvatarTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTextSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const prompt = formData.get('prompt') as string;
    const gender = formData.get('gender') as string;
    const style = formData.get('style') as string;

    console.log('Enviando datos:', { prompt, gender, style });

    try {
      const response = await fetch('/api/heygen/text-to-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, gender, style }),
      });

      console.log('Respuesta del servidor:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al crear el avatar');
      }

      const data = await response.json();
      console.log('Datos recibidos:', data);
      setSuccess('Avatar creado exitosamente');
      // Redirigir a la página de administración después de 2 segundos
      setTimeout(() => {
        router.push('/admin/avatars');
      }, 2000);
    } catch (err) {
      console.error('Error completo:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const imageFile = formData.get('image') as File;
    const gender = formData.get('gender') as string;
    const style = formData.get('style') as string;

    if (!imageFile) {
      setError('Por favor selecciona una imagen');
      setLoading(false);
      return;
    }

    try {
      const imageFormData = new FormData();
      imageFormData.append('image', imageFile);
      imageFormData.append('gender', gender);
      imageFormData.append('style', style);

      const response = await fetch('/api/heygen/image-to-avatar', {
        method: 'POST',
        body: imageFormData,
      });

      if (!response.ok) {
        throw new Error('Error al crear el avatar');
      }

      const data = await response.json();
      setSuccess('Avatar creado exitosamente');
      // Redirigir a la página de administración después de 2 segundos
      setTimeout(() => {
        router.push('/admin/avatars');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Test de Creación de Avatares</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">Texto a Avatar</TabsTrigger>
          <TabsTrigger value="image">Imagen a Avatar</TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Crear Avatar desde Texto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTextSubmit} className="space-y-4">
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                    Descripción del Avatar
                  </label>
                  <Textarea
                    id="prompt"
                    name="prompt"
                    placeholder="Describe cómo quieres que sea tu avatar..."
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium mb-2">
                    Género
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="style" className="block text-sm font-medium mb-2">
                    Estilo
                  </label>
                  <select
                    id="style"
                    name="style"
                    required
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="realistic">Realista</option>
                    <option value="cartoon">Caricatura</option>
                    <option value="anime">Anime</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creando Avatar...' : 'Crear Avatar'}
                </button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle>Crear Avatar desde Imagen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleImageSubmit} className="space-y-4">
                <div>
                  <label htmlFor="image" className="block text-sm font-medium mb-2">
                    Imagen de Referencia
                  </label>
                  <input
                    type="file"
                    id="image"
                    name="image"
                    accept="image/*"
                    required
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium mb-2">
                    Género
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="style" className="block text-sm font-medium mb-2">
                    Estilo
                  </label>
                  <select
                    id="style"
                    name="style"
                    required
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="realistic">Realista</option>
                    <option value="cartoon">Caricatura</option>
                    <option value="anime">Anime</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creando Avatar...' : 'Crear Avatar'}
                </button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 