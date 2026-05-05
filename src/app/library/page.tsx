
'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Loader2, Library, BookOpen, Search, Grid, List, DownloadCloud, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import YourStoryCard from '@/components/shared/YourStoryCard';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import LibraryListItemCard from '@/components/shared/LibraryListItemCard';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function LibraryPage() {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('updated-desc');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isSyncingAll, setIsSyncingAll] = useState(false);

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

    const handleSyncAll = async () => {
        if (readingList.length === 0) return;
        setIsSyncingAll(true);
        toast({ title: "Smart Sync Started", description: "Saving your library for offline access..." });

        try {
            // Firestore handles smart sync by reading docs when online.
            // We iterate through reading list and pull latest data.
            for (const item of readingList) {
                await getDoc(doc(db, 'stories', item.id));
            }
            toast({ title: "Library Synced", description: "Your stories are ready for offline reading." });
        } catch (error) {
            toast({ title: "Sync Failed", variant: "destructive" });
        } finally {
            setIsSyncingAll(false);
        }
    };
    
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
                <p className="text-muted-foreground max-sm">
                    <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link> to save your favorite stories, keep track of your reading progress, and build your personal collection.
                </p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                            <Library className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-headline font-bold">Manuscript Library</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Your private collection</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSyncAll} 
                        disabled={isSyncingAll || readingList.length === 0}
                        className="rounded-full gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
                    >
                        {isSyncingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
                        {isSyncingAll ? 'Syncing...' : 'Sync for Offline'}
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative flex-grow group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Filter by title or author..."
                            className="pl-10 rounded-xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full sm:w-[160px] rounded-xl bg-card border-none shadow-sm h-11">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="updated-desc">Recently Updated</SelectItem>
                                <SelectItem value="added-desc">Recently Added</SelectItem>
                                <SelectItem value="title-asc">A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[140px] rounded-xl bg-card border-none shadow-sm h-11">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Ongoing">Ongoing</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center rounded-xl border-none bg-card p-1 shadow-sm h-11">
                            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} aria-label="Grid View" className="rounded-lg h-9 w-9">
                                <Grid className="h-4 w-4"/>
                            </Button>
                            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} aria-label="List View" className="rounded-lg h-9 w-9">
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {readingList.length > 0 ? (
                filteredAndSortedList.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
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
                    <div className="text-center py-32 bg-card/40 rounded-[40px] border-2 border-dashed border-border/40">
                        <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                        <h2 className="text-xl font-headline font-bold text-foreground">No matches found</h2>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters or search term.</p>
                    </div>
                )
            ) : (
                <div className="text-center py-32 bg-card/40 rounded-[40px] border-2 border-dashed border-border/40 max-w-2xl mx-auto">
                    <BookOpen className="h-20 w-20 text-muted-foreground/20 mx-auto mb-6" />
                    <h2 className="text-2xl font-headline font-bold text-foreground mb-3">Your Library is Empty</h2>
                    <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Build your personal collection of manuscripts to read them offline and track your progress.</p>
                    <Link href="/stories" passHref>
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-10 shadow-xl shadow-primary/20">
                            Explore Stories
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
