
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2, CameraOff, Trash2, X, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteThreadPost } from '@/app/actions/threadActions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Setting a reset date to clean the feed of old test posts
const FEED_RESET_DATE = new Date('2025-05-21T00:00:00Z');

interface ProfilePhotoGridProps {
    userId: string;
    isOwnProfile?: boolean;
}

export default function ProfilePhotoGrid({ userId, isOwnProfile }: ProfilePhotoGridProps) {
    const [posts, setPosts] = useState<ThreadPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<ThreadPost | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();
    const { toast } = useToast();
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
    
    const handlePressStart = (post: ThreadPost) => {
        timerRef.current = setTimeout(() => {
            setSelectedPost(post);
        }, 800); // 800ms long press
    };

    const handlePressEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleDeletePost = () => {
        if (!selectedPost || !isOwnProfile) return;
        startDeleteTransition(async () => {
            const result = await deleteThreadPost(selectedPost.id, userId);
            if (result.success) {
                toast({ title: "Post deleted" });
                setSelectedPost(null);
            } else {
                toast({ title: "Error deleting post", description: result.error, variant: 'destructive' });
            }
        });
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
                        onClick={() => setSelectedPost(post)}
                        onMouseDown={() => handlePressStart(post)}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={() => handlePressStart(post)}
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
            
            <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
                <DialogContent className="p-0 border-0 bg-black shadow-none w-screen h-screen sm:h-auto sm:max-w-2xl flex flex-col items-center justify-center">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Image Preview</DialogTitle>
                        <DialogDescription>A larger view of the selected post.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        {isOwnProfile && selectedPost && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-10 w-10 rounded-full shadow-lg">
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently remove this photo from your feed and profile. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Delete Post
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/20 hover:bg-black/40 text-white">
                                <X className="h-6 w-6" />
                            </Button>
                        </DialogClose>
                    </div>

                    {selectedPost?.imageUrl && (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <Image
                                src={selectedPost.imageUrl}
                                alt="Post preview"
                                width={1200}
                                height={1200}
                                className="object-contain max-h-[90vh] w-auto"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
