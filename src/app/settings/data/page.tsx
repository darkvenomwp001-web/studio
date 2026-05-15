'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
    Loader2, 
    ArrowLeft, 
    Database, 
    Trash2, 
    RotateCcw, 
    ShieldAlert, 
    CheckCircle, 
    Zap,
    HardDrive,
    Cloud,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { clearFirestoreCache } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function DataAndCachePage() {
    const { user, loading, clearAppCache } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isClearing, setIsClearing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleClearJunk = async () => {
        setIsClearing(true);
        try {
            await clearAppCache();
            toast({ title: "Cache Purged!", description: "App session has been refreshed." });
            // The clearAppCache function in useAuth reloads the window
        } catch (error) {
            toast({ title: "Purge Failed", variant: "destructive" });
            setIsClearing(false);
        }
    };

    const handleResetPersistence = async () => {
        setIsResetting(true);
        try {
            await clearFirestoreCache();
            toast({ title: "Persistence Reset", description: "Offline database has been cleared. Re-syncing with cloud..." });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast({ title: "Reset Failed", description: "Make sure all other LitVerse tabs are closed.", variant: "destructive" });
            setIsResetting(false);
        }
    };

    if (loading && !user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
            <header className="space-y-1">
                <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
                </Button>
                <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center gap-4">
                    <Database className="h-10 w-10 text-emerald-500" /> Data & Cache
                </h1>
                <p className="text-muted-foreground text-sm font-medium">Fix loading "hangs", clear offline junk, and manage your local storage.</p>
            </header>

            <div className="grid gap-6">
                <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-emerald-500/5 border-b border-emerald-500/10 p-8">
                        <div className="flex items-center justify-between mb-2">
                            <CardTitle className="text-xl flex items-center gap-3">
                                <Zap className="h-6 w-6 text-emerald-500" /> Storage Health
                            </CardTitle>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 rounded-full px-3">
                                <CheckCircle className="h-3 w-3" /> System Nominal
                            </Badge>
                        </div>
                        <CardDescription className="text-sm">Current telemetry of your local D4RKV3NOM environment.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-3xl bg-muted/30 border border-border/40 flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-background shadow-sm">
                                    <Cloud className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sync Status</p>
                                    <p className="text-sm font-bold">Synchronized</p>
                                </div>
                            </div>
                            <div className="p-5 rounded-3xl bg-muted/30 border border-border/40 flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-background shadow-sm">
                                    <HardDrive className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Local Cache</p>
                                    <p className="text-sm font-bold">Active (~1.2MB)</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="opacity-40" />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-foreground">Purge App Cache</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">Clears session-specific "junk" like cached user profiles and temporary UI states. Safe and recommended if the app feels slow.</p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    className="rounded-2xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest flex-shrink-0"
                                    onClick={handleClearJunk}
                                    disabled={isClearing}
                                >
                                    {isClearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                    Purge
                                </Button>
                            </div>

                            <Separator className="opacity-20" />

                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-foreground">Deep Reset Persistence</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">Forces the Firestore database to wipe its local IndexedDB copy and re-fetch everything from the cloud. <strong>Fixes the "Loading Hang" error.</strong></p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            className="rounded-2xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest flex-shrink-0"
                                            disabled={isResetting}
                                        >
                                            {isResetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                            Hard Reset
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2.5rem] border-none shadow-3xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="font-headline text-2xl">Hard Reset Persistence?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-sm">
                                                This will clear the offline copy of your manuscripts and force a fresh sync with the server. This is the primary solution for data loading issues. 
                                                <br /><br />
                                                <strong>Note:</strong> All other tabs must be closed for this to complete.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleResetPersistence} className="bg-emerald-600 hover:bg-emerald-700 rounded-full px-8 font-bold">Initiate Deep Reset</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-destructive/20 bg-destructive/5 shadow-none overflow-hidden">
                    <CardHeader className="bg-destructive/10 border-b border-destructive/10 p-8">
                        <CardTitle className="text-lg text-destructive flex items-center gap-2 font-headline">
                            <ShieldAlert className="h-5 w-5" /> Danger Zone
                        </CardTitle>
                        <CardDescription className="text-destructive/70">Wipe all local LitVerse data and reset the environment.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h4 className="font-bold text-foreground">Wipe Reader Preferences</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">Deletes all local storage items including your custom font sizes, reading themes, and "Zen Mode" states. This brings the app back to factory defaults.</p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="rounded-2xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest flex-shrink-0 shadow-lg shadow-destructive/20">
                                        <RotateCcw className="h-4 w-4 mr-2" /> Wipe All
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-3xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-headline font-bold text-destructive">Wipe everything?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm">
                                            This will delete every local preference and setting saved in this browser. You will stay logged in, but your personalized reading setup will be lost.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={() => { localStorage.clear(); window.location.reload(); }}
                                            className="bg-destructive hover:bg-destructive/90 rounded-full px-8 font-bold"
                                        >
                                            Confirm Wipe
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <footer className="pt-10 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Local Node Architecture & bull; LitVerse Core</p>
            </footer>
        </div>
    );
}
