
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Reaction, ReactionType, UserSummary } from '@/types';
import { toggleReaction } from '@/app/actions/threadActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart } from 'lucide-react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { loveAnimation } from './reactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';

interface ReactionButtonProps {
    postId: string;
    initialReactionsCount: number;
}

const reactionConfig = {
    love: {
        animation: loveAnimation,
        label: 'Love'
    }
};

function ReactorsList({ postId }: { postId: string }) {
    const [reactors, setReactors] = useState<UserSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const reactionsColRef = collection(db, 'feedPosts', postId, 'reactions');
        const unsubscribe = onSnapshot(reactionsColRef, (snapshot) => {
            const users: UserSummary[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if(data.user) {
                    users.push(data.user);
                }
            });
            setReactors(users);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [postId]);

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }
    
    if (reactors.length === 0) {
        return <p className="p-4 text-center text-sm text-muted-foreground">No reactions yet.</p>;
    }

    return (
        <ScrollArea className="max-h-64">
            <div className="space-y-2 p-4">
                {reactors.map(user => (
                     <Link href={`/profile/${user.id}`} key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                            <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{user.displayName || user.username}</span>
                    </Link>
                ))}
            </div>
        </ScrollArea>
    );
}


export default function ReactionButton({ postId, initialReactionsCount }: ReactionButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
    const [reactionsCount, setReactionsCount] = useState(initialReactionsCount);
    const [isProcessing, startTransition] = useTransition();

    useEffect(() => {
        if (!user || !postId) return;
        const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);
        const unsubscribe = onSnapshot(reactionRef, (doc) => {
            if (doc.exists()) {
                setUserReaction(doc.data().type as ReactionType);
            } else {
                setUserReaction(null);
            }
        });
        return () => unsubscribe();
    }, [postId, user]);

    useEffect(() => {
        if (!postId) return;
        const postRef = doc(db, 'feedPosts', postId);
        const unsubscribe = onSnapshot(postRef, (doc) => {
            if (doc.exists()) {
                setReactionsCount(doc.data().reactionsCount || 0);
            }
        });
        return () => unsubscribe();
    }, [postId]);

    const handleReaction = (reactionType: ReactionType) => {
        if (!user || user.isAnonymous) {
            toast({ title: 'Please sign in to react.' });
            return;
        }
        
        startTransition(async () => {
            const oldReaction = userReaction;
            
            // Optimistic UI updates
            setUserReaction(oldReaction === reactionType ? null : reactionType);

            const plainUser: UserSummary = {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
            };

            const result = await toggleReaction(postId, plainUser, reactionType);

            if (!result.success) {
                // Revert on failure
                setUserReaction(oldReaction);
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };
    
    return (
        <div className="flex items-center gap-2">
             <Dialog>
                <DialogTrigger asChild>
                    <button disabled={reactionsCount === 0} className="text-sm text-muted-foreground hover:underline disabled:no-underline disabled:cursor-not-allowed">
                        {reactionsCount > 0 && <span>{reactionsCount} {reactionsCount === 1 ? 'love' : 'loves'}</span>}
                    </button>
                </DialogTrigger>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Reactions</DialogTitle>
                    </DialogHeader>
                    <ReactorsList postId={postId} />
                </DialogContent>
            </Dialog>
            <Button
                variant="ghost"
                size="icon"
                className="group h-8 w-8"
                disabled={isProcessing}
                onClick={() => handleReaction('love')}
            >
                {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <div className="w-8 h-8 relative">
                        <Lottie 
                            animationData={loveAnimation}
                            loop={false}
                            autoplay={false}
                            className={cn("absolute inset-0 w-16 h-16 -top-4 -left-4 transition-opacity", userReaction === 'love' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                            style={{
                                transform: userReaction === 'love' ? 'scale(1)' : 'scale(0.8)'
                            }}
                        />
                         <Heart className={cn("w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all", userReaction === 'love' ? "text-red-500 fill-red-500" : "text-muted-foreground group-hover:text-red-500")} />
                    </div>
                )}
            </Button>
        </div>
    );
}
