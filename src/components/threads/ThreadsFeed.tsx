'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2 } from 'lucide-react';
import CreatePostForm from './CreatePostForm';
import ThreadPostCard from './ThreadPostCard';

const OWNER_USERNAMES = ['authorrafaelnv', 'd4rkv3nom'];

export default function ThreadsFeed() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = user && OWNER_USERNAMES.includes(user.username);

  useEffect(() => {
    setIsLoading(true);
    
    // Main feed shows posts from any of the official handles
    const postsQuery = query(
        collection(db, 'feedPosts'), 
        where('author.username', 'in', OWNER_USERNAMES),
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
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {isOwner && <CreatePostForm />}
      
      {isLoading ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div className="space-y-6">
            {posts.map(post => <ThreadPostCard key={post.id} post={post} />)}
            
            {posts.length === 0 && (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-dashed border-border/60">
                    <p className="text-lg font-medium text-foreground">No announcements yet.</p>
                    <p className="text-sm">Stay tuned for official updates.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
