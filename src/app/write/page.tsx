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
  Clock,
  Star
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
import { cn, formatCompactNumber } from '@/lib/utils';
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
    <div className="space-y-6 pb-32 animate-in fade-in duration-700 px-4 md:px-6 mt-6 max-w-6xl mx-auto">
      
      {/* Condensend Studio Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between p-6 bg-card/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-xl gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="p-3 bg-primary/10 rounded-2xl hidden xs:block">
                  <Feather className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                  <h1 className="text-2xl md:text-3xl font-headline font-bold tracking-tight">Writer's Studio</h1>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">My Creative Archive</p>
              </div>
          </div>
          <Link href="/write/edit-details" passHref>
              <Button className="rounded-full shadow-lg shadow-primary/20 gap-2 font-black uppercase text-[10px] tracking-widest h-11 px-8 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90">
                  <PlusCircle className="h-4 w-4" />
                  New Journey
              </Button>
          </Link>
      </header>

      {/* Studio Insight Bar - Icon Driven & Compact */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 md:gap-4 px-2">
          <div className="flex items-center gap-2.5 bg-card/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/5 shadow-sm group">
              <Star className="h-4 w-4 text-rose-500 fill-rose-500/20 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                  <span className="text-xs font-black leading-none">{totalVotes > 0 ? formatCompactNumber(totalVotes) : '0'}</span>
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">Love</span>
              </div>
          </div>

          <div className="flex items-center gap-2.5 bg-card/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/5 shadow-sm group">
              <TrendingUp className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                  <span className="text-xs font-black leading-none">{totalReads > 0 ? formatCompactNumber(totalReads) : '0'}</span>
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">Reads</span>
              </div>
          </div>

          <div className="flex items-center gap-2.5 bg-primary/10 px-4 py-2.5 rounded-full border border-primary/20 shadow-sm group">
              <div className="relative">
                  <Clock className="h-4 w-4 text-primary group-hover:animate-pulse" />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="flex flex-col">
                  <span className="text-xs font-black leading-none text-primary">Stable</span>
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-primary/60">Creative Flow</span>
              </div>
          </div>
      </div>
      
      <Tabs defaultValue="published" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6 border-b border-border/10 pb-6">
            <TabsList className="bg-muted/40 backdrop-blur-xl p-1 rounded-full border border-border/40 shadow-inner w-full max-w-[340px] h-11">
                <TabsTrigger value="published" className="rounded-full font-black uppercase text-[9px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                    <Book className="h-3.5 w-3.5" /> Shared 
                    <Badge variant="secondary" className="h-4.5 px-1.5 font-bold min-w-[18px] bg-primary/10 text-primary border-none text-[8px]">{publishedStories.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="drafts" className="rounded-full font-black uppercase text-[9px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                    <Feather className="h-3.5 w-3.5" /> Private
                    <Badge variant="secondary" className="h-4.5 px-1.5 font-bold min-w-[18px] bg-muted-foreground/10 text-muted-foreground border-none text-[8px]">{draftStories.length}</Badge>
                </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 bg-muted/20 px-4 py-1.5 rounded-2xl border border-border/40">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Archive Synced</span>
            </div>
        </div>

        <TabsContent value="published" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-700">
          {publishedStories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-10">
              {publishedStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-card/20 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-border/40 max-w-xl mx-auto flex flex-col items-center gap-5 transform-gpu">
                <div className="p-6 rounded-full bg-muted/30 shadow-inner">
                    <Book className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xl font-headline font-bold text-foreground uppercase tracking-tight">Empty Archive</p>
                    <p className="text-xs text-muted-foreground max-w-xs px-10">You haven't shared any of your creative works yet.</p>
                </div>
                <Link href="/write/edit-details" passHref>
                    <Button variant="outline" className="rounded-full font-black uppercase text-[9px] tracking-[0.2em] px-10 h-10 border-border/60 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">Begin Writing</Button>
                </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-700">
          {draftStories.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-10">
              {draftStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-card/20 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-border/40 max-w-xl mx-auto flex flex-col items-center gap-5 transform-gpu">
                <div className="p-6 rounded-full bg-muted/30 shadow-inner">
                    <Feather className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xl font-headline font-bold text-foreground uppercase tracking-tight">No Private Drafts</p>
                    <p className="text-xs text-muted-foreground max-w-xs px-10">Your personal works-in-progress will stay safe here.</p>
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