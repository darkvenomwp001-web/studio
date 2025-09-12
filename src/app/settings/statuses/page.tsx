
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Loader2, ArrowLeft, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { permanentlyDeleteStatusUpdate } from '@/app/actions/statusActions';
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

  const handleVanish = async (statusId: string) => {
    if (!user) return;
    
    setDeletingId(statusId); // Trigger the animation

    startTransition(async () => {
      // Wait for animation to be visible
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = await permanentlyDeleteStatusUpdate(statusId, user.id);
      if (result.success) {
          toast({ title: "Status Vanished", description: "The status has been permanently deleted." });
          // The onSnapshot listener will handle removing the item from the UI
      } else {
          toast({ title: "Error", description: result.error, variant: "destructive" });
          setDeletingId(null); // Reset animation on failure
      }
      // No need to setDeletingId(null) on success, as the item will disappear from the list
    });
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
        <p className="text-muted-foreground">Make your active statuses vanish into thin air. This action is permanent.</p>
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
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="bg-gradient-to-br from-red-500 to-orange-400 text-white hover:from-red-600 hover:to-orange-500 shadow-md hover:shadow-lg transition-all transform hover:scale-105">
                            <Wind className="mr-2 h-4 w-4" /> Vanish
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Make this status vanish forever?</AlertDialogTitle>
                        <AlertDialogDescription>This action is permanent and cannot be undone. The status will be gone forever.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleVanish(item.id)} className="bg-destructive hover:bg-destructive/90">
                          {isPending && deletingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wind className="mr-2 h-4 w-4" />}
                          Yes, Make it Vanish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
  );
}
