'use client';

import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group overflow-hidden">
        <span className="text-2xl font-headline font-bold text-foreground">
            D4RKV3NOM
        </span>
    </Link>
  );
}
