
'use client';

import { useEffect, useState } from 'react';
import type { User, FeedPost } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Loader2, Users } from 'lucide-react';
import FeedPostCard from './FeedPostCard';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function HomeFeed({ user }: { user: User }) {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // If the user isn't following anyone, there's nothing to query.
    if (!user.followingIds || user.followingIds.length === 0) {
      setIsLoading(false);
      return;
    }
    
    // Note: Firestore 'in' queries are limited to 30 items in the array.
    // For this app's scope, we'll slice to the most recent 30 follows if necessary.
    const followedAuthors = user.followingIds.slice(0, 30);

    const q = query(
      collection(db, 'feedPosts'),
      where('authorId', 'in', followedAuthors),
      orderBy('timestamp', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
      setFeedPosts(posts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching feed:", error);
       if (error.code === 'failed-precondition') {
        toast({
          title: "Database Index Required for Live Feed",
          description: "Your Live Feed needs a special database index to work. Please check your browser's developer console (F12) for a link to create it in Firebase. This is an expected, one-time setup step.",
          variant: "destructive",
          duration: 20000,
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();

  }, [user.followingIds, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading your feed...</span>
      </div>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-lg shadow-sm">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-headline font-semibold mb-2">Your Feed is Quiet</h2>
        <p className="text-muted-foreground">
          Follow some authors to see their updates and posts here.
          <br/>
          <Link href="/stories" passHref>
             <span className='text-primary hover:underline cursor-pointer'>Explore stories and find authors to follow.</span>
          </Link>
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
