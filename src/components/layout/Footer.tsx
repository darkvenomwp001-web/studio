
import Link from 'next/link';
import { BookOpenText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <BookOpenText className="h-7 w-7 text-primary" />
              <span className="text-xl font-headline font-bold text-foreground">D4RKV3NOM</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Discover, write, and connect with a global community of readers and writers.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold font-headline mb-3 text-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-md font-semibold font-headline mb-3 text-foreground">Connect</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Twitter</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Facebook</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Instagram</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} D4RKV3NOM. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
