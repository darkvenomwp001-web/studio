'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Annotation } from '@/types';
import { Loader2, Quote, Edit, Share, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function AnnotationCard({ annotation }: { annotation: Annotation }) {
    const { toast } = useToast();
    
    const handleShare = () => {
        // In a real app, this would open a modal to generate a shareable image.
        toast({
            title: "Sharing Feature Coming Soon!",
            description: "Soon you'll be able to generate a beautiful image of this quote to share on social media.",
        });
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-normal text-muted-foreground">
                    From <Link href={`/stories/${annotation.storyId}`} className="text-primary hover:underline font-semibold">{annotation.storyTitle}</Link>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <blockquote className="border-l-4 p-4" style={{ borderColor: annotation.highlightColor || 'hsl(var(--primary))' }}>
                    <p className="italic text-foreground">“{annotation.highlightedText}”</p>
                </blockquote>
                {annotation.note && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">{annotation.note}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                <p>{new Date(annotation.timestamp.toDate()).toLocaleDateString()}</p>
                <div className="flex gap-1">
                    <Link href={`/stories/${annotation.storyId}/read/${annotation.chapterId}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Go to Chapter">
                            <BookOpen className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShare} title="Share Annotation">
                        <Share className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}

export default function AnnotationFeed() {
    const { user, loading } = useAuth();
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            if (!loading) setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(
            collection(db, 'annotations'), 
            where('userId', '==', user.id), 
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAnnotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching annotations:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, loading]);

    if (loading || isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
            <Card className="text-center p-8">
                <CardHeader>
                    <Quote className="mx-auto h-12 w-12 text-muted-foreground" />
                    <CardTitle className="mt-4">Your Personal Annotation Feed</CardTitle>
                    <CardDescription>
                        <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link> to highlight text, add notes, and see all your annotations here.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (annotations.length === 0) {
        return (
            <Card className="text-center p-8">
                <CardHeader>
                    <Quote className="mx-auto h-12 w-12 text-muted-foreground" />
                    <CardTitle className="mt-4">No Annotations Yet</CardTitle>
                    <CardDescription>
                        While reading, select text to highlight it or add a note. Your collection will appear here.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/stories">
                        <Button>Start Reading</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {annotations.map(anno => <AnnotationCard key={anno.id} annotation={anno} />)}
        </div>
    );
}
