
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit2, Trash2, FileText, Eye, Loader2 } from 'lucide-react';
import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
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

async function getUserStoriesClient(userId: string | undefined): Promise<Story[]> {
  if (!userId) return [];
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300)); 
  return placeholderStories.filter(story => story.author.id === userId);
}

export default function WriteDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadStories() {
      if (user && !authLoading) {
        setIsLoadingStories(true);
        const stories = await getUserStoriesClient(user.id);
        setUserStories(stories);
        setIsLoadingStories(false);
      } else if (!authLoading && !user) {
        // If auth is done loading and there's no user, no stories to load.
        setIsLoadingStories(false);
        setUserStories([]);
      }
    }
    loadStories();
  }, [user, authLoading]);

  const handleDeleteStory = () => {
    if (!storyToDelete) return;

    // Simulate deleting from backend/state
    setUserStories(prevStories => prevStories.filter(story => story.id !== storyToDelete.id));
    
    // Optional: To make placeholderStories reflect deletion for the session (advanced mock)
    // const storyIndex = placeholderStories.findIndex(s => s.id === storyToDelete.id);
    // if (storyIndex > -1) {
    //   placeholderStories.splice(storyIndex, 1);
    // }

    toast({
      title: "Story Deleted",
      description: `"${storyToDelete.title}" has been deleted.`,
    });
    setStoryToDelete(null); // Close dialog
  };
  
  const getStatusBadgeVariant = (status?: 'Ongoing' | 'Completed' | 'Draft') => {
    switch (status) {
      case 'Completed':
        return 'secondary'; // Typically green or distinct 'done' color
      case 'Ongoing':
        return 'default'; // Primary color
      case 'Draft':
        return 'outline'; // Muted/less prominent
      default:
        return 'outline';
    }
  };
   const getStatusBadgeClasses = (status?: 'Ongoing' | 'Completed' | 'Draft') => {
    switch (status) {
      case 'Completed':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-700';
      case 'Ongoing':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600';
      case 'Draft':
        return 'bg-gray-500 hover:bg-gray-600 text-white border-gray-600';
      default:
        return 'text-muted-foreground';
    }
  };


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
          <Link href="/write/edit" passHref>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" /> Start a New Story
            </Button>
          </Link>
        </div>

        {userStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStories.map(story => (
              <Card key={story.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="relative p-0 aspect-[16/10] overflow-hidden">
                  <Image
                    src={story.coverImageUrl || `https://placehold.co/400x250.png`}
                    alt={story.title}
                    width={400}
                    height={250}
                    className="object-cover w-full h-full"
                    data-ai-hint={story.dataAiHint || "abstract illustration"}
                  />
                  <Badge 
                    variant={getStatusBadgeVariant(story.status)} 
                    className={`absolute top-2 right-2 text-xs px-2 py-1 ${getStatusBadgeClasses(story.status)}`}
                  >
                      {story.status || 'Draft'}
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
                    <p><strong>Last Updated:</strong> {new Date(story.lastUpdated).toLocaleDateString()}</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                  <Link href={`/stories/${story.id}`} passHref>
                    <Button variant="outline" size="sm"><Eye className="mr-1.5 h-4 w-4" /> View</Button>
                  </Link>
                  <Link href={`/write/edit?storyId=${story.id}`} passHref>
                    <Button variant="default" size="sm" className="bg-primary/90 hover:bg-primary text-primary-foreground"><Edit2 className="mr-1.5 h-4 w-4" /> Edit</Button>
                  </Link>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" onClick={() => setStoryToDelete(story)}>
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-lg shadow-sm">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-headline font-semibold mb-2">No Stories Yet</h2>
            <p className="text-muted-foreground mb-6">It looks like you haven't started any stories. <br/>Click the button above to begin your writing journey!</p>
            <Link href="/write/edit" passHref>
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
              story "{storyToDelete.title}" and all its chapters.
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
