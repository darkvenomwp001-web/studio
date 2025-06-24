
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/hooks/useAuth'; 
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { SplashWrapper } from '@/components/layout/SplashWrapper';
import PasswordSetupDialog from '@/components/auth/PasswordSetupDialog';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'LitVerse - Your Next Literary Adventure',
  description: 'Discover, write, and connect with a global community of readers and writers on LitVerse.',
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
          "min-h-screen bg-background font-body antialiased overflow-x-hidden",
          inter.variable,
          spaceGrotesk.variable
        )}
      >
        <SplashWrapper>
          <AuthProvider>
            <ScrollToTop />
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
            <Toaster />
            <PasswordSetupDialog />
          </AuthProvider>
        </SplashWrapper>
        <Script
          custom-element="storyly-web"
          src="https://web-story.storyly.io/sdk/4.6.0/storyly-web.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
