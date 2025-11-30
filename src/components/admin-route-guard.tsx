'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminLoggedIn } from '@/lib/admin-auth';

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if admin is logged in
    if (!isAdminLoggedIn()) {
      router.push('/admin/login');
    }
  }, [router]);

  // During SSR and initial client render, return null to prevent hydration mismatch
  // After mount, check auth and render children if authorized
  if (!mounted) {
    return null;
  }

  // After mount, check auth again and render
  if (!isAdminLoggedIn()) {
    return null;
  }

  return <>{children}</>;
}


