
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactionType, Reaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';

const REACTION_OPTIONS = [
    { type: 'love' as const, emoji: '❤️', label: 'Love', color: 'text-red-500' },
    { type: 'like' as const, emoji: '👍', label: 'Like', color: 'text-blue-500' },
    { type: 'haha' as const, emoji: '😂', label: 'Haha', color: 'text-yellow-500' },
    { type: 'sad' as const, emoji: '😢', label: 'Sad', color: 'text-blue-400' },
    { type: 'angry' as const, emoji: '😡', label: 'Angry', color: 'text-orange-600' },
];

function ReactorsList({ postId }: { postId: string }) {
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const reactionsColRef = collection(db, 'feedPosts', postId, 'reactions');
        const unsubscribe = onSnapshot(
            reactionsColRef, 
            (snapshot) => {
                const results: Reaction[] = [];
                snapshot.forEach(doc => {
                    results.push({ id: doc.id, ...doc.data() } as Reaction);
                });
                setReactions(results);
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
    
    if (reactions.length === 0) {
        return <p className="p-8 text-center text-sm text-muted-foreground">No reactions yet.</p>;
    }

    return (
        <ScrollArea className="max-h-80">
            <div className="space-y-1 p-2">
                {reactions.map(react => (
                     <Link href={`/profile/${react.user.id}`} key={react.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors group">
                        <div className="relative">
                            <Avatar className="h-10 w-10 border border-border/20 group-hover:border-primary/30 transition-colors">
                                <AvatarImage src={react.user.avatarUrl} alt={react.user.displayName} />
                                <AvatarFallback>{react.user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border/10 flex items-center justify-center">
                                {REACTION_OPTIONS.find(o => o.type === react.type) && (
                                    <span className="text-[10px] drop-shadow-sm">
                                        {REACTION_OPTIONS.find(o => o.type === react.type)!.emoji}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm text-foreground">@{react.user.username}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{react.user.displayName || react.user.username}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </ScrollArea>
    );
}


export default function ReactionButton({ postId, initialReactionsCount }: { postId: string, initialReactionsCount: number }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
    const [reactionsCount, setReactionsCount] = useState(initialReactionsCount);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user || !postId) return;
        const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);
        const unsubscribe = onSnapshot(
            reactionRef, 
            (docSnap) => {
                if (docSnap.exists()) {
                    setUserReaction(docSnap.data().type as ReactionType);
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
        const unsubscribe = onSnapshot(postRef, (snap) => {
            if (snap.exists()) {
                setReactionsCount(snap.data().reactionsCount || 0);
            }
        });
        return () => unsubscribe();
    }, [postId]);

    const handleReaction = (type: ReactionType) => {
        if (!user || user.isAnonymous) {
            toast({ title: 'Please sign in to react.' });
            return;
        }
        
        setIsProcessing(true);
        setIsPickerOpen(false);
        
        const postRef = doc(db, 'feedPosts', postId);
        const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);

        runTransaction(db, async (transaction) => {
            const reactionDoc = await transaction.get(reactionRef);
            
            if (reactionDoc.exists()) {
                const existingType = reactionDoc.data().type;
                if (existingType === type) {
                    transaction.delete(reactionRef);
                    transaction.update(postRef, { reactionsCount: increment(-1) });
                } else {
                    transaction.update(reactionRef, { type, timestamp: serverTimestamp() });
                }
            } else {
                const reactionData = { 
                    userId: user.id, 
                    type,
                    timestamp: serverTimestamp(),
                    user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
                };
                transaction.set(reactionRef, reactionData);
                transaction.update(postRef, { reactionsCount: increment(1) });
            }
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: reactionRef.path,
                operation: 'write',
                requestResourceData: { type },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsProcessing(false);
        });
    };

    const handleDefaultToggle = () => {
        if (userReaction) {
            handleReaction(userReaction);
        } else {
            handleReaction('love');
        }
    };

    const startPress = () => {
        longPressTimer.current = setTimeout(() => {
            setIsPickerOpen(true);
        }, 500);
    };

    const endPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const currentOption = REACTION_OPTIONS.find(o => o.type === userReaction);
    const summaryIcons = REACTION_OPTIONS.slice(0, 3);

    return (
        <div className="flex items-center gap-1">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 rounded-lg font-bold text-[10px] uppercase text-primary transition-all hover:bg-primary/5 active:scale-95" disabled={reactionsCount === 0}>
                        <div className="flex -space-x-2 mr-0.5 opacity-80">
                            {summaryIcons.map(o => (
                                <span key={o.type} className="text-xs drop-shadow-sm">{o.emoji}</span>
                            ))}
                        </div>
                        {reactionsCount > 0 ? reactionsCount : ''}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs sm:max-w-sm rounded-3xl border-none shadow-3xl">
                     <DialogHeader>
                        <DialogTitle className="font-headline text-xl">Reactions</DialogTitle>
                        <DialogDescription className="sr-only">List of people who reacted to this post</DialogDescription>
                    </DialogHeader>
                    <ReactorsList postId={postId} />
                </DialogContent>
            </Dialog>

            <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "group h-10 w-10 rounded-full transition-all duration-300 transform-gpu",
                            currentOption ? "bg-muted/50 scale-110" : "text-muted-foreground hover:text-red-500"
                        )}
                        disabled={isProcessing}
                        onClick={handleDefaultToggle}
                        onMouseDown={startPress}
                        onMouseUp={endPress}
                        onMouseLeave={endPress}
                        onTouchStart={startPress}
                        onTouchEnd={endPress}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : currentOption ? (
                            <span className="text-2xl drop-shadow-md animate-in zoom-in-50 duration-300">{currentOption.emoji}</span>
                        ) : (
                            <span className="text-2xl grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">❤️</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    side="top" 
                    align="start" 
                    sideOffset={10}
                    className="w-fit p-1.5 rounded-full bg-card/95 backdrop-blur-xl border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-2 duration-300"
                >
                    <div className="flex items-center gap-1">
                        {REACTION_OPTIONS.map((option) => (
                            <TooltipProvider key={option.type}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReaction(option.type)}
                                    className={cn(
                                        "h-10 w-10 rounded-full hover:bg-muted transition-all hover:scale-125 hover:-translate-y-1 transform-gpu",
                                        userReaction === option.type && "bg-muted shadow-inner scale-110"
                                    )}
                                >
                                    <span className="text-2xl drop-shadow-md">{option.emoji}</span>
                                </Button>
                            </TooltipProvider>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
