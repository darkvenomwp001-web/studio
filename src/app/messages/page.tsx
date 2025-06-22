
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MessagesRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const startConversationWith = searchParams.get('startConversationWith');
    let redirectUrl = '/notifications?tab=messages';
    if (startConversationWith) {
      redirectUrl += `&startConversationWith=${startConversationWith}`;
    }
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Redirecting to your inbox...</p>
    </div>
  );
}
