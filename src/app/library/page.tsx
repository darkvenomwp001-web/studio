'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Loader2, Library, BookOpen, Search, Grid, List, DownloadCloud, CheckCircle2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

    // Archive Verification Node: Ensures ghosts of deleted stories are removed from view
    useEffect(() => {
        if (!user?.readingList || user.readingList.length === 0) {
            setExistingStoryIds(new Set());
            setIsVerifying(false);
            return;
        }

        const verifyStories = async () => {
            setIsVerifying(true);
            const ids = user.readingList!.filter(s => s && s.id).map(s => s.id);
            const results = new Set<string>();
            const storiesRef = collection(db, 'stories');

            try {
                if (ids.length > 0) {
                    for (let i = 0; i < ids.length; i += 30) {
                        const chunk = ids.slice(i, i + 30);
                        const q = query(storiesRef, where(documentId(), 'in', chunk));
                        const snap = await getDocs(q);
                        snap.docs.forEach(d => results.add(d.id));
                    }
                }
                setExistingStoryIds(results);
            } catch (error) {
                console.error("Verification error:", error);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyStories();
    }, [user?.readingList]);

    const filteredAndSortedList = useMemo(() => {
        let stories = readingList.filter(s => s && existingStoryIds.has(s.id));

        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            stories = stories.filter(s => 
                s.title.toLowerCase().includes(term) ||
                s.author?.username.toLowerCase().includes(term)
            );
        }

        if (filterStatus !== 'all') {
            stories = stories.filter(s => s.status?.toLowerCase() === filterStatus.toLowerCase());
        }

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
                    const indexMap = new Map(readingList.map((story, index) => [story?.id, index]));
                    return (indexMap.get(b.id) ?? -1) - (indexMap.get(a.id) ?? -1);
            }
        });

        return stories;
    }, [readingList, searchTerm, filterStatus, sortBy, existingStoryIds]);

    const handleSyncAll = async () => {
        if (filteredAndSortedList.length === 0) return;
        setIsSyncingAll(true);
        toast({ title: "Saving to device", description: "Getting your stories ready for offline reading..." });

        try {
            // Fetch each story explicitly to ensure it resides in the local IndexedDB cache
            for (const item of filteredAndSortedList) {
                await getDoc(doc(db, 'stories', item.id));
            }
            toast({ title: "Stories Saved", description: "You can now read these even without internet." });
        } catch (error) {
            toast({ title: "Save Failed", description: "Make sure you have a stable connection to finish saving.", variant: "destructive" });
        } finally {
            setIsSyncingAll(false);
        }
    };
    
    if (loading || (isVerifying && readingList.length > 0)) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-background gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Entering Library...</p>
            </div>
        );
    }
    
    return (
        <>
            <Header />
            <main className="container mx-auto max-w-7xl pt-6 pb-32 md:pb-12 px-4 md:px-8 animate-in fade-in duration-700">
                {!user ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-muted/20 rounded-[3rem] border border-dashed">
                        <Library className="h-20 w-20 text-muted-foreground/20 mb-6" />
                        <h2 className="text-2xl font-headline font-bold mb-2">Your Archive Awaits</h2>
                        <p className="text-muted-foreground max-w-xs mx-auto mb-8">Sign in to save stories and keep track of your reading journey.</p>
                        <Link href="/auth/signin">
                            <Button size="lg" className="rounded-full px-10 h-12 font-bold shadow-xl">Sign In to Continue</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <header className="flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h1 className="text-2xl md:text-3xl font-headline font-bold tracking-tight">Saved Stories</h1>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">My Personal Archive</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="hidden sm:inline-block text-[11px] font-black uppercase tracking-widest text-primary">Library</span>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleSyncAll} 
                                        disabled={isSyncingAll || filteredAndSortedList.length === 0}
                                        className="rounded-full gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 font-black text-[9px] uppercase tracking-widest h-9 px-4 shadow-sm transition-all active:scale-95"
                                    >
                                        {isSyncingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <DownloadCloud className="h-3 w-3" />}
                                        {isSyncingAll ? 'Saving...' : 'Save all to device'}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                <div className="relative flex-grow group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder="Find in my library..."
                                        className="pl-11 rounded-2xl bg-muted/30 border-none h-12 focus-visible:ring-primary/20 shadow-inner"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 h-12">
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="flex-1 sm:w-44 rounded-2xl bg-card border border-border/40 shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                            <SelectItem value="updated-desc" className="rounded-lg">Recently Updated</SelectItem>
                                            <SelectItem value="added-desc" className="rounded-lg">Recently Added</SelectItem>
                                            <SelectItem value="title-asc" className="rounded-lg">Alphabetical (A-Z)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center rounded-2xl border border-border/40 bg-card p-1 shadow-sm">
                                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="rounded-xl h-10 w-10">
                                            <Grid className="h-4 w-4"/>
                                        </Button>
                                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="rounded-xl h-10 w-10">
                                            <List className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {filteredAndSortedList.length > 0 ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-12">
                                        {filteredAndSortedList.map(item => (
                                            <YourStoryCard key={item.id} story={item} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-4xl mx-auto">
                                        {filteredAndSortedList.map(item => (
                                            <LibraryListItemCard key={item.id} story={item} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-40 bg-card/20 rounded-[3rem] border-2 border-dashed border-border/40 max-w-2xl mx-auto flex flex-col items-center">
                                <div className="p-6 rounded-full bg-muted/30 mb-6">
                                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                                </div>
                                <h2 className="text-2xl font-headline font-bold text-foreground mb-2">
                                    {searchTerm || filterStatus !== 'all' ? "No matches found" : "Empty Archive"}
                                </h2>
                                <p className="text-sm text-muted-foreground max-w-xs px-10">
                                    {searchTerm || filterStatus !== 'all' ? "Try adjusting your search terms." : "Find something new to read and add it to your library!"}
                                </p>
                                <Link href="/stories" className="mt-8">
                                    <Button className="rounded-full px-10 h-12 font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">Explore Discoveries</Button>
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
