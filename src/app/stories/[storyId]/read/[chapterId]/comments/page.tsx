'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CommentSection from '@/components/comments/CommentSection';
import { Loader2, ArrowLeft, Quote, BookOpen, MessageSquare } from 'lucide-react';
import type { Story, Chapter } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function CommentsContent() {
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
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest animate-pulse">Gathering the conversation...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-2xl py-10 px-4 md:px-6 space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <header className="space-y-6">
                    <Button variant="ghost" onClick={() => router.back()} className="group -ml-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"/>
                        Back to Chapter
                    </Button>
                    
                    {chapter && story && (
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-1">
                                <BookOpen className="h-3 w-3" />
                                <span>{story.title}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground leading-tight tracking-tight">
                                {chapter.title}
                            </h1>
                            <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
                                <MessageSquare className="h-4 w-4" />
                                <p className="text-sm font-medium">Chapter Discussion</p>
                            </div>
                        </div>
                    )}

                    {quote && (
                        <div className="relative pt-4">
                            <Card className="border-l-4 border-l-primary bg-muted/30 border-none shadow-inner overflow-hidden">
                                <CardContent className="p-6 relative">
                                    <Quote className="absolute top-4 right-4 h-12 w-12 text-primary/10 -scale-x-100" />
                                    <p className="italic text-lg text-foreground/80 font-serif leading-relaxed relative z-10">
                                        "{quote}"
                                    </p>
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="h-px w-8 bg-primary/30" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Highlight snippet</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </header>

                <Separator className="opacity-50" />
                
                <main className="pb-20">
                    <CommentSection storyId={storyId} chapterId={chapterId} quote={quote || undefined} />
                </main>
            </div>
        </div>
    );
}

export default function CommentsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
            <CommentsContent />
        </Suspense>
    );
}
