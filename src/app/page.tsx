'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users, Loader2, Award, Swords, Rocket, Heart as HeartIcon, BookMarked, Wand2, PlusCircle, Send, Image as ImageIcon, X, MoreHorizontal, Archive, Trash2, Pin, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Story, UserSummary, Prompt } from '@/types';
import { useEffect, useState, FormEvent, useRef, useTransition } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import CreatePostForm from '@/components/feed/CreatePostForm';
import HomeFeed from '@/components/feed/HomeFeed';
import { cn } from '@/lib/utils';


function ForYouTabContent() {
  const [trendingStories, setTrendingStories] = useState<Story[]>([]);
  const [storySpotlight, setStorySpotlight] = useState<Story | null>(null);
  const [featuredAuthors, setFeaturedAuthors] = useState<(UserSummary & { bio?: string, followersCount?: number })[]>([]);
  const [communityPicks, setCommunityPicks] = useState<Story[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setIsDataLoading(true);

    const storiesCol = collection(db, 'stories');
    const storiesQuery = query(
      storiesCol,
      where('visibility', '==', 'Public'),
      orderBy('lastUpdated', 'desc'),
      firestoreLimit(12)
    );

    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          author: data.author || { id: 'unknown', username: 'Unknown' },
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
        } as Story;
      });

      const publicStories = fetchedStories.filter(s => s.status !== 'Draft');
      setTrendingStories(publicStories.slice(0, 8));
      setCommunityPicks(publicStories.slice().sort(() => 0.5 - Math.random()).slice(0, 8));

      if (publicStories.length > 0) {
        const availableForSpotlight = publicStories.filter(s => s.status === 'Ongoing' || s.status === 'Completed');
        if (availableForSpotlight.length > 0) {
          setStorySpotlight(availableForSpotlight[Math.floor(Math.random() * availableForSpotlight.length)]);
        } else if (publicStories.length > 0) {
          setStorySpotlight(publicStories[0]);
        }
      }
    }, (error) => {
      console.error("Error fetching stories in real-time:", error);
    });

    const usersCol = collection(db, 'users');
    const authorsQuery = query(
      usersCol,
      orderBy('followersCount', 'desc'),
      firestoreLimit(6)
    );

    const unsubscribeAuthors = onSnapshot(authorsQuery, (snapshot) => {
      const fetchedAuthors = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          username: data.username,
          displayName: data.displayName || data.username,
          avatarUrl: data.avatarUrl,
          bio: data.bio,
          followersCount: data.followersCount,
        } as UserSummary & { bio?: string, followersCount?: number };
      });
      setFeaturedAuthors(fetchedAuthors);
      setIsDataLoading(false); 
    }, (error) => {
      console.error("Error fetching authors in real-time:", error);
      setIsDataLoading(false);
    });

    return () => {
      unsubscribeStories();
      unsubscribeAuthors();
    };
  }, []);
  
  const popularGenres = [
    { name: "Fantasy", icon: Swords, blurb: "Epic quests & magical realms await.", dataAiHint: "dragon castle", cover: "https://picsum.photos/seed/fantasy/512/800" },
    { name: "Sci-Fi", icon: Rocket, blurb: "Explore galaxies & future tech.", dataAiHint: "space station", cover: "https://picsum.photos/seed/sci-fi/512/800"},
    { name: "Romance", icon: HeartIcon, blurb: "Heartfelt connections & love stories.", dataAiHint: "couple sunset", cover: "https://picsum.photos/seed/romance/512/800"},
  ];
  
  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24 py-8">
      {storySpotlight && (
        <section className="relative w-full h-[60vh] max-h-[500px] rounded-2xl overflow-hidden shadow-2xl group flex items-center justify-center text-white">
          <div className="absolute inset-0 z-0">
            <Image
              src={storySpotlight.coverImageUrl || `https://picsum.photos/seed/${storySpotlight.id}/1200/600`}
              alt={storySpotlight.title}
              fill
              className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              data-ai-hint={storySpotlight.dataAiHint || "book cover epic"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10"></div>
          </div>
          <div className="relative z-10 p-8 md:p-12 text-center animate-fade-in">
            <Badge 
                variant="secondary" 
                className="mb-4 bg-white/20 text-white backdrop-blur-sm animate-fade-in [animation-delay:200ms] opacity-0"
            >
                <Award className="h-4 w-4 mr-2"/>
                Story Spotlight
            </Badge>
            <h2 
                className="text-3xl md:text-5xl font-headline font-bold text-shadow-lg animate-fade-in [animation-delay:400ms] opacity-0"
                style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}
            >
                {storySpotlight.title}
            </h2>
            <p className="mt-2 text-md md:text-lg animate-fade-in [animation-delay:600ms] opacity-0">
              by <Link href={`/profile/${storySpotlight.author.id}`} className="hover:underline font-semibold">{storySpotlight.author.displayName || storySpotlight.author.username}</Link>
            </p>
             <p className="mt-4 max-w-xl mx-auto text-sm md:text-base text-white/90 line-clamp-3 animate-fade-in [animation-delay:800ms] opacity-0">
                {storySpotlight.summary}
            </p>
            <Link href={`/stories/${storySpotlight.id}`} passHref>
                <Button size="lg" className="mt-6 bg-white text-black hover:bg-white/90 animate-fade-in [animation-delay:1000ms] opacity-0">
                  <BookHeart className="mr-2 h-5 w-5" /> Read Now
                </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Trending Stories Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline font-bold text-primary">Trending Stories</h2>
          <Link href="/stories" passHref>
            <Button variant="outline" className="text-sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="relative">
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent -m-2 p-2">
            {trendingStories.map(story => (
                <CompactStoryCard key={`trending-${story.id}`} story={story} />
            ))}
            {trendingStories.length === 0 && <p className="text-muted-foreground">No trending stories to display.</p>}
            </div>
        </div>
      </section>

      {/* Community Picks Section */}
       {communityPicks.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-headline font-bold text-accent flex items-center gap-2">
                <Sparkles className="h-6 w-6"/>
                Community Picks
              </h2>
            </div>
             <div className="relative">
                <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-accent/50 scrollbar-track-transparent -m-2 p-2">
                {communityPicks.map(story => (
                    <CompactStoryCard key={`community-${story.id}`} story={story} />
                ))}
                </div>
            </div>
          </section>
        )}
      
      {/* Quick Dive Genre Teasers Section */}
      <section>
        <h2 className="text-2xl font-headline font-bold mb-8 text-center">Dive Into Your Next Obsession</h2>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {popularGenres.map(genre => {
            const GenreIcon = genre.icon;
            return (
              <Card key={genre.name} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                <CardHeader className="p-0 relative aspect-[3/2] md:aspect-video">
                  <Image src={genre.cover} alt={genre.name} fill objectFit="cover" data-ai-hint={genre.dataAiHint} className="group-hover:scale-105 transition-transform object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 text-center">
                    <GenreIcon className="h-12 w-12 text-white mb-2 drop-shadow-lg" />
                    <CardTitle className="text-2xl font-headline text-white drop-shadow-lg">{genre.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">{genre.blurb}</p>
                   <Link href={`/stories?genre=${genre.name.toLowerCase()}`} passHref>
                     <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10 w-full">
                        Explore {genre.name} <ArrowRight className="ml-2 h-4 w-4" />
                     </Button>
                   </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Featured Authors Section */}
      {featuredAuthors.length > 0 && (
      <section>
        <h2 className="text-2xl font-headline font-bold text-accent mb-6">Featured Authors</h2>
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

function ThreadsTabContent() {
    const { user, loading } = useAuth();
    const [isRefreshing, startRefreshTransition] = useTransition();

    const handleRefresh = () => {
        startRefreshTransition(() => {
            // In a real app, you'd re-fetch data here.
            // For now, we just simulate a delay.
            return new Promise(resolve => setTimeout(resolve, 500));
        });
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="text-center py-10">
                <p className="text-muted-foreground">
                    <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link> to see posts from authors you follow.
                </p>
            </div>
        )
    }

    return (
        <div className="py-8 max-w-2xl mx-auto space-y-8">
            <CreatePostForm user={user} />
            <div className="flex justify-center">
                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Feed'}
                </Button>
            </div>
            <HomeFeed user={user} />
        </div>
    );
}


export default function HomePage() {
  const { authLoading } = useAuth();
  
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
      <main className="flex-1 container mx-auto px-4 pb-24 md:pb-8">
        <section className="mb-4">
          <StatusFeature />
        </section>
        
        <div className="mt-4">
           <Tabs defaultValue="for-you" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="for-you">For You</TabsTrigger>
              <TabsTrigger value="bookshelf">Bookshelf</TabsTrigger>
              <TabsTrigger value="threads">Threads</TabsTrigger>
            </TabsList>
            
            <TabsContent value="for-you" className="mt-6">
                <ForYouTabContent />
            </TabsContent>
            <TabsContent value="bookshelf" className="mt-6">
                <Bookshelf />
            </TabsContent>
            <TabsContent value="threads" className="mt-6">
                <ThreadsTabContent />
            </TabsContent>
          </Tabs>
        </div>


      </main>
      <BottomNavigationBar />
    </>
  );
}
