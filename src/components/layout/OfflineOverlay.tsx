'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Database, ArrowRight, RefreshCw, Sparkles, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * OfflineOverlay - A high-fidelity signal interruption node.
 * Appears globally when navigator.onLine is false, except on the Library page.
 */
export default function OfflineOverlay() {
    const [isOffline, setIsOffline] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        if (!navigator.onLine) setIsOffline(true);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Do not block the Library or Story Reading pages, as they have offline persistence
    const isExemptPage = pathname === '/library' || pathname.includes('/read/');
    const showOverlay = isOffline && !isExemptPage;

    if (!showOverlay) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-700 transform-gpu">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            
            {/* Morphic Scanner Line Effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
                <div className="w-full h-1 bg-primary animate-scan-line shadow-[0_0_20px_rgba(var(--primary),1)]" />
            </div>

            <div className="max-w-md w-full space-y-10 text-center relative">
                <div className="relative inline-block">
                    <div className="p-8 rounded-[2.5rem] bg-card border border-border/40 shadow-2xl transform-gpu transition-all">
                        <WifiOff className="h-16 w-16 text-muted-foreground/30 mx-auto mb-2 animate-pulse" />
                        <div className="absolute -top-2 -right-2 p-2 bg-destructive text-white rounded-full shadow-lg ring-4 ring-background">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-tight">Signal Interrupted</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed px-4">
                        Your connection to the central archive has been severed. Some features may be restricted.
                    </p>
                </div>

                <div className="grid gap-4 pt-4">
                    <Link href="/library">
                        <Button 
                            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 gap-3 group"
                        >
                            <Database className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            Access Offline Library
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                    
                    <Button 
                        variant="ghost" 
                        className="w-full h-14 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] gap-2 border border-transparent hover:bg-muted/50"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry Connection
                    </Button>
                </div>

                <div className="pt-10 flex items-center justify-center gap-2 opacity-30">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Archival Mode Active</span>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan-line {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(1000%); }
                }
                .animate-scan-line {
                    animation: scan-line 4s linear infinite;
                }
            `}</style>
        </div>
    );
}
