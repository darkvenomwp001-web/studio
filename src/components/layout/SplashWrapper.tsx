
'use client';

import { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';

export function SplashWrapper({ children }: { children: React.ReactNode }) {
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // This timer should match the duration of the splash screen animation
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2500); // The animation in tailwind.config.ts is 2.5s

        return () => clearTimeout(timer);
    }, []); // The empty dependency array ensures this effect runs only once on mount

    // Render the splash screen initially
    if (showSplash) {
        return <SplashScreen />;
    }
    
    // After the timeout, render the main application content
    return <>{children}</>;
}
