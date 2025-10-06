'use client';

import { BookOpenCheck } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-fade-in">
      <div className="relative flex items-center justify-center overflow-hidden">
        <div className="relative h-24 w-24 flex items-center justify-center animate-logo-slide">
            <BookOpenCheck className="h-24 w-24 text-primary" />
        </div>
        <span className="ml-4 text-5xl font-headline font-bold text-foreground animate-text-fade-in opacity-0">
            D4RKV3NOM
        </span>
      </div>
    </div>
  );
}
