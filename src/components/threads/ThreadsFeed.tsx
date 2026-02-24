
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2 } from 'lucide-react';
import CreatePostForm from './CreatePostForm';
import ThreadPostCard from './ThreadPostCard';

// Setting a reset date to clean the feed of old test posts
const FEED_RESET_DATE = new Date('2025-05-21T00:00:00Z');

export default function ThreadsFeed() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Only fetch posts created after the reset date to provide a clean feed
    const postsQuery = query(
        collection(db, 'feedPosts'), 
        where('timestamp', '>', Timestamp.fromDate(FEED_RESET_DATE)),
        orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadPost));
      setPosts(fetchedPosts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching feed posts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {user && !user.isAnonymous && <CreatePostForm />}
      
      {isLoading ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        posts.map(post => <ThreadPostCard key={post.id} post={post} />)
      )}

      {!isLoading && posts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-lg border border-dashed">
          <p className="text-lg font-medium text-foreground">Your feed is clean!</p>
          <p className="text-sm">Be the first to start a fresh conversation and bring this space to life.</p>
        </div>
      )}
    </div>
  );
}
