
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Story } from '@/types';
import StoryCard from '@/components/shared/StoryCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, BookOpen, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StoriesPage() {
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [filteredStories, setFilteredStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('all');
  const [sortBy, setSortBy] = useState('trending');

  useEffect(() => {
    setIsLoading(true);
    const storiesCol = collection(db, 'stories');
    const q = query(
      storiesCol, 
      where('visibility', '==', 'Public'),
      where('status', '!=', 'Draft')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stories = snapshot.docs.map(doc => {
        const data = doc.data();
        const authorSummary = data.author 
          ? { id: data.author.id || 'unknown', username: data.author.username || 'Unknown Author', displayName: data.author.displayName, avatarUrl: data.author.avatarUrl }
          : { id: 'unknown', username: 'Unknown Author', displayName: 'Unknown Author' };

        return { 
          id: doc.id, 
          ...data,
          author: authorSummary,
          genre: data.genre || 'N/A',
          tags: data.tags || [],
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
          chapters: data.chapters || [],
        } as Story;
      });
      setAllStories(stories);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching all public stories:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const uniqueGenres = useMemo(() => {
    const genres = new Set(allStories.map(s => s.genre).filter(Boolean));
    return ['all', ...Array.from(genres)];
  }, [allStories]);

  useEffect(() => {
    let stories = [...allStories];

    if (filterGenre !== 'all') {
      stories = stories.filter(s => s.genre?.toLowerCase() === filterGenre.toLowerCase());
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      stories = stories.filter(s => 
        s.title.toLowerCase().includes(term) || 
        s.author.username.toLowerCase().includes(term) || 
        s.author.displayName?.toLowerCase().includes(term)
      );
    }

    switch (sortBy) {
      case 'new':
        stories.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'popular':
        stories.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'trending':
      default:
        stories.sort((a,b) => ((b.views || 0) + (b.rating || 0) * 100) - ((a.views || 0) + (a.rating || 0) * 100));
        break;
    }

    setFilteredStories(stories);
  }, [allStories, searchTerm, filterGenre, sortBy]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Scanning the archives...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Header */}
        <header className="pt-12 pb-16 text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <Badge variant="outline" className="px-4 py-1 border-primary/20 text-primary bg-primary/5 rounded-full mb-2">
            <Sparkles className="h-3 w-3 mr-2" /> Explorer
          </Badge>
          <h1 className="text-4xl md:text-6xl font-headline font-bold text-foreground tracking-tight">
            Infinite Worlds Await
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
            Discover thousands of stories curated by a global community of independent authors.
          </p>
        </header>

        {/* Refined Filter Bar */}
        <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl py-4 mb-12 border-b border-border/40">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search by title, author, or genre..." 
                className="pl-10 h-11 bg-muted/30 border-border/50 rounded-full focus-visible:ring-primary focus-visible:bg-background transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mr-2">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </div>
              <Select value={filterGenre} onValueChange={setFilterGenre}>
                <SelectTrigger className="w-[140px] rounded-full bg-muted/30 border-border/50 h-10">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueGenres.map(genre => (
                    <SelectItem key={genre} value={genre} className="capitalize">{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] rounded-full bg-muted/30 border-border/50 h-10">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="popular">Most Read</SelectItem>
                  <SelectItem value="new">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Denser Grid for Better UX */}
        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 gap-y-10 animate-in fade-in zoom-in-95 duration-500">
            {filteredStories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-card/50 rounded-3xl border-2 border-dashed border-border/50">
              <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-headline font-bold mb-2">No Stories Found</h2>
              <p className="text-muted-foreground max-w-xs mx-auto">Try adjusting your search terms or filters to discover something new.</p>
              <Button variant="link" onClick={() => { setSearchTerm(''); setFilterGenre('all'); }} className="mt-4 text-primary">
                Clear all filters
              </Button>
          </div>
        )}
      </main>
    </div>
  );
}
