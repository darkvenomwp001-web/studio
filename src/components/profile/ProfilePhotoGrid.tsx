
'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2, CameraOff } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Setting a reset date to clean the feed of old test posts
const FEED_RESET_DATE = new Date('2025-05-21T00:00:00Z');

interface ProfilePhotoGridProps {
    userId: string;
}

export default function ProfilePhotoGrid({ userId }: ProfilePhotoGridProps) {
    const [posts, setPosts] = useState<ThreadPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [previewingImage, setPreviewingImage] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        
        // Only fetch photo posts created after the reset date
        const postsQuery = query(
            collection(db, 'feedPosts'),
            where('author.id', '==', userId),
            where('timestamp', '>', Timestamp.fromDate(FEED_RESET_DATE)),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ThreadPost))
                .filter(post => post.imageUrl); // Filter for posts that have an image
            setPosts(fetchedPosts);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching user photo posts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);
    
    const handlePressStart = (imageUrl: string) => {
        timerRef.current = setTimeout(() => {
            setPreviewingImage(imageUrl);
        }, 800); // 800ms long press
    };

    const handlePressEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (previewingImage) {
             // Use a short delay to allow the preview to be seen briefly on mobile before closing
             setTimeout(() => setPreviewingImage(null), 100);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-16 bg-card rounded-lg border border-dashed">
                <CameraOff className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No recent photos posted yet.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-3 gap-1">
                {posts.map(post => (
                    <div
                        key={post.id}
                        className="relative aspect-square cursor-pointer group bg-muted"
                        onMouseDown={() => handlePressStart(post.imageUrl!)}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={() => handlePressStart(post.imageUrl!)}
                        onTouchEnd={handlePressEnd}
                    >
                        <Image
                            src={post.imageUrl!}
                            alt="User post"
                            layout="fill"
                            objectFit="cover"
                            className="group-hover:opacity-80 transition-opacity"
                        />
                    </div>
                ))}
            </div>
            
            <Dialog open={!!previewingImage} onOpenChange={(open) => !open && setPreviewingImage(null)}>
                <DialogContent className="p-0 border-0 bg-transparent shadow-none w-full max-w-2xl h-auto">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Image Preview</DialogTitle>
                        <DialogDescription>A larger view of the selected image.</DialogDescription>
                    </DialogHeader>
                    {previewingImage && (
                        <Image
                            src={previewingImage}
                            alt="Post preview"
                            width={1200}
                            height={1200}
                            className="rounded-lg object-contain w-full h-auto max-h-[80vh]"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
