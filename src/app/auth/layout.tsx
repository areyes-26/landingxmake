import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Landing x Make',
  description: 'Login or create an account for Landing x Make',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[AuthLayout] Render');
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {children}
    </div>
  );
}
