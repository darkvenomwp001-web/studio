
'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users, Loader2, Award, Swords, Rocket, Heart as HeartIcon, BookMarked, Wand2, PlusCircle, Send, Image as ImageIcon, X, MoreHorizontal, Archive, Trash2, Pin, Pencil, RefreshCw, Sparkles, PenSquare, FileText, TrendingUp, LibrarySquare } from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Story, UserSummary, Prompt, ReadingListItem } from '@/types';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { AnimatedTabs, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import Bookshelf from '@/components/shared/Bookshelf';
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
import GlobalChatRoom from '@/components/chat/GlobalChatRoom';
import YourStoryCard from '@/components/shared/YourStoryCard';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";


function ForYouTabContent() {
  const { user, loading: authLoading } = useAuth();
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [featuredAuthors, setFeaturedAuthors] = useState<(UserSummary & { bio?: string, followersCount?: number })[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setIsDataLoading(true);

    const storiesQuery = query(
      collection(db, 'stories'),
      where('visibility', '==', 'Public'),
      orderBy('lastUpdated', 'desc'),
      firestoreLimit(40) // Fetch more stories for variety
    );
    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        author: doc.data().author || { id: 'unknown', username: 'Unknown' },
        lastUpdated: doc.data().lastUpdated?.toDate ? doc.data().lastUpdated.toDate().toISOString() : doc.data().lastUpdated,
      } as Story));
      
      const publicStories = fetchedStories.filter(s => s.status !== 'Draft');
      setAllStories(publicStories);
    }, console.error);

    const promptsQuery = query(collection(db, 'prompts'), where('isArchived', '==', false), orderBy('createdAt', 'desc'), firestoreLimit(5));
    const unsubscribePrompts = onSnapshot(promptsQuery, (snapshot) => {
      setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
    }, console.error);
    
    const authorsQuery = query(collection(db, 'users'), orderBy('followersCount', 'desc'), firestoreLimit(6));
    const unsubscribeAuthors = onSnapshot(authorsQuery, (snapshot) => {
      setFeaturedAuthors(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as UserSummary & { bio?: string, followersCount?: number })));
    }, console.error);

    const timer = setTimeout(() => setIsDataLoading(false), 1500);

    return () => {
      clearTimeout(timer);
      unsubscribeStories();
      unsubscribePrompts();
      unsubscribeAuthors();
    };
  }, []);

  const featuredStoriesForCarousel = allStories.slice(0, 5);
  const popularStories = [...allStories].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  const newReleases = [...allStories].sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).slice(0, 10);
  const communityPicks = [...allStories].sort(() => 0.5 - Math.random()).slice(0, 10);
  const userReadingList: ReadingListItem[] = user?.readingList || [];
  
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
            className="w-full shadow-xl rounded-lg overflow-hidden -mt-4"
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
                        src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}-banner/1200/500`} 
                        alt={story.title}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
                        data-ai-hint={story.dataAiHint || "story banner"}
                        priority={index === 0}
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-8">
                        <h2 className="text-2xl md:text-4xl font-headline font-bold text-white text-shadow-lg">{story.title}</h2>
                        <p className="text-sm md:text-md text-white/90">by {story.author.displayName || story.author.username}</p>
                    </div>
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

      {!authLoading && user && userReadingList.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
              <BookHeart className="text-accent h-6 w-6" /> Continue Reading
            </h2>
             <Link href="/library" passHref>
                <Button variant="outline" className="text-sm">My Library<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="flex overflow-x-auto space-x-4 py-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {userReadingList.slice(0, 10).map(story => ( 
                <YourStoryCard key={`yourstory-${story.id}`} story={story} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
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

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
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
      
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold flex items-center gap-2 text-foreground animate-fade-in">
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

       {prompts.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-2  animate-fade-in">
              <PenSquare className="h-6 w-6" />
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

      {featuredAuthors.length > 0 && (
      <section>
        <h2 className="text-2xl font-headline font-bold text-accent mb-6  animate-fade-in">Featured Authors</h2>
         <div className="relative">
            <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-thin scrollbar-thumb-accent/50 scrollbar-track-transparent -m-2 p-2">
            {featuredAuthors.map(author => (
                <Link href={`/profile/${author.id}`} key={`author-${author.id}`} passHref>
                <div className="flex-shrink-0 w-52 group cursor-pointer">
                    <Card className="flex flex-col items-center p-4 bg-card rounded-lg shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full">
                    <Avatar className="w-28 h-28 mb-4 border-4 border-accent/30 group-hover:border-accent transition-colors">
                        <AvatarImage src={author.avatarUrl || `https://picsum.photos/seed/${author.id}/120/120`} alt={author.displayName || author.username} data-ai-hint="profile person" />
                        <AvatarFallback className="text-3xl">{author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold font-headline text-center group-hover:text-accent transition-colors">{author.displayName || author.username}</h3>
                    <p className="text-xs text-muted-foreground text-center line-clamp-2 mt-1 flex-grow">{(author.bio || "Passionate Creator").substring(0,60)}{author.bio && author.bio.length > 60 ? "..." : ""}</p>
                    </Card>
                </div>
                </Link>
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
    { value: 'bookshelf', label: 'Reading Nook' },
    { value: 'threads', label: 'Threads' },
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
              <AnimatedTabs tabs={TABS} activeTab={activeTab} />
              <TabsContent value="for-you" className="mt-6">
                <ForYouTabContent />
              </TabsContent>
              <TabsContent value="bookshelf" className="mt-6">
                <Bookshelf />
              </TabsContent>
              <TabsContent value="threads" className="mt-6">
                <GlobalChatRoom />
              </TabsContent>
            </Tabs>
           </div>
        </div>
      </main>
      <BottomNavigationBar />
    </>
  );
}

