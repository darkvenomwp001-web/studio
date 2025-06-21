
'use client';

import { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';

export function SplashWrapper({ children }: { children: React.ReactNode }) {
    const [isFirstVisit, setIsFirstVisit] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (sessionStorage.getItem('splashSeen') === null) {
            sessionStorage.setItem('splashSeen', 'true');
            setIsFirstVisit(true);
        }
        setIsChecking(false);
    }, []);

    if (isChecking) {
        return null; // Render nothing while checking sessionStorage to avoid flash of content
    }

    if (isFirstVisit) {
        return <SplashScreen />;
    }

    return <>{children}</>;
}
