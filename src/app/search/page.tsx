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
  Check,
  Eye,
  ListOrdered,
  ChevronDown,
  LayoutGrid
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
import { cn, formatCompactNumber } from '@/lib/utils';
import NextImage from 'next/image';

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
    <div className="w-full max-w-5xl mx-auto space-y-0 pb-24 animate-in fade-in duration-500 overflow-x-hidden">
      {/* Search Header - Sticky */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3 md:p-4 space-y-4 w-full">
        <div className="relative group max-w-2xl mx-auto w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="Search for stories or people" 
              className="pl-10 w-full h-10 md:h-12 rounded-lg bg-muted/40 border-none shadow-none text-sm focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={handleInputChange}
          />
          {searchTerm && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground" onClick={handleClear}>
                  <X className="h-4 w-4" />
              </button>
          )}
        </div>

        <div className="flex items-center gap-2 max-w-2xl mx-auto w-full">
            <ScrollArea className="flex-1 whitespace-nowrap scrollbar-hide">
                <div className="flex items-center gap-6 px-1">
                    {GENRES.map(genre => (
                        <button 
                            key={genre} 
                            onClick={() => handleGenreClick(genre)}
                            className={cn(
                                "text-xs md:text-sm font-bold uppercase tracking-widest transition-all pb-1 border-b-2",
                                activeGenre === genre ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                            )}
                        >
                            {genre}
                        </button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all">
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[90vw] sm:w-[400px] p-4 rounded-3xl border-none shadow-3xl bg-card/95 backdrop-blur-xl" align="end" sideOffset={12}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">Library Categories</h4>
                            {activeGenre !== 'all' && (
                                <button onClick={() => handleGenreClick('all')} className="text-[10px] font-black uppercase text-primary hover:underline">Clear</button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {GENRES.map(genre => (
                                <Button
                                    key={genre}
                                    variant={activeGenre === genre ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn(
                                        "justify-start h-10 text-[9px] font-black uppercase tracking-widest rounded-xl px-4 border-border/40 transition-all",
                                        activeGenre === genre ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5 hover:text-primary hover:border-primary/30"
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

      {/* Discovery Hub */}
      {isBrowsing && (
          <div className="p-4 md:p-6 space-y-8">
              <section className="space-y-4">
                <h2 className="text-base md:text-lg font-bold tracking-tight">Hottest DVHIDEOUT Originals</h2>
                <ScrollArea className="w-full whitespace-nowrap scrollbar-hide -mx-4 px-4">
                    <div className="flex gap-3 pb-2">
                        {trendingStories.slice(0, 8).map(s => (
                            <div key={s.id} className="w-28 md:w-36 shrink-0">
                                <StoryCard story={s} />
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
              </section>

              {/* Feed resets after originals */}
              <div className="flex items-center justify-between pt-4">
                 <h2 className="text-base md:text-lg font-bold tracking-tight">
                    {formatCompactNumber(trendingStories.length * 100)} Stories
                 </h2>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 rounded-lg font-bold uppercase text-[10px] tracking-widest border border-border/40">
                            <SlidersHorizontal className="h-3 w-3" />
                            Filter
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[85vw] max-w-sm p-4 rounded-2xl border-none shadow-3xl bg-card/95 backdrop-blur-xl" align="end">
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm">Refine Search</h4>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground">Sort By</Label>
                                <RadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="grid grid-cols-1 gap-1">
                                    {['relevance', 'views', 'newest'].map(s => (
                                        <Label key={s} htmlFor={`sort-${s}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer capitalize text-xs">
                                            <RadioGroupItem value={s} id={`sort-${s}`} />
                                            {s}
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                        </div>
                    </PopoverContent>
                 </Popover>
              </div>

              {/* Discovery List View */}
              <div className="space-y-6 pt-2">
                  {trendingStories.map((story, index) => (
                      <Link href={`/stories/${story.id}`} key={story.id} className="flex gap-4 group">
                          <div className="relative w-20 md:w-24 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-muted shadow-sm group-hover:shadow-md transition-shadow">
                              <NextImage src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/200/300`} alt="" fill className="object-cover" />
                          </div>
                          <div className="flex-1 space-y-1 py-1">
                              <div className="flex items-center gap-2">
                                  <span className="text-base font-bold text-foreground/40">{index + 1}</span>
                                  <h3 className="font-bold text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">{story.title}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground font-medium">_{story.author.username}_</p>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground/60">
                                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatCompactNumber(story.views || 0)}</span>
                                  <span className="flex items-center gap-1"><ListOrdered className="h-3 w-3" /> {story.chapters?.length || 0}</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                  {story.tags.slice(0, 3).map(tag => (
                                      <Badge key={tag} variant="secondary" className="h-5 px-2 rounded bg-muted/50 text-[9px] font-bold border-none">{tag}</Badge>
                                  ))}
                                  {story.tags.length > 3 && <span className="text-[9px] font-bold text-muted-foreground/60 self-center">+ more</span>}
                              </div>
                          </div>
                      </Link>
                  ))}
              </div>
          </div>
      )}

      {/* Search Results View */}
      {!isBrowsing && (
        <div className="p-4 md:p-6 space-y-6">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase text-muted-foreground animate-pulse">Scanning Archives</p>
                </div>
            ) : !hasResults ? (
                <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border/40">
                    <SearchIcon className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <h3 className="text-sm font-bold">No results found</h3>
                    <Button onClick={handleClear} variant="link" className="text-xs uppercase font-black">Clear Search</Button>
                </div>
            ) : (
                <Tabs defaultValue="stories" className="w-full">
                    <div className="flex justify-between items-center mb-6">
                        <TabsList className="bg-muted/50 p-0.5 rounded-lg h-9">
                            <TabsTrigger value="stories" className="rounded-md text-[10px] font-black uppercase gap-1 px-4 h-8">Manuscripts</TabsTrigger>
                            <TabsTrigger value="authors" disabled={userResults.length === 0} className="rounded-md text-[10px] font-black uppercase gap-1 px-4 h-8">Creators</TabsTrigger>
                        </TabsList>
                        <Badge variant="outline" className="h-6 rounded-full px-3 text-[10px] font-bold uppercase tracking-tight">{storyResults.length} Results</Badge>
                    </div>

                    <TabsContent value="stories" className="space-y-6">
                        {storyResults.map((story, index) => (
                            <Link href={`/stories/${story.id}`} key={story.id} className="flex gap-4 group">
                                <div className="relative w-24 md:w-28 aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-muted shadow-sm">
                                    <NextImage src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/200/300`} alt="" fill className="object-cover" />
                                </div>
                                <div className="flex-1 py-1 space-y-2">
                                    <h3 className="font-bold text-sm md:text-lg line-clamp-2 group-hover:text-primary transition-colors leading-snug">{story.title}</h3>
                                    <p className="text-xs text-muted-foreground font-medium">@{story.author.username}</p>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/70">
                                        <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> {formatCompactNumber(story.views || 0)}</span>
                                        <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {story.chapters?.length || 0} Parts</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <Badge variant="outline" className="h-5 px-2 text-[9px] uppercase tracking-tighter text-primary border-primary/20 bg-primary/5">{story.genre}</Badge>
                                        {story.tags.slice(0, 2).map(tag => (
                                            <Badge key={tag} variant="secondary" className="h-5 px-2 rounded bg-muted/40 text-[9px] font-bold border-none truncate max-w-[80px]">#{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </TabsContent>

                    <TabsContent value="authors" className="space-y-3">
                        {userResults.map(author => (
                        <Link href={`/profile/${author.id}`} key={author.id} className="block group">
                            <Card className="rounded-xl border-border/40 hover:bg-muted/30 transition-colors">
                                <CardContent className="p-3 flex items-center gap-4">
                                    <Avatar className="w-12 h-12 border shadow-sm">
                                        <AvatarImage src={author.avatarUrl} alt={author.username} />
                                        <AvatarFallback className="text-xs font-black uppercase">{(author.username).substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm truncate">@{author.username}</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest">{author.displayName}</p>
                                        <p className="text-[10px] text-primary font-black mt-1">{author.followersCount || 0} Followers</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
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
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
