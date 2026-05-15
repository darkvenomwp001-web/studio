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
  TrendingUp, 
  Sparkles,
  ChevronRight,
  Filter,
  Flame,
  Check
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import NextImage from 'next/image';

const GENRES = [
    'Fantasy', 'Romance', 'Mystery', 'Thriller', 'Horror', 'Sci-Fi', 
    'Adventure', 'Historical', 'Poetry', 'Non-Fiction', 'Fanfiction', 'Action'
];

const TRENDING_TAGS = ['enemies-to-lovers', 'slow-burn', 'dark-academia', 'cyberpunk', 'isekai', 'found-family', 'betrayal'];

// Debounce function
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
  const { toast } = useToast();

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

  // Fetch trending stories for initial state
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
    setStoryResults([]); 
    setUserResults([]);   

    try {
      // 1. Search Stories
      const storiesRef = collection(db, 'stories');
      let storyQuery;

      if (currentQuery.trim()) {
          // Keyword search
          storyQuery = query(
            storiesRef,
            where('visibility', '==', 'Public'),
            where('title', '>=', currentQuery.trim()),
            where('title', '<=', currentQuery.trim() + '\uf8ff'),
            orderBy('title'),
            limit(20)
          );
      } else if (genre !== 'all') {
          // Genre Browse
          storyQuery = query(
            storiesRef,
            where('visibility', '==', 'Public'),
            where('genre', '==', genre),
            orderBy('lastUpdated', 'desc'),
            limit(20)
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

      // Apply Client-Side Filters (Firestore doesn't support complex composite queries without indexes)
      if (statusFilter !== 'all') {
          storiesFound = storiesFound.filter(s => s.status === statusFilter);
      }
      if (!matureFilter) {
          storiesFound = storiesFound.filter(s => !s.isMature);
      }

      // Sort
      if (sortBy === 'views') {
          storiesFound.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (sortBy === 'newest') {
          storiesFound.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      }

      setStoryResults(storiesFound);

      // 2. Search Authors (Only if there's a keyword)
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
      }

    } catch (error) {
      console.error("Search Error:", error);
      toast({ title: "Search Error", variant: "destructive" });
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
    if (!val.trim() && activeGenre === 'all') {
        router.push('/search', { scroll: false });
    } else {
        const params = new URLSearchParams();
        if (val.trim()) params.set('q', val.trim());
        if (activeGenre !== 'all') params.set('genre', activeGenre);
        router.push(`/search?${params.toString()}`, { scroll: false });
    }
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
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Search Header - Recalibrated for phone-size density */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl -mx-4 px-4 py-3 md:py-6 border-b border-border/40 space-y-3 md:space-y-6 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3 max-w-2xl mx-auto">
          <div className="relative flex-1 group">
            <SearchIcon className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-3.5 md:h-5 w-3.5 md:w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Search manuscripts..." 
                className="pl-9 md:pl-12 h-10 md:h-14 rounded-xl md:rounded-2xl bg-muted/40 border-none shadow-inner text-xs md:text-lg focus-visible:ring-primary/30"
                value={searchTerm}
                onChange={handleInputChange}
            />
            {searchTerm && (
                <button 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors" 
                  onClick={handleClear}
                >
                    <X className="h-3.5 md:h-5 w-3.5 md:w-5" />
                </button>
            )}
          </div>
          
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 md:h-14 w-10 md:w-14 rounded-xl md:rounded-2xl border-border/40 shadow-sm relative shrink-0">
                      <SlidersHorizontal className="h-4 md:h-6 w-4 md:w-6" />
                      {(statusFilter !== 'all' || matureFilter || sortBy !== 'relevance') && (
                          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 md:w-4 md:h-4 bg-primary rounded-full border-2 border-background" />
                      )}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[85vw] max-w-80 p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border-none shadow-3xl bg-card/95 backdrop-blur-xl" align="end" sideOffset={12}>
                  <div className="space-y-4 md:space-y-6">
                      <div className="flex items-center justify-between">
                          <h4 className="font-headline font-bold text-sm md:text-lg text-foreground">Filter Archives</h4>
                          <Button variant="ghost" size="sm" className="text-[9px] uppercase font-bold tracking-widest text-primary h-7 px-2" onClick={() => { setStatusFilter('all'); setMatureFilter(false); setSortBy('relevance'); }}>Reset</Button>
                      </div>
                      
                      <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Manuscript Status</Label>
                          <RadioGroup value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)} className="grid grid-cols-3 gap-1.5">
                              {['all', 'Ongoing', 'Completed'].map(s => (
                                  <Label key={s} htmlFor={`status-${s}`} className="flex flex-col items-center justify-center p-1.5 rounded-lg border-2 border-transparent bg-muted/40 cursor-pointer transition-all peer-data-[state=checked]:border-primary data-[state=checked]:bg-primary/5">
                                      <RadioGroupItem value={s} id={`status-${s}`} className="sr-only" />
                                      <span className="text-[9px] font-bold capitalize">{s === 'all' ? 'All' : s}</span>
                                  </Label>
                              ))}
                          </RadioGroup>
                      </div>

                      <div className="flex items-center justify-between p-2.5 md:p-4 bg-muted/20 rounded-xl border border-dashed border-red-500/20">
                          <div className="space-y-0.5">
                              <Label className="text-[10px] md:text-sm font-bold block">Mature Content</Label>
                              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-tight">Include 18+ stories</p>
                          </div>
                          <Switch checked={matureFilter} onCheckedChange={setMatureFilter} className="scale-75 md:scale-100" />
                      </div>

                      <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Sort Preference</Label>
                          <RadioGroup value={sortBy} onValueChange={(v) => setSortBy(v)} className="space-y-1">
                              {[
                                  { id: 'relevance', label: 'Relevance', icon: Sparkles },
                                  { id: 'views', label: 'Most Read', icon: TrendingUp },
                                  { id: 'newest', label: 'Recently Updated', icon: BookOpen },
                              ].map(s => (
                                  <Label key={s.id} htmlFor={`sort-${s.id}`} className="flex items-center gap-2.5 p-2 md:p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                                      <RadioGroupItem value={s.id} id={`sort-${s.id}`} />
                                      <s.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                      <span className="text-xs md:text-sm font-medium">{s.label}</span>
                                  </Label>
                              ))}
                          </RadioGroup>
                      </div>
                  </div>
              </PopoverContent>
          </Popover>
        </div>

        {/* Genre Scroll - Refined for mobile kinetic feel */}
        <ScrollArea className="w-full whitespace-nowrap scrollbar-hide">
            <div className="flex items-center gap-1.5 max-w-7xl mx-auto px-4">
                <Button 
                    variant={activeGenre === 'all' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-full h-8 md:h-10 px-3 md:px-6 font-bold text-[9px] md:text-xs uppercase tracking-widest shadow-sm shrink-0"
                    onClick={() => handleGenreClick('all')}
                >
                    All Genres
                </Button>
                {GENRES.map(genre => (
                    <Button 
                        key={genre} 
                        variant={activeGenre === genre ? 'default' : 'ghost'} 
                        size="sm" 
                        className={cn(
                            "rounded-full h-8 md:h-10 px-3 md:px-6 font-bold text-[9px] md:text-xs uppercase tracking-widest transition-all shrink-0",
                            activeGenre === genre ? "shadow-lg shadow-primary/20 scale-105" : "bg-muted/40 hover:bg-primary/5 hover:text-primary"
                        )}
                        onClick={() => handleGenreClick(genre)}
                    >
                        {genre}
                    </Button>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* Discovery Hub - Tighter Mobile Layout */}
      {isBrowsing && (
          <div className="px-4 space-y-6 md:space-y-12 pb-10">
              <section className="space-y-3 md:space-y-6">
                <div className="flex items-center gap-2 text-primary">
                    <TrendingUp className="h-4 md:h-6 w-4 md:w-6" />
                    <h2 className="text-lg md:text-2xl font-headline font-bold tracking-tight">Trending Now</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 md:gap-x-6 gap-y-6 md:gap-y-10">
                    {trendingStories.map(s => <StoryCard key={s.id} story={s} />)}
                </div>
              </section>

              <section className="bg-card/50 rounded-2xl md:rounded-[40px] p-5 md:p-12 border border-border/40 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-primary/5 rounded-full blur-3xl -mr-16 md:-mr-32 -mt-16 md:-mt-32" />
                  <div className="relative z-10 space-y-4 md:space-y-8">
                    <div className="space-y-0.5 md:space-y-2">
                        <h2 className="text-xl md:text-3xl font-headline font-bold text-foreground">Explore by Vibe</h2>
                        <p className="text-[10px] md:text-sm text-muted-foreground">Find stories matching specific themes.</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:gap-3">
                        {TRENDING_TAGS.map(tag => (
                            <Button 
                                key={tag} 
                                variant="outline" 
                                className="h-8 md:h-12 rounded-lg md:rounded-2xl gap-1.5 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all font-bold text-[9px] md:text-xs uppercase tracking-widest bg-background/40 px-2.5 md:px-4"
                                onClick={() => setSearchTerm(tag.replace('-', ' '))}
                            >
                                <Sparkles className="h-2.5 md:h-4 w-2.5 md:w-4 text-accent" />
                                #{tag}
                            </Button>
                        ))}
                    </div>
                  </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
                  <div className="lg:col-span-2 space-y-3 md:space-y-6">
                    <h3 className="text-base md:text-xl font-headline font-bold flex items-center gap-2">
                        <Flame className="h-4 md:h-5 w-4 md:w-5 text-orange-500" />
                        Fresh Releases
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-4">
                        {trendingStories.slice(0, 6).map(s => (
                             <Link href={`/stories/${s.id}`} key={s.id} className="group">
                                <div className="aspect-[2/3] relative rounded-xl md:rounded-2xl overflow-hidden bg-muted mb-1.5 shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1">
                                    <NextImage src={s.coverImageUrl || `https://picsum.photos/seed/${s.id}/512/800`} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <p className="text-[10px] md:text-xs font-bold truncate group-hover:text-primary transition-colors px-0.5">{s.title}</p>
                             </Link>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-3 md:space-y-6">
                    <h3 className="text-base md:text-xl font-headline font-bold flex items-center gap-2">
                        <Users className="h-4 md:h-5 w-4 md:w-5 text-blue-500" />
                        Rising Authors
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                        {userResults.length > 0 ? userResults.slice(0, 5).map((author, i) => (
                             <Link href={`/profile/${author.id}`} key={author.id} className="p-2.5 md:p-4 rounded-xl md:rounded-2xl bg-card border border-border/20 flex items-center gap-3 hover:bg-muted/50 cursor-pointer transition-all">
                                <Avatar className="h-8 w-8 md:h-10 md:w-10 border shadow-sm">
                                    <AvatarImage src={author.avatarUrl} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">WR</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[11px] md:text-sm truncate">@{author.username}</p>
                                    <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{author.followersCount || 0} Followers</p>
                                </div>
                                <ChevronRight className="h-3 md:h-3.5 w-3 md:w-3.5 text-muted-foreground/30" />
                            </Link>
                        )) : [...Array(5)].map((_, i) => (
                            <div key={i} className="p-2.5 md:p-4 rounded-xl md:rounded-2xl bg-card border border-border/20 flex items-center gap-3 md:gap-4 hover:bg-muted/50 cursor-pointer transition-all">
                                <Avatar className="h-8 w-8 md:h-10 md:w-10 border shadow-sm">
                                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">WR</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[11px] md:text-sm truncate">@Author_Name</p>
                                    <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">1.2k Followers</p>
                                </div>
                                <ChevronRight className="h-3 md:h-3.5 w-3 md:w-3.5 text-muted-foreground/30" />
                            </div>
                        ))}
                    </div>
                  </div>
              </section>
          </div>
      )}

      {/* Results View - Compact Sizing */}
      {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3 px-4">
              <Loader2 className="h-7 md:h-10 w-7 md:w-10 animate-spin text-primary" />
              <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Scanning archives...</p>
          </div>
      ) : !isBrowsing && (
        <div className="px-4 space-y-4 md:space-y-10">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 md:gap-4 border-b border-border/40 pb-4 md:pb-6">
                <div className="max-w-full">
                    <h2 className="text-lg md:text-3xl font-headline font-bold tracking-tight truncate">
                        {searchTerm ? `Results for "${searchTerm}"` : `Browsing ${activeGenre}`}
                    </h2>
                    <p className="text-[9px] md:text-sm text-muted-foreground mt-0.5 uppercase font-bold tracking-tight">Found {storyResults.length} manuscripts and {userResults.length} creators</p>
                </div>
                <div className="flex flex-wrap gap-1 md:gap-2">
                    {statusFilter !== 'all' && <Badge variant="secondary" className="rounded-full px-2 md:px-3 h-6 md:h-8 gap-1 md:gap-2 font-bold text-[8px] md:text-[10px] uppercase">{statusFilter} <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setStatusFilter('all')} /></Badge>}
                    {matureFilter && <Badge variant="secondary" className="rounded-full px-2 md:px-3 h-6 md:h-8 gap-1 md:gap-2 font-bold text-[8px] md:text-[10px] uppercase">18+ <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setMatureFilter(false)} /></Badge>}
                    {sortBy !== 'relevance' && <Badge variant="secondary" className="rounded-full px-2 md:px-3 h-6 md:h-8 gap-1 md:gap-2 font-bold text-[8px] md:text-[10px] uppercase">Sort: {sortBy} <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setSortBy('relevance')} /></Badge>}
                </div>
            </header>

            {!hasResults ? (
                <div className="text-center py-16 md:py-32 bg-card/50 rounded-[2rem] md:rounded-[40px] border-2 border-dashed border-border/40 max-w-2xl mx-auto px-6">
                    <div className="bg-muted/30 w-14 md:w-20 h-14 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <SearchIcon className="h-6 md:h-10 w-6 md:w-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-lg md:text-2xl font-headline font-bold mb-1.5">Archives are empty</h3>
                    <p className="text-[11px] md:text-sm text-muted-foreground max-sm mx-auto mb-5 md:mb-8 leading-relaxed">No results matched your criteria. Try loosening your filters.</p>
                    <Button onClick={handleClear} variant="outline" className="rounded-full px-5 md:px-8 h-9 md:h-12 font-bold uppercase text-[9px] md:text-xs tracking-widest">Clear Everything</Button>
                </div>
            ) : (
                <Tabs defaultValue="stories" className="w-full">
                    <div className="flex justify-center mb-5 md:mb-10">
                        <TabsList className="bg-muted/50 p-0.5 md:p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md h-9 md:h-12">
                            <TabsTrigger value="stories" className="rounded-full font-bold gap-1.5 px-4 md:px-8 data-[state=active]:bg-background data-[state=active]:shadow-md h-8 md:h-10 text-[9px] md:text-sm transition-all">
                                <BookOpen className="h-3 md:h-4 w-3 md:w-4" /> Manuscripts
                            </TabsTrigger>
                            <TabsTrigger value="authors" disabled={userResults.length === 0} className="rounded-full font-bold gap-1.5 px-4 md:px-8 data-[state=active]:bg-background data-[state=active]:shadow-md h-8 md:h-10 text-[9px] md:text-sm transition-all">
                                <Users className="h-3 md:h-4 w-3 md:w-4" /> Creators
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="stories" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-1 duration-500">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 md:gap-x-6 gap-y-7 md:gap-y-10">
                            {storyResults.map(story => (
                            <StoryCard key={story.id} story={story} />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="authors" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-1 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
                            {userResults.map(author => (
                            <Link href={`/profile/${author.id}`} key={author.id} className="group">
                                <Card className="rounded-xl md:rounded-3xl border-border/40 shadow-sm hover:shadow-md transition-all group-hover:border-primary/20 overflow-hidden bg-card/60 backdrop-blur-sm">
                                    <CardContent className="p-3 md:p-5 flex items-center gap-3 md:gap-4">
                                        <div className="relative">
                                            <Avatar className="w-11 md:w-16 h-11 md:h-16 border-2 border-primary/10 group-hover:scale-105 transition-transform duration-300 shadow-md">
                                                <AvatarImage src={author.avatarUrl} alt={author.username} data-ai-hint="profile person" />
                                                <AvatarFallback className="bg-primary/5 text-primary text-sm md:text-xl font-bold">{(author.username).substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {author.isVerified && (
                                                <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-white p-0.5 rounded-full shadow-sm ring-2 ring-background">
                                                    <Check className="h-1.5 md:h-2 w-1.5 md:w-2" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold font-headline text-sm md:text-lg group-hover:text-primary transition-colors truncate">
                                                {author.displayName || author.username}
                                            </h3>
                                            <p className="text-[9px] md:text-xs text-muted-foreground font-mono -mt-0.5">@{author.username}</p>
                                            <div className="flex items-center gap-1.5 md:gap-3 mt-1 md:mt-2 text-[7px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                                <span>{author.followersCount || 0} Followers</span>
                                                <span className="w-0.5 md:w-1 h-0.5 md:h-1 bg-border rounded-full" />
                                                <span>Writer</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                                            <ChevronRight className="h-5 w-5 text-primary" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Link>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
