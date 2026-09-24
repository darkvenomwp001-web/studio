'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, 
  Loader2, 
  Book, 
  Feather, 
  Sparkles,
  TrendingUp,
  MessageCircle,
  Clock,
  ArrowRight,
  Star,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import type { Story } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import DashboardStoryCard from '@/components/shared/DashboardStoryCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingStories(true);

      const storiesCollectionRef = collection(db, 'stories');

      const authorQuery = query(
        storiesCollectionRef,
        where('author.id', '==', user.id)
      );

      const collaboratorQuery = query(
        storiesCollectionRef,
        where('collaboratorIds', 'array-contains', user.id)
      );
      
      const mapDocToStory = (docSnap: any): Story => {
        const data = docSnap.data();
        let isoDate = '';
        if (data.lastUpdated) {
            if (typeof data.lastUpdated.toDate === 'function') {
                isoDate = data.lastUpdated.toDate().toISOString();
            } else {
                isoDate = new Date(data.lastUpdated).toISOString();
            }
        }
        
        const authorData = data.author ? {
            id: data.author.id || 'unknown',
            username: data.author.username || 'Unknown Author',
            displayName: data.author.displayName,
            avatarUrl: data.author.avatarUrl
        } : { id: 'unknown', username: 'Unknown Author' };

        return {
            id: docSnap.id,
            ...data,
            author: authorData,
            lastUpdated: isoDate,
            chapters: data.chapters || [],
            tags: data.tags || [],
          } as Story;
      }

      let authoredStories: Story[] = [];
      let collaboratingStories: Story[] = [];

      const combineAndSetStories = () => {
        const allStoriesMap = new Map<string, Story>();
        [...authoredStories, ...collaboratingStories].forEach(story => {
            allStoriesMap.set(story.id, story);
        });
        const combined = Array.from(allStoriesMap.values());
        combined.sort((a,b) => {
            const timeA = new Date(a.lastUpdated).getTime();
            const timeB = new Date(b.lastUpdated).getTime();
            return timeB - timeA;
        });
        setUserStories(combined);
      }

      const unsubscribeAuthor = onSnapshot(authorQuery, (querySnapshot) => {
        authoredStories = querySnapshot.docs.map(mapDocToStory);
        combineAndSetStories();
        setIsLoadingStories(false);
      }, (error) => {
        console.error("Error fetching authored stories: ", error);
        setIsLoadingStories(false);
      });

      const unsubscribeCollaborator = onSnapshot(collaboratorQuery, (querySnapshot) => {
        collaboratingStories = querySnapshot.docs.map(mapDocToStory);
        combineAndSetStories();
        setIsLoadingStories(false);
      }, (error) => {
        console.error("Error fetching collaborating stories: ", error);
        setIsLoadingStories(false);
      });

      return () => {
          unsubscribeAuthor();
          unsubscribeCollaborator();
      };
    } else if (!authLoading && !user) {
      setIsLoadingStories(false);
      setUserStories([]);
    }
  }, [user, authLoading, toast]);


  const { publishedStories, draftStories } = useMemo(() => {
    const published = userStories.filter(s => s.status !== 'Draft' && s.visibility === 'Public');
    const drafts = userStories.filter(s => s.status === 'Draft' || s.visibility !== 'Public');
    return { publishedStories: published, draftStories: drafts };
  }, [userStories]);

  const totalVotes = useMemo(() => {
    return userStories.reduce((acc, story) => {
        return acc + (story.chapters?.reduce((cAcc, ch) => cAcc + (ch.votes || 0), 0) || 0);
    }, 0);
  }, [userStories]);

  const totalReads = useMemo(() => {
    return userStories.reduce((acc, story) => acc + (story.views || 0), 0);
  }, [userStories]);

  if (authLoading || (isLoadingStories && user)) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-10rem)] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Writer Space...</p>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="space-y-8 text-center py-20 animate-in fade-in duration-700">
        <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Feather className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h1 className="text-3xl font-headline font-bold text-foreground">My Stories</h1>
        <p className="text-muted-foreground max-w-xs mx-auto">Please <Link href="/auth/signin" className="text-primary font-bold hover:underline">sign in</Link> to begin your creative journey.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700 px-4 md:px-6 mt-6 max-w-7xl mx-auto">
      
      {/* Redesigned Header: No Hub/Engineering Jargon */}
      <header className="flex flex-col md:flex-row items-center justify-between p-8 bg-card/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl transform-gpu gap-6">
          <div className="flex items-center gap-6 text-center md:text-left">
              <div className="p-4 bg-primary/10 rounded-3xl hidden sm:block">
                  <Feather className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                  <h1 className="text-3xl md:text-5xl font-headline font-bold tracking-tight">Writer's Studio</h1>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-primary/60">My Creative Archive</p>
              </div>
          </div>
          <Link href="/write/edit-details" passHref>
              <Button size="lg" className="rounded-full shadow-2xl shadow-primary/30 gap-3 font-black uppercase text-[10px] tracking-widest h-14 px-10 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90">
                  <PlusCircle className="h-5 w-5" />
                  Begin a New Journey
              </Button>
          </Link>
      </header>

      {/* Unique Feature 1: Reader Love (Audience-oriented stats) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="rounded-[2rem] border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden group hover:bg-card/80 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform duration-500">
                      <Star className="h-6 w-6 fill-current" />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black">{totalVotes > 0 ? totalVotes.toLocaleString() : '0'}</h3>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Reader Appreciation</p>
                  </div>
              </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden group hover:bg-card/80 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform duration-500">
                      <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black">{totalReads > 0 ? totalReads.toLocaleString() : '0'}</h3>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Manuscript Reads</p>
                  </div>
              </CardContent>
          </Card>

          {/* Unique Feature 2: Creative Flow (Streak/Activity node) */}
          <Card className="rounded-[2rem] border-none shadow-xl bg-primary text-white overflow-hidden group transition-all hover:shadow-primary/30 relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Sparkles className="h-20 w-20" />
              </div>
              <CardContent className="p-8 flex items-center gap-6 relative z-10">
                  <div className="p-4 rounded-2xl bg-white/20 text-white group-hover:animate-pulse">
                      <Clock className="h-6 w-6" />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black">Creative Flow</h3>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/70">Archive activity is stable</p>
                  </div>
              </CardContent>
          </Card>
      </section>
      
      <Tabs defaultValue="published" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-border/10 pb-6">
            <TabsList className="bg-muted/40 backdrop-blur-xl p-1 rounded-full border border-border/40 shadow-inner w-full max-w-sm h-12">
                <TabsTrigger value="published" className="rounded-full font-black uppercase text-[10px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                    <Book className="h-4 w-4" /> Shared 
                    <Badge variant="secondary" className="h-5 px-1.5 font-bold min-w-[20px] bg-primary/10 text-primary border-none">{publishedStories.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="drafts" className="rounded-full font-black uppercase text-[10px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                    <Feather className="h-4 w-4" /> Private
                    <Badge variant="secondary" className="h-5 px-1.5 font-bold min-w-[20px] bg-muted-foreground/10 text-muted-foreground border-none">{draftStories.length}</Badge>
                </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-4 bg-muted/20 px-4 py-2 rounded-2xl border border-border/40">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Digital Sync Active</span>
            </div>
        </div>

        <TabsContent value="published" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-700">
          {publishedStories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
              {publishedStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-40 bg-card/20 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-border/40 max-w-2xl mx-auto flex flex-col items-center gap-6 transform-gpu">
                <div className="p-8 rounded-full bg-muted/30 shadow-inner">
                    <Book className="h-14 w-14 text-muted-foreground/20" />
                </div>
                <div className="space-y-2">
                    <p className="text-2xl font-headline font-bold text-foreground">Empty Archive</p>
                    <p className="text-sm text-muted-foreground max-w-xs px-10">You haven't shared any of your creative works with the community yet.</p>
                </div>
                <Link href="/write/edit-details" passHref>
                    <Button variant="outline" className="rounded-full mt-2 font-black uppercase text-[10px] tracking-[0.2em] px-10 h-12 border-border/60 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">Begin Writing</Button>
                </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-700">
          {draftStories.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
              {draftStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-40 bg-card/20 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-border/40 max-w-2xl mx-auto flex flex-col items-center gap-6 transform-gpu">
                <div className="p-8 rounded-full bg-muted/30 shadow-inner">
                    <Feather className="h-14 w-14 text-muted-foreground/20" />
                </div>
                <div className="space-y-2">
                    <p className="text-2xl font-headline font-bold text-foreground">No Private Drafts</p>
                    <p className="text-sm text-muted-foreground max-w-xs px-10">Your personal works-in-progress and unlisted entries will stay safe here.</p>
                </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function WriteDashboardPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col justify-center items-center h-screen bg-background gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Entering Studio...</p>
        </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
