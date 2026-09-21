'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Edit3, Library, Search, Bell, UserPlus, UserX, ChevronDown, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

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
  const { user, loading, savedAccounts, switchAccount, removeSavedAccount, signOutFirebase } = useAuth(); 
  const router = useRouter();
  
  // High-Fidelity Identity Hub State
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isLongPressDetected, setIsLongPressDetected] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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

  const handleStart = () => {
    setIsLongPressDetected(false);
    longPressTimer.current = setTimeout(() => {
        if (user && savedAccounts.length > 0) {
            setIsLongPressDetected(true);
            setIsSwitcherOpen(true);
            if (window.navigator.vibrate) window.navigator.vibrate(10);
        }
    }, 600);
  };

  const handleEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
      // If a long press was detected, prevent the single-click navigation
      if (isLongPressDetected) {
          e.preventDefault();
          return;
      }
      router.push(`/profile/${user?.id}`);
  };

  const displayName = user?.displayName || user?.username;

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
            {user && <NavLink href="/write"><Edit3 className="h-5 w-5" /> Write</NavLink>}
            <NavLink href="/notifications"><Bell className="h-5 w-5" /> Inbox</NavLink>
          </div>
          
          {loading ? (
            <div className="h-10 w-10 flex items-center justify-center p-2">
                <div className="h-7 w-7 bg-muted rounded-full animate-pulse" />
            </div>
          ) : user ? (
            <DropdownMenu open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen}>
                <DropdownMenuTrigger asChild>
                    <button 
                        className="relative h-10 w-10 md:h-11 md:w-11 rounded-full outline-none group transition-transform active:scale-95"
                        onMouseDown={handleStart}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onTouchStart={handleStart}
                        onTouchEnd={handleEnd}
                        onClick={handleProfileClick}
                    >
                        <Avatar className="h-full w-full border border-border/40 shadow-sm transition-all group-hover:border-primary/40">
                            <AvatarImage src={user.avatarUrl} alt={displayName || 'User'} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{displayName ? displayName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        {savedAccounts.length > 1 && (
                            <div className="absolute -bottom-1 -right-1 bg-background border border-border/40 rounded-full p-0.5 shadow-sm text-primary group-hover:scale-110 transition-transform">
                                <ChevronDown className="h-2.5 w-2.5" />
                            </div>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-[2.5rem] border-none shadow-3xl bg-background/95 backdrop-blur-3xl p-3 animate-in zoom-in-95 duration-200">
                    <DropdownMenuLabel className="px-4 pt-4 pb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Switch Account</p>
                    </DropdownMenuLabel>
                    
                    <div className="space-y-1 mb-3">
                        {savedAccounts.map((acc) => (
                            <DropdownMenuItem 
                                key={acc.id}
                                onClick={() => acc.id !== user.id && switchAccount(acc)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all",
                                    acc.id === user.id ? "bg-primary/10 border-primary/20 pointer-events-none" : "hover:bg-muted/50"
                                )}
                            >
                                <div className="relative">
                                    <Avatar className="h-10 w-10 border shadow-sm">
                                        <AvatarImage src={acc.avatarUrl} />
                                        <AvatarFallback className="font-bold">{acc.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {acc.id === user.id && <div className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full ring-2 ring-background"><Sparkles className="h-2 w-2" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">@{acc.username}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black truncate">{acc.displayName}</p>
                                </div>
                                {acc.id !== user.id && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                                        onClick={(e) => { e.stopPropagation(); removeSavedAccount(acc.id); }}
                                    >
                                        <UserX className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </div>

                    <DropdownMenuSeparator className="bg-border/20 mx-3" />
                    
                    <div className="p-1">
                        <DropdownMenuItem onClick={() => router.push('/auth/signin')} className="rounded-xl gap-3 p-3 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all">
                            <UserPlus className="h-4 w-4" />
                            Add Account
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={signOutFirebase} className="rounded-xl gap-3 p-3 font-bold text-xs uppercase tracking-widest text-destructive hover:bg-destructive/10 focus:bg-destructive/10 transition-all">
                            <LogOut className="h-4 w-4" />
                            Sign Out All
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
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