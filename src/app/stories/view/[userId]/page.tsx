
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { UserStory, UserSummary } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { X, Heart, MessageCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

export default function ViewUserStoriesPage() {
    const params = useParams();
    const router = useRouter();
    const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

    const [stories, setStories] = useState<UserStory[]>([]);
    const [author, setAuthor] = useState<UserSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!userId) {
            router.push('/');
            return;
        }
        setIsLoading(true);
        const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
        
        const q = query(
            collection(db, 'userStories'),
            where('authorId', '==', userId),
            where('expiresAt', '>=', twentyFourHoursAgo),
            orderBy('expiresAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserStory));
            if (fetchedStories.length > 0) {
                setStories(fetchedStories);
                setAuthor(fetchedStories[0].author);
            } else {
                setStories([]);
                // If no stories are found, redirect back.
                router.back();
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching stories:", error);
            setIsLoading(false);
            router.back();
        });

        return () => unsubscribe();
    }, [userId, router]);

    const activeStory = stories[currentStoryIndex];

    const advanceStory = useCallback(() => {
        if (isPaused) return;

        if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
            router.back();
        }
    }, [currentStoryIndex, stories.length, isPaused, router]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') router.back();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = 'auto';
            window.removeEventListener('keydown', handleKeyDown);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [router]);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (activeStory?.type !== 'video') {
            timerRef.current = setTimeout(advanceStory, 5000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [currentStoryIndex, advanceStory, activeStory?.type]);
    
    useEffect(() => {
        if (activeStory?.type === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(e => console.error("Video autoplay failed:", e));
        }
    }, [activeStory]);

    const handleNext = () => {
        advanceStory();
    };

    const handlePrev = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        }
    };
    
    const pauseTimer = () => setIsPaused(true);
    const resumeTimer = () => setIsPaused(false);

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
        );
    }
    
    if (!activeStory || !author) {
        // This case is handled by the redirect in useEffect, but as a fallback:
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
                <p className="text-white">Could not load stories.</p>
            </div>
        );
    }

    const renderContent = () => {
        switch(activeStory.type) {
            case 'text':
                return <p className="text-center text-xl md:text-2xl font-medium text-white drop-shadow-md whitespace-pre-line p-4">{activeStory.content}</p>;
            case 'image':
                return <Image src={activeStory.content} alt={`Story from ${author.displayName}`} layout="fill" objectFit="contain" />;
            case 'video':
                return <video ref={videoRef} src={activeStory.content} className="w-full h-full object-contain" autoPlay muted onEnded={advanceStory} playsInline />;
            default:
                return null;
        }
    }

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
                    {stories.map((story, index) => (
                        <div key={story.id} className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full bg-white", 
                                    index < currentStoryIndex && 'w-full',
                                    index > currentStoryIndex && 'w-0',
                                    index === currentStoryIndex && activeStory.type !== 'video' && 'animate-[width-grow_5s_linear]',
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
                        <Link href={`/profile/${author.id}`}>
                            <Avatar className="h-10 w-10 border-2 border-white/80">
                                <AvatarImage src={author.avatarUrl} alt={author.username} data-ai-hint="profile person" />
                                <AvatarFallback>{author.username.substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <Link href={`/profile/${author.id}`} className="font-semibold text-white drop-shadow-sm hover:underline">{author.displayName}</Link>
                            <p className="text-xs text-white/80 drop-shadow-sm">{formatDistanceToNowStrict(activeStory.createdAt.toDate())} ago</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/20 hover:text-white">
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className={cn("relative flex items-center justify-center p-0 h-full w-full max-w-sm aspect-[9/16] rounded-lg overflow-hidden", activeStory.type === 'text' && activeStory.backgroundColor)}>
                {renderContent()}
            </div>
            
             <div className="absolute bottom-0 left-0 right-0 p-4 z-20 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                    <Heart className="h-6 w-6" />
                </Button>
                 <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                    <MessageCircle className="h-6 w-6" />
                </Button>
            </div>

            <div className="absolute inset-y-0 right-0 w-1/2 z-10" onClick={handleNext} />
            <div className="absolute inset-y-0 left-0 w-1/2 z-10" onClick={handlePrev} />
        </div>
    );
}
