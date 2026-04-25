
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, onSnapshot, getDocs, limit } from 'firebase/firestore';
import type { User as AppUser } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Users, UserPlus } from 'lucide-react';
import FollowerUserCard from '@/components/shared/FollowerUserCard';
import { useAuth } from '@/hooks/useAuth';

function ConnectionsContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loading: authLoading } = useAuth();
    const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
    const defaultTab = searchParams.get('tab') || 'followers';

    const [profileUser, setProfileUser] = useState<AppUser | null>(null);
    const [followers, setFollowers] = useState<AppUser[]>([]);
    const [following, setFollowing] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);
    const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);

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

        setIsLoadingFollowers(true);
        const followersQuery = query(
            collection(db, 'users'),
            where('followingIds', 'array-contains', userId)
        );
        const unsubscribeFollowers = onSnapshot(followersQuery, (snapshot) => {
            setFollowers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
            setIsLoadingFollowers(false);
        });

        return () => unsubscribeFollowers();
    }, [userId]);

    useEffect(() => {
        if (!profileUser?.followingIds || profileUser.followingIds.length === 0) {
            setFollowing([]);
            setIsLoadingFollowing(false);
            return;
        }

        setIsLoadingFollowing(true);
        const followingIds = profileUser.followingIds.slice(0, 30);
        const followingQuery = query(
            collection(db, 'users'),
            where('__name__', 'in', followingIds)
        );
        
        const unsubscribeFollowing = onSnapshot(followingQuery, (snapshot) => {
            setFollowing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
            setIsLoadingFollowing(false);
        });

        return () => unsubscribeFollowing();
    }, [profileUser?.followingIds]);

    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!profileUser) return null;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
            <header className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-headline font-bold">
                        {profileUser.displayName || profileUser.username}
                    </h1>
                    <p className="text-sm text-muted-foreground">Connections</p>
                </div>
            </header>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                    <TabsTrigger value="followers" className="gap-2">
                        <Users className="h-4 w-4" />
                        Followers ({profileUser.followersCount || 0})
                    </TabsTrigger>
                    <TabsTrigger value="following" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Following ({profileUser.followingCount || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="followers" className="mt-8">
                    {isLoadingFollowers ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : followers.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {followers.map(u => (
                                <FollowerUserCard key={u.id} user={u} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                            <Users className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p>No followers yet.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="following" className="mt-8">
                    {isLoadingFollowing ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : following.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {following.map(u => (
                                <FollowerUserCard key={u.id} user={u} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                            <UserPlus className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p>Not following anyone yet.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function UserConnectionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <ConnectionsContent />
    </Suspense>
  );
}
