'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactionType, Reaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ThumbsUp } from 'lucide-react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const REACTION_OPTIONS = [
    { type: 'like' as const, emoji: '👍', label: 'Like', color: 'text-blue-500' },
    { type: 'love' as const, emoji: '❤️', label: 'Love', color: 'text-rose-500' },
    { type: 'haha' as const, emoji: '😂', label: 'Haha', color: 'text-amber-500' },
    { type: 'happy' as const, emoji: '😊', label: 'Happy', color: 'text-amber-400' },
    { type: 'sad' as const, emoji: '😢', label: 'Sad', color: 'text-blue-400' },
    { type: 'angry' as const, emoji: '😡', label: 'Angry', color: 'text-orange-600' },
];

function ReactorsList({ postId, parentCollection }: { postId: string, parentCollection: string }) {
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const reactionsColRef = collection(db, parentCollection, postId, 'reactions');
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
                    path: `${parentCollection}/${postId}/reactions`,
                    operation: 'list',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [postId, parentCollection]);

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
                                <AvatarFallback>{(react.user.username || 'U').substring(0,1).toUpperCase()}</AvatarFallback>
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

interface ReactionButtonProps {
    postId: string;
    parentCollection?: 'feedPosts' | 'broadcasts' | 'annotations';
    initialReactionsCount: number;
    reactionCounts?: Record<string, number>;
}

export default function ReactionButton({ postId, parentCollection = 'feedPosts', initialReactionsCount, reactionCounts = {} }: ReactionButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
    const [liveReactionsCount, setLiveReactionsCount] = useState(initialReactionsCount);
    const [liveReactionCounts, setLiveReactionCounts] = useState(reactionCounts);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user || !postId) return;
        const reactionRef = doc(db, parentCollection, postId, 'reactions', user.id);
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
    }, [postId, user, parentCollection]);

    useEffect(() => {
        if (!postId) return;
        const postRef = doc(db, parentCollection, postId);
        const unsubscribe = onSnapshot(postRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLiveReactionsCount(data.reactionsCount || 0);
                setLiveReactionCounts(data.reactionCounts || {});
            }
        });
        return () => unsubscribe();
    }, [postId, parentCollection]);

    const handleReaction = (type: ReactionType) => {
        if (!user || user.isAnonymous) {
            toast({ title: 'Please sign in to react.' });
            return;
        }
        
        setIsProcessing(true);
        setIsPickerOpen(false);
        
        const postRef = doc(db, parentCollection, postId);
        const reactionRef = doc(db, parentCollection, postId, 'reactions', user.id);

        runTransaction(db, async (transaction) => {
            const reactionDoc = await transaction.get(reactionRef);
            const postDoc = await transaction.get(postRef);

            if (!postDoc.exists()) throw "Target document does not exist.";

            const postData = postDoc.data();

            if (reactionDoc.exists()) {
                const existingType = reactionDoc.data().type;
                if (existingType === type) {
                    transaction.delete(reactionRef);
                    transaction.update(postRef, { 
                        reactionsCount: increment(-1),
                        [`reactionCounts.${existingType}`]: increment(-1)
                    });
                } else {
                    transaction.update(reactionRef, { type, timestamp: serverTimestamp() });
                    transaction.update(postRef, {
                        [`reactionCounts.${existingType}`]: increment(-1),
                        [`reactionCounts.${type}`]: increment(1)
                    });
                }
            } else {
                const reactionData = { 
                    userId: user.id, 
                    type,
                    timestamp: serverTimestamp(),
                    user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
                };
                // Use merge: true to prevent "Document already exists" errors during race conditions
                transaction.set(reactionRef, reactionData, { merge: true });
                transaction.update(postRef, { 
                    reactionsCount: increment(1),
                    [`reactionCounts.${type}`]: increment(1)
                });
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
            handleReaction('like');
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
    const summaryIcons = useMemo(() => {
        return REACTION_OPTIONS
            .filter(o => (liveReactionCounts[o.type] || 0) > 0)
            .sort((a,b) => (liveReactionCounts[b.type] || 0) - (liveReactionCounts[a.type] || 0))
            .slice(0, 3);
    }, [liveReactionCounts]);

    return (
        <div className="flex items-center gap-1 group">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 rounded-lg font-bold text-[10px] uppercase text-primary transition-all hover:bg-primary/5 active:scale-95" disabled={liveReactionsCount === 0}>
                        <div className="flex -space-x-1.5 mr-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            {summaryIcons.map(o => (
                                <span key={o.type} className="text-xs drop-shadow-sm">{o.emoji}</span>
                            ))}
                        </div>
                        {liveReactionsCount > 0 ? liveReactionsCount : ''}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs sm:max-w-sm rounded-[32px] border-none shadow-3xl">
                     <DialogHeader className="px-2 pt-2">
                        <DialogTitle className="font-headline text-xl">Reactions</DialogTitle>
                        <DialogDescription className="sr-only">List of people who reacted to this post</DialogDescription>
                    </DialogHeader>
                    <ReactorsList postId={postId} parentCollection={parentCollection} />
                </DialogContent>
            </Dialog>

            <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-9 px-4 gap-2 rounded-full transition-all duration-300 font-bold uppercase text-[10px] tracking-widest group",
                            currentOption ? "bg-muted/50 shadow-inner" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
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
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : currentOption ? (
                            <>
                                <span className="text-xl animate-in zoom-in-50 duration-500 transform-gpu drop-shadow-md">{currentOption.emoji}</span>
                                <span className={cn(currentOption.color, "animate-in slide-in-from-left-2 duration-500 font-black")}>{currentOption.label}</span>
                            </>
                        ) : (
                            <>
                                <ThumbsUp className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:-rotate-12" />
                                <span>Like</span>
                            </>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    side="top" 
                    align="start" 
                    sideOffset={8}
                    className="w-fit p-1.5 rounded-full bg-background/95 backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-4 zoom-in-90 duration-500 transform-gpu"
                >
                    <div className="flex items-center gap-1.5 px-0.5">
                        <TooltipProvider delayDuration={0}>
                            {REACTION_OPTIONS.map((option) => (
                                <Tooltip key={option.type}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => handleReaction(option.type)}
                                            className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 transform-gpu hover:scale-[1.25] hover:-translate-y-2 active:scale-90",
                                                userReaction === option.type && "bg-primary/20 shadow-inner scale-110"
                                            )}
                                        >
                                            <span className="text-2xl drop-shadow-lg select-none">{option.emoji}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={16} className="rounded-full bg-black/90 text-white border-none font-bold text-[9px] uppercase tracking-widest px-3 py-1 shadow-2xl">
                                        {option.label}
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </TooltipProvider>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
