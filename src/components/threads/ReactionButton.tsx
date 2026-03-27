
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactionType, UserSummary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart } from 'lucide-react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loveAnimation } from './reactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface ReactionButtonProps {
    postId: string;
    initialReactionsCount: number;
}

function ReactorsList({ postId }: { postId: string }) {
    const [reactors, setReactors] = useState<UserSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const reactionsColRef = collection(db, 'feedPosts', postId, 'reactions');
        const unsubscribe = onSnapshot(
            reactionsColRef, 
            (snapshot) => {
                const users: UserSummary[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if(data.user) {
                        users.push(data.user);
                    }
                });
                setReactors(users);
                setIsLoading(false);
            },
            async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: `feedPosts/${postId}/reactions`,
                    operation: 'list',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [postId]);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    if (reactors.length === 0) {
        return <p className="p-8 text-center text-sm text-muted-foreground">No loves yet.</p>;
    }

    return (
        <ScrollArea className="max-h-80">
            <div className="space-y-1 p-2">
                {reactors.map(user => (
                     <Link href={`/profile/${user.id}`} key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors group">
                        <Avatar className="h-10 w-10 border border-border/20 group-hover:border-primary/30 transition-colors">
                            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                            <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-bold text-sm text-foreground">@{user.username}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{user.displayName || user.username}</p>
                        </div>
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
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!user || !postId) return;
        const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);
        const unsubscribe = onSnapshot(
            reactionRef, 
            (doc) => {
                if (doc.exists()) {
                    setUserReaction(doc.data().type as ReactionType);
                } else {
                    setUserReaction(null);
                }
            },
            async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: reactionRef.path,
                    operation: 'get',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
        );
        return () => unsubscribe();
    }, [postId, user]);

    useEffect(() => {
        if (!postId) return;
        const postRef = doc(db, 'feedPosts', postId);
        const unsubscribe = onSnapshot(
            postRef, 
            (doc) => {
                if (doc.exists()) {
                    setReactionsCount(doc.data().reactionsCount || 0);
                }
            },
            async (serverError) => {
                // Ignore general read errors here as they are handled by the main feed listener
            }
        );
        return () => unsubscribe();
    }, [postId]);

    const handleReaction = (reactionType: ReactionType) => {
        if (!user || user.isAnonymous) {
            toast({ title: 'Please sign in to react.' });
            return;
        }
        
        setIsProcessing(true);
        const oldReaction = userReaction;
        
        // Optimistic UI updates (visual only)
        setUserReaction(oldReaction === reactionType ? null : reactionType);

        const plainUser: UserSummary = {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        };

        const postRef = doc(db, 'feedPosts', postId);
        const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);

        runTransaction(db, async (transaction) => {
            const reactionDoc = await transaction.get(reactionRef);
            
            if (reactionDoc.exists()) {
                transaction.delete(reactionRef);
                transaction.update(postRef, { reactionsCount: increment(-1) });
            } else {
                const reactionData = { 
                    userId: user.id, 
                    type: reactionType,
                    timestamp: serverTimestamp(),
                    user: plainUser
                };
                transaction.set(reactionRef, reactionData);
                transaction.update(postRef, { reactionsCount: increment(1) });
            }
        })
        .catch(async (serverError) => {
            // Revert optimistic state
            setUserReaction(oldReaction);
            
            const permissionError = new FirestorePermissionError({
                path: reactionRef.path,
                operation: 'write',
                requestResourceData: { type: reactionType },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsProcessing(false);
        });
    };
    
    return (
        <div className="flex items-center gap-1">
             <Dialog>
                <DialogTrigger asChild>
                    <button disabled={reactionsCount === 0} className="text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors px-2 disabled:opacity-50 disabled:hover:text-muted-foreground">
                        {reactionsCount > 0 ? reactionsCount : ''}
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl">
                     <DialogHeader>
                        <DialogTitle className="font-headline">Loves</DialogTitle>
                    </DialogHeader>
                    <ReactorsList postId={postId} />
                </DialogContent>
            </Dialog>
            <Button
                variant="ghost"
                size="icon"
                className="group h-10 w-10 rounded-full"
                disabled={isProcessing}
                onClick={() => handleReaction('love')}
            >
                {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                ) : (
                    <div className="w-10 h-10 relative flex items-center justify-center">
                        <Lottie 
                            animationData={loveAnimation}
                            loop={false}
                            autoplay={userReaction === 'love'}
                            className={cn(
                                "absolute inset-0 w-20 h-20 -top-5 -left-5 transition-opacity pointer-events-none", 
                                userReaction === 'love' ? 'opacity-100' : 'opacity-0'
                            )}
                        />
                         <Heart className={cn(
                             "w-5 h-5 transition-all duration-300", 
                             userReaction === 'love' ? "text-red-500 fill-red-500 scale-110" : "text-muted-foreground group-hover:text-red-500 group-hover:scale-110"
                         )} />
                    </div>
                )}
            </Button>
        </div>
    );
}
