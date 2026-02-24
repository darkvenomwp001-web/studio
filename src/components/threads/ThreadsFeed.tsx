
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2 } from 'lucide-react';
import CreatePostForm from './CreatePostForm';
import ThreadPostCard from './ThreadPostCard';

const OWNER_USERNAME = 'authorrafaelnv';

export default function ThreadsFeed() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = user?.username === OWNER_USERNAME;

  useEffect(() => {
    setIsLoading(true);
    
    // Main feed now only shows posts from the owner
    const postsQuery = query(
        collection(db, 'feedPosts'), 
        where('author.username', '==', OWNER_USERNAME),
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
      {/* Only the owner can post to the feed now */}
      {isOwner && <CreatePostForm />}
      
      {isLoading ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div className="space-y-6">
            {posts.map(post => <ThreadPostCard key={post.id} post={post} />)}
            
            {posts.length === 0 && (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-lg border border-dashed">
                <p className="text-lg font-medium text-foreground">No announcements yet.</p>
                <p className="text-sm">Stay tuned for updates from the author.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
