'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Edit3, Library, Search, Bell, UserPlus, UserX, ChevronDown, LogOut, Sparkles, WifiOff } from 'lucide-react';
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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { user, loading, savedAccounts, switchAccount, removeSavedAccount, signOutFirebase } = useAuth(); 
  const router = useRouter();
  
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isLongPressDetected, setIsLongPressDetected] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Connectivity Sensing Node
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
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
        if (user) {
            setIsLongPressDetected(true);
            setIsSwitcherOpen(true);
            if (window.navigator.vibrate) window.navigator.vibrate(20);
        }
    }, 4000); 
  };

  const handleEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const handleProfileClick = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isLongPressDetected) {
          setTimeout(() => setIsLongPressDetected(false), 200);
          return;
      }

      if (user) {
        router.push(`/profile/${user.id}`);
      }
      setIsSwitcherOpen(false);
  };

  const displayName = user?.displayName || user?.username;

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4 flex-shrink-0 origin-left">
          <Logo />
          {!isOnline && (
            <Badge variant="outline" className="hidden sm:flex rounded-full bg-destructive/10 text-destructive border-destructive/20 gap-1.5 animate-in fade-in duration-1000 h-6 px-2.5">
               <WifiOff className="h-3 w-3" />
               <span className="text-[8px] font-black uppercase tracking-widest">Signal Lost</span>
            </Badge>
          )}
        </div>

        <nav className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" passHref>
              <Button variant="ghost" className="flex items-center gap-2 text-sm hover:bg-accent/50 hover:text-accent-foreground">
                <Home className="h-5 w-5" /> Home
              </Button>
            </Link>
            <Link href="/library" passHref>
              <Button variant="ghost" className="flex items-center gap-2 text-sm hover:bg-accent/50 hover:text-accent-foreground">
                <Library className="h-5 w-5" /> Library
              </Button>
            </Link>
            <Link href="/search" passHref>
              <Button variant="ghost" className="flex items-center gap-2 text-sm hover:bg-accent/50 hover:text-accent-foreground">
                <Search className="h-5 w-5" /> Search
              </Button>
            </Link>
            {user && (
              <Link href="/write" passHref>
                <Button variant="ghost" className="flex items-center gap-2 text-sm hover:bg-accent/50 hover:text-accent-foreground">
                  <Edit3 className="h-5 w-5" /> Write
                </Button>
              </Link>
            )}
            <Link href="/notifications" passHref>
              <Button variant="ghost" className="flex items-center gap-2 text-sm hover:bg-accent/50 hover:text-accent-foreground">
                <Bell className="h-5 w-5" /> Inbox
              </Button>
            </Link>
          </div>
          
          {loading ? (
            <div className="h-10 w-10 flex items-center justify-center p-2">
                <div className="h-7 w-7 bg-muted rounded-full animate-pulse" />
            </div>
          ) : user ? (
            <DropdownMenu 
              open={isSwitcherOpen} 
              onOpenChange={(open) => {
                if (!open) {
                  setIsSwitcherOpen(false);
                  setIsLongPressDetected(false);
                }
              }}
            >
                <DropdownMenuTrigger asChild>
                    <button 
                        className="relative h-10 w-10 md:h-11 md:w-11 rounded-full outline-none group transition-transform active:scale-95 touch-none select-none"
                        onPointerDown={handleStart}
                        onPointerUp={handleEnd}
                        onPointerLeave={handleEnd}
                        onClick={handleProfileClick}
                    >
                        <Avatar className={cn(
                          "h-full w-full border shadow-sm transition-all group-hover:border-primary/40",
                          !isOnline ? "border-destructive/40" : "border-border/40"
                        )}>
                            <AvatarImage src={user.avatarUrl} alt={displayName || 'User'} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{displayName ? displayName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        {savedAccounts.length > 1 && (
                            <div className="absolute -bottom-1 -right-1 bg-background border border-border/40 rounded-full p-0.5 shadow-sm text-primary group-hover:scale-110 transition-transform">
                                <ChevronDown className="h-2.5 w-2.5" />
                            </div>
                        )}
                        {!isOnline && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive rounded-full border-2 border-background animate-pulse" />
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-2xl border-none shadow-3xl bg-background/95 backdrop-blur-3xl p-3 animate-in zoom-in-95 duration-200">
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
                        <DropdownMenuItem onClick={() => router.push('/auth/signin?mode=addAccount')} className="rounded-xl gap-3 p-3 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all">
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
