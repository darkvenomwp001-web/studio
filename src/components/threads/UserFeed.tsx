'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2 } from 'lucide-react';
import ThreadPostCard from './ThreadPostCard';

interface UserFeedProps {
    userId: string;
}

export default function UserFeed({ userId }: UserFeedProps) {
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const postsQuery = query(
        collection(db, 'feedPosts'),
        where('author.id', '==', userId),
        orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadPost));
      setPosts(fetchedPosts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user feed posts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </div>
    );
  }
  
  if(posts.length === 0) {
      return (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
              <p>This user hasn't posted anything yet.</p>
          </div>
      )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {posts.map(post => <ThreadPostCard key={post.id} post={post} />)}
    </div>
  );
}
