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
  { href: '/letters', label: 'Mailbox', icon: Mailbox, requiresAuth: true, countKey: 'letters' },
  { href: '/notifications', label: 'Inbox', icon: Bell, requiresAuth: true, countKey: 'notifications' },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();
  const { user, notifications, unreadLettersCount, unreadConversationsCount } = useAuth();

  const unreadNotificationsCount = user ? notifications.filter(n => !n.isRead).length : 0;

  if (pathname.startsWith('/auth') || pathname.startsWith('/write') || pathname.includes('/read/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 md:hidden safe-area-inset-bottom">
      <div className="flex h-full items-center justify-between px-1">
        {navItems.map((item) => {
          if (item.requiresAuth && !user) {
            return null;
          }

          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          let count = 0;
          if (item.countKey === 'notifications') {
            count = unreadNotificationsCount + unreadConversationsCount;
          } else if (item.countKey === 'letters') {
            count = unreadLettersCount;
          }

          return (
            <Link key={item.href} href={item.href} className="flex-1 h-full">
              <div className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-md transition-all duration-300 w-full h-full text-center",
                isActive ? "text-primary scale-110" : "text-muted-foreground active:scale-95"
              )}>
                <Icon className={cn("h-5 w-5")} />
                <span className="text-[10px] font-bold uppercase tracking-tighter leading-none">{item.label}</span>
                
                {count > 0 && (
                  <div className="absolute top-1 right-1/2 translate-x-4 min-w-[18px] h-[18px] bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-background animate-in zoom-in duration-300 transform-gpu">
                    {count > 99 ? '99+' : count}
                  </div>
                )}

                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
