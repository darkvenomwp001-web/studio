
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateStoryDialog from './CreateStoryDialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, limit, getDoc, doc } from 'firebase/firestore';
import type { UserStory, UserSummary } from '@/types';

export default function StoryTray() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const [storyAuthors, setStoryAuthors] = useState<UserSummary[]>([]);

  useEffect(() => {
    // This simplified query fetches the 30 most recent stories.
    // It does NOT require a composite index.
    const q = query(
        collection(db, 'userStories'),
        orderBy('createdAt', 'desc'),
        limit(30) // Limit to a reasonable number to avoid fetching too much data
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        const now = new Date();
        const allFetchedStories = snapshot.docs.map(doc => doc.data() as UserStory);

        // Client-side filtering: only show stories that have not expired.
        const validStories = allFetchedStories.filter(story => {
            if (!story.expiresAt) return false;
            // Convert Firestore Timestamp to JS Date for comparison
            const expires = (story.expiresAt as Timestamp).toDate(); 
            return expires > now;
        });

        const uniqueAuthorIds = [...new Set(validStories.map(story => story.authorId))];

        if (uniqueAuthorIds.length > 0) {
            const authorPromises = uniqueAuthorIds.map(id => getDoc(doc(db, 'users', id)));
            const authorDocs = await Promise.all(authorPromises);
            
            const authors = authorDocs
                .filter(docSnap => docSnap.exists())
                .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as UserSummary));
            
            setStoryAuthors(authors);
        } else {
            setStoryAuthors([]);
        }
    }, (error) => {
        console.error("Error fetching stories for tray:", error);
        if (error.code === 'permission-denied') {
             toast({
                title: "Error Loading Stories",
                description: "Permission denied. Please ensure your firestore.rules are set up correctly to allow reads on the 'userStories' collection.",
                variant: "destructive",
                duration: 10000,
            });
        }
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddStoryClick = () => {
    if (user) {
      setIsCreateDialogOpen(true);
    } else {
      toast({
        title: "Please Sign In",
        description: "You need to be logged in to post a story.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="w-full border-b pb-3">
        <div className="flex overflow-x-auto space-x-4 py-2 px-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
          {/* Button to add a new story */}
          <button
            onClick={handleAddStoryClick}
            className="text-center w-16 flex-shrink-0"
            aria-label="Add a new story"
          >
            <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-primary">
                <PlusCircle className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium truncate">Add Story</span>
            </div>
          </button>
          
          {/* Real user avatars with stories */}
          {storyAuthors.map((storyAuthor) => (
            <Link 
              key={storyAuthor.id}
              href={`/stories/view/${storyAuthor.id}`}
              className="flex-shrink-0 w-16 text-center group"
              aria-label={`View ${storyAuthor.displayName || storyAuthor.username}'s story`}
            >
              <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-pink-500 via-red-500 group-hover:scale-105 transition-transform">
                <div className="bg-background p-0.5 rounded-full h-full w-full">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={storyAuthor.avatarUrl} alt={storyAuthor.username} data-ai-hint={'profile person'} />
                    <AvatarFallback>{(storyAuthor.displayName || storyAuthor.username).substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground truncate mt-1 group-hover:text-primary">{storyAuthor.displayName || storyAuthor.username}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* The dialog for creating a real story */}
      <CreateStoryDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </>
  );
}
