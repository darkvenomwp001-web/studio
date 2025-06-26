
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpenText, Home, Edit3, Brain, Mailbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const NavLink = ({ href, children, icon }: { href: string; children: React.ReactNode; icon?: React.ReactNode }) => (
  <Link href={href} passHref>
    <Button variant="ghost" className="flex items-center gap-2 text-sm hover:bg-accent/50 hover:text-accent-foreground">
      {icon}
      {children}
    </Button>
  </Link>
);

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth(); 
  
  useEffect(() => setMounted(true), []);
  
  if (!mounted) { 
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
           <Link href="/" className="flex items-center gap-2">
             <BookOpenText className="h-8 w-8 text-primary" />
             <span className="text-2xl font-headline font-bold text-foreground">LitVerse</span>
           </Link>
           <div className="flex items-center gap-2">
             <div className="h-10 w-10 p-2 animate-pulse"><div className="h-7 w-7 bg-muted rounded-full" /></div>
           </div>
        </div>
      </header>
    );
  }

  const displayName = user?.displayName || user?.username;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-foreground">LitVerse</span>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/"><Home className="h-5 w-5" /> Home</NavLink>
            <NavLink href="/stories"><BookOpenText className="h-5 w-5" /> Stories</NavLink>
            <NavLink href="/write"><Edit3 className="h-5 w-5" /> Write</NavLink>
            <NavLink href="/letters"><Mailbox className="h-5 w-5" /> Mailbox</NavLink>
            <NavLink href="/ai-assistant"><Brain className="h-5 w-5" /> AI Assistant</NavLink>
          </div>
          
          {loading ? (
            <div className="h-10 w-10 flex items-center justify-center p-2">
                <div className="h-7 w-7 bg-muted rounded-full animate-pulse" />
            </div>
          ) : user ? (
            <Link href="/profile" passHref>
              <Button variant="ghost" size="icon" aria-label="View Profile">
                {user.avatarUrl ? (
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.avatarUrl} alt={displayName || 'User'} data-ai-hint="profile person"/>
                    <AvatarFallback>{displayName ? displayName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                ) : ( 
                  <Avatar className="h-7 w-7">
                     <AvatarFallback>{displayName ? displayName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                )}
              </Button>
            </Link>
          ) : (
            <Link href="/auth/signin" passHref>
              <Button>
                Sign In
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
