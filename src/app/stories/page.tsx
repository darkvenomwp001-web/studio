
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, BookOpen, LibrarySquare, TrendingUp, Sparkles, Users, Bookmark, Loader2, Search } from 'lucide-react';
import type { Story, ReadingListItem } from '@/types';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { useAuth } from '@/hooks/useAuth'; 
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import StoryCard from '@/components/shared/StoryCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StoriesPage() {
  const { user, loading: authLoading } = useAuth();
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

    // Filter by genre
    if (filterGenre !== 'all') {
      stories = stories.filter(s => s.genre === filterGenre);
    }

    // Filter by search term
    if (searchTerm) {
      stories = stories.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.author.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.author.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
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
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading stories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground space-y-8">
      <header className="container mx-auto px-4 pt-8">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2">Explore All Stories</h1>
        <p className="text-muted-foreground">Find your next favorite book from our entire collection.</p>
        
        <div className="mt-6 flex flex-col sm:flex-row gap-2 bg-card p-2 rounded-lg border">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search by title, author..." 
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={filterGenre} onValueChange={setFilterGenre}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                {uniqueGenres.map(genre => (
                  <SelectItem key={genre} value={genre} className="capitalize">{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="new">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredStories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-lg shadow-sm">
              <h2 className="text-xl font-headline font-semibold mb-2">No Stories Found</h2>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        )}
      </main>

    </div>
  );
}
