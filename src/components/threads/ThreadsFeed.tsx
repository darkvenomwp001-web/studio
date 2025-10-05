
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2 } from 'lucide-react';
import CreatePostForm from './CreatePostForm';
import ThreadPostCard from './ThreadPostCard';

const HIDDEN_POSTS_SESSION_KEY = 'hiddenThreadPosts';

export default function ThreadsFeed() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);

  useEffect(() => {
    // Load hidden posts from session storage on component mount
    const storedHiddenPosts = sessionStorage.getItem(HIDDEN_POSTS_SESSION_KEY);
    if (storedHiddenPosts) {
      setHiddenPostIds(JSON.parse(storedHiddenPosts));
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const postsQuery = query(
        collection(db, 'feedPosts'), 
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

  const handleHidePost = (postId: string) => {
    const newHiddenIds = [...hiddenPostIds, postId];
    setHiddenPostIds(newHiddenIds);
    sessionStorage.setItem(HIDDEN_POSTS_SESSION_KEY, JSON.stringify(newHiddenIds));
  };
  
  const visiblePosts = posts.filter(post => !hiddenPostIds.includes(post.id));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {user && !user.isAnonymous && <CreatePostForm />}
      
      {isLoading ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        visiblePosts.map(post => <ThreadPostCard key={post.id} post={post} onHide={handleHidePost} />)
      )}

      {!isLoading && visiblePosts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No posts in the thread yet. Be the first to start a conversation!</p>
        </div>
      )}
    </div>
  );
}
