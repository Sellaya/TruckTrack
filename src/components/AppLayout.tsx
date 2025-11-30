'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide sidebar and header for driver routes and landing page
  // Check for /driver/ (with trailing slash) to match /driver/* routes, but NOT /drivers (plural)
  const isDriverRoute = pathname?.startsWith('/driver/');
  const isLandingPage = pathname === '/';
  const isAdminLoginPage = pathname === '/admin/login';
  
  if (isDriverRoute || isLandingPage || isAdminLoginPage) {
    return <>{children}</>;
  }
  
  return (
    <>
      <Sidebar collapsible="offcanvas">
        <AppSidebar />
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen overflow-x-hidden">
        <Header />
        <main className="flex-1 w-full max-w-full overflow-x-hidden p-4 sm:p-6">{children}</main>
        <Footer />
      </SidebarInset>
    </>
  );
}
