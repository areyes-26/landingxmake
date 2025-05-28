import type { Metadata } from "next";
import "./globals.css"; // Ensures global styles are loaded

export const metadata: Metadata = {
  title: "Plataforma de Video",
  description: "Envía tu contenido de video.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* Applies base background, text color, and font from globals.css */}
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
