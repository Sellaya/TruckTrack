'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDriverSession } from '@/lib/driver-auth';

export function DriverRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const session = getDriverSession();
    if (!session) {
      router.push('/driver/login');
    }
  }, [router]);

  return <>{children}</>;
}












