'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Loader2 } from 'lucide-react';
import StoryViewer from './StoryViewer';
import type { UserStory } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, Timestamp, getDocs, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GroupedStories {
  [userId: string]: {
    userId: string;
    username: string;
    userAvatarUrl: string;
    stories: UserStory[];
  };
}

export default function StoryBubbles() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [groupedStories, setGroupedStories] = useState<GroupedStories>({});
  
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedUserStories, setSelectedUserStories] = useState<UserStory[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchStories = async () => {
      setIsLoading(true);
      try {
        const followingList = user.followingIds || [];
        // User can always see their own stories
        const authorsToFetch = Array.from(new Set([user.id, ...followingList]));

        if (authorsToFetch.length === 0) {
          setIsLoading(false);
          return;
        }

        const now = Timestamp.now();
        const storiesQuery = query(
          collection(db, 'userStories'),
          where('userId', 'in', authorsToFetch),
          where('expiresAt', '>', now),
          orderBy('expiresAt', 'desc')
        );
        const storiesSnap = await getDocs(storiesQuery);

        const fetchedStories = storiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserStory));
        
        const grouped: GroupedStories = {};
        fetchedStories.forEach(story => {
          if (!grouped[story.userId]) {
            grouped[story.userId] = {
              userId: story.userId,
              username: story.username,
              userAvatarUrl: story.userAvatarUrl,
              stories: []
            };
          }
          grouped[story.userId].stories.push(story);
          // Sort stories by creation date, oldest first, for correct viewing order
          grouped[story.userId].stories.sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis());
        });
        setGroupedStories(grouped);

      } catch (error: any) {
        console.error("Error fetching user stories:", error);
        toast({ title: 'Error', description: `Could not load stories. (${error.message})`, variant: 'destructive'});
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, [user, authLoading, toast]);
  
  const handleBubbleClick = (userId: string) => {
    if(groupedStories[userId]) {
        setSelectedUserStories(groupedStories[userId].stories);
        setViewerOpen(true);
    }
  };

  const storyGroups = Object.values(groupedStories);

  if (isLoading || authLoading) {
    return (
      <div className="h-[92px] flex items-center space-x-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary"/>
        <p className="text-muted-foreground">Loading stories...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Don't show component if user is not logged in
  }
  
  return (
    <>
      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex space-x-4 p-2">
            {/* Add Story Bubble */}
            <Link href="/stories/create" passHref>
                <div className="text-center w-16 cursor-pointer group">
                    <div className="h-16 w-16 rounded-full bg-muted/60 border-2 border-dashed border-primary/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground truncate mt-1">Add Story</p>
                </div>
            </Link>

            {/* Stories from followed users */}
            {storyGroups.map(group => (
                 <div key={group.userId} className="text-center w-16 cursor-pointer group" onClick={() => handleBubbleClick(group.userId)}>
                    <div className="h-16 w-16 p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 group-hover:scale-105 transition-transform">
                       <div className="bg-background p-0.5 rounded-full h-full w-full">
                         <Image
                            src={group.userAvatarUrl || 'https://placehold.co/100x100.png'}
                            alt={group.username}
                            width={60}
                            height={60}
                            className="rounded-full object-cover"
                            data-ai-hint="profile person"
                         />
                       </div>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate mt-1">{group.username}</p>
                 </div>
            ))}
        </div>
      </ScrollArea>
      {viewerOpen && <StoryViewer stories={selectedUserStories} onClose={() => setViewerOpen(false)} />}
    </>
  );
}
