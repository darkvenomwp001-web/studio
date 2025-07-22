
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Archive as ArchiveIcon, Trash2, Edit, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { LiveFeedPost, Prompt, StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { permanentlyDeleteLiveFeedPost } from '@/app/actions/liveFeedActions';
import { permanentlyDeletePrompt } from '@/app/actions/promptActions';
import { permanentlyDeleteStatusUpdate } from '@/app/actions/statusActions';

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [archivedPrompts, setArchivedPrompts] = useState<Prompt[]>([]);
  const [archivedLiveFeedPosts, setArchivedLiveFeedPosts] = useState<LiveFeedPost[]>([]);
  const [archivedStatuses, setArchivedStatuses] = useState<StatusUpdate[]>([]);
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
    const statusesQuery = query(collection(db, 'statusUpdates'), where('authorId', '==', user.id), where('isArchived', '==', true), orderBy('archivedAt', 'desc'));

    const unsubPrompts = onSnapshot(promptsQuery, snapshot => {
      setArchivedPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
      setIsLoading(false); 
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
    
    const unsubStatuses = onSnapshot(statusesQuery, snapshot => {
        setArchivedStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
    }, error => {
        console.error("Error fetching archived statuses:", error);
        toast({ title: "Error", description: "Could not load archived statuses.", variant: "destructive" });
    });

    return () => {
      unsubPrompts();
      unsubLiveFeed();
      unsubStatuses();
    };
  }, [user, authLoading, router, toast]);

  const handleUnarchive = async (item: Prompt | LiveFeedPost | StatusUpdate, type: 'prompt' | 'liveFeed' | 'status') => {
    let collectionName: string;
    switch(type) {
        case 'prompt': collectionName = 'prompts'; break;
        case 'liveFeed': collectionName = 'liveFeed'; break;
        case 'status': collectionName = 'statusUpdates'; break;
    }

    const itemRef = doc(db, collectionName, item.id);
    try {
        await updateDoc(itemRef, {
            isArchived: false,
            archivedAt: null 
        });
        toast({ title: "Content Restored", description: "The item has been returned to the main feed." });
    } catch (error) {
        toast({ title: "Error", description: "Could not restore the item.", variant: "destructive" });
    }
  };

  const handleDelete = async (item: Prompt | LiveFeedPost | StatusUpdate, type: 'prompt' | 'liveFeed' | 'status') => {
    if (!user) return;
    let result: { success: boolean, error?: string };
    switch(type) {
        case 'prompt':
            result = await permanentlyDeletePrompt(item.id, user.id);
            break;
        case 'liveFeed':
            result = await permanentlyDeleteLiveFeedPost(item.id, user.id);
            break;
        case 'status':
            result = await permanentlyDeleteStatusUpdate(item.id, user.id);
            break;
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
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts ({archivedLiveFeedPosts.length})</TabsTrigger>
            <TabsTrigger value="prompts">Prompts ({archivedPrompts.length})</TabsTrigger>
            <TabsTrigger value="statuses">Statuses ({archivedStatuses.length})</TabsTrigger>
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
         <TabsContent value="statuses" className="mt-4">
            <div className="space-y-4">
                {archivedStatuses.length > 0 ? archivedStatuses.map(status => (
                    <Card key={status.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Image status from {formatDate(status.createdAt)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Archived on {formatDate(status.archivedAt)}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleUnarchive(status, 'status')}>Restore</Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete Forever</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(status, 'status')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )) : <p className="text-center text-muted-foreground py-10">No archived statuses.</p>}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
