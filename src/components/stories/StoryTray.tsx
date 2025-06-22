'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { UserSummary, UserStory } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader2, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StoryViewer from './StoryViewer';
import Link from 'next/link';

interface GroupedStory {
    author: UserSummary;
    stories: UserStory[];
}

export default function StoryTray() {
    const { user } = useAuth();
    const [groupedStories, setGroupedStories] = useState<GroupedStory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [viewerState, setViewerState] = useState<{
        isOpen: boolean;
        startIndex: number;
    }>({ isOpen: false, startIndex: 0 });

    useEffect(() => {
        if (!user || !user.followingIds) {
            setIsLoading(false);
            return;
        }

        const followedIds = [user.id, ...user.followingIds];
        
        // Firestore 'in' query is limited to 30 items. Slice if necessary.
        const idsToQuery = followedIds.length > 30 ? followedIds.slice(0, 30) : followedIds;

        if (idsToQuery.length === 0) {
            setIsLoading(false);
            return;
        }
        
        const storiesQuery = query(
            collection(db, 'userStories'),
            where('author.id', 'in', idsToQuery),
            where('expiresAt', '>', Timestamp.now()),
            orderBy('expiresAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
            const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserStory));
            
            const storiesByAuthor = new Map<string, GroupedStory>();

            for (const story of stories) {
                if (!storiesByAuthor.has(story.author.id)) {
                    storiesByAuthor.set(story.author.id, { author: story.author, stories: [] });
                }
                storiesByAuthor.get(story.author.id)!.stories.push(story);
            }
            
            const sortedGroupedStories = Array.from(storiesByAuthor.values())
                .sort((a, b) => {
                    // Put current user's story first if it exists
                    if (a.author.id === user.id) return -1;
                    if (b.author.id === user.id) return 1;
                    // Sort others by most recent story
                    const lastStoryA = a.stories[0]?.createdAt.toMillis() || 0;
                    const lastStoryB = b.stories[0]?.createdAt.toMillis() || 0;
                    return lastStoryB - lastStoryA;
                });

            setGroupedStories(sortedGroupedStories);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleOpenViewer = (index: number) => {
        setViewerState({ isOpen: true, startIndex: index });
    };

    if (!user) return null;

    return (
        <>
            {viewerState.isOpen && (
                <StoryViewer
                    groupedStories={groupedStories}
                    startIndex={viewerState.startIndex}
                    onClose={() => setViewerState({ isOpen: false, startIndex: 0 })}
                />
            )}
            
            <div className="w-full border-b pb-3">
                <div className="flex overflow-x-auto space-x-4 py-2 px-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
                    <Link href="/instapost" className="text-center w-16 flex-shrink-0">
                        <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-primary">
                                <PlusCircle className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium truncate">Add Story</span>
                        </div>
                    </Link>

                    {isLoading ? (
                         <div className="flex items-center text-muted-foreground text-sm"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading stories...</div>
                    ) : (
                        groupedStories.map((group, index) => (
                            <button key={group.author.id} onClick={() => handleOpenViewer(index)} className="flex-shrink-0 w-16 text-center group">
                                <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-pink-500 via-red-500 group-hover:scale-105 transition-transform">
                                    <div className="bg-background p-0.5 rounded-full h-full w-full">
                                         <Avatar className="h-full w-full">
                                            <AvatarImage src={group.author.avatarUrl} alt={group.author.username} data-ai-hint="profile person" />
                                            <AvatarFallback>{group.author.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-muted-foreground truncate mt-1 group-hover:text-primary">{group.author.displayName || group.author.username}</p>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
