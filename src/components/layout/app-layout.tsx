
"use client";
import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { UserNav } from './user-nav';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen">
        <Sidebar className="border-r" collapsible="icon">
          <SidebarHeader className="p-4">
            <Logo textClassName="group-data-[collapsible=icon]:hidden transition-opacity duration-200" iconClassName="group-data-[collapsible=icon]:mx-auto" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-2">
            {/* Can add footer items here if needed */}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
            <div className="md:hidden"> {/* SidebarTrigger for mobile */}
               <SidebarTrigger asChild>
                 <Button variant="outline" size="icon" className="shrink-0">
                    <PanelLeft className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
               </SidebarTrigger>
            </div>
            <div className="flex-1 text-lg font-semibold md:text-2xl">
              {/* This could be a dynamic page title */}
            </div>
            <UserNav />
          </header>
          <main className="flex-1 overflow-y-auto pt-16 px-6 pb-6 md:px-8 md:pb-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
