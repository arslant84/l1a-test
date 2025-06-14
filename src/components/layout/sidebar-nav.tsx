
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import type { Employee } from '@/lib/types';
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardCheck,
  Users,
  Settings,
  BarChartHorizontalBig,
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton } from '@/components/ui/sidebar';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Employee['role'][];
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['employee', 'supervisor', 'thr', 'ceo', 'cm'] },
  { href: '/requests/new', label: 'New Request', icon: FilePlus2, roles: ['employee', 'supervisor', 'thr', 'ceo', 'cm'] },
  { href: '/requests/review', label: 'Review Requests', icon: ClipboardCheck, roles: ['supervisor', 'thr', 'ceo'] },
  { href: '/employees', label: 'Employee Directory', icon: Users, roles: ['supervisor', 'thr', 'ceo'] },
  { href: '/analytics', label: 'Analytics', icon: BarChartHorizontalBig, roles: ['thr', 'ceo'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { currentUser, isLoading } = useAuth();

  if (isLoading || !currentUser) {
    return (
      <SidebarMenu className="p-2">
        <SidebarMenuSkeleton showIcon />
        <SidebarMenuSkeleton showIcon />
        <SidebarMenuSkeleton showIcon />
        <SidebarMenuSkeleton showIcon />
      </SidebarMenu>
    );
  }
  
  const userRole = currentUser.role;
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));
  
  const dashboardItem = navItems.find(item => item.href === '/dashboard');
  if (dashboardItem && (userRole === 'supervisor' || userRole === 'thr' || userRole === 'ceo')) {
    dashboardItem.label = 'My Requests';
  }


  return (
    <SidebarMenu className="p-2">
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link legacyBehavior passHref href={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              tooltip={{children: item.label, side: "right", align: "center", className: "ml-2"}}
              className="justify-start"
            >
              <span>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
      <SidebarMenuItem className="mt-auto pt-2 border-t border-sidebar-border">
         <Link legacyBehavior passHref href="/settings">
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip={{children: "Settings", side: "right", align: "center", className: "ml-2"}}
              className="justify-start"
            >
              <span>
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </span>
            </SidebarMenuButton>
          </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

