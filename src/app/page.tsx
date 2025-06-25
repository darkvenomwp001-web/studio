
'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users, Loader2, Award, Swords, Rocket, Heart as HeartIcon, MessageSquare, HelpCircle, FileText, Check, X, MoreHorizontal, UserPlus, BookOpenText } from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Story, UserSummary, Question, ReadingListItem, User as AppUserType } from '@/types';
import { useEffect, useState, FormEvent, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit, onSnapshot } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import Bookshelf from '@/components/shared/Bookshelf';
import { Textarea } from '@/components/ui/textarea';
import { askQuestion } from '@/app/actions/qaActions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import StoryBubbles from '@/components/stories/StoryBubbles';


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

function LoggedOutHomeContent() {
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
  
  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24 py-8">
      {/* Story Spotlight Section */}
      {storySpotlight && (
        <section>
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
                </CardFooter>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Trending Stories Section */}
      <section>
        <div className="flex flex-col mb-6">
            <Link href="/stories" passHref className="self-end">
                <Button variant="outline" className="text-sm">View All Stories <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <h2 className="text-2xl font-headline font-bold text-primary mt-1">Trending Stories</h2>
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
      <section>
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
      <section>
        <h2 className="text-2xl font-headline font-bold text-accent mb-6">Featured Authors</h2>
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
    </div>
  );
}

function ForYouTabContent() {
  return <LoggedOutHomeContent />;
}

// Debounce function for user search
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

function QuestionCard({ question }: { question: Question }) {
    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/profile/${question.asker.id}`}><Avatar className="h-10 w-10"><AvatarImage src={question.asker.avatarUrl} /></Avatar></Link>
                        <div>
                            <Link href={`/profile/${question.asker.id}`} className="font-semibold hover:underline">{question.asker.displayName}</Link>
                            <p className="text-xs text-muted-foreground">
                                asked {question.createdAt?.toDate ? formatDistanceToNow(question.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-line">{question.questionText}</p>
            </CardContent>
        </Card>
    );
}

function CommunityQATabContent() {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
    const [questionText, setQuestionText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'), firestoreLimit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
            setQuestions(fetchedQuestions);
            setIsLoadingQuestions(false);
        }, (error) => {
            console.error("Error fetching questions:", error);
            setIsLoadingQuestions(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAskQuestion = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Please sign in', description: 'You must be logged in to ask a question.', variant: 'destructive'});
            return;
        }
        setIsSubmitting(true);
        const result = await askQuestion(
            { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
            questionText
        );
        if (result.success) {
            setQuestionText('');
            toast({ title: 'Question Posted!' });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };


    if (loading) {
        return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    return (
        <div className="py-8 max-w-2xl mx-auto space-y-6">
            {user && (
                <Card>
                    <form onSubmit={handleAskQuestion}>
                        <CardHeader>
                            <CardTitle>Ask the Community</CardTitle>
                            <CardDescription>Post a public question for everyone to see.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                placeholder="What's your question?"
                                maxLength={1000}
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSubmitting || questionText.trim().length < 10}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                                Post Question
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}
            {isLoadingQuestions && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
            
            <div className="space-y-4">
                {!isLoadingQuestions && questions.map(q => <QuestionCard key={q.id} question={q} />)}
            </div>

            {!isLoadingQuestions && questions.length === 0 && <p className="text-center text-muted-foreground py-10">No questions yet. Be the first to ask one!</p>}
        </div>
    );
}

function WritingPromptsTabContent() {
    const prompts = [
        { title: 'The Silent Artifact', prompt: 'An ancient artifact is discovered that absorbs all sound around it. Describe the first team to study it and what happens when it "activates".', genre: 'Sci-Fi / Horror' },
        { title: 'A Favor for a Ghost', prompt: 'The ghost of a long-lost friend appears and asks you for one last favor. You must complete it before sunrise.', genre: 'Fantasy / Drama' },
        { title: 'The Last Bookstore', prompt: 'In a future where all books are digital, you run the last physical bookstore on Earth. Who is your final customer and what book do they want?', genre: 'Dystopian / Sentimental' },
    ];
    return (
        <div className="py-8 max-w-3xl mx-auto">
             <h2 className="text-2xl font-headline font-bold text-center mb-6">Prompts &amp; Challenges</h2>
             <div className="space-y-6">
                {prompts.map((item, index) => (
                    <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                               <Edit className="h-6 w-6 text-accent"/>
                               <CardTitle className="font-headline">{item.title}</CardTitle>
                            </div>
                            <CardDescription>Genre: {item.genre}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground/90">{item.prompt}</p>
                        </CardContent>
                        <CardFooter>
                            <Link href="/write" passHref>
                                <Button>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Start Writing
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
             </div>
        </div>
    );
}

export default function HomePage() {
  const { authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8">
        <section className="mb-8">
          <StoryBubbles />
        </section>

        <section className="mb-4">
          <Bookshelf />
        </section>

        <Tabs defaultValue="for-you" className="w-full">
          <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-sm -mx-4 px-4 py-2 border-b">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="for-you">For You</TabsTrigger>
              <TabsTrigger value="community-qa">Q&amp;A</TabsTrigger>
              <TabsTrigger value="writing-prompts">Prompts</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="for-you" className="mt-6">
            <ForYouTabContent />
          </TabsContent>
          <TabsContent value="community-qa" className="mt-6">
            <CommunityQATabContent />
          </TabsContent>
          <TabsContent value="writing-prompts" className="mt-6">
            <WritingPromptsTabContent />
          </TabsContent>
        </Tabs>
      </main>
      <BottomNavigationBar />
    </>
  );
}
