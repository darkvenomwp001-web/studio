
import type { Metadata } from 'next';
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
    <html lang="en" suppressHydrationWarning>
      <head>
        
      </head>
      <body 
        className={cn(
          "min-h-screen bg-background font-body antialiased",
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
            <SplashWrapper>
                <StoryPreviewProvider>
                  <ScrollToTop />
                  <div className="relative flex min-h-screen flex-col">
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
