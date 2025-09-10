
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, Archive as ArchiveIcon, Trash2, Edit, FileText, Image as ImageIcon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Prompt, StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { permanentlyDeletePrompt } from '@/app/actions/promptActions';
import { permanentlyDeleteStatusUpdate, trashStatusUpdate } from '@/app/actions/statusActions';
import Image from 'next/image';
import Link from 'next/link';

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [archivedPrompts, setArchivedPrompts] = useState<Prompt[]>([]);
  const [expiredStatuses, setExpiredStatuses] = useState<StatusUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    // This query fetches prompts explicitly marked as archived
    const promptsQuery = query(collection(db, 'prompts'), where('author.id', '==', user.id), where('isArchived', '==', true), orderBy('archivedAt', 'desc'));
    
    // This query fetches statuses that are older than 24 hours and NOT trashed
    const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const statusesQuery = query(
        collection(db, 'statusUpdates'), 
        where('authorId', '==', user.id), 
        where('isTrashed', '==', false),
        where('createdAt', '<=', twentyFourHoursAgo),
        orderBy('createdAt', 'desc')
    );

    const unsubPrompts = onSnapshot(promptsQuery, snapshot => {
      setArchivedPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
      if (isLoading) setIsLoading(false);
    }, error => {
      console.error("Error fetching archived prompts:", error);
      toast({ title: "Error", description: "Could not load archived prompts.", variant: "destructive" });
      if (isLoading) setIsLoading(false);
    });
    
    const unsubStatuses = onSnapshot(statusesQuery, snapshot => {
        setExpiredStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
        if (isLoading) setIsLoading(false);
    }, error => {
        console.error("Error fetching expired statuses:", error);
        toast({ title: "Error", description: "Could not load expired statuses.", variant: "destructive" });
        if (isLoading) setIsLoading(false);
    });

    return () => {
      unsubPrompts();
      unsubStatuses();
    };
  }, [user, authLoading, router, toast]);

  const handleMoveToTrash = async (statusId: string) => {
    if (!user) return;
    const result = await trashStatusUpdate(statusId, user.id);
    if (result.success) {
        toast({ title: "Status Moved to Trash" });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!user) return;
    const result = await permanentlyDeletePrompt(promptId, user.id);
    if (result.success) {
        toast({ title: `Prompt Deleted`, description: `The prompt has been permanently removed.`});
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
        <p className="text-muted-foreground">Manage your archived prompts and expired status updates.</p>
      </header>

       <Tabs defaultValue="statuses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="statuses">Expired Statuses ({expiredStatuses.length})</TabsTrigger>
            <TabsTrigger value="prompts">Archived Prompts ({archivedPrompts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="mt-4">
            <div className="space-y-4">
                {expiredStatuses.length > 0 ? expiredStatuses.map(status => (
                    <Card key={status.id}>
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start gap-4">
                             <div className="w-full sm:w-32 h-auto sm:h-32 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                                <Image src={status.mediaUrl} alt="Archived status" layout="responsive" width={128} height={128} objectFit="cover" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Status from {formatDate(status.createdAt)}</p>
                                <p className="text-xs text-muted-foreground mt-1">This status is over 24 hours old and is no longer live.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                           <Button variant="outline" size="sm" onClick={() => handleMoveToTrash(status.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
                           </Button>
                        </CardFooter>
                    </Card>
                )) : (
                  <Card className="text-center py-10">
                    <CardHeader>
                      <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                      <CardTitle>No Expired Statuses</CardTitle>
                      <CardDescription>Status updates you post will appear here after 24 hours.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/" passHref>
                          <Button>Post a Status Update</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
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
                            <AlertDialog>
                               <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Permanently delete this prompt?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone and the prompt will be gone forever.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePrompt(prompt.id)} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction>
                                    </AlertDialogFooter>
                               </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )) : (
                  <Card className="text-center py-10">
                    <CardHeader>
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                      <CardTitle>No Archived Prompts</CardTitle>
                      <CardDescription>Prompts you archive will appear here.</CardDescription>
                    </CardHeader>
                     <CardContent>
                      <Link href="/#prompts" passHref>
                          <Button>Create a Prompt</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
            </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
