
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit2, Trash2, FileText, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import type { Story } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { cn } from '@/lib/utils';

export default function WriteDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingStories(true);
      const storiesCollectionRef = collection(db, 'stories');
      
      const authorQuery = where('author.id', '==', user.id);
      const collaboratorQuery = where('collaborators', 'array-contains', {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      });
      
      const q = query(
        storiesCollectionRef,
        orderBy('lastUpdated', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const stories = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
            chapters: data.chapters || [],
            tags: data.tags || [],
          } as Story;
        }).filter(story => 
            story.author.id === user.id || 
            (story.collaborators && story.collaborators.some(c => c.id === user.id))
        );
        setUserStories(stories);
        setIsLoadingStories(false);
      }, (error) => {
        console.error("Error fetching user stories: ", error);
        toast({ title: "Error", description: "Could not load your stories.", variant: "destructive" });
        setIsLoadingStories(false);
      });

      return () => unsubscribe();
    } else if (!authLoading && !user) {
      setIsLoadingStories(false);
      setUserStories([]);
    }
  }, [user, authLoading, toast]);

  const handleDeleteStory = async () => {
    if (!storyToDelete || !user) return;

    if (storyToDelete.author.id !== user.id) {
      toast({ title: "Unauthorized", description: "Only the original author can delete a story.", variant: "destructive" });
      setStoryToDelete(null);
      return;
    }

    const storyDocRef = doc(db, 'stories', storyToDelete.id);
    try {
      if (storyToDelete.coverImageUrl && storyToDelete.coverImageUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const imageRef = storageRef(storage, storyToDelete.coverImageUrl);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          if (storageError.code !== 'storage/object-not-found') {
            console.warn("Could not delete cover image from Firebase Storage:", storageError);
            toast({ title: "Storage Warning", description: "Story record will be deleted, but its cover image might remain in storage.", variant: "destructive" });
          }
        }
      }

      await deleteDoc(storyDocRef);

      toast({
        title: "Story Deleted",
        description: `"${storyToDelete.title}" has been permanently deleted.`,
      });
    } catch (error) {
      console.error("Error deleting story from Firestore: ", error);
      toast({
        title: "Deletion Failed",
        description: `Could not delete "${storyToDelete.title}". Please try again.`,
        variant: "destructive",
      });
    } finally {
      setStoryToDelete(null);
    }
  };
  
   const getStatusBadgeClasses = (status?: 'Ongoing' | 'Completed' | 'Draft', visibility?: 'Public' | 'Private' | 'Unlisted') => {
    if (visibility === 'Private' || visibility === 'Unlisted') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600';
    }
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };
  
  const getDisplayStatus = (status?: 'Ongoing' | 'Completed' | 'Draft', visibility?: 'Public' | 'Private' | 'Unlisted') => {
    if (visibility === 'Private') return 'Private';
    if (visibility === 'Unlisted') return 'Unlisted';
    return status || 'Draft';
  }


  if (authLoading || (isLoadingStories && user)) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-6 border-b">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">My Writing Dashboard</h1>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" disabled>
            <PlusCircle className="mr-2 h-5 w-5" /> Start a New Story
          </Button>
        </div>
        <div className="text-center py-10 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Loading your stories...</p>
        </div>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="space-y-8 text-center py-10">
         <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">My Writing Dashboard</h1>
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to manage your stories.</p>
      </div>
    );
  }

  return (
    <AlertDialog>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-6 border-b">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">My Writing Dashboard</h1>
          <Link href="/write/edit-details" passHref>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" /> Start a New Story
            </Button>
          </Link>
        </div>

        {userStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStories.map(story => (
              <Card key={story.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-card">
                <CardHeader className="relative p-0 aspect-[2/3] overflow-hidden">
                  <Image
                    src={story.coverImageUrl || `https://placehold.co/512x800.png`}
                    alt={story.title}
                    layout="fill"
                    objectFit="cover"
                    className="w-full h-full"
                    data-ai-hint={story.dataAiHint || "book cover abstract"}
                  />
                  <Badge 
                    variant={'outline'}
                    className={cn(
                        "absolute top-2 right-2 text-xs px-2 py-1 font-semibold capitalize",
                        getStatusBadgeClasses(story.status, story.visibility)
                    )}
                  >
                      {getDisplayStatus(story.status, story.visibility)}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4 flex-grow">
                  <CardTitle className="text-xl font-headline truncate mb-1">
                    {story.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2 mb-2 h-10">
                    {story.summary}
                  </CardDescription>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p><strong>Chapters:</strong> {story.chapters.length}</p>
                    <p><strong>Views:</strong> {story.views != null ? (story.views / 1000).toFixed(1) + 'k' : 'N/A'}</p>
                    <p><strong>Last Updated:</strong> {story.lastUpdated ? new Date(story.lastUpdated).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                  <Link href={`/stories/${story.id}`} passHref>
                    <Button variant="outline" size="sm"><Eye className="mr-1.5 h-4 w-4" /> View</Button>
                  </Link>
                  <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                    <Button variant="default" size="sm" className="bg-primary/90 hover:bg-primary text-primary-foreground"><Edit2 className="mr-1.5 h-4 w-4" /> Edit</Button>
                  </Link>
                   {story.author.id === user.id && (
                     <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setStoryToDelete(story)}>
                          <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                   )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-lg shadow-sm">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-headline font-semibold mb-2">No Stories Yet</h2>
            <p className="text-muted-foreground mb-6">It looks like you haven't started any stories. <br/>Click the button above to begin your writing journey!</p>
            <Link href="/write/edit-details" passHref>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Create Your First Story
              </Button>
            </Link>
          </div>
        )}
      </div>

      {storyToDelete && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              story "{storyToDelete.title}" and all its chapters from Firestore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, delete story
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
