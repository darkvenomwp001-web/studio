
'use client';

import { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';

export function SplashWrapper({ children }: { children: React.ReactNode }) {
    const [showSplash, setShowSplash] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // This runs only on the client-side
        setIsClient(true);
        if (sessionStorage.getItem('splashSeen') !== 'true') {
            setShowSplash(true);
            sessionStorage.setItem('splashSeen', 'true');
        }
    }, []);

    useEffect(() => {
        // This effect manages the timer to hide the splash screen
        if (showSplash) {
            const timer = setTimeout(() => {
                setShowSplash(false);
            }, 1500); // Faster 1.5-second splash

            return () => clearTimeout(timer);
        }
    }, [showSplash]);

    if (!isClient) {
        // Render nothing on the server to avoid hydration mismatches with sessionStorage
        return null;
    }

    if (showSplash) {
        return <SplashScreen />;
    }
    
    // Once the splash is done (or was never shown), render the main app content
    return <>{children}</>;
}
