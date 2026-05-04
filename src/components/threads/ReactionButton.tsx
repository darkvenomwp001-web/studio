
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactionType, UserSummary, Reaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, ThumbsUp, Smile, Frown, Angry } from 'lucide-react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loveAnimation } from './reactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const REACTION_OPTIONS = [
    { type: 'love' as const, icon: Heart, label: 'Love', color: 'text-red-500', fillColor: 'fill-red-500', lottie: true },
    { type: 'like' as const, icon: ThumbsUp, label: 'Like', color: 'text-blue-500', fillColor: 'fill-blue-500' },
    { type: 'haha' as const, icon: Smile, label: 'Haha', color: 'text-yellow-500', fillColor: 'fill-yellow-500' },
    { type: 'sad' as const, icon: Frown, label: 'Sad', color: 'text-blue-400', fillColor: 'fill-blue-400' },
    { type: 'angry' as const, icon: Angry, label: 'Angry', color: 'text-orange-600', fillColor: 'fill-orange-600' },
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
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border/10">
                                {REACTION_OPTIONS.find(o => o.type === react.type)?.icon && (
                                    (() => {
                                        const Option = REACTION_OPTIONS.find(o => o.type === react.type)!;
                                        return <Option.icon className={cn("h-3 w-3", Option.color, Option.fillColor)} />;
                                    })()
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
        const oldReaction = userReaction;
        
        const postRef = doc(db, 'feedPosts', postId);
        const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);

        runTransaction(db, async (transaction) => {
            const reactionDoc = await transaction.get(reactionRef);
            
            if (reactionDoc.exists()) {
                const existingType = reactionDoc.data().type;
                if (existingType === type) {
                    // Toggle off if same type
                    transaction.delete(reactionRef);
                    transaction.update(postRef, { reactionsCount: increment(-1) });
                } else {
                    // Update type if different
                    transaction.update(reactionRef, { type, timestamp: serverTimestamp() });
                }
            } else {
                // New reaction
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
            handleReaction(userReaction); // Toggles off current
        } else {
            handleReaction('love'); // Defaults to love
        }
    };

    const startPress = () => {
        longPressTimer.current = setTimeout(() => {
            setIsPickerOpen(true);
        }, 500); // 500ms long press
    };

    const endPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const currentOption = REACTION_OPTIONS.find(o => o.type === userReaction);

    return (
        <div className="flex items-center gap-1">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 rounded-lg font-bold text-[10px] uppercase text-primary transition-all hover:bg-primary/5 active:scale-95" disabled={reactionsCount === 0}>
                        <div className="flex -space-x-1.5 mr-0.5">
                            {REACTION_OPTIONS.slice(0, 3).map(o => (
                                <div key={o.type} className={cn("p-0.5 rounded-full bg-background border border-border/10", o.color)}>
                                    <o.icon className="h-2.5 w-2.5 fill-current" />
                                </div>
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
                            "group h-10 w-10 rounded-full transition-all duration-300",
                            currentOption ? currentOption.color : "text-muted-foreground hover:text-red-500"
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
                        ) : currentOption?.lottie ? (
                            <div className="w-10 h-10 relative flex items-center justify-center">
                                <Lottie 
                                    animationData={loveAnimation}
                                    loop={false}
                                    autoplay={userReaction === 'love'}
                                    className="absolute inset-0 w-20 h-20 -top-5 -left-5 transition-opacity"
                                />
                                <Heart className={cn("w-5 h-5 fill-current scale-110")} />
                            </div>
                        ) : currentOption ? (
                            <currentOption.icon className="w-5 h-5 fill-current animate-in zoom-in-50 duration-300" />
                        ) : (
                            <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    side="top" 
                    align="start" 
                    sideOffset={10}
                    className="w-fit p-1.5 rounded-full bg-card/90 backdrop-blur-xl border-white/10 shadow-3xl animate-in slide-in-from-bottom-2 duration-300"
                >
                    <div className="flex items-center gap-1">
                        {REACTION_OPTIONS.map((option) => (
                            <TooltipProvider key={option.type}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReaction(option.type)}
                                    className={cn(
                                        "h-10 w-10 rounded-full hover:bg-muted transition-all hover:scale-125 hover:-translate-y-1",
                                        option.color,
                                        userReaction === option.type && "bg-muted shadow-inner scale-110"
                                    )}
                                >
                                    <option.icon className={cn("h-6 w-6", option.fillColor)} />
                                </Button>
                            </TooltipProvider>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
