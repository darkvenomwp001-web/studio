'use client';

import { Suspense } from 'react';
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
import { DynamicIslandProvider } from '@/context/DynamicIslandContext';
import StoryPreviewDrawer from '@/components/story/StoryPreviewDrawer';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import AppearanceManager from '@/components/layout/AppearanceManager';
import NativePermissionGuard from '@/components/layout/NativePermissionGuard';
import { Loader2 } from 'lucide-react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden max-w-[100vw]">
      <body 
        className={cn(
          "min-h-screen bg-background font-body antialiased overflow-x-hidden max-w-[100vw]",
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
          <DynamicIslandProvider>
            <AuthProvider>
              <AppearanceManager />
              <NativePermissionGuard />
              <SplashWrapper>
                  <StoryPreviewProvider>
                    <FirebaseErrorListener />
                    <ScrollToTop />
                    {/* DynamicIsland component removed in favor of unified top-center Toaster */}
                    <div className="relative flex min-h-screen flex-col overflow-x-hidden max-w-[100vw]">
                      <Suspense fallback={<div className="flex justify-center items-center h-screen bg-background"><Loader2 className="animate-spin text-primary" /></div>}>
                        {children}
                      </Suspense>
                    </div>
                    <Toaster />
                    <PasswordSetupDialog />
                    <StoryPreviewDrawer />
                  </StoryPreviewProvider>
              </SplashWrapper>
            </AuthProvider>
          </DynamicIslandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
