'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstagramSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4">
      <h1 className="text-3xl font-bold mb-4">✅ Instagram connected successfully</h1>
      <p className="text-muted-foreground">
        You’ll be redirected shortly...
      </p>
    </div>
  );
}
