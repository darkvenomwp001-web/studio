
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Archive as ArchiveIcon, Trash2, Edit, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { LiveFeedPost, Prompt } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { permanentlyDeleteLiveFeedPost } from '@/app/actions/liveFeedActions';
import { permanentlyDeletePrompt } from '@/app/actions/promptActions';

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [archivedPrompts, setArchivedPrompts] = useState<Prompt[]>([]);
  const [archivedLiveFeedPosts, setArchivedLiveFeedPosts] = useState<LiveFeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    const promptsQuery = query(collection(db, 'prompts'), where('author.id', '==', user.id), where('isArchived', '==', true), orderBy('archivedAt', 'desc'));
    const liveFeedQuery = query(collection(db, 'liveFeed'), where('authorId', '==', user.id), where('isArchived', '==', true), orderBy('archivedAt', 'desc'));

    const unsubPrompts = onSnapshot(promptsQuery, snapshot => {
      setArchivedPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
      setIsLoading(false); // Can set loading false after first query returns
    }, error => {
      console.error("Error fetching archived prompts:", error);
      toast({ title: "Error", description: "Could not load archived prompts.", variant: "destructive" });
    });

    const unsubLiveFeed = onSnapshot(liveFeedQuery, snapshot => {
      setArchivedLiveFeedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveFeedPost)));
    }, error => {
      console.error("Error fetching archived live feed posts:", error);
       toast({ title: "Error", description: "Could not load archived posts.", variant: "destructive" });
    });

    return () => {
      unsubPrompts();
      unsubLiveFeed();
    };
  }, [user, authLoading, router, toast]);

  const handleUnarchive = async (item: Prompt | LiveFeedPost, type: 'prompt' | 'liveFeed') => {
    const collectionName = type === 'prompt' ? 'prompts' : 'liveFeed';
    const itemRef = doc(db, collectionName, item.id);
    try {
        await updateDoc(itemRef, {
            isArchived: false,
            archivedAt: null // or delete(it) if you prefer
        });
        toast({ title: "Content Restored", description: "The item has been returned to the main feed." });
    } catch (error) {
        toast({ title: "Error", description: "Could not restore the item.", variant: "destructive" });
    }
  };

  const handleDelete = async (item: Prompt | LiveFeedPost, type: 'prompt' | 'liveFeed') => {
    if (!user) return;
    let result: { success: boolean, error?: string };
    if (type === 'prompt') {
        result = await permanentlyDeletePrompt(item.id, user.id);
    } else {
        result = await permanentlyDeleteLiveFeedPost(item.id, user.id);
    }

    if (result.success) {
        toast({ title: "Deleted Forever", description: "The item has been permanently removed."});
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
          <ArchiveIcon className="h-10 w-10" /> Your Archive
        </h1>
        <p className="text-muted-foreground">Content you've archived. Restore or permanently delete it here.</p>
      </header>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts ({archivedLiveFeedPosts.length})</TabsTrigger>
            <TabsTrigger value="prompts">Prompts ({archivedPrompts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
            <div className="space-y-4">
                {archivedLiveFeedPosts.length > 0 ? archivedLiveFeedPosts.map(post => (
                    <Card key={post.id}>
                        <CardContent className="p-4">
                            <p className="text-muted-foreground whitespace-pre-line">{post.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">Archived on {formatDate(post.archivedAt)}</p>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleUnarchive(post, 'liveFeed')}>Restore</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete Forever</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(post, 'liveFeed')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-10">No archived posts.</p>}
            </div>
        </TabsContent>
        <TabsContent value="prompts" className="mt-4">
             <div className="space-y-4">
                {archivedPrompts.length > 0 ? archivedPrompts.map(prompt => (
                    <Card key={prompt.id}>
                       <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5"/>{prompt.title}</CardTitle>
                            <CardDescription>Genre: {prompt.genre}</CardDescription>
                       </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-line">{prompt.prompt}</p>
                            <p className="text-xs text-muted-foreground mt-2">Archived on {formatDate(prompt.archivedAt)}</p>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleUnarchive(prompt, 'prompt')}>Restore</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete Forever</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(prompt, 'prompt')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-10">No archived prompts.</p>}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

