import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/hooks/useAuth'; 
import { SplashWrapper } from '@/components/layout/SplashWrapper';
import PasswordSetupDialog from '@/components/auth/PasswordSetupDialog';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { ThemeProvider } from '@/components/theme-provider';
import { StoryPreviewProvider } from '@/context/StoryPreviewProvider';
import StoryPreviewDrawer from '@/components/story/StoryPreviewDrawer';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import AppearanceManager from '@/components/layout/AppearanceManager';


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'D4RKV3NOM - Your Next Literary Adventure',
  description: 'Discover, write, and connect with a global community of readers and writers on D4RKV3NOM.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'D4RKV3NOM',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico', 
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body 
        className={cn(
          "min-h-screen bg-background font-body antialiased overflow-x-hidden",
          inter.variable,
          spaceGrotesk.variable
        )}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
          <AuthProvider>
            <AppearanceManager />
            <SplashWrapper>
                <StoryPreviewProvider>
                  <FirebaseErrorListener />
                  <ScrollToTop />
                  <div className="relative flex min-h-screen flex-col overflow-x-hidden">
                    {children}
                  </div>
                  <Toaster />
                  <PasswordSetupDialog />
                  <StoryPreviewDrawer />
                </StoryPreviewProvider>
            </SplashWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
