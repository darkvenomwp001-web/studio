
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Loader2, ArrowLeft, Trash2, RotateCcw, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { restoreStatusUpdate, permanentlyDeleteStatusUpdate } from '@/app/actions/statusActions';
import Image from 'next/image';
import Link from 'next/link';

export default function TrashPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [trashedItems, setTrashedItems] = useState<StatusUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    // Query for status updates that belong to the user and are marked as trashed
    const statusesQuery = query(
        collection(db, 'statusUpdates'), 
        where('authorId', '==', user.id), 
        where('isTrashed', '==', true), 
        orderBy('trashedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(statusesQuery, (snapshot) => {
      setTrashedItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching trashed items:", error);
        toast({ title: "Error", description: "Could not load items from trash.", variant: "destructive"});
        setIsLoading(false);
    });

    return () => unsubscribe();

  }, [user, authLoading, router, toast]);

  const handleRestore = async (statusId: string) => {
    if (!user) return;
    const result = await restoreStatusUpdate(statusId, user.id);
    if (result.success) {
        toast({ title: "Status Restored", description: "The status is live again for 24 hours." });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDelete = async (statusId: string) => {
    if (!user) return;
    const result = await permanentlyDeleteStatusUpdate(statusId, user.id);
     if (result.success) {
        toast({ title: "Status Deleted", description: "The status has been permanently deleted." });
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
        <h1 className="text-4xl font-headline font-bold text-destructive flex items-center gap-3">
          <Trash2 className="h-10 w-10" /> Trash
        </h1>
        <p className="text-muted-foreground">Items in trash are permanently deleted after 30 days. This action cannot be undone.</p>
      </header>
      
      <div className="space-y-4">
        {trashedItems.length > 0 ? trashedItems.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-start gap-4">
                 <div className="w-24 h-24 sm:w-32 sm:h-32 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <Image src={item.mediaUrl} alt="Trashed status" layout="fill" objectFit="cover" />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Status from {formatDate(item.createdAt)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Moved to trash on {formatDate(item.trashedAt)}</p>
                </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => handleRestore(item.id)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Restore
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        )) : (
          <Card className="text-center py-10">
            <CardHeader>
                <Trash2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle>Trash is Empty</CardTitle>
                <CardDescription>Items you move to trash from the archive will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/archive" passHref>
                  <Button variant="outline">View Archive</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
