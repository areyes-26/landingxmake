import { Inter } from 'next/font/google';
import type { Metadata } from "next";
import "./globals.css"; // Ensures global styles are loaded

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Improves font loading performance
  variable: '--font-inter', // Exposes the font as a CSS variable
});

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
    <html lang="es" className={`${inter.variable}`} suppressHydrationWarning>
      {/* Applies base background, text color, and font from globals.css */}
      {/* font-sans class on body will now pick up --font-inter */}
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
