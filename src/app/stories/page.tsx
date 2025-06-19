
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import StoryCard from '@/components/shared/StoryCard';
import { placeholderStories } from '@/lib/placeholder-data';
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
import { ArrowRight, TrendingUp, Sparkles, BookOpen } from 'lucide-react';

export default function StoriesPage() {
  const featuredStoriesForCarousel = placeholderStories.slice(0, 5);
  const popularStories = placeholderStories.slice(0, 8);
  const newReleases = placeholderStories.slice(placeholderStories.length - 4 > 0 ? placeholderStories.length - 4 : 0).reverse();
  const communityPicks = [...placeholderStories].sort(() => 0.5 - Math.random()).slice(0, 4);

  return (
    <div className="min-h-screen bg-background text-foreground space-y-12 py-8">
      {/* Hero Carousel Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-headline font-bold mb-6 text-center md:text-left text-primary">Featured Reads</h2>
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
          className="w-full"
        >
          <CarouselContent>
            {featuredStoriesForCarousel.map((story, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <Link href={`/stories/${story.id}`} passHref>
                  <Card className="overflow-hidden h-[450px] group relative shadow-xl border-2 border-transparent hover:border-primary transition-all duration-300 bg-card">
                    <Image
                      src={story.coverImageUrl || `https://placehold.co/600x900.png`}
                      alt={story.title}
                      layout="fill"
                      objectFit="cover"
                      className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
                      data-ai-hint={story.dataAiHint || "book cover"}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <CardContent className="absolute bottom-0 left-0 p-6 w-full z-10">
                      <h3 className="text-2xl font-headline font-bold text-white mb-1 line-clamp-2">{story.title}</h3>
                      <p className="text-sm text-gray-200 mb-2">By {story.author.username}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {story.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-white/20 text-white backdrop-blur-sm border-none">{tag}</Badge>
                        ))}
                      </div>
                       <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Read Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-2 md:-left-4 top-1/2 -translate-y-1/2 z-20 bg-background/70 hover:bg-primary text-foreground hover:text-primary-foreground disabled:bg-muted/50" />
          <CarouselNext className="absolute right-2 md:-right-4 top-1/2 -translate-y-1/2 z-20 bg-background/70 hover:bg-primary text-foreground hover:text-primary-foreground disabled:bg-muted/50" />
        </Carousel>
      </section>

      {/* Popular Stories Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-headline font-bold flex items-center gap-2 text-foreground">
            <TrendingUp className="text-accent h-7 w-7" /> Popular Stories
          </h2>
          <Link href="/stories/popular" passHref>
            <Button variant="outline">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {popularStories.map(story => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      {/* New Releases Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-headline font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="text-accent h-7 w-7" /> New Releases
          </h2>
          <Link href="/stories/new" passHref>
            <Button variant="outline">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {newReleases.map(story => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      {/* Community Picks Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-headline font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="text-accent h-7 w-7" /> Community Picks
          </h2>
          <Link href="/stories/community" passHref>
            <Button variant="outline">Explore More <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {communityPicks.map(story => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </section>
    </div>
  );
}
