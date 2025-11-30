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

  // Ensure sidebar stays open on desktop for admin routes
  // This runs whenever pathname changes or component mounts
  useEffect(() => {
    if (!isMobile && pathname && !pathname.startsWith('/driver')) {
      // Force sidebar to stay open on desktop for admin routes
      // Set cookie to true immediately to override any false value
      if (typeof document !== 'undefined') {
        document.cookie = 'sidebar_state=true; path=/; max-age=604800'; // 7 days
      }
      // Force sidebar to open (this will also update the cookie)
      setOpen(true);
    }
  }, [pathname, isMobile, setOpen]);

  // Handle navigation - ensure desktop sidebar stays open
  const handleNavigation = () => {
    // Desktop sidebar: ensure it stays open (state managed by cookies)
    // The sidebar should remain open when navigating between pages
    if (!isMobile) {
      // Ensure desktop sidebar is open - don't let it close on navigation
      setOpen(true);
    }
    // Mobile sidebar: standard behavior (can close on navigation, user can reopen)
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
