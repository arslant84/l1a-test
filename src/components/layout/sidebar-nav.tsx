
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardCheck,
  Users,
  Settings,
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton } from '@/components/ui/sidebar';

const employeeNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests/new', label: 'New Request', icon: FilePlus2 },
];

const supervisorNavItems = [
  { href: '/dashboard', label: 'My Requests', icon: LayoutDashboard },
  { href: '/requests/new', label: 'New Request', icon: FilePlus2 },
  { href: '/requests/review', label: 'Review Requests', icon: ClipboardCheck },
  { href: '/employees', label: 'Employee Directory', icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SidebarMenu className="p-2">
        <SidebarMenuSkeleton showIcon />
        <SidebarMenuSkeleton showIcon />
        <SidebarMenuSkeleton showIcon />
      </SidebarMenu>
    );
  }

  const navItems = currentUser?.role === 'supervisor' ? supervisorNavItems : employeeNavItems;

  return (
    <SidebarMenu className="p-2">
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              tooltip={{children: item.label, side: "right", align: "center", className: "ml-2"}}
              className="justify-start"
            >
              <a>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
       {/* Example of an additional item always visible, e.g. settings or profile */}
      <SidebarMenuItem className="mt-auto pt-2 border-t border-sidebar-border">
         <Link href="/settings" passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip={{children: "Settings", side: "right", align: "center", className: "ml-2"}}
              className="justify-start"
            >
              <a>
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
