'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Edit3, Library, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Logo from './Logo';

const OWNER_HANDLES = ['arnv'];

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
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
           <div className="flex items-center gap-2">
             <div className="h-8 w-32 bg-muted rounded-md animate-pulse" />
           </div>
           <div className="flex items-center gap-2">
             <div className="h-10 w-10 p-2 animate-pulse"><div className="h-7 w-7 bg-muted rounded-full" /></div>
           </div>
        </div>
      </header>
    );
  }

  const displayName = user?.displayName || user?.username;
  const isOwner = user && OWNER_HANDLES.includes(user.username);
  const isWriter = !!user;

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4">
        <div className="flex-shrink-0 origin-left">
          <Logo />
        </div>

        <nav className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/"><Home className="h-5 w-5" /> Home</NavLink>
            <NavLink href="/library"><Library className="h-5 w-5" /> Library</NavLink>
            <NavLink href="/search"><Search className="h-5 w-5" /> Search</NavLink>
            {isWriter && <NavLink href="/write"><Edit3 className="h-5 w-5" /> Write</NavLink>}
            <NavLink href="/notifications"><Bell className="h-5 w-5" /> Inbox</NavLink>
          </div>
          
          {loading ? (
            <div className="h-10 w-10 flex items-center justify-center p-2">
                <div className="h-7 w-7 bg-muted rounded-full animate-pulse" />
            </div>
          ) : user ? (
            <Link href="/profile" passHref>
              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-11 md:w-11 rounded-full" aria-label="View Profile">
                <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-border/40">
                  <AvatarImage src={user.avatarUrl} alt={displayName || 'User'} data-ai-hint="profile person"/>
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{displayName ? displayName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </Link>
          ) : (
            <div className="flex gap-2">
                <Link href="/auth/signin" passHref>
                    <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/auth/signup" passHref>
                    <Button size="sm">Join</Button>
                </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
