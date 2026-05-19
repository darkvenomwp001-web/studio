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
            limit(20)
          );
      } else if (genre !== 'all') {
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
    <div className="max-w-4xl mx-auto space-y-4 pb-24 px-3 sm:px-4 md:px-6 animate-in fade-in duration-500">
      {/* Ultra-Compact Sticky Search Header */}
      <div className="sticky top-14 md:top-16 z-30 bg-background/90 backdrop-blur-xl -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-2 md:py-4 border-b border-border/40 shadow-sm space-y-2">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1 group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Search archives..." 
                className="pl-9 h-9 md:h-11 rounded-xl bg-muted/30 border-none shadow-inner text-xs md:text-sm focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={handleInputChange}
            />
            {searchTerm && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground" onClick={handleClear}>
                    <X className="h-4 w-4" />
                </button>
            )}
          </div>
          
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 md:h-11 w-9 md:w-11 rounded-xl border-border/40 shrink-0 relative">
                      <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      {(statusFilter !== 'all' || matureFilter || sortBy !== 'relevance') && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border-2 border-background" />
                      )}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[85vw] max-w-sm p-4 rounded-3xl border-none shadow-3xl bg-card/95 backdrop-blur-xl" align="end" sideOffset={8}>
                  <div className="space-y-4">
                      <div className="flex items-center justify-between">
                          <h4 className="font-headline font-bold text-sm">Filter Discovery</h4>
                          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary h-6" onClick={() => { setStatusFilter('all'); setMatureFilter(false); setSortBy('relevance'); }}>Reset</Button>
                      </div>
                      
                      <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status</Label>
                          <RadioGroup value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)} className="grid grid-cols-3 gap-1">
                              {['all', 'Ongoing', 'Completed'].map(s => (
                                  <Label key={s} htmlFor={`status-${s}`} className="flex items-center justify-center h-8 rounded-lg border bg-muted/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary data-[state=checked]:bg-primary/5">
                                      <RadioGroupItem value={s} id={`status-${s}`} className="sr-only" />
                                      <span className="text-[9px] font-bold uppercase">{s}</span>
                                  </Label>
                              ))}
                          </RadioGroup>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                          <div className="space-y-0.5">
                              <Label className="text-xs font-bold block">18+ Content</Label>
                              <p className="text-[9px] text-muted-foreground uppercase">Show mature works</p>
                          </div>
                          <Switch checked={matureFilter} onCheckedChange={setMatureFilter} className="scale-75" />
                      </div>

                      <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sort By</Label>
                          <RadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="space-y-0.5">
                              {[
                                  { id: 'relevance', label: 'Relevance', icon: Sparkles },
                                  { id: 'views', label: 'Most Read', icon: TrendingUp },
                                  { id: 'newest', label: 'Recent', icon: BookOpen },
                              ].map(s => (
                                  <Label key={s.id} htmlFor={`sort-${s.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                                      <RadioGroupItem value={s.id} id={`sort-${s.id}`} />
                                      <s.icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                      <span className="text-[11px] font-bold">{s.label}</span>
                                  </Label>
                              ))}
                          </RadioGroup>
                      </div>
                  </div>
              </PopoverContent>
          </Popover>
        </div>

        <ScrollArea className="w-full whitespace-nowrap scrollbar-hide">
            <div className="flex items-center gap-1 mx-auto px-1 pb-1">
                <Button 
                    variant={activeGenre === 'all' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-full h-6 px-2.5 font-bold text-[8px] md:text-[9px] uppercase tracking-widest shrink-0"
                    onClick={() => handleGenreClick('all')}
                >
                    All
                </Button>
                {GENRES.map(genre => (
                    <Button 
                        key={genre} 
                        variant={activeGenre === genre ? 'default' : 'ghost'} 
                        size="sm" 
                        className={cn(
                            "rounded-full h-6 px-2.5 font-bold text-[8px] md:text-[9px] uppercase tracking-widest transition-all shrink-0",
                            activeGenre === genre ? "shadow-md scale-105" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
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

      {/* Discovery Hub */}
      {isBrowsing && (
          <div className="space-y-6 pb-10">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                    <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em]">Trending</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {trendingStories.slice(0, 6).map(s => <StoryCard key={s.id} story={s} />)}
                </div>
              </section>

              <section className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-4">
                  <div className="space-y-0.5">
                      <h2 className="text-xs md:text-sm font-black uppercase tracking-widest">Vibe Check</h2>
                      <p className="text-[8px] md:text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Explore by thematic tropes</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                      {TRENDING_TAGS.map(tag => (
                          <Button 
                              key={tag} 
                              variant="ghost" 
                              className="h-6 rounded-lg border border-primary/20 bg-background/50 hover:bg-primary/10 transition-all font-bold text-[8px] md:text-[9px] uppercase tracking-tighter px-2"
                              onClick={() => setSearchTerm(tag.replace('-', ' '))}
                          >
                              #{tag}
                          </Button>
                      ))}
                  </div>
              </section>

              {trendingStories.length > 0 && (
                  <section className="space-y-6">
                      <div className="space-y-3">
                        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-60">
                            <Flame className="h-3 w-3 text-orange-500" /> Recent Arrivals
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {trendingStories.slice(0, 3).map(s => (
                                 <Link href={`/stories/${s.id}`} key={s.id} className="group">
                                    <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-muted mb-1 shadow-sm transition-all group-hover:-translate-y-0.5">
                                        <NextImage src={s.coverImageUrl || `https://picsum.photos/seed/${s.id}/512/800`} alt="" fill className="object-cover" />
                                    </div>
                                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter truncate group-hover:text-primary transition-colors px-0.5">{s.title}</p>
                                 </Link>
                            ))}
                        </div>
                      </div>
                  </section>
              )}
          </div>
      )}

      {/* Results View */}
      {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
              <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Scanning Archives</p>
          </div>
      ) : !isBrowsing && (
        <div className="space-y-4">
            <header className="border-b border-border/40 pb-2 md:pb-3 flex justify-between items-end">
                <div className="min-w-0">
                    <h2 className="text-[10px] md:text-sm font-black uppercase tracking-widest truncate">
                        {searchTerm ? `Results: "${searchTerm}"` : `Archive: ${activeGenre}`}
                    </h2>
                    <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Found {storyResults.length} Manuscripts</p>
                </div>
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {statusFilter !== 'all' && <Badge variant="secondary" className="h-4 px-1 text-[7px] md:text-[8px] uppercase">{statusFilter}</Badge>}
                    {matureFilter && <Badge variant="secondary" className="h-4 px-1 text-[7px] md:text-[8px] uppercase">18+</Badge>}
                </div>
            </header>

            {!hasResults ? (
                <div className="text-center py-16 bg-muted/10 rounded-3xl border-2 border-dashed border-border/40 max-w-md mx-auto px-4">
                    <SearchIcon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <h3 className="text-xs md:text-sm font-black uppercase">No Findings</h3>
                    <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase mt-1">Try relaxing your filters.</p>
                    <Button onClick={handleClear} variant="link" className="text-[8px] md:text-[9px] uppercase font-black mt-2">Clear All</Button>
                </div>
            ) : (
                <Tabs defaultValue="stories" className="w-full">
                    <div className="flex justify-center mb-6">
                        <TabsList className="bg-muted/50 p-0.5 rounded-full border h-7 md:h-8">
                            <TabsTrigger value="stories" className="rounded-full text-[8px] md:text-[9px] font-black uppercase gap-1 px-3 md:px-4 h-6 md:h-7">
                                <BookOpen className="h-2.5 w-2.5 md:h-3 md:w-3" /> Manuscripts
                            </TabsTrigger>
                            <TabsTrigger value="authors" disabled={userResults.length === 0} className="rounded-full text-[8px] md:text-[9px] font-black uppercase gap-1 px-3 md:px-4 h-6 md:h-7">
                                <Users className="h-2.5 w-2.5 md:h-3 md:w-3" /> Creators
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="stories" className="mt-0 focus-visible:outline-none">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                            {storyResults.map(story => (
                            <StoryCard key={story.id} story={story} />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="authors" className="mt-0 focus-visible:outline-none space-y-1.5">
                        {userResults.map(author => (
                        <Link href={`/profile/${author.id}`} key={author.id} className="block group">
                            <Card className="rounded-xl border-border/40 active:bg-muted/50 transition-colors bg-card/60 backdrop-blur-sm">
                                <CardContent className="p-2 md:p-3 flex items-center gap-2 md:gap-3">
                                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border shadow-sm">
                                        <AvatarImage src={author.avatarUrl} alt={author.username} />
                                        <AvatarFallback className="text-[8px] md:text-[10px] font-black uppercase">{(author.username).substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-[10px] md:text-xs truncate uppercase tracking-tight">
                                            {author.displayName || author.username}
                                        </h3>
                                        <p className="text-[7px] md:text-[8px] text-muted-foreground font-bold tracking-widest -mt-0.5">@{author.username}</p>
                                        <p className="text-[7px] md:text-[8px] text-primary uppercase font-black tracking-tighter mt-1">{author.followersCount || 0} Followers</p>
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                                </CardContent>
                            </Card>
                        </Link>
                        ))}
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
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-6 w-6 md:h-8 md:w-8" /></div>}>
      <SearchResults />
    </Suspense>
  );
}