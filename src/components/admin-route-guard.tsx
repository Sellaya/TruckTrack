'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminLoggedIn } from '@/lib/admin-auth';

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Check if admin is logged in
    if (!isAdminLoggedIn()) {
      router.push('/admin/login');
    }
  }, [router]);

  // If not logged in, don't render children (will redirect)
  if (!isAdminLoggedIn()) {
    return null;
  }

  return <>{children}</>;
}
