

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CommentSection from '@/components/comments/CommentSection';
import { Loader2, ArrowLeft, Quote } from 'lucide-react';
import type { Story, Chapter } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function CommentsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const storyId = Array.isArray(params.storyId) ? params.storyId[0] : params.storyId;
    const chapterId = Array.isArray(params.chapterId) ? params.chapterId[0] : params.chapterId;
    const quote = searchParams.get('quote');

    const [story, setStory] = useState<Story | null>(null);
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        if (!storyId || !chapterId) {
            toast({ title: "Error", description: "Missing story or chapter ID.", variant: "destructive" });
            router.push('/');
            return;
        }

        const fetchHeaderData = async () => {
            setIsLoading(true);
            try {
                const storyDocRef = doc(db, 'stories', storyId);
                const storySnap = await getDoc(storyDocRef);

                if (storySnap.exists()) {
                    const storyData = { id: storySnap.id, ...storySnap.data() } as Story;
                    setStory(storyData);

                    const chapterData = storyData.chapters.find(c => c.id === chapterId);
                    if(chapterData) {
                        setChapter(chapterData);
                    } else {
                        toast({ title: "Error", description: "Chapter not found in story.", variant: "destructive" });
                    }
                } else {
                     toast({ title: "Error", description: "Story not found.", variant: "destructive" });
                }
            } catch (error) {
                toast({ title: "Error", description: "Failed to load story details.", variant: "destructive" });
                console.error("Error fetching story for comments header:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHeaderData();
    }, [storyId, chapterId, router, toast]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto max-w-2xl py-8">
            <header className="mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Chapter
                </Button>
                {chapter && story && (
                    <>
                        <h1 className="text-2xl font-headline font-bold text-primary truncate">{chapter.title}</h1>
                        <p className="text-muted-foreground">Comments for chapter in "{story.title}"</p>
                    </>
                )}
                 {quote && (
                    <blockquote className="mt-4 border-l-4 pl-4 italic text-muted-foreground flex gap-2">
                        <Quote className="h-5 w-5 flex-shrink-0" />
                        <span className="line-clamp-3">"{quote}"</span>
                    </blockquote>
                )}
            </header>
            
            <CommentSection storyId={storyId} chapterId={chapterId} quote={quote || undefined} />
        </div>
    );
}
