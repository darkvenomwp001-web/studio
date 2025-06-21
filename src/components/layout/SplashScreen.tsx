'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/auth/signin');
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-fade-in">
      <div className="animate-pulse">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
          className="h-24 w-24 text-primary"
        >
          <path
            fill="currentColor"
            d="M56.2,34.9c-6.2,0-11.2,5-11.2,11.2v107.8c0,6.2,5,11.2,11.2,11.2h28.1c6.2,0,11.2-5,11.2-11.2V46.1 c0-6.2-5-11.2-11.2-11.2H56.2z M115.7,34.9c-6.2,0-11.2,5-11.2,11.2v107.8c0,6.2,5,11.2,11.2,11.2h16.8c15.5,0,28.1-12.6,28.1-28.1 V63c0-15.5-12.6-28.1-28.1-28.1H115.7z"
          />
        </svg>
      </div>
    </div>
  );
}
