'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/driver/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}








