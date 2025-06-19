'use client';

import Link from 'next/link';
import { BookOpenText, Home, MessageCircle, Search, UserCircle, Edit3, LogIn, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes'; // Assuming next-themes is or will be installed
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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
  // const { theme, setTheme } = useTheme(); // This line will cause an error if next-themes is not installed.
                                          // For now, we'll mock theme toggle functionality or omit it.
                                          // Let's create a simple toggle for demonstration if useTheme is not available.
  const [currentTheme, setCurrentTheme] = useState('light');


  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    // This is a mock. In a real app, useTheme from next-themes would handle this.
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    if (mounted) {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };
  
  if (!mounted) {
    return null; 
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-foreground">LitVerse</span>
        </Link>

        <div className="flex flex-1 items-center justify-center px-8 md:px-16 lg:px-24">
          <div className="relative w-full max-w-md">
            <Input type="search" placeholder="Search stories, authors, tags..." className="pl-10" />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/"><Home className="h-5 w-5" /> Home</NavLink>
            <NavLink href="/write"><Edit3 className="h-5 w-5" /> Write</NavLink>
            <NavLink href="/messages"><MessageCircle className="h-5 w-5" /> Messages</NavLink>
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {currentTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User Menu">
                <UserCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="md:hidden">
                 <Link href="/" className="flex items-center gap-2"><Home className="h-4 w-4" /> Home</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="md:hidden">
                 <Link href="/write" className="flex items-center gap-2"><Edit3 className="h-4 w-4" /> Write</Link>
              </DropdownMenuItem>
               <DropdownMenuItem asChild className="md:hidden">
                 <Link href="/messages" className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Messages</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/auth/signin" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Sign In
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
