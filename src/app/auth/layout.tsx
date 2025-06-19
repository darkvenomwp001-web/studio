
import { BookOpenText } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-foreground">D4RKV3NOM</span>
        </Link>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} D4RKV3NOM. All rights reserved.
      </footer>
    </div>
  )
}
