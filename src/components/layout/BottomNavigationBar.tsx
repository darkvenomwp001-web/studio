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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 md:hidden pointer-events-none safe-area-inset-bottom">
      <nav className="h-16 flex items-center justify-around bg-card/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] pointer-events-auto p-1 px-2">
        {navItems.map((item) => {
          if (item.requiresAuth && !user) return null;

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
                "relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-500 w-full h-full text-center group transform-gpu",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground/60 active:scale-90"
              )}>
                <div className="relative">
                  <Icon className={cn("h-5 w-5 transition-transform duration-500 group-hover:scale-110", isActive && "fill-primary/20")} />
                  {count > 0 && (
                    <div className="absolute -top-2 -right-2 min-w-[16px] h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-background animate-in zoom-in duration-500">
                      {count > 9 ? '9+' : count}
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-tighter transition-all",
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}>
                  {item.label}
                </span>
                
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)] animate-in fade-in zoom-in-50" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
