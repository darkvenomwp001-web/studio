
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpenText, Home, MessageCircle, Search, UserCircle, Edit3, LogIn, LogOut, UserPlus, Settings, Bell } from 'lucide-react'; // Added Bell
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import type { NotificationType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

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
  const { user, signOutFirebase, loading, notifications, markNotificationAsRead } = useAuth(); 
  const router = useRouter();
  
  useEffect(() => setMounted(true), []);
  
  const handleSearchIconClick = () => {
    router.push('/search');
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  if (!mounted) { // Basic skeleton loader for header during SSR or initial client mount
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
           <Link href="/" className="flex items-center gap-2">
             <BookOpenText className="h-8 w-8 text-primary" />
             <span className="text-2xl font-headline font-bold text-foreground">D4RKV3NOM</span>
           </Link>
           <div className="flex items-center gap-2">
             <div className="h-10 w-10 p-2 animate-pulse"><div className="h-6 w-6 bg-muted rounded-full" /></div> {/* Bell placeholder */}
             <div className="h-10 w-10 p-2 animate-pulse"><div className="h-7 w-7 bg-muted rounded-full" /></div> {/* Avatar placeholder */}
           </div>
        </div>
      </header>
    );
  }

  const displayName = user?.displayName || user?.username;

  const handleNotificationClick = (notification: NotificationType) => {
    markNotificationAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-foreground">D4RKV3NOM</span>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/"><Home className="h-5 w-5" /> Home</NavLink>
            <NavLink href="/stories"><BookOpenText className="h-5 w-5" /> Stories</NavLink>
            <NavLink href="/write"><Edit3 className="h-5 w-5" /> Write</NavLink>
            <NavLink href="/messages"><MessageCircle className="h-5 w-5" /> Messages</NavLink>
          </div>
          
          <Button variant="ghost" size="icon" onClick={handleSearchIconClick} aria-label="Search">
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications Dropdown - Visible if user is logged in */}
          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotificationsCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] p-0 flex items-center justify-center text-xs rounded-full"
                    >
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <DropdownMenuLabel className="flex justify-between items-center">
                  Notifications
                  <Link href="/notifications" className="text-xs text-primary hover:underline">View All</Link>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <DropdownMenuItem 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`cursor-pointer flex items-start gap-2 ${!notif.isRead ? 'font-semibold' : ''}`}
                    >
                        {notif.actor?.avatarUrl && (
                            <Avatar className="h-6 w-6 mt-0.5">
                                <AvatarImage src={notif.actor.avatarUrl} alt={notif.actor.username} data-ai-hint="profile person" />
                                <AvatarFallback>{notif.actor.username.substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        )}
                        {!notif.actor?.avatarUrl && notif.type !== 'announcement' && (
                            <div className="h-6 w-6 mt-0.5 bg-muted rounded-full flex items-center justify-center text-xs">
                                {notif.type === 'new_follower' ? <UserPlus className="h-3 w-3"/> : <BookOpenText className="h-3 w-3"/>}
                            </div>
                        )}
                         {!notif.actor && notif.type === 'announcement' && (
                            <div className="h-6 w-6 mt-0.5 bg-accent rounded-full flex items-center justify-center text-xs">
                                <Bell className="h-3 w-3 text-accent-foreground"/>
                            </div>
                        )}
                      <div className="flex-1">
                        <p className="text-xs leading-tight whitespace-normal">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}</p>
                      </div>
                       {!notif.isRead && <div className="w-2 h-2 bg-primary rounded-full self-center shrink-0"></div>}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User Menu">
                {loading ? (
                    <div className="h-7 w-7 bg-muted rounded-full animate-pulse" />
                ) : user && user.avatarUrl ? (
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={user.avatarUrl} alt={displayName || 'User'} data-ai-hint="profile person" />
                        <AvatarFallback>{displayName ? displayName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                ) : user ? ( 
                    <Avatar className="h-7 w-7">
                       <AvatarFallback>{displayName ? displayName.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                ) : ( 
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
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Settings
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
                   {/* Add other mobile nav links if user is not logged in and they should see them */}
                </>
              ) : ( // Still loading state
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
