
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, LibrarySquare, TrendingUp, Sparkles, Users } from 'lucide-react';
import { placeholderStories } from '@/lib/placeholder-data';
import type { Story } from '@/types';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { useToast } from '@/hooks/use-toast';

// Helper to get unique genres
const getUniqueGenres = (stories: Story[]): string[] => {
  const allGenres = stories.flatMap(story => story.genre.toLowerCase()); // Assuming genre is a string, if it can be array, adjust
  return Array.from(new Set(allGenres)).map(genre => genre.charAt(0).toUpperCase() + genre.slice(1));
};


export default function StoriesPage() {
  const { toast } = useToast();

  const featuredStoriesForCarousel = placeholderStories.slice(0, 5);
  const popularStories = placeholderStories.slice(0, 10);
  const newReleases = placeholderStories.slice(placeholderStories.length - 10 > 0 ? placeholderStories.length - 10 : 0).reverse();
  const communityPicks = [...placeholderStories].sort(() => 0.5 - Math.random()).slice(0, 10);

  const uniqueGenres = getUniqueGenres(placeholderStories);
  
  const getStoriesByGenre = (genre: string, limit: number = 10): Story[] => {
    return placeholderStories.filter(story => story.genre.toLowerCase() === genre.toLowerCase()).slice(0, limit);
  };

  const handleAddToLibrary = (storyTitle: string) => {
    toast({
      title: "Added to Library (Mock)",
      description: `"${storyTitle}" has been added to your library.`,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground space-y-12 py-8">
      {/* Hero Carousel Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-headline font-bold mb-6 text-center md:text-left text-primary flex items-center gap-2">
          <Sparkles className="h-7 w-7" /> Featured Reads
        </h2>
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
          className="w-full shadow-xl rounded-lg overflow-hidden"
        >
          <CarouselContent>
            {featuredStoriesForCarousel.map((story) => (
              <CarouselItem key={story.id}>
                <Card className="overflow-hidden h-[400px] md:h-[500px] group relative border-none rounded-none">
                  <Image
                    src={story.coverImageUrl || `https://placehold.co/1200x600.png`}
                    alt={story.title}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
                    data-ai-hint={story.dataAiHint || "story background"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
                  <CardContent className="absolute bottom-0 left-0 p-6 md:p-10 w-full z-10">
                    <h3 className="text-3xl md:text-4xl font-headline font-bold text-white mb-2 line-clamp-2">{story.title}</h3>
                    <p className="text-md text-gray-200 mb-3">By {story.author.displayName || story.author.username}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {story.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs bg-white/20 text-white backdrop-blur-sm border-none">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/stories/${story.id}`} passHref>
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          <BookOpen className="mr-2 h-5 w-5" /> Read Now
                        </Button>
                      </Link>
                      <Button size="lg" variant="outline" className="bg-black/30 text-white border-white/50 hover:bg-white/20 hover:text-white" onClick={() => handleAddToLibrary(story.title)}>
                        <LibrarySquare className="mr-2 h-5 w-5" /> Add to Library
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-background/70 hover:bg-primary text-foreground hover:text-primary-foreground disabled:bg-muted/50" />
          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-background/70 hover:bg-primary text-foreground hover:text-primary-foreground disabled:bg-muted/50" />
        </Carousel>
      </section>

      {/* Popular Stories Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground">
            <TrendingUp className="text-accent h-6 w-6" /> Popular Stories
          </h2>
          {/* <Link href="/stories/popular" passHref><Button variant="link" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button></Link> */}
        </div>
        <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2">
          {popularStories.map(story => (
            <CompactStoryCard key={`popular-${story.id}`} story={story} />
          ))}
        </div>
      </section>

      {/* New Releases Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground">
             <Sparkles className="text-accent h-6 w-6" /> New Releases
          </h2>
          {/* <Link href="/stories/new" passHref><Button variant="link" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button></Link> */}
        </div>
        <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2">
          {newReleases.map(story => (
            <CompactStoryCard key={`new-${story.id}`} story={story} />
          ))}
        </div>
      </section>
      
      {/* Community Picks Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground">
             <Users className="text-accent h-6 w-6" /> Community Picks
          </h2>
          {/* <Link href="/stories/community" passHref><Button variant="link" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button></Link> */}
        </div>
        <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2">
          {communityPicks.map(story => (
            <CompactStoryCard key={`community-${story.id}`} story={story} />
          ))}
        </div>
      </section>


      {/* Genre Sections */}
      {uniqueGenres.map(genre => {
        const genreStories = getStoriesByGenre(genre);
        if (genreStories.length === 0) return null;
        return (
          <section key={genre} className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-headline font-semibold text-foreground">{genre}</h2>
              {/* <Link href={`/stories/genre/${genre.toLowerCase()}`} passHref><Button variant="link" className="text-primary">View All <ArrowRight className="ml-1 h-4 w-4" /></Button></Link> */}
            </div>
            <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2">
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
