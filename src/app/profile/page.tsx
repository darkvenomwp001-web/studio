'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function ProfileRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the loading is complete
    if (!loading) {
      if (user) {
        // If user is logged in, redirect to their dynamic profile page
        router.replace(`/profile/${user.id}`);
      } else {
        // If no user, redirect to sign-in page
        router.replace('/auth/signin');
      }
    }
  }, [user, loading, router]);

  // Show a loading indicator while we determine the redirect
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
