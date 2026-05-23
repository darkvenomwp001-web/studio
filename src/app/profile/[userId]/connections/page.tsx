'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, onSnapshot, getDocs, limit, documentId } from 'firebase/firestore';
import type { User as AppUser } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    ArrowLeft, 
    Users, 
    UserPlus, 
    Search, 
    Star, 
    MessageSquare, 
    CheckCircle2, 
    Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { toggleCloseFriend } from '@/app/actions/userActions';

function ConnectionCard({ 
    targetUser, 
    isMoot, 
    isOwnProfile, 
    isCloseFriend, 
    onToggleCloseFriend 
}: { 
    targetUser: AppUser, 
    isMoot: boolean, 
    isOwnProfile: boolean, 
    isCloseFriend: boolean,
    onToggleCloseFriend?: (id: string) => void
}) {
    const router = useRouter();
    const displayName = targetUser.displayName || targetUser.username;

    return (
        <div className="flex items-center justify-between p-4 rounded-3xl bg-card/40 border border-border/40 hover:bg-muted/30 transition-all group shadow-sm">
            <div className="flex items-center gap-4 min-w-0">
                <Link href={`/profile/${targetUser.id}`} className="relative shrink-0">
                    <Avatar className="h-12 w-12 md:h-14 md:w-14 border-2 border-background shadow-md group-hover:scale-105 transition-transform duration-300">
                        <AvatarImage src={targetUser.avatarUrl} alt={targetUser.username} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{targetUser.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {isMoot && (
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border/10">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                    )}
                </Link>
                <div className="flex-1 min-w-0">
                    <Link href={`/profile/${targetUser.id}`} className="font-bold text-sm md:text-base hover:underline truncate block">
                        {displayName}
                    </Link>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] md:text-xs text-muted-foreground font-medium truncate">@{targetUser.username}</p>
                        {isMoot && <Badge variant="outline" className="h-4 text-[8px] uppercase tracking-widest bg-primary/5 text-primary border-primary/20 font-black">Moot</Badge>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isOwnProfile && onToggleCloseFriend && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "rounded-full h-10 w-10 transition-all active:scale-90",
                            isCloseFriend ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "text-muted-foreground hover:bg-muted"
                        )}
                        onClick={(e) => { e.stopPropagation(); onToggleCloseFriend(targetUser.id); }}
                        title={isCloseFriend ? "Remove from Close Friends" : "Add to Close Friends"}
                    >
                        <Star className={cn("h-5 w-5", isCloseFriend && "fill-current")} />
                    </Button>
                )}
                
                <Link href={`/notifications?tab=messages&startConversationWith=${targetUser.id}`}>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-90 transition-all">
                        <MessageSquare className="h-5 w-5" />
                    </Button>
                </Link>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-10 w-10 text-muted-foreground hover:bg-muted active:scale-90 transition-all"
                    onClick={() => router.push(`/profile/${targetUser.id}`)}
                >
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                </Button>
            </div>
        </div>
    );
}

function ConnectionsContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    
    const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
    const defaultTab = searchParams.get('tab') || 'followers';

    const [profileUser, setProfileUser] = useState<AppUser | null>(null);
    const [followers, setFollowers] = useState<AppUser[]>([]);
    const [following, setFollowing] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const isOwnProfile = currentUser?.id === userId;

    useEffect(() => {
        if (!userId) return;

        const userRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfileUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
            } else {
                router.push('/');
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, router]);

    useEffect(() => {
        if (!userId) return;

        const followersQuery = query(
            collection(db, 'users'),
            where('followingIds', 'array-contains', userId)
        );
        const unsubscribeFollowers = onSnapshot(followersQuery, (snapshot) => {
            setFollowers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
        });

        return () => unsubscribeFollowers();
    }, [userId]);

    useEffect(() => {
        if (!profileUser?.followingIds || profileUser.followingIds.length === 0) {
            setFollowing([]);
            return;
        }

        const followingIds = profileUser.followingIds.slice(0, 50);
        const followingQuery = query(
            collection(db, 'users'),
            where('__name__', 'in', followingIds)
        );
        
        const unsubscribeFollowing = onSnapshot(followingQuery, (snapshot) => {
            setFollowing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
        });

        return () => unsubscribeFollowing();
    }, [profileUser?.followingIds]);

    const handleToggleMootCF = async (friendId: string) => {
        if (!currentUser) return;
        const isAdding = !currentUser.closeFriendIds?.includes(friendId);
        const result = await toggleCloseFriend(currentUser.id, friendId, isAdding);
        if (result.success) {
            toast({ title: isAdding ? "Close Friend added" : "Removed from list" });
        }
    };

    const moots = useMemo(() => {
        if (!profileUser) return [];
        return followers.filter(f => profileUser.followingIds?.includes(f.id));
    }, [followers, profileUser]);

    const filteredData = (list: AppUser[]) => {
        if (!searchTerm.trim()) return list;
        const s = searchTerm.toLowerCase();
        return list.filter(u => u.username.toLowerCase().includes(s) || u.displayName?.toLowerCase().includes(s));
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-12rem)] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Network Node...</p>
            </div>
        );
    }

    if (!profileUser) return null;

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 h-11 w-11 shadow-sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-3xl font-headline font-bold truncate tracking-tight">
                            {profileUser.displayName || profileUser.username}
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Creative Signal Hub</p>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search connections..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 h-14 rounded-[2rem] bg-muted/20 border-none shadow-inner text-base focus-visible:ring-primary/20"
                    />
                </div>
            </header>

            <Tabs defaultValue={defaultTab} className="w-full">
                <div className="flex justify-center mb-8 border-b border-border/20 pb-4">
                    <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md h-12 w-full max-w-sm">
                        <TabsTrigger value="followers" className="rounded-full font-bold flex-1 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-md">
                            Followers
                        </TabsTrigger>
                        <TabsTrigger value="following" className="rounded-full font-bold flex-1 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-md">
                            Following
                        </TabsTrigger>
                        <TabsTrigger value="moots" className="rounded-full font-bold flex-1 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-md gap-2">
                            Moots <Sparkles className="h-3 w-3 text-primary" />
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="followers" className="mt-0 space-y-3 animate-in fade-in duration-500">
                    {filteredData(followers).length > 0 ? (
                        filteredData(followers).map(u => (
                            <ConnectionCard 
                                key={u.id} 
                                targetUser={u} 
                                isMoot={profileUser.followingIds?.includes(u.id) || false}
                                isOwnProfile={isOwnProfile}
                                isCloseFriend={currentUser?.closeFriendIds?.includes(u.id) || false}
                                onToggleCloseFriend={isOwnProfile ? handleToggleMootCF : undefined}
                            />
                        ))
                    ) : (
                        <div className="text-center py-32 text-muted-foreground bg-muted/5 rounded-[3rem] border-2 border-dashed border-border/40">
                            <Users className="mx-auto h-12 w-12 opacity-10 mb-4" />
                            <p className="font-bold text-sm">No followers yet.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="following" className="mt-0 space-y-3 animate-in fade-in duration-500">
                    {filteredData(following).length > 0 ? (
                        filteredData(following).map(u => (
                            <ConnectionCard 
                                key={u.id} 
                                targetUser={u} 
                                isMoot={followers.some(f => f.id === u.id)}
                                isOwnProfile={isOwnProfile}
                                isCloseFriend={currentUser?.closeFriendIds?.includes(u.id) || false}
                                onToggleCloseFriend={isOwnProfile ? handleToggleMootCF : undefined}
                            />
                        ))
                    ) : (
                        <div className="text-center py-32 text-muted-foreground bg-muted/5 rounded-[3rem] border-2 border-dashed border-border/40">
                            <UserPlus className="mx-auto h-12 w-12 opacity-10 mb-4" />
                            <p className="font-bold text-sm">Not following anyone yet.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="moots" className="mt-0 space-y-3 animate-in fade-in duration-500">
                    {filteredData(moots).length > 0 ? (
                        filteredData(moots).map(u => (
                            <ConnectionCard 
                                key={u.id} 
                                targetUser={u} 
                                isMoot={true}
                                isOwnProfile={isOwnProfile}
                                isCloseFriend={currentUser?.closeFriendIds?.includes(u.id) || false}
                                onToggleCloseFriend={isOwnProfile ? handleToggleMootCF : undefined}
                            />
                        ))
                    ) : (
                        <div className="text-center py-32 text-muted-foreground bg-muted/5 rounded-[3rem] border-2 border-dashed border-border/40">
                            <Sparkles className="mx-auto h-12 w-12 opacity-10 mb-4" />
                            <h3 className="font-bold text-foreground mb-1 text-lg">No mutual archives</h3>
                            <p className="text-xs px-12 leading-relaxed">Mutual connections appear when two creators signal follow each other.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function UserConnectionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen bg-background"><Loader2 className="animate-spin text-primary" /></div>}>
      <ConnectionsContent />
    </Suspense>
  );
}
