
'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Loader2, Library, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import YourStoryCard from '@/components/shared/YourStoryCard';

export default function LibraryPage() {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center">
                <Library className="h-24 w-24 text-muted-foreground/50 mb-6" />
                <h2 className="text-2xl font-headline font-semibold mb-2">Your Library is Empty</h2>
                <p className="text-muted-foreground">Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to view your library.</p>
            </div>
        );
    }
    
    const readingList = user.readingList || [];

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center gap-3">
                    <Library className="h-8 w-8" />
                    My Library
                </h1>
                <p className="text-muted-foreground mt-1">Stories you've saved to read.</p>
            </header>
            
            {readingList.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                    {readingList.map(item => (
                        <YourStoryCard key={item.id} story={item} />
                    ))}
                 </div>
            ) : (
                <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-headline font-semibold mb-2">Your Library is Empty</h2>
                    <p className="text-muted-foreground mb-6">You haven't added any stories yet. Explore stories and add them to your library to see them here.</p>
                    <Link href="/stories" passHref>
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Explore Stories
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
