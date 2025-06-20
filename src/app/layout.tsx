
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/hooks/useAuth'; 
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'D4RKV3NOM - Your Next Literary Adventure',
  description: 'Discover, write, and connect with a global community of readers and writers on D4RKV3NOM.',
  icons: {
    icon: '/favicon.ico', 
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        
      </head>
      <body 
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          inter.variable,
          spaceGrotesk.variable
        )}
      >
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8"> {/* Added pb-24 for bottom nav space, revert to pb-8 on md */}
              {children}
            </main>
            <Footer />
            <BottomNavigationBar />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
