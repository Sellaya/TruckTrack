'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  BarChart3,
  Truck,
  FileText,
  Package,
  Users,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, tooltip: 'Dashboard' },
  { href: '/trips', label: 'Trips', icon: Truck, tooltip: 'Trips' },
  { href: '/units', label: 'Units', icon: Package, tooltip: 'Units' },
  { href: '/drivers', label: 'Drivers', icon: Users, tooltip: 'Drivers' },
  { href: '/reports', label: 'Reports', icon: FileText, tooltip: 'Reports' },
  { href: '/settings', label: 'Settings', icon: Settings, tooltip: 'Settings' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpen, open } = useSidebar();

  // Initialize sidebar state on mount for admin routes (only once, not on every pathname change)
  // This ensures the sidebar has a default open state but allows user to toggle it
  useEffect(() => {
    if (!isMobile && pathname && !pathname.startsWith('/driver')) {
      // Only set initial state if sidebar state hasn't been set by user interaction
      // Check if cookie exists - if not, set default to open
      if (typeof document !== 'undefined') {
        const cookieValue = document.cookie
          .split('; ')
          .find((row) => row.startsWith('sidebar_state='))
          ?.split('=')[1];
        
        // Only set default open if no cookie exists (first visit)
        if (cookieValue === undefined) {
          setOpen(true);
        }
        // If cookie exists, respect user's preference (don't force it)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, not on pathname changes

  // Handle navigation - don't force sidebar state, let user control it
  const handleNavigation = () => {
    // Mobile sidebar: can close on navigation (standard behavior)
    // Desktop sidebar: maintain current state (user controls via toggle button)
    // Don't force sidebar open/closed - respect user's preference
  };

  return (
    <>
      <SidebarHeader className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={handleNavigation}>
          <div className="bg-sidebar-primary p-2 rounded-lg">
            <Truck className="size-6 text-sidebar-primary-foreground" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-sidebar-foreground font-headline truncate">
              TruckTrack
            </h1>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="w-full justify-start"
                tooltip={item.tooltip}
              >
                <Link href={item.href} onClick={handleNavigation}>
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t mt-auto">
        <p className="text-xs text-sidebar-foreground/70 text-center">
          Product by{' '}
          <a
            href="https://instagram.com/sellayadigital"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
          >
            Sellaya
          </a>
        </p>
      </SidebarFooter>
    </>
  );
}
