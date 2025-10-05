
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Lottie from 'lottie-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Reaction, ReactionType } from '@/types';
import { toggleReaction } from '@/app/actions/threadActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ThumbsUp } from 'lucide-react';
import { likeAnimation, loveAnimation, hahaAnimation, wowAnimation, sadAnimation, angryAnimation } from './reactions';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReactionButtonProps {
    postId: string;
    initialReactionsCount: number;
}

const reactionTypes: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
const reactionAnimations: { [key in ReactionType]: any } = {
    like: likeAnimation,
    love: loveAnimation,
    haha: hahaAnimation,
    wow: wowAnimation,
    sad: sadAnimation,
    angry: angryAnimation,
};
const reactionLabels: { [key in ReactionType]: string } = {
    like: 'Like',
    love: 'Love',
    haha: 'Haha',
    wow: 'Wow',
    sad: 'Sad',
    angry: 'Angry',
};

export default function ReactionButton({ postId, initialReactionsCount }: ReactionButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [currentUserReaction, setCurrentUserReaction] = useState<ReactionType | null>(null);
    const [reactionsCount, setReactionsCount] = useState(initialReactionsCount);
    const [isProcessing, startTransition] = useTransition();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    useEffect(() => {
        if (!user || !postId) return;
        const reactionRef = doc(db, 'feedPosts', postId, 'reactions', user.id);
        const unsubscribe = onSnapshot(reactionRef, (doc) => {
            if (doc.exists()) {
                setCurrentUserReaction(doc.data().type as ReactionType);
            } else {
                setCurrentUserReaction(null);
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
        
        setIsPopoverOpen(false);

        startTransition(async () => {
            const oldReaction = currentUserReaction;
            const oldReactionsCount = reactionsCount;
            
            const isRemovingReaction = oldReaction === reactionType;

            // Optimistic UI updates
            if (isRemovingReaction) {
                setCurrentUserReaction(null);
                if (oldReaction !== null) setReactionsCount(prev => Math.max(0, prev - 1));
            } else {
                const hadReactionBefore = oldReaction !== null;
                setCurrentUserReaction(reactionType);
                if (!hadReactionBefore) {
                    setReactionsCount(prev => prev + 1);
                }
            }
            
            const result = await toggleReaction(postId, user.id, reactionType);

            if (!result.success) {
                 // Revert optimistic UI updates on failure
                setCurrentUserReaction(oldReaction);
                setReactionsCount(oldReactionsCount);
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };
    
    const DefaultIcon = () => (
        <ThumbsUp className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    );

    const CurrentReactionIcon = () => {
        if (!currentUserReaction) return <DefaultIcon />;
        const animation = reactionAnimations[currentUserReaction];
        if (!animation) return <DefaultIcon />;
        return (
            <Lottie
                animationData={animation}
                loop={true}
                autoplay={true}
                className="w-6 h-6"
            />
        );
    };

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                 <Button
                    variant="ghost"
                    size="sm"
                    className="group"
                    disabled={isProcessing}
                    onClick={() => {
                        if (!user || user.isAnonymous) {
                            toast({ title: 'Please sign in to react.' });
                            return;
                        }
                        if (currentUserReaction) {
                            handleReaction(currentUserReaction);
                        } else {
                            setIsPopoverOpen(true);
                        }
                    }}
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-1.5">
                             <div className={cn(!currentUserReaction && "group-hover:scale-110 transition-transform")}>
                                <CurrentReactionIcon />
                             </div>
                             <span className={cn(
                                "font-semibold text-sm",
                                currentUserReaction === 'love' ? 'text-red-500' :
                                currentUserReaction === 'like' ? 'text-blue-500' :
                                currentUserReaction === 'haha' ? 'text-yellow-500' :
                                currentUserReaction === 'wow' ? 'text-amber-500' :
                                currentUserReaction === 'sad' ? 'text-blue-400' :
                                currentUserReaction === 'angry' ? 'text-orange-600' :
                                'text-muted-foreground group-hover:text-primary'
                             )}>
                               {currentUserReaction ? reactionLabels[currentUserReaction] : 'Like'}
                             </span>
                             {reactionsCount > 0 && <span className="text-sm text-muted-foreground font-medium">{reactionsCount}</span>}
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1">
                <div className="flex gap-1">
                    {reactionTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => handleReaction(type)}
                            className="p-1 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-transform hover:scale-110"
                            aria-label={reactionLabels[type]}
                        >
                            <Lottie
                                animationData={reactionAnimations[type]}
                                loop={true}
                                autoplay={true}
                                className="w-8 h-8"
                            />
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
