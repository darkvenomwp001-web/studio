'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CommentSection from '@/components/comments/CommentSection';
import { Loader2, ArrowLeft, BookOpen, MessageSquare, Sparkles } from 'lucide-react';
import type { Story, Chapter } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

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
                <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Syncing discussion node...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-700">
            <div className="max-w-2xl mx-auto py-6 px-4 md:px-6 space-y-8">
                <header className="flex items-center justify-between border-b border-border/40 pb-4">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => router.back()} 
                            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        >
                            <ArrowLeft className="h-4 w-4"/>
                        </Button>
                        <div>
                           <h2 className="text-[10px] font-black uppercase tracking-widest text-primary">Discussion Hub</h2>
                           {chapter && (
                             <p className="text-[9px] font-bold text-muted-foreground uppercase truncate max-w-[200px]">
                               Part {chapter.order}: {chapter.title}
                             </p>
                           )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-muted/40 rounded-full px-3 py-1 border border-border/40">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Interactive</span>
                    </div>
                </header>

                <main className="space-y-8 pb-32">
                    {quote && (
                        <section className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                            <div className="bg-muted/20 p-6 rounded-2xl border-l-4 border-l-primary border-t border-r border-b border-border/40 shadow-inner relative group overflow-hidden">
                                <p className="italic text-base md:text-lg text-foreground/80 leading-relaxed font-serif">
                                    “{quote}”
                                </p>
                            </div>
                        </section>
                    )}

                    {!quote && chapter && (
                        <section className="text-center py-4 space-y-2">
                             <h1 className="text-3xl font-headline font-bold tracking-tight">{chapter.title}</h1>
                             <div className="flex items-center justify-center gap-2 text-primary font-bold text-[9px] uppercase tracking-[0.2em]">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Chapter Discussion</span>
                             </div>
                        </section>
                    )}

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