
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpenText, Home, MessageCircle, Search, UserCircle, Edit3, LogIn, LogOut, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  const { user, signOutFirebase, loading } = useAuth(); 
  const router = useRouter();
  
  useEffect(() => setMounted(true), []);
  
  const handleSearchIconClick = () => {
    router.push('/search');
  };

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
           <Link href="/" className="flex items-center gap-2">
             <BookOpenText className="h-8 w-8 text-primary" />
             <span className="text-2xl font-headline font-bold text-foreground">D4RKV3NOM</span>
           </Link>
           <div className="flex items-center gap-2">
             <div className="h-10 w-10 p-2">
                <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
            </div>
           </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-foreground">D4RKV3NOM</span>
        </Link>

        <nav className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/"><Home className="h-5 w-5" /> Home</NavLink>
            <NavLink href="/stories"><BookOpenText className="h-5 w-5" /> Stories</NavLink>
            <NavLink href="/write"><Edit3 className="h-5 w-5" /> Write</NavLink>
            <NavLink href="/messages"><MessageCircle className="h-5 w-5" /> Messages</NavLink>
          </div>
          
          <Button variant="ghost" size="icon" onClick={handleSearchIconClick} aria-label="Search">
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User Menu">
                {loading ? (
                    <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
                ) : user && user.avatarUrl ? (
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="profile person" />
                        <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                ) : user ? ( // User exists but no avatarUrl
                    <Avatar className="h-7 w-7">
                       <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                ) : ( // No user
                    <UserCircle className="h-6 w-6" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!loading && user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="md:hidden"/>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/" className="flex items-center gap-2"><Home className="h-4 w-4" /> Home</Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/stories" className="flex items-center gap-2"><BookOpenText className="h-4 w-4" /> Stories</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/write" className="flex items-center gap-2"><Edit3 className="h-4 w-4" /> Write</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/messages" className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Messages</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOutFirebase} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </>
              ) : !loading && !user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/signin" className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" /> Sign In
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/signup" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" /> Sign Up
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="md:hidden"/>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/" className="flex items-center gap-2"><Home className="h-4 w-4" /> Home</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/stories" className="flex items-center gap-2"><BookOpenText className="h-4 w-4" /> Stories</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/write" className="flex items-center gap-2"><Edit3 className="h-4 w-4" /> Write</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link href="/messages" className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Messages</Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
