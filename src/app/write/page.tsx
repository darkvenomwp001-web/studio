
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, BarChart2, Book, Feather, ShieldAlert, PenSquare, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useMemo } from 'react';
import type { Story } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import DashboardStoryCard from '@/components/shared/DashboardStoryCard';

function QuickActionCard({ href, icon: Icon, title, description }: { href: string, icon: React.ElementType, title: string, description: string }) {
    return (
        <Link href={href} passHref>
            <Card className="hover:bg-primary/5 hover:border-primary/20 hover:shadow-lg transition-all duration-300 h-full">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-headline">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
            </Card>
        </Link>
    )
}

export default function WriteDashboardPage() {
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
        return {
            id: docSnap.id,
            ...data,
            lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
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
            const timeA = a.lastUpdated?.toDate ? a.lastUpdated.toDate().getTime() : new Date(a.lastUpdated).getTime();
            const timeB = b.lastUpdated?.toDate ? b.lastUpdated.toDate().getTime() : new Date(a.lastUpdated).getTime();
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
        toast({ title: "Error", description: "Could not load your authored stories. Check Firestore rules.", variant: "destructive" });
        setIsLoadingStories(false);
      });

      const unsubscribeCollaborator = onSnapshot(collaboratorQuery, (querySnapshot) => {
        collaboratingStories = querySnapshot.docs.map(mapDocToStory);
        combineAndSetStories();
        setIsLoadingStories(false);
      }, (error) => {
        console.error("Error fetching collaborating stories: ", error);
        toast({ title: "Error", description: "Could not load stories you collaborate on. Check Firestore rules.", variant: "destructive" });
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

  const { totalViews, totalVotes, storyCount } = useMemo(() => {
    const stats = publishedStories.reduce((acc, story) => {
      const votes = story.chapters?.reduce((voteSum, ch) => voteSum + (ch.votes || 0), 0) || 0;
      acc.totalViews += story.views || 0;
      acc.totalVotes += votes;
      return acc;
    }, { totalViews: 0, totalVotes: 0 });

    return { ...stats, storyCount: publishedStories.length };
  }, [publishedStories]);


  if (authLoading || (isLoadingStories && user)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground ml-3">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="space-y-8 text-center py-10">
        <Feather className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-headline font-bold text-foreground">Writer Dashboard</h1>
        <p className="text-muted-foreground">Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to manage your stories.</p>
      </div>
    );
  }

  if (user.role === 'reader') {
    return (
      <div className="space-y-8 text-center py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-headline font-bold text-foreground">Writer Access Required</h1>
        <p className="text-muted-foreground max-w-md mx-auto">This dashboard is for creating and managing stories. The site administrator can grant you writer access if you wish to contribute.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Writer Dashboard</h1>
          <p className="text-muted-foreground">Your creative space. Manage all your stories and drafts here.</p>
        </div>
      </div>
      
       <section>
          <h2 className="text-xl font-headline font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickActionCard href="/write/edit-details" icon={PenSquare} title="New Story" description="Start a new adventure from scratch." />
              <QuickActionCard href="/" icon={Book} title="Community Prompts" description="Get inspired by prompts from fellow writers." />
              <QuickActionCard href="/ai-assistant" icon={Brain} title="AI Assistant" description="Enhance your writing with AI suggestions." />
          </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><BarChart2 className="text-accent h-5 w-5" /> Your Stats at a Glance</CardTitle>
          <CardDescription>An overview of your writing journey on D4RKV3NOM.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{storyCount}</p>
                <p className="text-sm font-medium text-muted-foreground">Total Stories</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{totalViews.toLocaleString()}</p>
                <p className="text-sm font-medium text-muted-foreground">Total Reads</p>
            </div>
             <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{totalVotes.toLocaleString()}</p>
                <p className="text-sm font-medium text-muted-foreground">Total Votes</p>
            </div>
        </CardContent>
      </Card>


      <Tabs defaultValue="published" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="published">
            <Book className="mr-2 h-4 w-4" /> Published ({publishedStories.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            <Feather className="mr-2 h-4 w-4" /> Drafts & Private ({draftStories.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="published" className="mt-4">
          {publishedStories.length > 0 ? (
            <div className="space-y-4">
              {publishedStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                <p className="text-muted-foreground">You haven't published any stories yet.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="drafts" className="mt-4">
          {draftStories.length > 0 ? (
            <div className="space-y-4">
              {draftStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                <p className="text-muted-foreground">No drafts here. Start a new story!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

    