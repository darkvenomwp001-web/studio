'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateStoryDialog from './CreateStoryDialog';
import StoryViewer from './StoryViewer';
import type { UserStory, UserSummary } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

interface GroupedStory {
  author: UserSummary;
  stories: UserStory[];
}

export default function StoryTray() {
  const { user, loading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setIsLoadingStories(false);
      return;
    }

    const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    // For this app, we'll just show stories from people the user follows + their own stories
    const followingIds = user.followingIds || [];
    const idsToQuery = Array.from(new Set([...followingIds, user.id]));
    
    // Firestore 'in' query has a limit of 30. Slice if needed.
    const queryIds = idsToQuery.length > 0 ? idsToQuery.slice(0, 30) : [user.id];

    if (queryIds.length === 0) {
        setIsLoadingStories(false);
        return;
    }

    const q = query(
      collection(db, 'userStories'),
      where('authorId', 'in', queryIds),
      where('createdAt', '>=', twentyFourHoursAgo),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as UserStory));
      setStories(fetchedStories);
      setIsLoadingStories(false);
    }, (error) => {
        console.error("Error fetching user stories:", error);
        setIsLoadingStories(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  const groupedStories = useMemo(() => {
    const groups: { [key: string]: GroupedStory } = {};
    stories.forEach(story => {
      if (!groups[story.author.id]) {
        groups[story.author.id] = {
          author: story.author,
          stories: [],
        };
      }
      groups[story.author.id].stories.push(story);
    });
    // Ensure newest stories for each user are first
    Object.values(groups).forEach(group => {
        group.stories.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    });
    // Sort groups by the latest story in each group
    return Object.values(groups).sort((a, b) => 
        b.stories[0].createdAt.toMillis() - a.stories[0].createdAt.toMillis()
    );
  }, [stories]);

  const handleAvatarClick = (index: number) => {
    setStartIndex(index);
    setIsViewerOpen(true);
  };
  
  if (!user) {
    return null; // Don't show the tray if not logged in
  }

  return (
    <>
      <div className="w-full border-b pb-3">
        <div className="flex overflow-x-auto space-x-4 py-2 px-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="text-center w-16 flex-shrink-0"
          >
            <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-primary">
                <PlusCircle className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium truncate">Add Story</span>
            </div>
          </button>
          
          {isLoadingStories ? (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            groupedStories.map((group, index) => (
              <button key={group.author.id} onClick={() => handleAvatarClick(index)} className="flex-shrink-0 w-16 text-center group">
                <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-pink-500 via-red-500 group-hover:scale-105 transition-transform">
                  <div className="bg-background p-0.5 rounded-full h-full w-full">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={group.author.avatarUrl} alt={group.author.username} data-ai-hint="profile person" />
                      <AvatarFallback>{group.author.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground truncate mt-1 group-hover:text-primary">{group.author.displayName || group.author.username}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <CreateStoryDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

      {isViewerOpen && (
        <StoryViewer
          groupedStories={groupedStories}
          startIndex={startIndex}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}
