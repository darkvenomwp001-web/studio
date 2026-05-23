'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, 
  Loader2, 
  Book, 
  Feather, 
  RefreshCw
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
        return {
            id: docSnap.id,
            ...data,
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

  if (authLoading || (isLoadingStories && user)) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-10rem)] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Entering Workspace Node...</p>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="space-y-8 text-center py-20 animate-in fade-in duration-700">
        <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Feather className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h1 className="text-3xl font-headline font-bold text-foreground">Writer Studio</h1>
        <p className="text-muted-foreground max-w-xs mx-auto">Please <Link href="/auth/signin" className="text-primary font-bold hover:underline">sign in</Link> to access your manuscript studio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700 px-4 md:px-6 mt-6">
      
      {/* Morphic Liquid Glass Header */}
      <header className="flex flex-row items-center justify-between p-6 md:p-8 bg-card/30 backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl transform-gpu">
          <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-headline font-bold tracking-tight">Writer Studio</h1>
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Creative Workspace Node</p>
          </div>
          <Link href="/write/edit-details" passHref>
              <Button size="lg" className="rounded-full shadow-xl shadow-primary/20 gap-2 font-bold h-10 md:h-12 px-6 md:px-10 transition-all hover:scale-[1.02] active:scale-95">
                  <PlusCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">New Story</span>
                  <span className="sm:hidden">New</span>
              </Button>
          </Link>
      </header>
      
      <Tabs defaultValue="published" className="w-full">
        <div className="flex justify-center md:justify-start mb-6 border-b border-border/10 pb-4">
            <TabsList className="bg-muted/40 backdrop-blur-xl p-1 rounded-full border border-border/40 shadow-inner w-full max-w-sm h-11">
                <TabsTrigger value="published" className="rounded-full font-bold text-xs flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                    <Book className="h-4 w-4" /> Published 
                    <Badge variant="ghost" className="h-5 px-1.5 font-bold min-w-[20px]">{publishedStories.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="drafts" className="rounded-full font-bold text-xs flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                    <Feather className="h-4 w-4" /> Archives
                    <Badge variant="ghost" className="h-5 px-1.5 font-bold min-w-[20px]">{draftStories.length}</Badge>
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="published" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-700">
          {publishedStories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 gap-y-12">
              {publishedStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-40 bg-card/20 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-border/40 max-w-2xl mx-auto flex flex-col items-center gap-4">
                <div className="p-5 rounded-full bg-muted/30">
                    <Book className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                    <p className="text-lg font-bold text-foreground">Manuscript Node Offline</p>
                    <p className="text-sm text-muted-foreground">You haven't released any public manuscripts yet.</p>
                </div>
                <Link href="/write/edit-details" passHref>
                    <Button variant="outline" className="rounded-full mt-2 font-bold text-xs uppercase tracking-widest px-8">Start First Entry</Button>
                </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-700">
          {draftStories.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 gap-y-12">
              {draftStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-40 bg-card/20 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-border/40 max-w-2xl mx-auto flex flex-col items-center gap-4">
                <div className="p-5 rounded-full bg-muted/30">
                    <Feather className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                    <p className="text-lg font-bold text-foreground">Archive is Clean</p>
                    <p className="text-sm text-muted-foreground">Your private drafts and archival manuscripts will appear here.</p>
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Studio Hub...</p>
        </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

