'use client';

import AppLogo from './AppLogo';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background animate-splash-fade-out">
      <div className="animate-splash-logo-pop">
        <AppLogo className="h-20 w-20" />
      </div>
      <span className="mt-4 text-3xl font-headline font-bold text-foreground animate-splash-text-fade-in">
        D4RKV3NOM
      </span>
    </div>
  );
}
