'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CommentSection from '@/components/comments/CommentSection';
import { Loader2, ArrowLeft, Quote, BookOpen, MessageSquare, Sparkles } from 'lucide-react';
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
            <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Scanning the discussion hub...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-700">
            <div className="max-w-3xl mx-auto py-10 px-4 md:px-6 space-y-12">
                <header className="space-y-8">
                    <div className="flex items-center justify-between">
                        <Button 
                            variant="ghost" 
                            onClick={() => router.back()} 
                            className="group rounded-full h-11 px-4 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"/>
                            Back to Part
                        </Button>
                        
                        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-4 py-1.5 shadow-sm">
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Discussion Node</span>
                        </div>
                    </div>
                    
                    {chapter && story && (
                        <div className="text-center space-y-3">
                            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1 px-4 py-1 bg-muted/30 rounded-full border border-border/40">
                                <BookOpen className="h-3 w-3" />
                                <span>{story.title}</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-headline font-bold text-foreground leading-tight tracking-tight">
                                {chapter.title}
                            </h1>
                            <div className="flex items-center justify-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest pt-2">
                                <MessageSquare className="h-4 w-4 fill-primary/10" />
                                <p>Interactive Chapter Log</p>
                            </div>
                        </div>
                    )}

                    {quote && (
                        <div className="relative pt-6 animate-in slide-in-from-top-4 duration-1000">
                            <Card className="rounded-[2.5rem] border-none bg-primary/5 shadow-inner overflow-hidden group">
                                <CardContent className="p-10 relative">
                                    <Quote className="absolute top-6 right-8 h-16 w-16 text-primary/10 -scale-x-100 transition-transform group-hover:scale-110 duration-700" />
                                    <p className="italic text-xl md:text-2xl text-foreground/90 font-serif leading-relaxed relative z-10 text-center">
                                        “{quote}”
                                    </p>
                                    <div className="mt-8 flex items-center justify-center gap-3">
                                        <div className="h-[2px] w-8 bg-primary/30 rounded-full" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">Archive Snippet</span>
                                        <div className="h-[2px] w-8 bg-primary/30 rounded-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </header>

                <Separator className="opacity-40" />
                
                <main className="pb-32">
                    <CommentSection storyId={storyId} chapterId={chapterId} quote={quote || undefined} />
                </main>
            </div>
        </div>
    );
}

export default function CommentsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}>
            <CommentsContent />
        </Suspense>
    );
}