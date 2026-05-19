'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Loader2, Library, BookOpen, Search, Grid, List, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import YourStoryCard from '@/components/shared/YourStoryCard';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LibraryListItemCard from '@/components/shared/LibraryListItemCard';
import { doc, getDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';

export default function LibraryPage() {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('updated-desc');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [existingStoryIds, setExistingStoryIds] = useState<Set<string>>(new Set());
    const [isVerifying, setIsVerifying] = useState(true);

    const readingList = user?.readingList || [];

    // Protocol: Verify that stories in the reading list actually exist in the archives
    useEffect(() => {
        if (!user?.readingList || user.readingList.length === 0) {
            setExistingStoryIds(new Set());
            setIsVerifying(false);
            return;
        }

        const verifyStories = async () => {
            setIsVerifying(true);
            const ids = user.readingList.map(s => s.id);
            const results = new Set<string>();
            const storiesRef = collection(db, 'stories');

            try {
                // Process in chunks of 30 (Firestore 'in' limit)
                for (let i = 0; i < ids.length; i += 30) {
                    const chunk = ids.slice(i, i + 30);
                    const q = query(storiesRef, where(documentId(), 'in', chunk));
                    const snap = await getDocs(q);
                    snap.docs.forEach(d => results.add(d.id));
                }
                setExistingStoryIds(results);
            } catch (error) {
                console.error("Archival verification failure:", error);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyStories();
    }, [user?.readingList]);

    const filteredAndSortedList = useMemo(() => {
        // Step 1: Filter out ghost stories (deleted manuscripts)
        let stories = readingList.filter(s => existingStoryIds.has(s.id));

        // Step 2: Filter by search term
        if (searchTerm.trim()) {
            stories = stories.filter(s => 
                s.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                s.author?.username.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                s.author?.displayName?.toLowerCase().includes(searchTerm.trim().toLowerCase())
            );
        }

        // Step 3: Filter by status
        if (filterStatus !== 'all') {
            stories = stories.filter(s => s.status?.toLowerCase() === filterStatus.toLowerCase());
        }

        // Step 4: Sort
        stories.sort((a, b) => {
            switch (sortBy) {
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'updated-desc': {
                    const dateA = a.lastUpdated?.toDate ? a.lastUpdated.toDate() : new Date(a.lastUpdated || 0);
                    const dateB = b.lastUpdated?.toDate ? b.lastUpdated.toDate() : new Date(b.lastUpdated || 0);
                    return dateB.getTime() - dateA.getTime();
                }
                case 'added-desc': 
                default:
                    const indexMap = new Map(readingList.map((story, index) => [story.id, index]));
                    return (indexMap.get(b.id) ?? -1) - (indexMap.get(a.id) ?? -1);
            }
        });

        return stories;
    }, [readingList, searchTerm, filterStatus, sortBy, existingStoryIds]);

    const handleSyncAll = async () => {
        if (filteredAndSortedList.length === 0) return;
        setIsSyncingAll(true);
        toast({ title: "Smart Sync Started", description: "Saving your library for offline access..." });

        try {
            for (const item of filteredAndSortedList) {
                await getDoc(doc(db, 'stories', item.id));
            }
            toast({ title: "Library Synced", description: "Your stories are ready for offline reading." });
        } catch (error) {
            toast({ title: "Sync Failed", variant: "destructive" });
        } finally {
            setIsSyncingAll(false);
        }
    };
    
    if (loading || (isVerifying && readingList.length > 0)) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Library Archive...</p>
            </div>
        );
    }
    
    return (
        <>
            <Header />
            <main className="container mx-auto max-w-7xl pt-6 pb-24 md:pb-12 px-4 md:px-6 animate-in fade-in duration-700">
                {!user ? (
                    <div className="flex flex-col items-center justify-center h-[calc(100vh-20rem)] text-center p-4">
                        <Library className="h-24 w-24 text-muted-foreground/50 mb-6" />
                        <h2 className="text-2xl font-headline font-semibold mb-2">Your Library Awaits</h2>
                        <p className="text-muted-foreground max-w-sm">
                            <Link href="/auth/signin" className="text-primary font-bold hover:underline">Sign in</Link> to save your favorite stories and track your reading progress.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <header className="flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                                        <Library className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-headline font-bold">Manuscript Library</h1>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Verified Identity Node</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleSyncAll} 
                                    disabled={isSyncingAll || filteredAndSortedList.length === 0}
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
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            <SelectItem value="all">All</SelectItem>
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

                        {filteredAndSortedList.length > 0 ? (
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
                                <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                                <h2 className="text-xl font-headline font-bold text-foreground">
                                    {searchTerm || filterStatus !== 'all' ? "No matches found" : "Your Library is Clean"}
                                </h2>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                                    {searchTerm || filterStatus !== 'all' ? "Try adjusting your filters." : "Discover new manuscripts and add them to your archive."}
                                </p>
                                <Link href="/stories" passHref className="inline-block mt-8">
                                    <Button className="rounded-full px-8 h-12 shadow-lg shadow-primary/20 font-bold uppercase tracking-widest text-xs">Explore Now</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </main>
            <BottomNavigationBar />
        </>
    );
}
