
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText, Search, Bell, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth'; // To get unread counts for notifications/messages

const navItems = [
  { href: '/stories', label: 'Stories', icon: BookOpenText, requiresAuth: false, countKey: null },
  { href: '/search', label: 'Search', icon: Search, requiresAuth: false, countKey: null },
  { href: '/notifications', label: 'Notifications', icon: Bell, requiresAuth: true, countKey: 'notifications' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, requiresAuth: true, countKey: 'messages' }, // Assuming a future messagesCount
];

export default function BottomNavigationBar() {
  const pathname = usePathname();
  const { user, notifications } = useAuth(); // Use notifications from useAuth

  // Example for unread messages count - you'll need to implement this in useAuth if desired
  // const unreadMessagesCount = user ? (user as any).unreadMessagesCount || 0 : 0;
  const unreadNotificationsCount = user ? notifications.filter(n => !n.isRead).length : 0;


  if (pathname.startsWith('/auth') || pathname.startsWith('/write') || pathname.includes('/read/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="container mx-auto flex h-full items-center justify-around px-1">
        {navItems.map((item) => {
          if (item.requiresAuth && !user) {
            // Optionally render a disabled or different version for non-logged-in users
            // For now, just don't render it if auth is required and user is not logged in
            return null;
          }

          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          let count = 0;
          if (item.countKey === 'notifications') {
            count = unreadNotificationsCount;
          }
          // else if (item.countKey === 'messages') {
          //   count = unreadMessagesCount;
          // }

          return (
            <Link key={item.href} href={item.href} passHref>
              <div className={cn(
                "relative flex flex-col items-center justify-center p-1 rounded-md transition-colors w-full h-full text-center",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/50"
              )}>
                <Icon className={cn("h-5 w-5 mb-0.5")} />
                <span className="text-[0.65rem] font-medium leading-tight">{item.label}</span>
                {count > 0 && (
                  <div className="absolute top-1 right-3 P-0.5 min-w-[1rem] h-4 bg-destructive text-destructive-foreground text-[0.6rem] rounded-full flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
