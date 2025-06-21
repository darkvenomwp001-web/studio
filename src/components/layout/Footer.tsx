'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Only render the footer on the settings page
  if (pathname !== '/settings') {
    return null;
  }

  return (
    <footer className="border-t border-border/40 bg-background py-8 mt-16">
      <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3 col-span-2 md:col-span-1">
           <Link href="/" className="flex items-center gap-2">
              <BookOpenText className="h-8 w-8 text-primary" />
              <span className="text-2xl font-headline font-bold text-foreground">D4RKV3NOM</span>
          </Link>
          <p className="text-muted-foreground">
              Discover, write, and connect with a global community of readers and writers.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">Quick Links</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link href="#" className="hover:text-primary">About Us</Link></li>
            <li><Link href="#" className="hover:text-primary">Contact</Link></li>
            <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
            <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
          </ul>
        </div>
        <div className="space-y-2">
           <h4 className="font-semibold text-foreground">Connect</h4>
           <ul className="space-y-1 text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">Twitter</Link></li>
              <li><Link href="#" className="hover:text-primary">Facebook</Link></li>
              <li><Link href="#" className="hover:text-primary">Instagram</Link></li>
           </ul>
        </div>
      </div>
      <div className="container mx-auto mt-8 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} D4RKV3NOM. All rights reserved.
      </div>
    </footer>
  );
}
