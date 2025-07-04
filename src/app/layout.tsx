import { Inter } from 'next/font/google';
import type { Metadata } from "next";
import "./globals.css"; // Ensures global styles are loaded
import { NewNavigation } from '@/components/ui/NewNavigation';
import { Toaster } from "sonner";
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SessionSyncer } from '@/components/SessionSyncer';

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
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SessionSyncer />
          <NewNavigation />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
