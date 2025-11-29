'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  BarChart3,
  Truck,
  FileText,
  Package,
  Users,
  Settings,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: BarChart3, tooltip: 'Dashboard' },
  { href: '/trips', label: 'Trips', icon: Truck, tooltip: 'Trips' },
  { href: '/units', label: 'Units', icon: Package, tooltip: 'Units' },
  { href: '/drivers', label: 'Drivers', icon: Users, tooltip: 'Drivers' },
  { href: '/admin/drivers/view', label: 'View Driver Dashboards', icon: Eye, tooltip: 'View Driver Dashboards' },
  { href: '/reports', label: 'Reports', icon: FileText, tooltip: 'Reports' },
  { href: '/settings', label: 'Settings', icon: Settings, tooltip: 'Settings' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="p-4 border-b">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-sidebar-primary p-2 rounded-lg">
            <Truck className="size-6 text-sidebar-primary-foreground" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-sidebar-foreground font-headline truncate">
              TruckOps Tracker
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
                <Link href={item.href}>
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
