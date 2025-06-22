import { X } from 'lucide-react';
import Link from 'next/link';

export default function InstapostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black z-50">
      <header className="absolute top-0 left-0 right-0 z-10 p-4">
        <Link href="/" passHref>
          <button className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors">
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </button>
        </Link>
      </header>
      <main className="h-full w-full">{children}</main>
    </div>
  );
}
