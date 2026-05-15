import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number to a compact string (e.g., 1.0k, 1.9k) if it's 1000 or greater.
 * Otherwise, returns the exact number as a string.
 */
export function formatCompactNumber(number: number): string {
  if (number < 1000) return number.toString();
  return (number / 1000).toFixed(1) + 'k';
}
