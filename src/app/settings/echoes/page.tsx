
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Star, TrendingUp, MessageSquare, Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Story, Comment as CommentType } from '@/types';
import Link from 'next/link';

interface VotedChapter {
    storyId: string;
    storyTitle: string;
    chapterId: string;
    chapterTitle: string;
    votes: number;
}

export default function EchoesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [mostVotedChapter, setMostVotedChapter] = useState<VotedChapter | null>(null);
  const [recentComments, setRecentComments] = useState<CommentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        if (!authLoading) setIsLoading(false);
        return;
    }
    setIsLoading(true);

    // Fetch user's stories to find most voted chapter
    const storiesQuery = query(collection(db, 'stories'), where('author.id', '==', user.id));
    const unsubStories = onSnapshot(storiesQuery, (snapshot) => {
        let topChapter: VotedChapter | null = null;
        snapshot.docs.forEach(doc => {
            const story = { id: doc.id, ...doc.data() } as Story;
            story.chapters?.forEach(chapter => {
                if (chapter.votes && (!topChapter || chapter.votes > topChapter.votes)) {
                    topChapter = {
                        storyId: story.id,
                        storyTitle: story.title,
                        chapterId: chapter.id,
                        chapterTitle: chapter.title,
                        votes: chapter.votes,
                    };
                }
            });
        });
        setMostVotedChapter(topChapter);
        if (isLoading) setIsLoading(false);
    }, (error) => {
      console.error("Error fetching stories for echoes:", error);
      if (isLoading) setIsLoading(false);
    });

    // Fetch user's recent comments
    const commentsQuery = query(
      collection(db, 'comments'), 
      where('user.id', '==', user.id), 
      orderBy('timestamp', 'desc'), 
      limit(3)
    );
    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType));
        setRecentComments(comments);
    });

    return () => {
        unsubStories();
        unsubComments();
    };

  }, [user, authLoading]);

  if (authLoading) {
     return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <Sparkles className="h-8 w-8" /> Echoes
        </h1>
        <p className="text-muted-foreground">Rediscover your journey and impact on the community.</p>
      </header>

      {isLoading ? (
         <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        Your Most Voted Chapter
                    </CardTitle>
                    <CardDescription>A look back at the chapter that resonated most with readers.</CardDescription>
                </CardHeader>
                <CardContent>
                    {mostVotedChapter ? (
                        <div className="space-y-3">
                            <h4 className="font-bold text-lg text-primary">{mostVotedChapter.chapterTitle}</h4>
                            <p className="text-sm text-muted-foreground">in "{mostVotedChapter.storyTitle}"</p>
                            <div className="flex items-center gap-2 text-xl font-bold">
                                <Star className="h-5 w-5 text-yellow-400" />
                                {mostVotedChapter.votes} Votes
                            </div>
                            <Link href={`/stories/${mostVotedChapter.storyId}/read/${mostVotedChapter.chapterId}`}>
                               <Button variant="outline" size="sm"><BookOpen className="mr-2 h-4 w-4"/>Read Chapter</Button>
                            </Link>
                        </div>
                    ) : (
                       <p className="text-sm text-muted-foreground p-8 bg-muted/50 rounded-md text-center">No votes on any chapters yet.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Follower Milestones
                    </CardTitle>
                    <CardDescription>Celebrate the moments your community grew.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                         <p className="text-sm text-muted-foreground">You currently have</p>
                        <div className="flex items-center gap-2 text-xl font-bold">
                           <TrendingUp className="h-5 w-5 text-green-400" />
                           {user?.followersCount || 0} Followers
                        </div>
                        <p className="text-xs text-muted-foreground pt-4">Historical milestone tracking coming soon!</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        A Look Back at Your Comments
                    </CardTitle>
                    <CardDescription>Rediscover the conversations and moments you were a part of.</CardDescription>
                </CardHeader>
                <CardContent>
                   {recentComments.length > 0 ? (
                    <div className="space-y-3">
                        {recentComments.map(comment => (
                            <div key={comment.id} className="p-3 bg-muted/50 rounded-md">
                                <p className="text-sm text-foreground/80 line-clamp-2">"{comment.content}"</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Commented on <Link href={`/stories/${comment.storyId}`} className="text-primary hover:underline">a story</Link>
                                </p>
                            </div>
                        ))}
                    </div>
                   ) : (
                    <p className="text-sm text-muted-foreground p-8 bg-muted/50 rounded-md text-center">You haven't made any comments yet.</p>
                   )}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
