import { Briefcase } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function Logo({ className, iconClassName, textClassName }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-headline font-semibold", className)}>
      <Briefcase className={cn("h-6 w-6 text-primary", iconClassName)} />
      <span className={cn("text-xl text-foreground", textClassName)}>L1A Portal</span>
    </Link>
  );
}
