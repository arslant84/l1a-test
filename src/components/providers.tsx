"use client";
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';


export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}
