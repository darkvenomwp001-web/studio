
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Loader2, ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { LiveFeedPost } from '@/types';
import { formatDate } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { restoreLiveFeedPost, permanentlyDeleteLiveFeedPost } from '@/app/actions/liveFeedActions';

export default function TrashPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [trashedPosts, setTrashedPosts] = useState<LiveFeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);
    const liveFeedQuery = query(
      collection(db, 'liveFeed'), 
      where('authorId', '==', user.id), 
      where('isTrashed', '==', true), 
      orderBy('trashedAt', 'desc')
    );

    const unsubscribe = onSnapshot(liveFeedQuery, snapshot => {
      setTrashedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveFeedPost)));
      setIsLoading(false);
    }, error => {
      console.error("Error fetching trashed posts:", error);
      toast({ title: "Error", description: "Could not load trashed items.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handleRestore = async (postId: string) => {
    if (!user) return;
    const result = await restoreLiveFeedPost(postId, user.id);
    if (result.success) {
      toast({ title: "Post Restored", description: "The post has been moved back to the live feed." });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDelete = async (postId: string) => {
    if (!user) return;
    const result = await permanentlyDeleteLiveFeedPost(postId, user.id);
    if (result.success) {
      toast({ title: "Deleted Forever", description: "The post has been permanently removed." });
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
        <p className="text-muted-foreground">Items in trash will be permanently deleted after 30 days.</p>
      </header>
      
      <div className="space-y-4">
        {trashedPosts.length > 0 ? trashedPosts.map(post => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <p className="text-muted-foreground whitespace-pre-line">{post.content}</p>
              <p className="text-xs text-muted-foreground mt-2">Moved to trash on {formatDate(post.trashedAt)}</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => handleRestore(post.id)}>
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
                    <AlertDialogAction onClick={() => handleDelete(post.id)} className="bg-destructive hover:bg-destructive/90">
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        )) : (
          <div className="text-center py-16 bg-card rounded-lg shadow-sm">
            <Trash2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-headline font-semibold mb-2">Trash is Empty</h2>
            <p className="text-muted-foreground">Items you move to trash will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
