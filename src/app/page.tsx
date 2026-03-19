
'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  BookHeart, 
  Loader2, 
  Heart as HeartIcon, 
  Sparkles, 
  PenSquare, 
  ChevronRight,
  Flame,
  LayoutGrid,
  Quote
} from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import type { Story, Prompt } from '@/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { AnimatedTabs, Tabs, TabsContent } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import StatusFeature from '@/components/status/StatusFeature';
import PromptCard from '@/components/shared/PromptCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import AnnotationFeed from '@/components/annotations/AnnotationFeed';
import ThreadsFeed from '@/components/threads/ThreadsFeed';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function ForYouTabContent() {
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setIsDataLoading(true);

    const storiesQuery = query(
      collection(db, 'stories'),
      where('visibility', '==', 'Public'),
      orderBy('lastUpdated', 'desc'),
      firestoreLimit(50)
    );
    
    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
        } as Story
      });
      setAllStories(fetchedStories.filter(s => s.status !== 'Draft'));
    }, (error) => {
        console.error("Home Story Fetch Error:", error);
    });

    const promptsQuery = query(
        collection(db, 'prompts'), 
        where('isArchived', '==', false), 
        orderBy('createdAt', 'desc'), 
        firestoreLimit(10)
    );
    const unsubscribePrompts = onSnapshot(promptsQuery, (snapshot) => {
      setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
    }, console.error);

    const timer = setTimeout(() => setIsDataLoading(false), 800);

    return () => {
      clearTimeout(timer);
      unsubscribeStories();
      unsubscribePrompts();
    };
  }, []);

  const featuredStories = allStories.slice(0, 6);
  const trendingStories = [...allStories].sort((a,b) => ((b.views || 0) + (b.rating || 0) * 100) - ((a.views || 0) + (a.rating || 0) * 100)).slice(0, 12);
  const newReleases = [...allStories].sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).slice(0, 12);

  const fantasyStories = allStories.filter(s => s.genre?.toLowerCase() === 'fantasy').slice(0, 10);
  const romanceStories = allStories.filter(s => s.genre?.toLowerCase() === 'romance').slice(0, 10);

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Curating your library...</p>
      </div>
    );
  }

  return (
    <div className="pb-12 animate-in fade-in duration-700 space-y-12">
      {/* Hero Carousel - Refined Aspect Ratio */}
      <section className="w-full">
        <Carousel
          plugins={[Autoplay({ delay: 6000, stopOnInteraction: true })]}
          opts={{ align: "start", loop: true }}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {featuredStories.length > 0 ? featuredStories.map((story, index) => (
              <CarouselItem key={story.id} className="pl-0 basis-full">
                <Link href={`/stories/${story.id}`} className="block group">
                  <div className="relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden bg-muted transition-all duration-500">
                    <Image
                      src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/1600/900`}
                      alt={story.title}
                      fill
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                      data-ai-hint="story high resolution cover"
                      priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent flex flex-col justify-end p-4 md:p-12 lg:p-16">
                      <div className="container mx-auto max-w-7xl px-4 md:px-0">
                        <div className="space-y-1 sm:space-y-2 max-w-2xl translate-y-2 sm:translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                          <Badge className="bg-primary text-primary-foreground mb-1 sm:mb-2 text-[10px] sm:text-xs">Featured</Badge>
                          <h2 className="text-xl sm:text-4xl md:text-5xl lg:text-6xl font-headline font-bold text-foreground drop-shadow-lg line-clamp-2 leading-tight">
                            {story.title}
                          </h2>
                          <p className="text-xs sm:text-lg text-muted-foreground font-medium flex items-center gap-2">
                            by <span className="text-foreground font-semibold">@{story.author.username}</span>
                          </p>
                          <div className="pt-2 sm:pt-4 flex items-center gap-3">
                              <Button size="sm" className="rounded-full px-4 sm:px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                                  Start Reading
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-full border-foreground/20 bg-background/50 backdrop-blur-md hover:bg-background/80 transition-all hidden sm:flex">
                                  View Details
                              </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            )) : (
                <CarouselItem className="pl-0 basis-full">
                    <div className="aspect-[16/9] w-full bg-muted border-2 border-dashed flex items-center justify-center">
                        <p className="text-muted-foreground px-4 text-center">Welcome to D4RKV3NOM. Start creating stories to see them featured here.</p>
                    </div>
                </CarouselItem>
            )}
          </CarouselContent>
          <div className="hidden md:block">
            <CarouselPrevious className="left-8 bg-background/50 backdrop-blur-md border-none hover:bg-background/80 transition-colors" />
            <CarouselNext className="right-8 bg-background/50 backdrop-blur-md border-none hover:bg-background/80 transition-colors" />
          </div>
        </Carousel>
      </section>

      {/* Discovery Rows */}
      <div className="container mx-auto max-w-7xl px-4 space-y-12">
        {/* Trending Row */}
        {trendingStories.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Flame className="text-orange-500 h-5 w-5 fill-orange-500" />
                  </div>
                  <h2 className="text-2xl font-headline font-bold tracking-tight">Trending Now</h2>
              </div>
              <Link href="/stories" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 group">
                  View All <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="flex overflow-x-auto space-x-5 pb-6 -mx-4 px-4 scrollbar-hide md:scrollbar-thin scrollbar-thumb-primary/30">
              {trendingStories.map(story => (
                <CompactStoryCard key={`trend-${story.id}`} story={story} />
              ))}
            </div>
          </section>
        )}

        {/* New Releases Row */}
        {newReleases.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Sparkles className="text-blue-500 h-5 w-5" />
                </div>
                <h2 className="text-2xl font-headline font-bold tracking-tight">New Releases</h2>
            </div>
            <div className="flex overflow-x-auto space-x-5 pb-6 -mx-4 px-4 scrollbar-hide md:scrollbar-thin scrollbar-thumb-primary/30">
              {newReleases.map(story => (
                <CompactStoryCard key={`new-${story.id}`} story={story} />
              ))}
            </div>
          </section>
        )}

        {/* Genre Spotlights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {fantasyStories.length > 0 && (
              <section className="space-y-4">
                  <h3 className="text-xl font-headline font-bold flex items-center gap-2 px-1">
                      <BookHeart className="text-accent h-5 w-5" /> Fantasy Worlds
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
                      {fantasyStories.map(story => (
                          <CompactStoryCard key={`fant-${story.id}`} story={story} />
                      ))}
                  </div>
              </section>
            )}
            {romanceStories.length > 0 && (
              <section className="space-y-4">
                  <h3 className="text-xl font-headline font-bold flex items-center gap-2 px-1">
                      <HeartIcon className="text-red-500 h-5 w-5 fill-red-500" /> Heartfelt Romance
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
                      {romanceStories.map(story => (
                          <CompactStoryCard key={`rom-${story.id}`} story={story} />
                      ))}
                  </div>
              </section>
            )}
        </div>

        {/* Community Prompts Grid */}
        {prompts.length > 0 && (
          <section className="bg-card/50 rounded-3xl p-6 md:p-10 border border-border/50 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="space-y-1">
                  <h2 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
                      <PenSquare className="h-7 w-7" />
                      Community Prompts
                  </h2>
                  <p className="text-muted-foreground">Stuck on your next chapter? Let these sparks ignite your imagination.</p>
              </div>
              <Button variant="outline" className="w-fit rounded-full hover:bg-primary/10 hover:text-primary transition-all font-semibold">
                  See All Prompts
              </Button>
            </div>
            <div className="flex overflow-x-auto space-x-6 pb-4 -mx-4 px-4 scrollbar-hide">
              {prompts.map(prompt => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('for-you');

  const TABS = [
    { value: 'for-you', label: 'For You', icon: <Sparkles className="h-4 w-4" /> },
    { value: 'annotations', label: 'Highlights', icon: <Quote className="h-4 w-4" /> },
    { value: 'feed', label: 'Community Feed', icon: <LayoutGrid className="h-4 w-4" /> },
  ];
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="w-full pb-24 md:pb-12 pt-6 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl px-4">
          <StatusFeature />
        </div>
        
        <div className="mt-8">
           <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-8 px-4">
                  <AnimatedTabs tabs={TABS} activeTab={activeTab} />
              </div>
              
              <TabsContent value="for-you" className="focus-visible:outline-none">
                <ForYouTabContent />
              </TabsContent>
              
              <TabsContent value="annotations" className="animate-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none container mx-auto max-w-7xl px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">My Highlights</h2>
                        <p className="text-muted-foreground">Every line that left a mark on your journey.</p>
                    </div>
                    <AnnotationFeed />
                </div>
              </TabsContent>
              
              <TabsContent value="feed" className="animate-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none container mx-auto max-w-7xl px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">Community Feed</h2>
                        <p className="text-muted-foreground">Catch up with the community and share your own updates.</p>
                    </div>
                    <ThreadsFeed />
                </div>
              </TabsContent>
           </Tabs>
        </div>
      </main>
      <BottomNavigationBar />
    </>
  );
}
