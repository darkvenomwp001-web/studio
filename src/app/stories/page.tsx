
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
import { ArrowRight, BookOpen, LibrarySquare, TrendingUp, Sparkles, Users, Bookmark, Loader2 } from 'lucide-react';
import type { Story, ReadingListItem } from '@/types';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import YourStoryCard from '@/components/shared/YourStoryCard'; 
import { useAuth } from '@/hooks/useAuth'; 
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';


export default function StoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const storiesCol = collection(db, 'stories');
    const q = query(
      storiesCol, 
      where('visibility', '==', 'Public'),
      where('status', '!=', 'Draft'),
      orderBy('lastUpdated', 'desc')
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
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
          chapters: data.chapters || [],
          tags: data.tags || [],
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

  const featuredStoriesForCarousel = allStories.slice(0, 5);
  const popularStories = [...allStories].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  const newReleases = [...allStories].sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).slice(0, 10);
  const communityPicks = [...allStories].sort(() => 0.5 - Math.random()).slice(0, 10);

  const getUniqueGenres = (stories: Story[]): string[] => {
    const allGenres = stories.flatMap(story => story.genre.toLowerCase()); 
    return Array.from(new Set(allGenres)).map(genre => genre.charAt(0).toUpperCase() + genre.slice(1));
  };
  const uniqueGenres = getUniqueGenres(allStories);

  const getStoriesByGenre = (genre: string, limit: number = 10): Story[] => {
    return allStories.filter(story => story.genre.toLowerCase() === genre.toLowerCase()).slice(0, limit);
  };

  const userReadingList: ReadingListItem[] = user?.readingList || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading stories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground space-y-12 -mt-8">
      {/* Hero Carousel Section */}
      <section>
        <Carousel
          plugins={[
            Autoplay({
              delay: 5000, 
              stopOnInteraction: true,
            }),
          ]}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full shadow-xl rounded-lg overflow-hidden max-w-7xl mx-auto"
        >
          <CarouselContent>
            {featuredStoriesForCarousel.map((story, index) => (
              <CarouselItem key={story.id}>
                <Link
                  href={`/stories/${story.id}`}
                  className="block overflow-hidden group relative rounded-lg aspect-[12/5] cursor-pointer bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={`View story: ${story.title}`}
                >
                  <Image
                    src={story.coverImageUrl || `https://placehold.co/1200x500.png`} 
                    alt={story.title}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
                    data-ai-hint={story.dataAiHint || "story banner"}
                    priority={index === 0}
                  />
                </Link>
              </CarouselItem>
            ))}
             {featuredStoriesForCarousel.length === 0 && (
                <CarouselItem>
                    <div className="aspect-[12/5] bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No featured stories available.</p>
                    </div>
                </CarouselItem>
             )}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Your Stories Section (Conditional) */}
      {!authLoading && user && userReadingList.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground">
              <Bookmark className="text-accent h-6 w-6" /> Your Stories
            </h2>
          </div>
          <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {userReadingList.slice(0, 10).map(story => ( 
                <YourStoryCard key={`yourstory-${story.id}`} story={story} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Stories Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground">
            <TrendingUp className="text-accent h-6 w-6" /> Popular Stories
          </h2>
        </div>
        <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
          {popularStories.length > 0 ? (
            popularStories.map(story => (
              <CompactStoryCard key={`popular-${story.id}`} story={story} />
            ))
          ) : (
            <p className="text-muted-foreground">No popular stories to display.</p>
          )}
        </div>
      </section>

      {/* New Releases Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground">
             <Sparkles className="text-accent h-6 w-6" /> New Releases
          </h2>
        </div>
        <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
          {newReleases.length > 0 ? (
            newReleases.map(story => (
              <CompactStoryCard key={`new-${story.id}`} story={story} />
            ))
          ) : (
            <p className="text-muted-foreground">No new releases to display.</p>
          )}
        </div>
      </section>
      
      {/* Community Picks Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground">
             <Users className="text-accent h-6 w-6" /> Community Picks
          </h2>
        </div>
        <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
          {communityPicks.length > 0 ? (
            communityPicks.map(story => (
              <CompactStoryCard key={`community-${story.id}`} story={story} />
            ))
          ) : (
             <p className="text-muted-foreground">No community picks to display.</p>
          )}
        </div>
      </section>

      {/* Genre Sections */}
      {uniqueGenres.map(genre => {
        const genreStories = getStoriesByGenre(genre, 10);
        if (genreStories.length === 0) return null; 
        return (
          <section key={genre} className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-headline font-semibold text-foreground">{genre}</h2>
            </div>
            <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
              {genreStories.map(story => (
                  <CompactStoryCard key={`${genre}-${story.id}`} story={story} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
