'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Sparkles, 
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

    const carouselQuery = query(
        collection(db, 'featuredCarousel'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
    );
    const unsubCarousel = onSnapshot(carouselQuery, (snapshot) => {
        setCarouselSlides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselSlide)));
    });

    const storiesQuery = query(
      collection(db, 'stories'),
      where('visibility', '==', 'Public'),
      orderBy('lastUpdated', 'desc'),
      firestoreLimit(50)
    );
    
    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      setAllStories(fetchedStories.filter(s => s.status !== 'Draft' && s.title));
      setIsDataLoading(false);
    }, (error) => {
        setHasError(true);
        setIsDataLoading(false);
    });

    const promptsQuery = query(collection(db, 'prompts'), where('isArchived', '==', false), orderBy('createdAt', 'desc'), firestoreLimit(10));
    const unsubscribePrompts = onSnapshot(promptsQuery, (snapshot) => {
      setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
    });

    return () => {
      unsubCarousel();
      unsubscribeStories();
      unsubscribePrompts();
    };
  }, []);

  const validSlides = carouselSlides.filter(s => !!s.imageUrl && !!s.ctaLink);
  const trendingStories = [...allStories].sort((a,b) => ((b.views || 0) + (b.rating || 0) * 100) - ((a.views || 0) + (a.rating || 0) * 100)).slice(0, 12);
  const myReadingList = user?.readingList?.filter(s => !!s.id && !!s.title) || [];

  if (isDataLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      {validSlides.length > 0 && (
        <Carousel plugins={[Autoplay({ delay: 6000 })]} opts={{ loop: true }} className="w-full">
            <CarouselContent className="-ml-0">
                {validSlides.map(slide => (
                    <CarouselItem key={slide.id} className="pl-0 basis-full">
                        <Link href={slide.ctaLink || '/'} className="block relative aspect-[16/9] md:aspect-[3/1] rounded-none md:rounded-b-[40px] overflow-hidden bg-muted">
                            <Image src={slide.imageUrl} alt={slide.title} fill className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex flex-col justify-end p-8">
                                <Button size="lg" className="rounded-full w-fit px-10 font-bold shadow-xl">{slide.ctaText || 'Read Now'}</Button>
                            </div>
                        </Link>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
      )}

      <div className="container mx-auto max-w-7xl px-4 space-y-12 pb-20">
        {myReadingList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-headline font-bold">Continue Reading</h2>
              <Link href="/library" className="text-xs font-bold text-primary uppercase">View All</Link>
            </div>
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
              {myReadingList.slice(0, 10).map(story => <CompactStoryCard key={story.id} story={story} />)}
            </div>
          </section>
        )}

        {trendingStories.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-headline font-bold">Trending Now</h2>
              <Link href="/stories" className="text-xs font-bold text-primary uppercase">Explore All</Link>
            </div>
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
              {trendingStories.map(story => <StoryCard key={story.id} story={story} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('for-you');
  const TABS = [
    { value: 'for-you', label: 'For You', icon: <Sparkles className="h-4 w-4" /> },
    { value: 'annotations', label: 'Highlights', icon: <Quote className="h-4 w-4" /> },
    { value: 'feed', label: 'Feed', icon: <LayoutGrid className="h-4 w-4" /> },
    { value: 'broadcast', label: 'Broadcast', icon: <Radio className="h-4 w-4" /> },
  ];

  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>}>
      <Header />
      <main className="w-full pb-24 md:pb-12 pt-4">
        <div className="container mx-auto max-w-7xl px-4"><StatusFeature /></div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center border-b border-border/40 pb-2"><AnimatedTabs tabs={TABS} activeTab={activeTab} /></div>
            <TabsContent value="for-you" className="mt-0"><ForYouTabContent /></TabsContent>
            <TabsContent value="annotations" className="container mx-auto px-4 mt-8"><AnnotationFeed /></TabsContent>
            <TabsContent value="feed" className="container mx-auto px-4 mt-8"><ThreadsFeed /></TabsContent>
            <TabsContent value="broadcast" className="container mx-auto px-4 mt-8"><BroadcastFeed /></TabsContent>
        </Tabs>
      </main>
      <BottomNavigationBar />
    </Suspense>
  );
}
