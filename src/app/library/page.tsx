
'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Loader2, Library, BookOpen, Search, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import YourStoryCard from '@/components/shared/YourStoryCard';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import LibraryListItemCard from '@/components/shared/LibraryListItemCard';

export default function LibraryPage() {
    const { user, loading } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('updated-desc');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const readingList = user?.readingList || [];

    const filteredAndSortedList = useMemo(() => {
        let stories = [...readingList];

        // 1. Filter by search term
        if (searchTerm.trim()) {
            stories = stories.filter(s => 
                s.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                s.author?.username.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                s.author?.displayName?.toLowerCase().includes(searchTerm.trim().toLowerCase())
            );
        }

        // 2. Filter by status
        if (filterStatus !== 'all') {
            stories = stories.filter(s => s.status?.toLowerCase() === filterStatus);
        }

        // 3. Sort
        stories.sort((a, b) => {
            switch (sortBy) {
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'updated-desc': {
                    const dateA = a.lastUpdated?.toDate ? a.lastUpdated.toDate() : new Date(a.lastUpdated || 0);
                    const dateB = b.lastUpdated?.toDate ? b.lastUpdated.toDate() : new Date(b.lastUpdated || 0);
                    return dateB.getTime() - dateA.getTime();
                }
                case 'added-desc': // This is the default from firestore (if it's an array)
                default:
                    // Create a temporary map to find the original index in readingList for stable sorting
                    const indexMap = new Map(readingList.map((story, index) => [story.id, index]));
                    return (indexMap.get(a.id) ?? -1) - (indexMap.get(b.id) ?? -1);
            }
        });

        // For "Recently Added", we just reverse the sorted-by-index array.
        if (sortBy === 'added-desc') {
            stories.reverse();
        }

        return stories;
    }, [readingList, searchTerm, filterStatus, sortBy]);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
                <Library className="h-24 w-24 text-muted-foreground/50 mb-6" />
                <h2 className="text-2xl font-headline font-semibold mb-2">Your Library Awaits</h2>
                <p className="text-muted-foreground max-w-sm">
                    <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link> to save your favorite stories, keep track of your reading progress, and build your personal collection.
                </p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <header className="mb-4">
                <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center gap-3">
                    <Library className="h-8 w-8" />
                    My Library
                </h1>
                <p className="text-muted-foreground mt-1">Your personal collection of saved stories. Dive back in!</p>
            </header>
            
            <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-sm -mx-4 px-4 py-3 border-b mb-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter by title or author..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full sm:w-[160px]">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="updated-desc">Recently Updated</SelectItem>
                                <SelectItem value="added-desc">Recently Added</SelectItem>
                                <SelectItem value="title-asc">A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Ongoing">Ongoing</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center rounded-md border bg-card p-0.5">
                            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                                <Grid className="h-5 w-5"/>
                            </Button>
                            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                                <List className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {readingList.length > 0 ? (
                filteredAndSortedList.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                            {filteredAndSortedList.map(item => (
                                <YourStoryCard key={item.id} story={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAndSortedList.map(item => (
                                <LibraryListItemCard key={item.id} story={item} />
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                        <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-headline font-semibold mb-2">No Matches Found</h2>
                        <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
                    </div>
                )
            ) : (
                <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-headline font-semibold mb-2">Your Library is Empty</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">You haven't added any stories yet. Explore stories and add them to your library to see them here.</p>
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
