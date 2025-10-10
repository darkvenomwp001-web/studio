
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, DocumentData } from 'firebase/firestore';
import type { User as AppUser } from '@/types';
import { Loader2, ArrowLeft, Users, Check, Plus, UserPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toggleCloseFriend } from '@/app/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function CloseFriendsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [followers, setFollowers] = useState<AppUser[]>([]);
  const [closeFriends, setCloseFriends] = useState<AppUser[]>([]);
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', user.id));
    
    const unsubFollowers = onSnapshot(followersQuery, (snapshot) => {
      const followersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setFollowers(followersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching followers:", error);
      toast({ title: 'Error', description: 'Could not load your followers.', variant: 'destructive'});
      setIsLoading(false);
    });

    const userDocRef = doc(db, 'users', user.id);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const ids = docSnap.data().closeFriendIds || [];
        setCloseFriendIds(ids);
      }
    });

    return () => {
        unsubFollowers();
        unsubUser();
    };
  }, [user, toast]);

  useEffect(() => {
    if (closeFriendIds.length === 0) {
        setCloseFriends([]);
        return;
    }
    const cfQuery = query(collection(db, 'users'), where('__name__', 'in', closeFriendIds));
    const unsubCF = onSnapshot(cfQuery, (snapshot) => {
        setCloseFriends(snapshot.docs.map(d => ({id: d.id, ...d.data()} as AppUser)));
    });
    return () => unsubCF();
  }, [closeFriendIds]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !loading) {
    router.push('/auth/signin');
    return null;
  }
  
  const handleToggleCloseFriend = async (friendId: string) => {
    if (!user) return;
    const isAdding = !closeFriendIds.includes(friendId);
    const result = await toggleCloseFriend(user.id, friendId, isAdding);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive'});
    }
  };
  
  const filteredFollowers = followers.filter(f => 
    f.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <Users className="h-8 w-8" /> Close Friends
        </h1>
        <p className="text-muted-foreground">Manage your list for sharing private statuses.</p>
      </header>

       <Card>
        <CardHeader>
          <CardTitle>Your Close Friends ({closeFriends.length})</CardTitle>
          <CardDescription>This is your private list. Only you can see who's on it.</CardDescription>
        </CardHeader>
        <CardContent>
            {closeFriends.length > 0 ? (
                <ScrollArea className="h-60">
                     <div className="space-y-2 pr-4">
                        {closeFriends.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between p-2 border rounded-lg bg-green-500/10 border-green-500/20">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
                                        <AvatarFallback>{friend.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{friend.displayName}</p>
                                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleToggleCloseFriend(friend.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                 <div className="text-center py-10 text-muted-foreground">
                    <p>You haven't added any close friends yet. Add followers from the list below.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Suggestions from Your Followers</CardTitle>
            <CardDescription>Select followers to add to your Close Friends list.</CardDescription>
            <Input 
                placeholder="Search followers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
            />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin"/></div>
            ) : filteredFollowers.length > 0 ? (
                <ScrollArea className="h-96">
                    <div className="space-y-2 pr-4">
                        {filteredFollowers.map(follower => {
                            const isCloseFriend = closeFriendIds.includes(follower.id);
                            if (isCloseFriend) return null; // Don't show if already in close friends list
                            return (
                                <div key={follower.id} className="flex items-center justify-between p-2 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={follower.avatarUrl} alt={follower.displayName} />
                                            <AvatarFallback>{follower.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{follower.displayName}</p>
                                            <p className="text-xs text-muted-foreground">@{follower.username}</p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant={'outline'} 
                                        size="sm"
                                        onClick={() => handleToggleCloseFriend(follower.id)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4" />
                    <p>You don't have any followers yet.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
