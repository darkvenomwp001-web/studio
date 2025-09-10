
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Loader2, ArrowLeft, Archive as ArchiveIcon, Trash2, Edit, FileText, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Prompt, StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { permanentlyDeletePrompt } from '@/app/actions/promptActions';
import { permanentlyDeleteStatusUpdate, restoreStatusUpdate } from '@/app/actions/statusActions';
import Image from 'next/image';

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [archivedPrompts, setArchivedPrompts] = useState<Prompt[]>([]);
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
    const statusesQuery = query(collection(db, 'statusUpdates'), where('authorId', '==', user.id), where('isArchived', '==', true), orderBy('archivedAt', 'desc'));

    const unsubPrompts = onSnapshot(promptsQuery, snapshot => {
      setArchivedPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
      setIsLoading(false); // Set loading to false once data is fetched
    }, error => {
      console.error("Error fetching archived prompts:", error);
      toast({ title: "Error", description: "Could not load archived prompts.", variant: "destructive" });
      setIsLoading(false);
    });
    
    const unsubStatuses = onSnapshot(statusesQuery, snapshot => {
        setArchivedStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
        setIsLoading(false); // Also set loading to false here
    }, error => {
        console.error("Error fetching archived statuses:", error);
        toast({ title: "Error", description: "Could not load archived statuses.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => {
      unsubPrompts();
      unsubStatuses();
    };
  }, [user, authLoading, router, toast]);

  const handleRestore = async (itemId: string, type: 'prompt' | 'status') => {
    if (!user) return;
    let result: { success: boolean, error?: string };
    let itemName = type === 'prompt' ? 'Prompt' : 'Status';
    
    if (type === 'status') {
        result = await restoreStatusUpdate(itemId, user.id);
    } else {
        // Placeholder for prompt restoration logic
        toast({ title: "Coming Soon", description: "Restoring prompts is not yet implemented." });
        return;
    }

    if (result.success) {
        toast({ title: `${itemName} Restored`, description: `The item has been restored from the archive.`});
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDelete = async (itemId: string, type: 'prompt' | 'status') => {
    if (!user) return;
    let result: { success: boolean, error?: string };
    let itemName = type === 'prompt' ? 'Prompt' : 'Status';
    
    switch(type) {
        case 'prompt':
            result = await permanentlyDeletePrompt(itemId, user.id);
            break;
        case 'status':
            result = await permanentlyDeleteStatusUpdate(itemId, user.id);
            break;
    }

    if (result.success) {
        toast({ title: `${itemName} Deleted`, description: `The item has been permanently removed.`});
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
        <p className="text-muted-foreground">Content you've archived. You can restore it or delete it permanently.</p>
      </header>

       <Tabs defaultValue={archivedPrompts.length > 0 ? "prompts" : "statuses"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompts">Prompts ({archivedPrompts.length})</TabsTrigger>
            <TabsTrigger value="statuses">Statuses ({archivedStatuses.length})</TabsTrigger>
        </TabsList>
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
                            <Button variant="outline" size="sm" disabled>
                                <RotateCcw className="mr-2 h-4 w-4" /> Restore
                            </Button>
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
                                        <AlertDialogAction onClick={() => handleDelete(prompt.id, 'prompt')} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction>
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
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start gap-4">
                             <div className="w-full sm:w-32 h-auto sm:h-32 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                                <Image src={status.mediaUrl} alt="Archived status" layout="responsive" width={128} height={128} objectFit="cover" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Image status from {formatDate(status.createdAt)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Archived on {formatDate(status.archivedAt)}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                           <Button variant="outline" size="sm" onClick={() => handleRestore(status.id, 'status')}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Restore
                           </Button>
                           <AlertDialog>
                               <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Permanently delete this status?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone and the status will be gone forever.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(status.id, 'status')} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction>
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
