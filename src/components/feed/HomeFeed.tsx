'use client';

import { useEffect, useState } from 'react';
import type { User, FeedPost } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import FeedPostCard from './FeedPostCard';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function HomeFeed({ user }: { user: User }) {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedError, setFeedError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // New, simpler query for a global public feed
    const q = query(
      collection(db, 'feedPosts'),
      orderBy('timestamp', 'desc'),
      limit(50) // Limit to the 50 most recent posts
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
      setFeedPosts(posts);
      setFeedError(null);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching global feed:", error);
      setFeedError(error);
      setIsLoading(false);
    });

    return () => unsubscribe();

  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading the feed...</span>
      </div>
    );
  }
  
  if (feedError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Live Feed Error</AlertTitle>
        <AlertDescription>
          Your feed could not be loaded. This is often because a one-time database setup is required.
          <p className="mt-2 font-semibold">Please open your browser's developer console (F12), look for an error message from Firebase, and click the link provided to create the necessary database index.</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-lg shadow-sm">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-headline font-semibold mb-2">The Feed is Empty</h2>
        <p className="text-muted-foreground">
          Be the first one to post something!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {feedPosts.map(post => (
        <FeedPostCard key={post.id} post={post} currentUser={user} />
      ))}
    </div>
  );
}
