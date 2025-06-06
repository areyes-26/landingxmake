import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function InicioPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6">
            Bienvenido a Landing x Make
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Crea videos profesionales y atractivos de manera sencilla
          </p>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">¿Qué podemos hacer por ti?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-card rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Videos personalizados</h3>
                  <p className="text-muted-foreground">
                    Crea videos con tu propio estilo y personalidad
                  </p>
                </div>
                <div className="p-6 bg-card rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Animaciones profesionales</h3>
                  <p className="text-muted-foreground">
                    Elige entre diferentes estilos de animación
                  </p>
                </div>
                <div className="p-6 bg-card rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Fácil de usar</h3>
                  <p className="text-muted-foreground">
                    Una interfaz simple y amigable
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link href="/auth/signup" className="inline-flex">
                <Button size="lg" className="w-full md:w-auto">
                  Empezar ahora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-4 right-4 z-50">
        <Link
          href="/privacy"
          className="bg-muted/50 hover:bg-muted/70 border border-border text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
          aria-label="Ver Política de Privacidad"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
