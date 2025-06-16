// app/page.tsx
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Landing XMake',
  description: 'Bienvenido a Landing XMake',
};

export default function Home() {
  redirect('/inicio');
}
