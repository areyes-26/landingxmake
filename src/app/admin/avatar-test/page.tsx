'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, X, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface Step {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'complete';
}

export default function AvatarTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Estados para diferentes métodos de creación
  const [textPrompt, setTextPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedEthnicity, setSelectedEthnicity] = useState<'White' | 'Black' | 'Asian American' | 'East Asian' | 'South East Asian' | 'South Asian' | 'Middle Eastern' | 'Pacific' | 'Hispanic' | 'Unspecified'>('Unspecified');
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [allGeneratedAvatars, setAllGeneratedAvatars] = useState<string[]>([]);

  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'upload',
      title: 'Subir Imagen',
      description: 'Selecciona una imagen clara de tu rostro',
      status: 'current'
    },
    {
      id: 'training',
      title: 'Entrenamiento',
      description: 'El modelo aprende las características de tu rostro',
      status: 'pending'
    },
    {
      id: 'generation',
      title: 'Generación',
      description: 'Creación de tus avatares personalizados',
      status: 'pending'
    }
  ]);

  const updateStepStatus = (stepIndex: number, status: 'pending' | 'current' | 'complete') => {
    setSteps(prev => prev.map((step, index) => ({
      ...step,
      status: index === stepIndex ? status : 
              index < stepIndex ? 'complete' : 
              index === stepIndex + 1 ? 'current' : 'pending'
    })));
  };

  const handleTextToAvatar = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/heygen/text-to-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textPrompt,
          gender: selectedGender,
          style: selectedStyle,
          ethnicity: selectedEthnicity,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear el avatar');
      }

      const data = await response.json();
      setAvatarUrl(data.avatarUrl);
      setSuccess('Avatar creado exitosamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageToAvatar = async () => {
    if (!selectedImage) {
      setError('Por favor selecciona una imagen');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentStep(0);
    updateStepStatus(0, 'current');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      // Paso 1: Subir imagen
      setGenerationProgress('Subiendo imagen...');
      const response = await fetch('/api/heygen/image-to-avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el avatar');
      }

      const data = await response.json();
      
      // Actualizar estado del stepper
      updateStepStatus(0, 'complete');
      setCurrentStep(1);
      updateStepStatus(1, 'current');
      setGenerationProgress('Entrenando el modelo...');

      // Esperar a que termine el entrenamiento
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulación de entrenamiento
      updateStepStatus(1, 'complete');
      setCurrentStep(2);
      updateStepStatus(2, 'current');
      setGenerationProgress('Generando avatares...');

      // Esperar a que termine la generación
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulación de generación
      updateStepStatus(2, 'complete');
      
      setGenerationProgress('Avatar generado exitosamente');
      setGeneratedAvatar(data.avatarUrl);
      setAllGeneratedAvatars(data.allUrls);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Error al generar el avatar');
    } finally {
      setIsLoading(false);
      setGenerationProgress('');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Prueba de Generación de Avatares</h1>
      
      <Tabs defaultValue="text" className="space-y-4">
        <TabsList>
          <TabsTrigger value="text">Texto a Avatar</TabsTrigger>
          <TabsTrigger value="image">Imagen a Avatar</TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Crear Avatar desde Texto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Descripción del Avatar</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe el avatar que deseas crear..."
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  className="border border-border focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Género</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant={selectedGender === 'male' ? 'default' : 'outline'}
                      onClick={() => setSelectedGender('male')}
                      className="flex-1"
                    >
                      Masculino
                    </Button>
                    <Button
                      variant={selectedGender === 'female' ? 'default' : 'outline'}
                      onClick={() => setSelectedGender('female')}
                      className="flex-1"
                    >
                      Femenino
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estilo</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant={selectedStyle === 'realistic' ? 'default' : 'outline'}
                      onClick={() => setSelectedStyle('realistic')}
                      className="flex-1"
                    >
                      Realista
                    </Button>
                    <Button
                      variant={selectedStyle === 'cartoon' ? 'default' : 'outline'}
                      onClick={() => setSelectedStyle('cartoon')}
                      className="flex-1"
                    >
                      Caricatura
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ethnicity">Etnia</Label>
                  <select
                    id="ethnicity"
                    value={selectedEthnicity}
                    onChange={(e) => setSelectedEthnicity(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="Unspecified">No especificar</option>
                    <option value="White">Blanca</option>
                    <option value="Black">Negra</option>
                    <option value="Asian American">Asiático Americano</option>
                    <option value="East Asian">Asiático Oriental</option>
                    <option value="South East Asian">Asiático del Sudeste</option>
                    <option value="South Asian">Asiático del Sur</option>
                    <option value="Middle Eastern">Medio Oriente</option>
                    <option value="Pacific">Pacífico</option>
                    <option value="Hispanic">Hispana</option>
                  </select>
                </div>
              </div>

              <Button 
                onClick={handleTextToAvatar}
                disabled={isLoading || !textPrompt}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando Avatar...
                  </>
                ) : (
                  'Crear Avatar'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="image">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Generar Avatar desde Imagen</CardTitle>
              <CardDescription>
                Crea un avatar personalizado a partir de tu foto siguiendo estos pasos:
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Sube una imagen clara de tu rostro</li>
                  <li>El sistema entrenará un modelo con tus características faciales</li>
                  <li>Se generarán múltiples versiones de tu avatar</li>
                </ol>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stepper */}
              <div className="relative w-full mt-8 mb-12">
                <div className="flex justify-between items-start relative z-10">
                  {steps.map((step, idx) => (
                    <div key={step.id} className="flex flex-col items-center flex-1">
                      {/* Círculo */}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2
                        ${step.status === 'complete' ? 'border-primary bg-primary text-primary-foreground' :
                          step.status === 'current' ? 'border-primary' : 'border-border'}
                        transition-colors duration-300 bg-background z-10`}>
                        {step.status === 'complete' ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <span className="text-base font-medium">{idx + 1}</span>
                        )}
                      </div>
                      {/* Texto y borde debajo del círculo */}
                      <div className={`
                        mt-3 text-center px-4 py-2 rounded-lg
                        ${step.status === 'complete' ? 'bg-primary/10 border border-primary' :
                          step.status === 'current' ? 'border border-primary' : 'border border-border'}
                        transition-colors duration-300
                      `}>
                        <p className="text-base font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contenido del paso actual */}
              <div className="space-y-4">
                {currentStep === 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="image">Imagen de Referencia</Label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-background hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {selectedImage ? (
                            <div className="relative w-24 h-24">
                              <Image
                                src={URL.createObjectURL(selectedImage)}
                                alt="Preview"
                                fill
                                className="object-cover rounded-lg"
                              />
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedImage(null);
                                }}
                                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click para subir</span> o arrastra y suelta
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG o JPEG (MAX. 5MB)
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('La imagen no debe superar los 5MB');
                                return;
                              }
                              setSelectedImage(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium">Entrenando el modelo</p>
                    <p className="text-sm text-muted-foreground">
                      Esto puede tomar unos minutos. El sistema está aprendiendo las características de tu rostro.
                    </p>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium">Generando avatares</p>
                    <p className="text-sm text-muted-foreground">
                      Creando diferentes versiones de tu avatar personalizado.
                    </p>
                  </div>
                )}

                {generationProgress && (
                  <div className="text-sm text-muted-foreground text-center">
                    {generationProgress}
                  </div>
                )}

                {currentStep === 0 && (
                  <Button 
                    onClick={handleImageToAvatar}
                    disabled={isLoading || !selectedImage}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      'Comenzar Proceso'
                    )}
                  </Button>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {generatedAvatar && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Avatares Generados</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {allGeneratedAvatars.map((url, index) => (
                        <div key={index} className="relative aspect-square">
                          <Image
                            src={url}
                            alt={`Avatar ${index + 1}`}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 