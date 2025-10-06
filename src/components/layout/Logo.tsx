
'use client';

import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group overflow-hidden">
        <div className="relative">
            <BookOpenCheck className="h-8 w-8 text-primary transition-transform duration-500 ease-in-out transform -translate-x-12 group-hover:translate-x-0" />
            <span 
                className="absolute left-0 top-0 h-8 w-8 animate-logo-slide"
            />
        </div>
        <span className="text-2xl font-headline font-bold text-foreground animate-text-fade-in opacity-0">
            DARKREADS
        </span>
    </Link>
  );
}
