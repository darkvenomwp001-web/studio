'use client';

import Link from 'next/link';
import AppLogo from './AppLogo';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <AppLogo className="h-7 w-7" />
      <span className="text-2xl font-headline font-bold text-foreground">
        D4RKV3NOM
      </span>
    </Link>
  );
}
