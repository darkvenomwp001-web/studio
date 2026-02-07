

'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users, Loader2, Award, Swords, Rocket, Heart as HeartIcon, BookMarked, Wand2, PlusCircle, Send, Image as ImageIcon, X, MoreHorizontal, Archive, Trash2, Pin, Pencil, RefreshCw, Sparkles, PenSquare, FileText, TrendingUp, LibrarySquare, MessageCircle, Quote, LayoutGrid } from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Story, UserSummary, Prompt, ReadingListItem } from '@/types';
import { useEffect, useState, FormEvent, useRef, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { AnimatedTabs, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import StatusFeature from '@/components/status/StatusFeature';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createPrompt, archivePrompt, updatePrompt } from '@/app/actions/promptActions';
import { useRouter } from 'next/navigation';
import placeholderImages from '@/app/lib/placeholder-images.json';
import { cn } from '@/lib/utils';
import PromptCard from '@/components/shared/PromptCard';
import YourStoryCard from '@/components/shared/YourStoryCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import AnnotationFeed from '@/components/annotations/AnnotationFeed';
import ThreadsFeed from '@/components/threads/ThreadsFeed';


function ForYouTabContent() {
  const { user, loading: authLoading } = useAuth();
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setIsDataLoading(true);

    const storiesQuery = query(
      collection(db, 'stories'),
      where('visibility', '==', 'Public'),
      orderBy('lastUpdated', 'desc'),
      firestoreLimit(100) // Fetch more stories for variety
    );
    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => {
        const data = doc.data();
        const author = data.author || { id: 'unknown', username: 'Unknown' };
        return { 
          id: doc.id, 
          ...data,
          author: {
              ...author,
              displayName: author.displayName || author.username
          },
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
        } as Story
      });
      
      const publicStories = fetchedStories.filter(s => s.status !== 'Draft');
      setAllStories(publicStories);
    }, console.error);

    const promptsQuery = query(collection(db, 'prompts'), where('isArchived', '==', false), orderBy('createdAt', 'desc'), firestoreLimit(5));
    const unsubscribePrompts = onSnapshot(promptsQuery, (snapshot) => {
      setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
    }, console.error);

    const timer = setTimeout(() => setIsDataLoading(false), 1500);

    return () => {
      clearTimeout(timer);
      unsubscribeStories();
      unsubscribePrompts();
    };
  }, []);

  const featuredStoriesForCarousel = allStories.slice(0, 8);
  const trendingStories = [...allStories].sort((a,b) => ((b.views || 0) + (b.rating || 0) * 50) - ((a.views || 0) + (a.rating || 0) * 50)).slice(0, 10);
  const newReleases = [...allStories].sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).slice(0, 10);

  const fantasyStories = allStories.filter(s => s.genre.toLowerCase() === 'fantasy').slice(0, 10);
  const romanceStories = allStories.filter(s => s.genre.toLowerCase() === 'romance').slice(0, 10);
  const scifiStories = allStories.filter(s => s.genre.toLowerCase() === 'sci-fi').slice(0, 10);

  
  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12 md:space-y-16">
        <section>
            <Carousel
                plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full -mt-4"
                >
                <CarouselContent className="-ml-4">
                    {featuredStoriesForCarousel.map((story, index) => (
                    <CarouselItem key={story.id} className="pl-4 md:basis-1/2 lg:basis-2/3">
                        <div className="p-1">
                            <Link
                                href={`/stories/${story.id}`}
                                className="block overflow-hidden group relative rounded-lg aspect-[16/9] cursor-pointer bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shadow-lg"
                                aria-label={`View story: ${story.title}`}
                            >
                                <Image
                                    src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}-banner/1600/900`} 
                                    alt={story.title}
                                    layout="fill"
                                    objectFit="cover"
                                    className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
                                    data-ai-hint={story.dataAiHint || "story cover"}
                                    priority={index < 2}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8">
                                    <h3 className="text-xl md:text-3xl font-headline font-bold text-white text-shadow-lg line-clamp-2">{story.title}</h3>
                                    <p className="text-sm md:text-base text-white/90 text-shadow-md line-clamp-1">by {story.author.displayName || story.author.username}</p>
                                </div>
                            </Link>
                        </div>
                    </CarouselItem>
                    ))}
                    {featuredStoriesForCarousel.length === 0 && (
                        <CarouselItem className="basis-full">
                            <div className="aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground">No featured stories available.</p>
                            </div>
                        </CarouselItem>
                    )}
                </CarouselContent>
                <CarouselPrevious className="absolute left-[-1rem] top-1/2 -translate-y-1/2 hidden sm:flex" />
                <CarouselNext className="absolute right-[-1rem] top-1/2 -translate-y-1/2 hidden sm:flex" />
            </Carousel>
      </section>

      {trendingStories.length > 0 && (
        <section>
            <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
                <TrendingUp className="text-accent h-5 w-5" /> Trending Now
            </h2>
            </div>
            <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {trendingStories.map(story => (
                <CompactStoryCard key={`trending-${story.id}`} story={story} />
            ))}
            </div>
        </section>
      )}

      {newReleases.length > 0 && (
        <section>
            <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
                <Sparkles className="text-accent h-5 w-5" /> New Releases
            </h2>
            </div>
            <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {newReleases.map(story => (
                <CompactStoryCard key={`new-${story.id}`} story={story} />
            ))}
            </div>
        </section>
      )}

      {fantasyStories.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
              <BookHeart className="text-accent h-5 w-5" /> Fantasy
            </h2>
          </div>
          <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {fantasyStories.map(story => (
              <CompactStoryCard key={`fantasy-${story.id}`} story={story} />
            ))}
          </div>
        </section>
      )}

       {romanceStories.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
              <HeartIcon className="text-accent h-5 w-5" /> Romance
            </h2>
          </div>
          <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {romanceStories.map(story => (
              <CompactStoryCard key={`romance-${story.id}`} story={story} />
            ))}
          </div>
        </section>
      )}

      {scifiStories.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
              <Rocket className="text-accent h-5 w-5" /> Sci-Fi
            </h2>
          </div>
          <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {scifiStories.map(story => (
              <CompactStoryCard key={`scifi-${story.id}`} story={story} />
            ))}
          </div>
        </section>
      )}

       {prompts.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-headline font-bold text-primary flex items-center gap-2  animate-fade-in">
              <PenSquare className="h-5 w-5" />
              Community Prompts
            </h2>
          </div>
           <div className="relative">
              <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent -m-2 p-2">
                {prompts.map(prompt => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </div>
          </div>
        </section>
      )}
    </div>
  );
}


export default function HomePage() {
  const { authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('for-you');

  const TABS = [
    { value: 'for-you', label: 'For You' },
    { value: 'annotations', label: 'Annotations', icon: <Quote className="mr-2 h-4 w-4" /> },
    { value: 'feed', label: 'Feed', icon: <LayoutGrid className="mr-2 h-4 w-4" /> },
  ];
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 pb-24 md:pb-8">
        <StatusFeature />
        <div className="my-6">
           <div className="flex justify-center">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
               <div className="flex justify-center">
                    <AnimatedTabs tabs={TABS} activeTab={activeTab} />
                </div>
              <TabsContent value="for-you" className="mt-6">
                <ForYouTabContent />
              </TabsContent>
              <TabsContent value="annotations" className="mt-6">
                <AnnotationFeed />
              </TabsContent>
              <TabsContent value="feed" className="mt-6">
                <ThreadsFeed />
              </TabsContent>
            </Tabs>
           </div>
        </div>
      </main>
      <BottomNavigationBar />
    </>
  );
}
