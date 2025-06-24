'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle } from 'lucide-react';

// Define the type for the Storyly DOM element
type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
};

export default function StorylyTray() {
  const { user } = useAuth();
  const storylyRef = useRef<StorylyWeb>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (storylyRef.current && typeof storylyRef.current.init === 'function') {
        try {
          storylyRef.current.init({
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc1fQ.Hn0jUM4FoEZ3DjFnYk7a82JNO7_M4G-yyVYFwmdOP1k",
          });
        } catch (error) {
          console.error("Storyly initialization failed inside timeout:", error);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center space-x-4 h-full">
      {user && (
        <Link href="/write/edit-details" className="flex-shrink-0">
          <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-dashed border-muted-foreground group-hover:border-primary transition-colors">
                <AvatarImage src={user.avatarUrl} alt="Your Story" data-ai-hint="profile person" />
                <AvatarFallback>{user.username?.substring(0,1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                 <PlusCircle className="h-5 w-5 text-primary" />
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Add Story</span>
          </div>
        </Link>
      )}
      <div className="flex-grow h-full overflow-hidden">
        <storyly-web ref={storylyRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
