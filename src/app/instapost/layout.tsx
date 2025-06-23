import { X } from 'lucide-react';
import Link from 'next/link';

export default function InstapostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-slate-900 z-50">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
        <Link href="/" passHref>
          <button className="text-white bg-black/40 rounded-full p-2.5 hover:bg-black/60 transition-colors focus-visible:ring-2 focus-visible:ring-white">
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </button>
        </Link>
      </header>
      <main className="h-full w-full flex items-center justify-center">{children}</main>
    </div>
  );
}
