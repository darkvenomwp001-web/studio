'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Sparkles, 
  PenSquare, 
  ChevronRight,
  Flame,
  LayoutGrid,
  Quote,
  Radio,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import StoryCard from '@/components/shared/StoryCard';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import type { Story, Prompt, CarouselSlide } from '@/types';
import { useEffect, useState, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { AnimatedTabs, Tabs, TabsContent, ScrollBar } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import StatusFeature from '@/components/status/StatusFeature';
import PromptCard from '@/components/shared/PromptCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import AnnotationFeed from '@/components/annotations/AnnotationFeed';
import ThreadsFeed from '@/components/threads/ThreadsFeed';
import BroadcastFeed from '@/components/broadcast/BroadcastFeed';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

function ForYouTabContent() {
  const { user } = useAuth();
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsDataLoading(true);
    setHasError(false);

    // Fetch Custom Owner Carousel
    const carouselQuery = query(
        collection(db, 'featuredCarousel'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
    );
    const unsubCarousel = onSnapshot(carouselQuery, (snapshot) => {
        setCarouselSlides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselSlide)));
    }, async (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'featuredCarousel',
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    // Fetch Stories for Discovery Hub
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
      setIsDataLoading(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'stories',
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setHasError(true);
        setIsDataLoading(false);
    });

    const promptsQuery = query(
        collection(db, 'prompts'), 
        where('isArchived', '==', false), 
        orderBy('createdAt', 'desc'), 
        firestoreLimit(10)
    );
    const unsubscribePrompts = onSnapshot(promptsQuery, (snapshot) => {
      setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
    }, async (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'prompts',
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
      unsubCarousel();
      unsubscribeStories();
      unsubscribePrompts();
    };
  }, []);

  const handleHardReset = async () => {
    const { clearFirestoreCache } = await import('@/lib/firebase');
    await clearFirestoreCache();
    window.location.reload();
  };

  const trendingStories = [...allStories].sort((a,b) => ((b.views || 0) + (b.rating || 0) * 100) - ((a.views || 0) + (a.rating || 0) * 100)).slice(0, 12);

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">Syncing Hub...</p>
      </div>
    );
  }

  if (hasError) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 bg-card/20 rounded-[40px] border border-dashed border-border/40 max-w-lg mx-auto mt-10">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-headline font-bold mb-2">Sync Interrupted</h3>
            <p className="text-muted-foreground text-sm mb-6">The archives are having trouble synchronizing. This is usually caused by a persistence conflict.</p>
            <Button onClick={handleHardReset} className="rounded-full px-8 gap-2 font-bold uppercase text-[10px] tracking-widest shadow-lg">
                <RefreshCw className="h-4 w-4" />
                Hard Reset Hub
            </Button>
        </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      {/* Dynamic Owner Carousel */}
      {carouselSlides.length > 0 && (
        <section className="w-full mb-8">
          <Carousel
            plugins={[Autoplay({ delay: 6000, stopOnInteraction: true })]}
            opts={{ align: "start", loop: true }}
            className="w-full"
          >
            <CarouselContent className="-ml-0">
              {carouselSlides.map((slide, index) => (
                <CarouselItem key={slide.id} className="pl-0 basis-full">
                  <Link href={slide.ctaLink || '/'} className="block group">
                    <div className="relative aspect-[16/9] md:aspect-[2.5/1] lg:aspect-[3/1] w-full overflow-hidden bg-muted transition-all duration-500 rounded-none md:rounded-b-[40px]">
                      <Image
                        src={slide.imageUrl}
                        alt={slide.title}
                        fill
                        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                        data-ai-hint="landscape story banner"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent flex flex-col justify-end p-4 md:p-8 lg:p-12">
                        <div className="container mx-auto max-w-7xl px-4 md:px-0">
                          <div className="space-y-1 sm:space-y-3 max-w-2xl translate-y-2 sm:translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                            <Badge className="bg-primary text-primary-foreground mb-1 sm:mb-2 text-[10px] sm:text-xs tracking-[0.2em] font-black uppercase">Featured Selection</Badge>
                            <div className="pt-4 sm:pt-6 flex items-center gap-3">
                                <Button size="lg" className="rounded-full px-6 sm:px-10 bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 font-bold">
                                    {slide.ctaText || 'Explore Now'}
                                </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            {carouselSlides.length > 1 && (
                <div className="hidden md:block">
                    <CarouselPrevious className="left-8 bg-background/50 backdrop-blur-md border-none hover:bg-background/80 transition-colors h-12 w-12" />
                    <CarouselNext className="right-8 bg-background/50 backdrop-blur-md border-none hover:bg-background/80 transition-colors h-12 w-12" />
                </div>
            )}
          </Carousel>
        </section>
      )}

      {/* Discovery Rows */}
      <div className="container mx-auto max-w-7xl px-4 space-y-10 pb-20">
        {user && user.readingList && user.readingList.length > 0 && (
          <section className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold tracking-tight">Pick up where you left off</h2>
              <Link href="/library" className="text-sm font-semibold text-primary hover:underline">View Library</Link>
            </div>
            <div className="flex overflow-x-auto space-x-5 pb-6 -mx-4 px-4 scrollbar-hide md:scrollbar-thin scrollbar-thumb-primary/30">
              {user.readingList.filter(s => !!s.id && !!s.title).slice(0, 8).map(story => (
                <CompactStoryCard key={`lib-${story.id}`} story={story} />
              ))}
            </div>
          </section>
        )}

        {trendingStories.length > 0 && (
          <section className="space-y-4 animate-in slide-in-from-bottom-2 duration-700">
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
                <StoryCard key={`trend-${story.id}`} story={story} />
              ))}
            </div>
          </section>
        )}

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

        {/* Global Empty State */}
        {allStories.length === 0 && carouselSlides.length === 0 && (
          <div className="text-center py-32 bg-card/50 rounded-[40px] border-2 border-dashed border-border/40">
              <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-2xl font-headline font-bold mb-2">The parchment is empty</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mb-8">The community is just getting started. Be the first to publish a public manuscript!</p>
              <Link href="/write">
                <Button className="rounded-full px-10 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-lg font-bold">Start Writing</Button>
              </Link>
          </div>
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
    { value: 'feed', label: 'Feed', icon: <LayoutGrid className="h-4 w-4" /> },
    { value: 'broadcast', label: 'Broadcast', icon: <Radio className="h-4 w-4" /> },
  ];
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense fallback={
        <div className="flex justify-center items-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
      <Header />
      <main className="w-full pb-24 md:pb-12 pt-6 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl px-4">
          <StatusFeature />
        </div>
        
        <div className="mt-2">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="w-full flex justify-center mb-1 px-4 overflow-hidden">
                  <ScrollArea className="w-full max-w-full">
                      <div className="flex min-w-max justify-start md:justify-center py-2 px-1">
                          <AnimatedTabs tabs={TABS} activeTab={activeTab} className="mb-0" />
                      </div>
                      <ScrollBar orientation="horizontal" className="md:hidden" />
                  </ScrollArea>
              </div>
              
              <TabsContent value="for-you" className="focus-visible:outline-none">
                <ForYouTabContent />
              </TabsContent>
              
              <TabsContent value="annotations" className="animate-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none container mx-auto max-w-7xl px-4 mt-6">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">My Highlights</h2>
                        <p className="text-muted-foreground">Every line that left a mark on your journey.</p>
                    </div>
                    <AnnotationFeed />
                </div>
              </TabsContent>
              
              <TabsContent value="feed" className="animate-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none container mx-auto max-w-7xl px-4 mt-6">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">Community Feed</h2>
                        <p className="text-muted-foreground">Share updates, photos, and stories with the whole community.</p>
                    </div>
                    <ThreadsFeed />
                </div>
              </TabsContent>

              <TabsContent value="broadcast" className="animate-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none container mx-auto max-w-7xl px-4 mt-6">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">Broadcast Hub</h2>
                        <p className="text-muted-foreground">Official logs for new features, bug fixes, and maintenance.</p>
                    </div>
                    <BroadcastFeed />
                </div>
              </TabsContent>
           </Tabs>
        </div>
      </main>
      <BottomNavigationBar />
    </Suspense>
  );
}