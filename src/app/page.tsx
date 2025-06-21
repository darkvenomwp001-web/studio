
'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users, Loader2, Award, Swords, Rocket, Heart as HeartIcon, Zap, Users2, PenTool, BookmarkPlus } from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Story, UserSummary } from '@/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';

async function fetchStoriesFromFirestore(count: number): Promise<Story[]> {
  try {
    const storiesCol = collection(db, 'stories');
    const q = query(
      storiesCol, 
      where('visibility', '==', 'Public'),
      orderBy('lastUpdated', 'desc'), 
      firestoreLimit(count)
    );
    const storySnapshot = await getDocs(q);
    const storyList = storySnapshot.docs.map(doc => {
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
    return storyList;
  } catch (error) {
    console.error("Error fetching stories from Firestore:", error);
    return [];
  }
}

async function fetchFeaturedAuthorsFromFirestore(count: number): Promise<UserSummary[]> {
  try {
    const usersCol = collection(db, 'users');
    const q = query(
      usersCol,
      orderBy('followersCount', 'desc'),
      firestoreLimit(count)
    );
    const userSnapshot = await getDocs(q);
    return userSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username,
        displayName: data.displayName || data.username,
        avatarUrl: data.avatarUrl,
        bio: data.bio, // Include bio for card display
        followersCount: data.followersCount,
      } as UserSummary & { bio?: string, followersCount?: number };
    });
  } catch (error) {
    console.error("Error fetching featured authors:", error);
    return [];
  }
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [trendingStories, setTrendingStories] = useState<Story[]>([]);
  const [storySpotlight, setStorySpotlight] = useState<Story | null>(null);
  const [featuredAuthors, setFeaturedAuthors] = useState<(UserSummary & { bio?: string, followersCount?: number })[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsDataLoading(true);
      const [fetchedStories, fetchedAuthors] = await Promise.all([
        fetchStoriesFromFirestore(8),
        fetchFeaturedAuthorsFromFirestore(6)
      ]);
      
      setTrendingStories(fetchedStories.filter(s => s.status !== 'Draft'));
      setFeaturedAuthors(fetchedAuthors);

      if (fetchedStories.length > 0) {
        const availableForSpotlight = fetchedStories.filter(s => s.visibility === 'Public' && (s.status === 'Ongoing' || s.status === 'Completed'));
        if (availableForSpotlight.length > 0) {
          setStorySpotlight(availableForSpotlight[Math.floor(Math.random() * availableForSpotlight.length)]);
        } else if (fetchedStories.length > 0) {
          setStorySpotlight(fetchedStories.filter(s => s.status !== 'Draft')[0]);
        }
      }
      setIsDataLoading(false);
    }
    loadData();
  }, []);
  
  const popularGenres = [
    { name: "Fantasy", icon: Swords, blurb: "Epic quests & magical realms await.", dataAiHint: "dragon castle", cover: "https://placehold.co/512x800.png" },
    { name: "Sci-Fi", icon: Rocket, blurb: "Explore galaxies & future tech.", dataAiHint: "space station", cover: "https://placehold.co/512x800.png"},
    { name: "Romance", icon: HeartIcon, blurb: "Heartfelt connections & love stories.", dataAiHint: "couple sunset", cover: "https://placehold.co/512x800.png"},
  ];

  if (authLoading || isDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background shadow-xl">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-headline font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary/70">
            Welcome to LitVerse
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Unleash your imagination. Discover captivating stories, share your own tales, and connect with a global community of creators and fans.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/stories" passHref>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform hover:scale-105 text-lg py-3 px-8">
                Explore Stories <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/write" passHref>
              <Button size="lg" variant="outline" className="shadow-md transition-transform hover:scale-105 text-lg py-3 px-8 border-primary text-primary hover:bg-primary/5">
                Start Writing <Edit className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Story Spotlight Section */}
      {storySpotlight && (
        <section className="container mx-auto px-4">
          <h2 className="text-2xl font-headline font-bold mb-8 text-center text-accent flex items-center justify-center gap-3">
            <Award className="h-8 w-8" /> Story Spotlight
          </h2>
          <Card className="w-full max-w-4xl mx-auto overflow-hidden shadow-2xl hover:shadow-primary/20 transition-all duration-300 group">
            <div className="md:flex">
              <div className="md:flex-shrink-0 md:w-1/3 relative aspect-[2/3]">
                <Image
                  src={storySpotlight.coverImageUrl || `https://placehold.co/512x800.png`}
                  alt={storySpotlight.title}
                  layout="fill"
                  objectFit="cover"
                  className="group-hover:scale-105 transition-transform duration-500"
                  data-ai-hint={storySpotlight.dataAiHint || "book cover epic"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r"></div>
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-between flex-1 bg-card">
                <div>
                  <Badge variant="secondary" className="mb-2 bg-accent text-accent-foreground">{storySpotlight.genre}</Badge>
                  <CardTitle className="text-2xl font-headline group-hover:text-primary transition-colors">{storySpotlight.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1 mb-3">
                    By <Link href={`/profile/${storySpotlight.author.id}`} className="hover:underline font-medium">{storySpotlight.author.displayName || storySpotlight.author.username}</Link>
                  </CardDescription>
                  <p className="text-muted-foreground text-sm line-clamp-4 mb-4">{storySpotlight.summary}</p>
                </div>
                <CardFooter className="p-0 flex flex-col sm:flex-row gap-3">
                  <Link href={`/stories/${storySpotlight.id}`} passHref className="w-full sm:w-auto">
                    <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      <BookHeart className="mr-2 h-5 w-5" /> Read Now
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto hover:border-primary hover:text-primary">
                    <BookmarkPlus className="mr-2 h-5 w-5" /> Add to Library
                  </Button>
                </CardFooter>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Trending Stories Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-headline font-bold text-primary">Trending Stories</h2>
            <Link href="/stories" passHref>
                <Button variant="outline" className="text-sm">View All Stories <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
        </div>
        <div className="relative">
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {trendingStories.map(story => (
                <CompactStoryCard key={`trending-${story.id}`} story={story} />
            ))}
            {trendingStories.length === 0 && <p className="text-muted-foreground">No trending stories to display.</p>}
            <div className="flex-shrink-0 w-px"></div>
            </div>
        </div>
      </section>
      
      {/* Quick Dive Genre Teasers Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-headline font-bold mb-8 text-center">Dive Into Your Next Obsession</h2>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {popularGenres.map(genre => {
            const GenreIcon = genre.icon;
            return (
              <Card key={genre.name} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                <CardHeader className="p-0 relative aspect-[3/2] md:aspect-video">
                  <Image src={genre.cover} alt={genre.name} layout="fill" objectFit="cover" data-ai-hint={genre.dataAiHint} className="group-hover:scale-105 transition-transform" />
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
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-headline font-bold text-accent">Featured Authors</h2>
        </div>
         <div className="relative">
            <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-thin scrollbar-thumb-accent/50 scrollbar-track-transparent">
            {featuredAuthors.map(author => (
                <Link href={`/profile/${author.id}`} key={`author-${author.id}`} passHref>
                <div className="flex-shrink-0 w-52 group cursor-pointer">
                    <Card className="flex flex-col items-center p-4 bg-card rounded-lg shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full">
                    <Avatar className="w-28 h-28 mb-4 border-4 border-accent/30 group-hover:border-accent transition-colors">
                        <AvatarImage src={author.avatarUrl || `https://placehold.co/120x120.png`} alt={author.displayName || author.username} data-ai-hint="profile person" />
                        <AvatarFallback className="text-3xl">{author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold font-headline text-center group-hover:text-accent transition-colors">{author.displayName || author.username}</h3>
                    <p className="text-xs text-muted-foreground text-center line-clamp-2 mt-1 flex-grow">{(author.bio || "Passionate Creator").substring(0,60)}{author.bio && author.bio.length > 60 ? "..." : ""}</p>
                    </Card>
                </div>
                </Link>
            ))}
            <div className="flex-shrink-0 w-px"></div>
            </div>
        </div>
      </section>
      )}

      {/* Community Pulse Section */}
      {trendingStories.length > 0 && (
      <section className="container mx-auto px-4">
        <Card className="bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary flex items-center gap-2">
              <Users2 className="h-7 w-7" /> Community Pulse
            </CardTitle>
            <CardDescription>What's happening right now on LitVerse.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm p-3 bg-background/50 rounded-md hover:bg-muted/50 transition-colors">
                    <Zap className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>{trendingStories[0].author.displayName || trendingStories[0].author.username} just updated "{trendingStories[0].title}"!</span>
                </li>
                {featuredAuthors.length > 0 && (
                <li className="flex items-center gap-3 text-sm p-3 bg-background/50 rounded-md hover:bg-muted/50 transition-colors">
                    <Users2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Welcome our newest featured author, @{featuredAuthors[0].username}!</span>
                </li>
                )}
                <li className="flex items-center gap-3 text-sm p-3 bg-background/50 rounded-md hover:bg-muted/50 transition-colors">
                    <BookHeart className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>"{trendingStories[0].title}" is trending with {trendingStories[0].views || 0} reads!</span>
                </li>
            </ul>
          </CardContent>
        </Card>
      </section>
      )}
      
      {/* Call to Action - Start Writing */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-accent/10 via-transparent to-primary/10 rounded-lg shadow-inner">
        <div className="text-center max-w-2xl mx-auto">
          <PenTool className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-4xl font-headline font-bold mb-4">Have a Story to Tell?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Your words have power. Share your unique voice with the world. LitVerse provides the tools and community to bring your stories to life.
          </p>
          <Link href="/write" passHref>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105 text-xl py-4 px-10">
              Start Writing Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
