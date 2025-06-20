import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a relative link to a training request detail page.
 * In a real app, this might be an absolute URL.
 */
export function generateRequestLink(requestId: string): string {
  return `/requests/${requestId}`;
}
