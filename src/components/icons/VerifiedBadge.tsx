
'use client';

import { cn } from "@/lib/utils";

export default function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Verified account"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5", className)}
    >
      {/* The clean circular background using the primary theme color */}
      <circle cx="12" cy="12" r="10" fill="hsl(var(--primary))" />
      
      {/* The sharp, clean white checkmark */}
      <path
        d="M8 12.2L10.5 14.7L16 9.2"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
