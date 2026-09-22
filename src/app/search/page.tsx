'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import type { Story, User as AppUser } from '@/types'; 
import StoryCard from '@/components/shared/StoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  Search as SearchIcon, 
  Loader2, 
  X, 
  SlidersHorizontal, 
  Eye,
  ListOrdered,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Filter
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn, formatCompactNumber } from '@/lib/utils';
import NextImage from 'next/image';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';

const GENRES = [
    'Romance', 'General Fiction', 'Teen Fiction', 'Fantasy', 'Mystery', 'Thriller', 'Horror', 'Sci-Fi', 
    'Adventure', 'Historical', 'Poetry', 'Non-Fiction', 'Fanfiction', 'Action'
];

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

function SearchResults() {
  const searchParamsHook = useSearchParams();
  const router = useRouter();
  const queryFromUrl = searchParamsHook.get('q') || '';
  const genreFromUrl = searchParamsHook.get('genre') || 'all';

  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [storyResults, setStoryResults] = useState<Story[]>([]);
  const [userResults, setUserResults] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trendingStories, setTrendingStories] = useState<Story[]>([]);

  // Filter States
  const [activeGenre, setActiveGenre] = useState(genreFromUrl);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Ongoing'>('all');
  const [matureFilter, setMatureFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'views' | 'newest'>('relevance');

  useEffect(() => {
    const q = query(
      collection(db, 'stories'),
      where('visibility', '==', 'Public'),
      where('status', '!=', 'Draft'),
      orderBy('views', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      setTrendingStories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story)));
    });
    return () => unsub();
  }, []);

  const performSearch = async (currentQuery: string, genre: string) => {
    setIsLoading(true);
    try {
      const storiesRef = collection(db, 'stories');
      let storyQuery;

      if (currentQuery.trim()) {
          storyQuery = query(
            storiesRef,
            where('visibility', '==', 'Public'),
            where('title', '>=', currentQuery.trim()),
            where('title', '<=', currentQuery.trim() + '\uf8ff'),
            orderBy('title'),
            limit(30)
          );
      } else if (genre !== 'all') {
          storyQuery = query(
            storiesRef,
            where('visibility', '==', 'Public'),
            where('genre', '==', genre),
            orderBy('lastUpdated', 'desc'),
            limit(30)
          );
      } else {
          setIsLoading(false);
          return;
      }

      const storySnapshot = await getDocs(storyQuery);
      let storiesFound = storySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
            } as Story;
      });

      if (statusFilter !== 'all') {
          storiesFound = storiesFound.filter(s => s.status === statusFilter);
      }
      if (!matureFilter) {
          storiesFound = storiesFound.filter(s => !s.isMature);
      }

      if (sortBy === 'views') {
          storiesFound.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (sortBy === 'newest') {
          storiesFound.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      }

      setStoryResults(storiesFound);

      if (currentQuery.trim()) {
          const usersRef = collection(db, 'users');
          const usernameQuery = query(
            usersRef,
            where('username', '>=', currentQuery.trim()),
            where('username', '<=', currentQuery.trim() + '\uf8ff'),
            orderBy('username'),
            limit(8)
          );
          const usernameSnapshot = await getDocs(usernameQuery);
          setUserResults(usernameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
      } else {
          setUserResults([]);
      }

    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(performSearch, 500), [statusFilter, matureFilter, sortBy]);

  useEffect(() => {
    if (searchTerm.trim() || activeGenre !== 'all') {
      debouncedSearch(searchTerm, activeGenre);
    } else {
      setStoryResults([]);
      setUserResults([]);
      setIsLoading(false);
    }
  }, [searchTerm, activeGenre, statusFilter, matureFilter, sortBy, debouncedSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    const params = new URLSearchParams();
    if (val.trim()) params.set('q', val.trim());
    if (activeGenre !== 'all') params.set('genre', activeGenre);
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  const handleGenreClick = (genre: string) => {
    const newGenre = activeGenre === genre ? 'all' : genre;
    setActiveGenre(newGenre);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (newGenre !== 'all') params.set('genre', newGenre);
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  const handleClear = () => {
      setSearchTerm('');
      setActiveGenre('all');
      router.push('/search', { scroll: false });
  };

  const isBrowsing = !isLoading && !searchTerm.trim() && activeGenre === 'all';
  const hasResults = storyResults.length > 0 || userResults.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-0 pb-32 animate-in fade-in duration-700 overflow-x-hidden">
      {/* 
          High-Fidelity Search Hub Header 
          Designed as an elongated rectangle-pill to match the Library page.
          Uses rounded-2xl and rounded-[2.5rem] for a modern, expansive feel.
      */}
      <div className="sticky top-6 z-40 mx-4 md:mx-auto max-w-5xl transition-all duration-500 transform-gpu">
        <div className="bg-card/90 backdrop-blur-3xl border border-white/10 p-3 flex flex-col md:flex-row items-center gap-4 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
            <div className="relative group w-full md:w-[350px] lg:w-[400px]">
                <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                <Input 
                    placeholder="Search titles or authors..." 
                    className="pl-12 w-full h-12 md:h-14 rounded-2xl md:rounded-3xl bg-black/10 border-none shadow-inner text-base focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                    value={searchTerm}
                    onChange={handleInputChange}
                />
                {searchTerm && (
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors" onClick={handleClear}>
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 flex-1 w-full md:w-auto px-1 overflow-hidden">
                <ScrollArea className="flex-1 whitespace-nowrap scrollbar-hide">
                    <div className="flex items-center gap-2 px-1">
                        <button 
                            onClick={() => handleGenreClick('all')}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest transition-all h-10 md:h-11 flex items-center px-6 rounded-2xl border border-transparent shadow-sm",
                                activeGenre === 'all' ? "bg-primary text-white shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            All Categories
                        </button>
                        {GENRES.map(genre => (
                            <button 
                                key={genre} 
                                onClick={() => handleGenreClick(genre)}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest transition-all h-10 md:h-11 flex items-center px-6 rounded-2xl border border-transparent shadow-sm",
                                    activeGenre === genre ? "bg-primary text-white shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
                
                <div className="flex items-center gap-1 shrink-0 ml-1">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-white/5 hover:bg-primary/10 transition-all shrink-0">
                                <ChevronDown className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[90vw] sm:w-[450px] p-6 rounded-[2.5rem] border-none shadow-3xl bg-card/95 backdrop-blur-3xl" align="end" sideOffset={16}>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">Library Categories</h4>
                                    {activeGenre !== 'all' && (
                                        <button onClick={() => handleGenreClick('all')} className="text-[10px] font-black uppercase text-primary hover:underline">Reset</button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {GENRES.map(genre => (
                                        <Button
                                            key={genre}
                                            variant={activeGenre === genre ? 'default' : 'outline'}
                                            size="sm"
                                            className={cn(
                                                "justify-start h-11 text-[9px] font-black uppercase tracking-widest rounded-xl px-4 border-border/40 transition-all",
                                                activeGenre === genre ? "shadow-lg shadow-primary/30" : "hover:bg-primary/5 hover:text-primary hover:border-primary/40"
                                            )}
                                            onClick={() => handleGenreClick(genre)}
                                        >
                                            {genre}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
      </div>

      <div className="h-10" /> 

      {/* Discovery Hub Content */}
      {isBrowsing && (
          <div className="p-4 md:p-10 space-y-12 max-w-6xl mx-auto">
              <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-headline font-bold tracking-tight">Hottest Trending</h2>
                </div>
                <ScrollArea className="w-full whitespace-nowrap scrollbar-hide -mx-4 px-4">
                    <div className="flex gap-4 pb-4">
                        {trendingStories.slice(0, 8).map(s => (
                            <div key={s.id} className="w-36 md:w-44 shrink-0 transition-transform duration-500 hover:scale-105">
                                <StoryCard story={s} />
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
              </section>

              <div className="flex items-center justify-between pt-6 border-t border-border/20">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-accent/10 text-accent shadow-sm">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-headline font-bold tracking-tight">
                        {formatCompactNumber(trendingStories.length * 150)} New Discoveries
                    </h2>
                 </div>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-11 gap-2 rounded-full px-6 font-bold uppercase text-[10px] tracking-widest border-border/40 hover:bg-muted shadow-sm transition-all active:scale-95">
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Refine
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[85vw] max-w-sm p-6 rounded-[2rem] border-none shadow-3xl bg-card/95 backdrop-blur-3xl" align="end">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sort Order</Label>
                                <RadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="grid grid-cols-1 gap-2">
                                    {['relevance', 'views', 'newest'].map(s => (
                                        <Label key={s} htmlFor={`sort-${s}`} className={cn(
                                            "flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border border-transparent hover:bg-muted/50 capitalize text-sm font-bold",
                                            sortBy === s && "bg-primary/5 border-primary/20 text-primary shadow-sm"
                                        )}>
                                            <RadioGroupItem value={s} id={`sort-${s}`} className="sr-only" />
                                            {s}
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                        </div>
                    </PopoverContent>
                 </Popover>
              </div>

              <div className="grid gap-12 pt-2">
                  {trendingStories.map((story, index) => (
                      <Link href={`/stories/${story.id}`} key={story.id} className="flex gap-6 md:gap-10 group transform-gpu transition-all hover:-translate-x-2">
                          <div className="relative w-28 md:w-40 aspect-[2/3] shrink-0 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-muted shadow-xl ring-1 ring-white/5">
                              <NextImage src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/200/300`} alt="" fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                          </div>
                          <div className="flex-1 space-y-4 py-2">
                              <div className="flex items-center gap-4">
                                  <span className="text-3xl font-black text-foreground/5 tabular-nums italic shrink-0">{index + 1}</span>
                                  <h3 className="font-headline font-bold text-xl md:text-3xl line-clamp-2 group-hover:text-primary transition-colors leading-tight">{story.title}</h3>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground/60 font-bold uppercase tracking-widest">@{story.author.username}</p>
                              <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">
                                  <span className="flex items-center gap-2.5"><Eye className="h-4.5 w-4.5 text-primary/30" /> {formatCompactNumber(story.views || 0)}</span>
                                  <span className="flex items-center gap-2.5"><ListOrdered className="h-4.5 w-4.5 text-accent/30" /> {story.chapters?.length || 0} Parts</span>
                              </div>
                              <div className="flex flex-wrap gap-2.5 pt-2">
                                  <Badge variant="outline" className="h-7 px-4 rounded-full bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest">{story.genre}</Badge>
                                  {story.tags.slice(0, 3).map(tag => (
                                      <Badge key={tag} variant="secondary" className="h-7 px-4 rounded-full bg-muted/40 text-muted-foreground border-none font-bold text-[9px] uppercase tracking-widest">#{tag}</Badge>
                                  ))}
                              </div>
                          </div>
                      </Link>
                  ))}
              </div>
          </div>
      )}

      {/* Search Results Hub */}
      {!isBrowsing && (
        <div className="p-4 md:p-10 space-y-10 max-w-6xl mx-auto">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <Loader2 className="h-14 w-14 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Scanning the multiverse...</p>
                </div>
            ) : !hasResults ? (
                <div className="text-center py-32 bg-muted/10 rounded-[3rem] border-2 border-dashed border-border/40 animate-in zoom-in-95 duration-500">
                    <SearchIcon className="h-16 w-16 text-muted-foreground/20 mx-auto mb-6" />
                    <h3 className="text-2xl font-headline font-bold">No matches found</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-10 max-w-xs mx-auto">Try adjusting your keywords or exploring a different category.</p>
                    <Button onClick={handleClear} className="rounded-full px-12 h-14 font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all active:scale-95">Reset Exploration</Button>
                </div>
            ) : (
                <Tabs defaultValue="stories" className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 mb-16 border-b border-border/20 pb-8">
                        <TabsList className="bg-muted/40 backdrop-blur-xl p-1 rounded-3xl border border-border/40 shadow-inner h-14 w-full sm:w-auto">
                            <TabsTrigger value="stories" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-10 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">Stories</TabsTrigger>
                            <TabsTrigger value="authors" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-10 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">Authors</TabsTrigger>
                        </TabsList>
                        <Badge variant="outline" className="h-10 rounded-full px-8 font-black text-[10px] uppercase tracking-[0.3em] bg-primary/5 text-primary border-primary/20 shadow-sm">{storyResults.length} Manuscripts Identified</Badge>
                    </div>

                    <TabsContent value="stories" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {storyResults.map((story) => (
                            <Link href={`/stories/${story.id}`} key={story.id} className="flex gap-8 md:gap-12 group transform-gpu">
                                <div className="relative w-32 md:w-56 aspect-[2/3] shrink-0 rounded-[2rem] overflow-hidden bg-muted shadow-[0_30px_70px_rgba(0,0,0,0.3)] transition-all duration-700 group-hover:scale-105 group-hover:-translate-y-2">
                                    <NextImage src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/200/300`} alt="" fill className="object-cover" />
                                </div>
                                <div className="flex-1 py-4 space-y-5">
                                    <h3 className="font-headline font-bold text-xl md:text-5xl line-clamp-2 group-hover:text-primary transition-colors leading-tight tracking-tighter">{story.title}</h3>
                                    <p className="text-xs md:text-sm text-muted-foreground/60 font-bold uppercase tracking-widest">@{story.author.username}</p>
                                    <div className="flex items-center gap-10 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground/40">
                                        <span className="flex items-center gap-3"><Eye className="h-5 w-5 text-primary/30" /> {formatCompactNumber(story.views || 0)} Reads</span>
                                        <span className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-accent/30" /> {story.chapters?.length || 0} Parts</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <Badge variant="outline" className="h-8 px-5 rounded-full bg-primary/5 text-primary border-primary/20 font-black text-[10px] uppercase tracking-widest">{story.genre}</Badge>
                                        {story.tags.slice(0, 3).map(tag => (
                                            <Badge key={tag} variant="secondary" className="h-8 px-5 rounded-full bg-muted/40 text-muted-foreground border-none font-bold text-[10px] uppercase tracking-widest">#{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </TabsContent>

                    <TabsContent value="authors" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {userResults.length > 0 ? (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {userResults.map(author => (
                                <Link href={`/profile/${author.id}`} key={author.id} className="block group">
                                    <Card className="rounded-[2.5rem] border-border/40 hover:bg-primary/5 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 transform-gpu group-hover:-translate-y-2 overflow-hidden bg-card/40 backdrop-blur-sm">
                                        <CardContent className="p-8 flex items-center gap-6">
                                            <Avatar className="w-20 h-20 border-4 border-background shadow-xl">
                                                <AvatarImage src={author.avatarUrl} alt={author.username} />
                                                <AvatarFallback className="text-xl font-black uppercase bg-muted text-primary">{(author.username).substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-xl truncate tracking-tight">@{author.username}</h3>
                                                <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest opacity-60 truncate mt-0.5">{author.displayName}</p>
                                                <div className="flex items-center gap-2 mt-4">
                                                    <Users className="h-3.5 w-3.5 text-primary/40" />
                                                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.1em]">{formatCompactNumber(author.followersCount || 0)} Followers</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-32 opacity-40">
                                <Users className="h-16 w-16 mx-auto mb-6" />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em]">No matching creators found</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
      )}
      <BottomNavigationBar />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
