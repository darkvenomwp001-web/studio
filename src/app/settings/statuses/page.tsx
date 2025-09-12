
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, Wind, Trash2, MoreHorizontal, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { permanentlyDeleteStatusUpdate, archiveStatusUpdate, trashStatusUpdate } from '@/app/actions/statusActions';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ManageStatusesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [liveStatuses, setLiveStatuses] = useState<StatusUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [itemToDelete, setItemToDelete] = useState<StatusUpdate | null>(null);

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
        where('isTrashed', '==', false),
        orderBy('expiresAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(statusesQuery, (snapshot) => {
      setLiveStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching live statuses:", error);
        toast({ title: "Error", description: "Could not load your live statuses. This may be due to missing database indexes.", variant: "destructive"});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handleVanish = async (statusId: string) => {
    if (!user) return;
    
    setDeletingId(statusId); // Trigger the animation

    startTransition(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = await permanentlyDeleteStatusUpdate(statusId, user.id);
      if (result.success) {
          toast({ title: "Status Vanished", description: "The status has been permanently deleted." });
      } else {
          toast({ title: "Error", description: result.error, variant: "destructive" });
          setDeletingId(null); 
      }
    });
  };

  const handleMoveToTrash = async (statusId: string) => {
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
        toast({ title: "Status Archived" });
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
    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
          Manage Live Statuses
        </h1>
        <p className="text-muted-foreground">Manage your active status updates before they expire.</p>
      </header>
      
      <div className="space-y-4">
        {liveStatuses.length > 0 ? liveStatuses.map(item => (
          <Card 
            key={item.id} 
            className={cn(
              "overflow-hidden shadow-sm transition-all duration-300",
              deletingId === item.id && "animate-fade-out scale-95"
            )}
          >
            <CardContent className="p-4 flex items-center gap-4">
                 <div className="w-24 h-24 sm:w-32 sm:h-32 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.mediaUrl ? (
                      <Image src={item.mediaUrl} alt="Status media" layout="fill" objectFit="cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">📝</div>
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <p className="text-sm text-foreground line-clamp-2">{item.textOverlay || item.note || "No caption"}</p>
                    <div className="text-xs text-muted-foreground">
                        Expires: {formatDate(item.expiresAt)}
                    </div>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => handleArchive(item.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMoveToTrash(item.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Move to Trash
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => setItemToDelete(item)}
                        >
                            <Wind className="mr-2 h-4 w-4" />
                            Vanish Forever
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
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
    
    {itemToDelete && (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Make this status vanish forever?</AlertDialogTitle>
                <AlertDialogDescription>This action is permanent and cannot be undone. The status will be gone forever.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if(itemToDelete) handleVanish(itemToDelete.id); }} className="bg-destructive hover:bg-destructive/90">
                {isPending && deletingId === itemToDelete.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wind className="mr-2 h-4 w-4" />}
                Yes, Make it Vanish
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    )}
    </AlertDialog>
  );
}
