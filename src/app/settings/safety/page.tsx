
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
    Loader2, 
    ArrowLeft, 
    Shield, 
    UserX, 
    EyeOff, 
    AlertTriangle,
    CheckCircle,
    UserMinus,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function SafetySettingsPage() {
    const { user, loading, updateUserProfile, authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
    const [blockSearchTerm, setBlockSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!user?.blockedUserIds || user.blockedUserIds.length === 0) {
            setBlockedUsers([]);
            return;
        }

        const fetchBlockedUsers = async () => {
            setIsLoadingBlocked(true);
            try {
                const usersRef = collection(db, 'users');
                // Firestore limit for 'in' is 10, but for blocking a few names is fine for MVP
                const q = query(usersRef, where('__name__', 'in', user.blockedUserIds!.slice(0, 10)));
                const snap = await getDocs(q);
                setBlockedUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingBlocked(false);
            }
        };

        fetchBlockedUsers();
    }, [user?.blockedUserIds]);

    const handleUnblock = async (targetId: string) => {
        if (!user) return;
        setIsProcessing(true);
        const userRef = doc(db, 'users', user.id);
        updateDoc(userRef, { blockedUserIds: arrayRemove(targetId) })
            .then(() => toast({ title: "User Unblocked" }))
            .finally(() => setIsProcessing(false));
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
                    <Shield className="h-10 w-10 text-red-500" /> Safety Hub
                </h1>
                <p className="text-muted-foreground text-sm font-medium">Protect your space. Control who can interact with you and what you see.</p>
            </header>

            <div className="grid gap-6">
                <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-red-500/5 border-b border-red-500/10 p-8">
                        <CardTitle className="text-xl flex items-center gap-3">
                            <UserX className="h-6 w-6 text-red-500" /> Blocked Accounts
                        </CardTitle>
                        <CardDescription className="text-sm">Blocked users cannot message you or see your detailed profile.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {isLoadingBlocked ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : blockedUsers.length > 0 ? (
                            <div className="space-y-3">
                                {blockedUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/40">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border shadow-sm">
                                                <AvatarImage src={u.avatarUrl} />
                                                <AvatarFallback>{u.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-bold">@{u.username}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{u.displayName}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="rounded-xl h-9 hover:bg-red-500/10 text-red-500 font-bold uppercase text-[10px] tracking-widest" onClick={() => handleUnblock(u.id)} disabled={isProcessing}>
                                            Unblock
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground italic bg-muted/10 rounded-3xl border border-dashed">
                                <p className="text-xs">Your blocked list is clean.</p>
                            </div>
                        )}
                        
                        <div className="pt-4">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Safety Note</Label>
                            <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-start gap-3 mt-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    Blocking is a serious tool for personal safety. If someone is violating community guidelines, please also use the Report feature on their profile or content to notify our moderators.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2"><EyeOff className="h-5 w-5 text-primary" /> Content Filters</CardTitle>
                        <CardDescription>Tailor your feed to your comfort level.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                        <div className="flex items-center justify-between py-4 border-b border-border/20">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Hide Mature Search Results</Label>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Blur 18+ content in the discovery hub</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between py-4 border-b border-border/20">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Aggressive Trigger Filtering</Label>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Automatically hide stories with severe warnings</p>
                            </div>
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between py-4">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Safe Reader Mode</Label>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Collapse all author disclaimers by default</p>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <footer className="pt-10 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">May 15, 2026 Core Protocol & bull; D4RKV3NOM Safety Hub</p>
            </footer>
        </div>
    );
}
