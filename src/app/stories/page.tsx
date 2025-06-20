
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
import { ArrowRight, BookOpen, LibrarySquare, TrendingUp, Sparkles, Users, Bookmark } from 'lucide-react';
import { placeholderStories } from '@/lib/placeholder-data';
import type { Story, ReadingListItem } from '@/types';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import YourStoryCard from '@/components/shared/YourStoryCard'; // New card for "Your stories"
import { useAuth } from '@/hooks/useAuth'; // To get current user
import { useToast } from '@/hooks/use-toast';

// Helper to get unique genres
const getUniqueGenres = (stories: Story[]): string[] => {
  const allGenres = stories.flatMap(story => story.genre.toLowerCase()); // Assuming genre is a string, if it can be array, adjust
  return Array.from(new Set(allGenres)).map(genre => genre.charAt(0).toUpperCase() + genre.slice(1));
};


export default function StoriesPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const featuredStoriesForCarousel = placeholderStories.slice(0, 5);
  const popularStories = placeholderStories.slice(0, 10);
  const newReleases = placeholderStories.slice(placeholderStories.length - 10 > 0 ? placeholderStories.length - 10 : 0).reverse();
  const communityPicks = [...placeholderStories].sort(() => 0.5 - Math.random()).slice(0, 10);

  const uniqueGenres = getUniqueGenres(placeholderStories);
  
  const getStoriesByGenre = (genre: string, limit: number = 10): Story[] => {
    return placeholderStories.filter(story => story.genre.toLowerCase() === genre.toLowerCase()).slice(0, limit);
  };

  const userReadingList: ReadingListItem[] = user?.readingList || [];

  return (
    <div className="min-h-screen bg-background text-foreground space-y-12 py-8">
      {/* Hero Carousel Section */}
      <section className="container mx-auto px-0 sm:px-4">
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
          className="w-full shadow-xl rounded-lg overflow-hidden max-w-6xl mx-auto"
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
            {userReadingList.slice(0, 10).map(story => ( // Ensure we get full story details if readingList items are summaries
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
        if (genreStories.length === 0) return null; // Don't render section if no stories for this genre
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
