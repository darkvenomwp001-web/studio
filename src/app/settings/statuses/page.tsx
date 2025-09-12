
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, MoreHorizontal, Edit, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { StatusUpdate } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { moveStatusToDrafts } from '@/app/actions/statusActions';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import StatusFeature from '@/components/status/StatusFeature';

export default function ManageStatusesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [liveStatuses, setLiveStatuses] = useState<StatusUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

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
        where('isTrashed', '==', false),
        orderBy('expiresAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(statusesQuery, (snapshot) => {
      const allLive = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate));
      // Manual filter for expiration, as Firestore doesn't allow inequality filters on different fields.
      setLiveStatuses(allLive.filter(s => s.expiresAt && (s.expiresAt as Timestamp).toMillis() > now.getTime()));
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching live statuses:", error);
        toast({ title: "Error", description: "Could not load your live statuses. This may be due to missing database indexes.", variant: "destructive"});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handleMoveToDrafts = async (statusId: string) => {
    if (!user) return;
    
    setIsProcessingId(statusId);
    
    const result = await moveStatusToDrafts(statusId, user.id);
    if (result.success) {
        toast({ title: "Status Moved to Drafts" });
        // The onSnapshot listener will automatically remove the item from the UI
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    
    setIsProcessingId(null);
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
              "overflow-hidden shadow-sm transition-all duration-300"
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
                        <Button variant="ghost" size="icon" disabled={isProcessingId === item.id}>
                          {isProcessingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => handleMoveToDrafts(item.id)}>
                            <Save className="mr-2 h-4 w-4" />
                            Save as Draft
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => toast({ title: "Coming Soon!", description: "Direct editing of statuses will be available shortly." })}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
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
                <StatusFeature />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
