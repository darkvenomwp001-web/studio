'use client';

import { cn } from "@/lib/utils";

export default function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="D4RKV3NOM Logo"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      fill="none"
    >
        <path
            d="M14 4H30C34.4183 4 38 7.58172 38 12V36C38 40.4183 34.4183 44 30 44H14V4Z"
            fill="hsl(var(--primary))"
        />
        <path
            d="M14 4H10C7.79086 4 6 5.79086 6 8V40C6 42.2091 7.79086 44 10 44H14V4Z"
            fill="hsl(var(--accent))"
        />
    </svg>
  );
}
