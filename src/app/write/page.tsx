'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Book, Feather, Share2, Search, CheckCircle, Sparkles, Download, ArrowRight, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useMemo, Suspense } from 'react';
import type { Story, Chapter } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import DashboardStoryCard from '@/components/shared/DashboardStoryCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function WattpadImportDialog() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [step, setStep] = useState<'username' | 'fetching' | 'select' | 'importing' | 'success'>('username');
    const [username, setUsername] = useState('');
    const [mockStories, setMockStories] = useState<any[]>([]);
    const [selectedStory, setSelectedStory] = useState<any | null>(null);

    const handleSearch = () => {
        if (!username.trim()) return;
        setStep('fetching');
        // Simulate Wattpad Archival Fetch
        setTimeout(() => {
            setMockStories([
                { id: 'w1', title: 'The Silent Code', parts: 12, genre: 'Mystery', summary: 'A high-stakes thriller about forgotten archives.' },
                { id: 'w2', title: 'Summer in Amethy', parts: 24, genre: 'Romance', summary: 'A coming-of-age story in the highschool of detectives.' },
                { id: 'w3', title: 'Binary Soul', parts: 8, genre: 'Sci-Fi', summary: 'The digital ghost of a writer seeking connection.' }
            ]);
            setStep('select');
        }, 2500);
    };

    const handleImport = async () => {
        if (!user || !selectedStory) return;
        setStep('importing');

        // Simulate Manuscript Processing (Prologue to Epilogue)
        setTimeout(async () => {
            try {
                const newStoryId = doc(collection(db, 'stories')).id;
                
                // Create Mock Chapters for the imported story
                const chapters: Chapter[] = [
                    { id: 'ch-p', title: 'Prologue: The Signal', content: '<p>The archives were dark when I first entered...</p>', order: 1, status: 'Published', accessType: 'public', wordCount: 450, votes: 0, voterIds: [], tags: [], views: 0, commentsCount: 0 },
                    { id: 'ch-1', title: 'Part 1: Discovery', content: '<p>The manuscript smelled of old binary and dust.</p>', order: 2, status: 'Draft', accessType: 'public', wordCount: 1200, votes: 0, voterIds: [], tags: [], views: 0, commentsCount: 0 },
                    { id: 'ch-e', title: 'Epilogue: The End', content: '<p>Every story eventually returns to the archives.</p>', order: 3, status: 'Draft', accessType: 'public', wordCount: 300, votes: 0, voterIds: [], tags: [], views: 0, commentsCount: 0 }
                ];

                const storyData: Story = {
                    id: newStoryId,
                    title: selectedStory.title,
                    author: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl },
                    genre: selectedStory.genre,
                    summary: selectedStory.summary,
                    tags: ['wattpad-import'],
                    chapters: chapters,
                    status: 'Draft',
                    lastUpdated: serverTimestamp(),
                    visibility: 'Private',
                    views: 0,
                    collaboratorIds: [],
                    collaborators: []
                };

                await setDoc(doc(db, 'stories', newStoryId), storyData);
                setStep('success');
                toast({ title: "Manuscript Imported!", description: `"${selectedStory.title}" is now in your dashboard.` });
            } catch (err) {
                toast({ title: "Import failed", variant: "destructive"});
                setStep('select');
            }
        }, 3000);
    };

    return (
        <DialogContent className="rounded-[2.5rem] border-none shadow-3xl bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
            <DialogHeader className="p-8 bg-muted/30 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <Share2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="font-headline text-2xl font-bold">Wattpad Archival Sync</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Import your manuscripts smoothly</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="p-8 min-h-[300px] flex flex-col justify-center">
                {step === 'username' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-2 text-center">
                            <h3 className="font-bold text-lg">Connect Your Identity</h3>
                            <p className="text-sm text-muted-foreground">Enter your Wattpad username to scan your public works.</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                            <Input 
                                placeholder="wattpad_username" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="h-14 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner text-lg font-medium"
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={!username.trim()} className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/20">
                            Scan Archives
                        </Button>
                    </div>
                )}

                {step === 'fetching' && (
                    <div className="flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Syncing Wattpad Archives...</p>
                    </div>
                )}

                {step === 'select' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">Found {mockStories.length} Manuscripts</h3>
                            <Button variant="ghost" size="sm" onClick={() => setStep('username')} className="h-7 text-[10px] uppercase font-bold text-primary">Change Handle</Button>
                        </div>
                        <ScrollArea className="h-[250px] -mx-2 px-2">
                            <div className="space-y-2">
                                {mockStories.map(s => (
                                    <div 
                                        key={s.id} 
                                        onClick={() => setSelectedStory(s)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all cursor-pointer group flex justify-between items-center",
                                            selectedStory?.id === s.id ? "bg-primary/10 border-primary/40 shadow-inner" : "bg-muted/10 border-transparent hover:bg-muted/20"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm truncate">{s.title}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tighter opacity-50">{s.parts} Parts & bull; {s.genre}</p>
                                        </div>
                                        {selectedStory?.id === s.id ? <CheckCircle className="h-5 w-5 text-primary" /> : <ArrowRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <Button 
                            onClick={handleImport} 
                            disabled={!selectedStory} 
                            className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/20"
                        >
                            Import Selected Work
                        </Button>
                    </div>
                )}

                {step === 'importing' && (
                    <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95">
                        <div className="relative">
                            <Download className="h-12 w-12 text-primary animate-bounce" />
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-background rounded-full border-2 border-primary flex items-center justify-center">
                                <Loader2 className="h-2 w-2 animate-spin text-primary" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Importing Manuscript</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Structuring Prologue to Epilogue...</p>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center space-y-6 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-inner">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-headline text-2xl font-bold">Manuscript Archived</h3>
                            <p className="text-sm text-muted-foreground">Your work has been smoothly transferred to your dashboard.</p>
                        </div>
                        <DialogClose asChild>
                            <Button className="w-full rounded-full h-12 font-bold uppercase tracking-widest text-xs">Return to Dashboard</Button>
                        </DialogClose>
                    </div>
                )}
            </div>
            {step !== 'importing' && step !== 'fetching' && (
                <div className="p-4 bg-muted/20 border-t flex justify-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Wattpad Protocol & bull; High Fidelity Importer</p>
                </div>
            )}
        </DialogContent>
    );
}

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
            const timeB = b.lastUpdated?.toDate ? b.lastUpdated.toDate().getTime() : new Date(b.lastUpdated).getTime();
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

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight">Writer Studio</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage your creative manuscripts and drafts.</p>
        </div>
        <div className="flex items-center gap-3">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-full h-11 px-6 font-bold text-[10px] uppercase tracking-widest gap-2 border-primary/20 hover:bg-primary/5 transition-all shadow-sm">
                        <Share2 className="h-4 w-4 text-primary" />
                        Sync Wattpad
                    </Button>
                </DialogTrigger>
                <WattpadImportDialog />
            </Dialog>

            <Link href="/write/edit-details" passHref>
                <Button size="lg" className="rounded-full shadow-xl shadow-primary/20 gap-2 font-bold h-11 px-8">
                    <PlusCircle className="h-5 w-5" />
                    New Story
                </Button>
            </Link>
        </div>
      </div>
      
      <Tabs defaultValue="published" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 shadow-inner max-w-sm">
          <TabsTrigger value="published" className="rounded-full font-bold text-xs">
            <Book className="mr-2 h-4 w-4" /> Published ({publishedStories.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-full font-bold text-xs">
            <Feather className="mr-2 h-4 w-4" /> Archives ({draftStories.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="published" className="mt-8 animate-in fade-in duration-700">
          {publishedStories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
              {publishedStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-card/40 rounded-[40px] border-2 border-dashed border-border/40">
                <Book className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">No published manuscripts found</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="drafts" className="mt-8 animate-in fade-in duration-700">
          {draftStories.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
              {draftStories.map(story => (
                <DashboardStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-card/40 rounded-[40px] border-2 border-dashed border-border/40">
                <Feather className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Your archives are empty</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function WriteDashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
