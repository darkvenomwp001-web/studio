
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Lottie from 'lottie-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactionType } from '@/types';
import { toggleReaction } from '@/app/actions/threadActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { likeAnimation, loveAnimation, hahaAnimation, wowAnimation, sadAnimation } from './reactions';

interface ReactionButtonProps {
    postId: string;
    reactions: { [key: string]: ReactionType };
}

const reactionTypes: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad'];
const reactionAnimations: { [key in ReactionType]: any } = {
    like: likeAnimation,
    love: loveAnimation,
    haha: hahaAnimation,
    wow: wowAnimation,
    sad: sadAnimation,
};
const reactionLabels: { [key in ReactionType]: string } = {
    like: 'Like',
    love: 'Love',
    haha: 'Haha',
    wow: 'Wow',
    sad: 'Sad',
};

export default function ReactionButton({ postId, reactions: initialReactions }: ReactionButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [reactions, setReactions] = useState(initialReactions || {});
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const currentUserReaction = user ? reactions[user.id] as ReactionType | undefined : undefined;
    const totalReactions = Object.keys(reactions).length;

    useEffect(() => {
        setReactions(initialReactions || {});
    }, [initialReactions]);

    const handleReaction = async (reactionType: ReactionType) => {
        if (!user || user.isAnonymous) {
            toast({ title: 'Please sign in to react.' });
            return;
        }
        
        setIsProcessing(true);
        setIsPopoverOpen(false);

        // Optimistic update
        const oldReactions = { ...reactions };
        const newReactions = { ...reactions };
        if (newReactions[user.id] === reactionType) {
            delete newReactions[user.id]; // User is un-reacting
        } else {
            newReactions[user.id] = reactionType;
        }
        setReactions(newReactions);

        const result = await toggleReaction(postId, reactionType);
        if (!result.success) {
            // Revert on error
            setReactions(oldReactions);
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsProcessing(false);
    };
    
    const DefaultIcon = () => (
        <Lottie
            animationData={likeAnimation}
            loop={false}
            autoplay={false}
            className="w-6 h-6"
        />
    );

    const CurrentReactionIcon = () => {
        if (!currentUserReaction) return <DefaultIcon />;
        return (
            <Lottie
                animationData={reactionAnimations[currentUserReaction]}
                loop={true}
                autoplay={true}
                className="w-6 h-6"
            />
        );
    };

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="group" disabled={isProcessing}>
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                             <div className={cn(!currentUserReaction && "group-hover:scale-110 transition-transform")}>
                                <CurrentReactionIcon />
                             </div>
                             <span className={cn(
                                "font-semibold",
                                currentUserReaction === 'love' && 'text-red-500',
                                currentUserReaction === 'like' && 'text-blue-500',
                                (currentUserReaction === 'haha' || currentUserReaction === 'wow') && 'text-yellow-500',
                                currentUserReaction === 'sad' && 'text-yellow-500',
                             )}>
                               {currentUserReaction ? reactionLabels[currentUserReaction] : 'React'}
                             </span>
                             {totalReactions > 0 && <span>{totalReactions}</span>}
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
                            className="p-1 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
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

