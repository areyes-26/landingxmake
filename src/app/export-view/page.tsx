// File: src/app/export-view/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ExportViewPage() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      // TODO: Implementar lógica de exportación aquí
      // Ejemplo: await fetch('/api/export', { method: 'POST', body: JSON.stringify({ /* parámetros */ }) });

      toast.success('Exportación iniciada con éxito.');
    } catch (error) {
      console.error('Error en exportación:', error);
      toast.error('Error al iniciar la exportación.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Exportar Contenido</h1>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Opciones de Exportación</h2>
            {/* Aquí irán los controles y configuraciones de exportación */}
            <p className="text-muted-foreground">
              Selecciona las opciones de exportación en la sección correspondiente.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}