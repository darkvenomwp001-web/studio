'use client';

import Link from 'next/link';
import AppLogo from './AppLogo';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <AppLogo className="h-8 w-8" />
      <span className="inline-block text-xl sm:text-2xl font-headline font-bold text-foreground">
        D4RKV3NOM
      </span>
    </Link>
  );
}
