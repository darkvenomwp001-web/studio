
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Search, Bell, Mailbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth'; 

const navItems = [
  { href: '/', label: 'Home', icon: Home, requiresAuth: false, countKey: null },
  { href: '/library', label: 'Library', icon: Library, requiresAuth: true, countKey: null },
  { href: '/search', label: 'Search', icon: Search, requiresAuth: false, countKey: null },
  { href: '/letters', label: 'Mailbox', icon: Mailbox, requiresAuth: true, countKey: null },
  { href: '/notifications', label: 'Inbox', icon: Bell, requiresAuth: true, countKey: 'notifications' },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();
  const { user, notifications } = useAuth(); // Use notifications from useAuth

  const unreadNotificationsCount = user ? notifications.filter(n => !n.isRead).length : 0;

  if (pathname.startsWith('/auth') || pathname.startsWith('/write') || pathname.includes('/read/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="container mx-auto flex h-full items-center justify-around px-1">
        {navItems.map((item) => {
          if (item.requiresAuth && !user) {
            return null;
          }

          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          let count = 0;
          if (item.countKey === 'notifications') {
            count = unreadNotificationsCount;
          }

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
