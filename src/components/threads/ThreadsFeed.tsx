
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { ThreadPost } from '@/types';
import { Loader2 } from 'lucide-react';
import CreatePostForm from './CreatePostForm';
import ThreadPostCard from './ThreadPostCard';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function ThreadsFeed() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Community feed shows all posts in chronological order
    const postsQuery = query(
        collection(db, 'feedPosts'), 
        orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      postsQuery, 
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadPost));
        setPosts(fetchedPosts);
        setIsLoading(false);
      }, 
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'feedPosts',
          operation: 'list',
        } satisfies SecurityRuleContext);
        
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {user && <CreatePostForm />}
      
      {isLoading ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div className="space-y-6">
            {posts.map(post => <ThreadPostCard key={post.id} post={post} />)}
            
            {posts.length === 0 && (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-dashed border-border/60">
                    <p className="text-lg font-medium text-foreground">The feed is quiet...</p>
                    <p className="text-sm">Be the first to share an update with the community!</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
