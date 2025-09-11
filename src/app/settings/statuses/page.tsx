
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, Trash2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { trashStatusUpdate, archiveStatusUpdate } from '@/app/actions/statusActions';
import Image from 'next/image';

export default function ManageStatusesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [liveStatuses, setLiveStatuses] = useState<StatusUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    const now = new Date();
    const statusesQuery = query(
        collection(db, 'statusUpdates'), 
        where('authorId', '==', user.id), 
        where('status', '==', 'published'),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(statusesQuery, (snapshot) => {
      setLiveStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching live statuses:", error);
        toast({ title: "Error", description: "Could not load your live statuses.", variant: "destructive"});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handleTrash = async (statusId: string) => {
    if (!user) return;
    const result = await trashStatusUpdate(statusId, user.id);
    if (result.success) {
        toast({ title: "Status Moved to Trash" });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleArchive = async (statusId: string) => {
    if (!user) return;
    const result = await archiveStatusUpdate(statusId, user.id);
    if (result.success) {
        toast({ title: "Status Archived", description: "This status has been moved to your archive." });
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
        <Button variant="ghost" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
          Manage Live Statuses
        </h1>
        <p className="text-muted-foreground">Archive or delete your active status updates before they expire.</p>
      </header>
      
      <div className="space-y-4">
        {liveStatuses.length > 0 ? liveStatuses.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-start gap-4">
                 <div className="w-24 h-24 sm:w-32 sm:h-32 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.mediaUrl ? (
                      <Image src={item.mediaUrl} alt="Status media" layout="fill" objectFit="cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">📝</div>
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-foreground line-clamp-2">{item.textOverlay || item.note || "No caption"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Posted on {formatDate(item.createdAt)}
                    </p>
                     <p className="text-xs text-muted-foreground mt-1">
                        Expires in {formatDate(item.expiresAt)}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="gap-2">
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive this status?</AlertDialogTitle>
                    <AlertDialogDescription>This will remove the status from public view and save it to your archive. You can manage it later from Settings -> Archive.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleArchive(item.id)}>
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                    <AlertDialogDescription>This will move the status to your trash folder. It will be permanently deleted after 30 days.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleTrash(item.id)} className="bg-destructive hover:bg-destructive/90">
                      Move to Trash
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        )) : (
          <Card className="text-center py-10">
            <CardHeader>
                <CardTitle>No Live Statuses</CardTitle>
                <CardDescription>You don't have any active status updates right now.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.push('/')}>Post a Status</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
