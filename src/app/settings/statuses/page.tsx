
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, MoreHorizontal, Edit, Save, Archive, Trash2, Feather, Send, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { permanentlyDeleteStatusUpdate } from '@/app/actions/statusActions';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import StatusFeature from '@/components/status/StatusFeature';

export default function ManageStatusesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [draftStatuses, setDraftStatuses] = useState<StatusUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    const statusesQuery = query(
        collection(db, 'statusUpdates'), 
        where('authorId', '==', user.id), 
        where('status', '==', 'draft'),
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(statusesQuery, (snapshot) => {
      const allDrafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate));
      setDraftStatuses(allDrafts);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching draft statuses:", error);
        toast({ title: "Error", description: "Could not load your drafts.", variant: "destructive"});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handlePublishDraft = async (draftId: string) => {
      setIsProcessingId(draftId);
      const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
      try {
        await updateDoc(doc(db, "statusUpdates", draftId), {
            status: 'published',
            expiresAt: expiresAt,
            updatedAt: serverTimestamp(),
        });
        toast({title: "Draft Published!"});
      } catch (error) {
        toast({title: "Error", description: "Could not publish draft.", variant: "destructive"});
      } finally {
        setIsProcessingId(null);
      }
  }

  const handleDeleteDraft = async (draftId: string) => {
     if (!user) return;
     setIsProcessingId(draftId);
     const result = await permanentlyDeleteStatusUpdate(draftId, user.id);
     if(result.success) {
        toast({title: "Draft Permanently Deleted."});
     } else {
        toast({title: "Error", description: result.error, variant: "destructive"});
     }
     setIsProcessingId(null);
  }
  
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
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
          Manage Statuses
        </h1>
        <p className="text-muted-foreground">Manage your saved drafts.</p>
      </header>
      
      <div className="space-y-4">
        {draftStatuses.length > 0 ? draftStatuses.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-center gap-4">
                 <div className="w-24 h-24 sm:w-32 sm:h-32 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.mediaUrl ? (
                      <Image src={item.mediaUrl} alt="Status media" layout="fill" objectFit="cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">
                        {item.spotifyUrl ? <Music className="h-8 w-8"/> : <Feather className="h-8 w-8"/>}
                      </div>
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <p className="text-sm text-foreground line-clamp-2">{item.textOverlay || item.note || item.songLyricSnippet || "No caption"}</p>
                    <div className="text-xs text-muted-foreground">
                        Saved: {formatDate(item.createdAt)}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                     <Button size="sm" variant="outline" onClick={() => handlePublishDraft(item.id)} disabled={isProcessingId === item.id}>
                        {isProcessingId === item.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                        <span className="hidden sm:inline ml-2">Publish</span>
                    </Button>
                    <Button size="sm" variant="outline" disabled={isProcessingId === item.id} onClick={() => toast({title: "Coming soon!"})}>
                        <Edit className="h-4 w-4"/>
                        <span className="hidden sm:inline ml-2">Edit</span>
                    </Button>
                     <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={isProcessingId === item.id}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Draft Forever?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action is permanent and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteDraft(item.id)}>
                                {isProcessingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="text-center py-10">
            <CardHeader>
                <CardTitle>No Drafts</CardTitle>
                <CardDescription>You don't have any saved status drafts right now.</CardDescription>
            </CardHeader>
            <CardContent>
                <StatusFeature />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
