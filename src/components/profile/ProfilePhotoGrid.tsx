'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2, CameraOff, Grid, List, Heart, MessageCircle } from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ThreadPostCard from '../threads/ThreadPostCard';

const FEED_RESET_DATE = new Date('2025-05-21T00:00:00Z');

interface ProfilePhotoGridProps {
    userId: string;
    isOwnProfile?: boolean;
}

export default function ProfilePhotoGrid({ userId, isOwnProfile }: ProfilePhotoGridProps) {
    const [posts, setPosts] = useState<ThreadPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        
        const postsQuery = query(
            collection(db, 'feedPosts'),
            where('author.id', '==', userId),
            where('timestamp', '>', Timestamp.fromDate(FEED_RESET_DATE)),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ThreadPost))
                .filter(post => post.imageUrl);
            setPosts(fetchedPosts);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching user photo posts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-32 bg-card/40 rounded-[40px] border-2 border-dashed border-border/40 max-w-2xl mx-auto">
                <CameraOff className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-headline font-bold text-foreground">No visual archives</h3>
                <p className="text-sm text-muted-foreground px-8">This author hasn't shared any community snapshots yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Immersive View Switcher */}
            <div className="flex justify-center border-t border-border/20 pt-6">
                <div className="flex items-center gap-1 bg-muted/40 p-1.5 rounded-full border border-border/20 shadow-inner">
                    <Button 
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "rounded-full h-10 px-8 gap-2.5 font-bold text-[10px] uppercase tracking-[0.1em] transition-all duration-300",
                            viewMode === 'grid' ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Grid className="h-4 w-4" /> Grid
                    </Button>
                    <Button 
                        variant={viewMode === 'feed' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setViewMode('feed')}
                        className={cn(
                            "rounded-full h-10 px-8 gap-2.5 font-bold text-[10px] uppercase tracking-[0.1em] transition-all duration-300",
                            viewMode === 'feed' ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <List className="h-4 w-4" /> Feed
                    </Button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-1 md:gap-4 pb-20">
                    {posts.map(post => (
                        <div
                            key={post.id}
                            className="relative aspect-square cursor-pointer group bg-muted overflow-hidden rounded-md md:rounded-[2.5rem] border border-border/10 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                        >
                            <NextImage
                                src={post.imageUrl!}
                                alt="Archive item"
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                            />
                            {/* High-Fidelity Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                <div className="flex items-center gap-6 text-white scale-90 group-hover:scale-100 transition-transform duration-500">
                                    <div className="flex flex-col items-center gap-1">
                                        <Heart className="h-6 w-6 fill-primary text-primary drop-shadow-lg" />
                                        <span className="text-xs font-bold font-mono">{post.reactionsCount || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <MessageCircle className="h-6 w-6 fill-white text-white drop-shadow-lg" />
                                        <span className="text-xs font-bold font-mono">{post.commentsCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="max-w-xl mx-auto space-y-10 pb-20 animate-in slide-in-from-bottom-4 duration-700">
                    {posts.map(post => (
                        <ThreadPostCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}