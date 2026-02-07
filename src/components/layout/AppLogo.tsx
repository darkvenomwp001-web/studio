'use client';

import { cn } from "@/lib/utils";

export default function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="D4RKV3NOM Logo"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
    >
      <path
        d="M12 8C12 5.79086 13.7909 4 16 4H38V44H16C13.7909 44 12 42.2091 12 40V8Z"
        fill="hsl(var(--primary))"
      />
      <path
        d="M12 8H4V40C4 42.2091 5.79086 44 8 44H12V8Z"
        fill="hsl(var(--accent))"
      />
    </svg>
  );
}
