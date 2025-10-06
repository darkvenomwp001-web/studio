
'use client';

import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group overflow-hidden">
        <div className="relative h-8 w-8 flex items-center justify-center">
            <BookOpenCheck className="h-8 w-8 text-primary transition-transform duration-500 ease-in-out transform group-hover:rotate-12" />
        </div>
        <span className="text-2xl font-headline font-bold text-foreground">
            D4RKV3NOM
        </span>
    </Link>
  );
}
