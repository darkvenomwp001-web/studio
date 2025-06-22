
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserStory, UserSummary } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { X, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface GroupedStory {
    author: UserSummary;
    stories: UserStory[];
}

interface StoryViewerProps {
    groupedStories: GroupedStory[];
    startIndex: number;
    onClose: () => void;
}

export default function StoryViewer({ groupedStories, startIndex, onClose }: StoryViewerProps) {
    const [currentUserIndex, setCurrentUserIndex] = useState(startIndex);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const activeGroup = groupedStories[currentUserIndex];
    const activeStory = activeGroup?.stories[currentStoryIndex];

    const advanceStory = useCallback(() => {
        if (isPaused) return;

        const storiesForCurrentUser = groupedStories[currentUserIndex]?.stories;
        if (currentStoryIndex < storiesForCurrentUser.length - 1) {
            // Go to next story for the same user
            setCurrentStoryIndex(prev => prev + 1);
        } else if (currentUserIndex < groupedStories.length - 1) {
            // Go to the first story of the next user
            setCurrentUserIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
        } else {
            // Last story of the last user, close the viewer
            onClose();
        }
    }, [currentStoryIndex, currentUserIndex, groupedStories, isPaused, onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = 'auto';
            window.removeEventListener('keydown', handleKeyDown);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [onClose]);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(advanceStory, 5000); // 5 seconds per story

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [currentStoryIndex, currentUserIndex, advanceStory]);

    const handleNext = () => {
        advanceStory();
    };

    const handlePrev = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
            // Go to the last story of the previous user
            const prevUserStories = groupedStories[currentUserIndex - 1]?.stories;
            setCurrentStoryIndex(prevUserStories.length - 1);
        }
    };
    
    const pauseTimer = () => setIsPaused(true);
    const resumeTimer = () => setIsPaused(false);

    if (!activeStory || !activeGroup) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-in fade-in"
            onMouseDown={pauseTimer}
            onMouseUp={resumeTimer}
            onTouchStart={pauseTimer}
            onTouchEnd={resumeTimer}
        >
            <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                    {activeGroup.stories.map((story, index) => (
                        <div key={story.id} className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full bg-white transition-all duration-300", 
                                    index < currentStoryIndex && 'w-full',
                                    index === currentStoryIndex && isPaused && 'w-full',
                                    index === currentStoryIndex && !isPaused && 'animate-[width-grow_5s_linear_forwards]',
                                    index > currentStoryIndex && 'w-0'
                                )}
                                style={{
                                    animationPlayState: isPaused ? 'paused' : 'running',
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/profile/${activeGroup.author.id}`} onClick={onClose}>
                            <Avatar className="h-10 w-10 border-2 border-white/80">
                                <AvatarImage src={activeGroup.author.avatarUrl} alt={activeGroup.author.username} data-ai-hint="profile person" />
                                <AvatarFallback>{activeGroup.author.username.substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <Link href={`/profile/${activeGroup.author.id}`} onClick={onClose} className="font-semibold text-white drop-shadow-sm hover:underline">{activeGroup.author.displayName}</Link>
                            <p className="text-xs text-white/80 drop-shadow-sm">{formatDistanceToNowStrict(activeStory.createdAt.toDate())} ago</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 hover:text-white">
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className={cn("relative flex items-center justify-center p-8 h-full w-full max-w-sm aspect-[9/16] rounded-lg overflow-hidden", activeStory.backgroundColor)}>
                <p className="text-center text-xl md:text-2xl font-medium text-white drop-shadow-md whitespace-pre-line">{activeStory.content}</p>
            </div>
            
             <div className="absolute bottom-0 left-0 right-0 p-4 z-20 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                    <Heart className="h-6 w-6" />
                </Button>
                 <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                    <MessageCircle className="h-6 w-6" />
                </Button>
            </div>

            <div className="absolute inset-y-0 left-0 w-1/2 z-10" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/2 z-10" onClick={handleNext} />
        </div>
    );
}

// Add keyframes to globals.css or tailwind.config.js for width-grow
// In tailwind.config.ts:
// keyframes: {
//   'width-grow': {
//     '0%': { width: '0%' },
//     '100%': { width: '100%' },
//   },
// },
// animation: {
//   'width-grow': 'width-grow linear forwards',
// },
