
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LiveFeedPost } from '@/types';
import { updateLiveFeedPost } from '@/app/actions/liveFeedActions';

export default function EditLiveFeedPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;

  const [post, setPost] = useState<LiveFeedPost | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    if (!postId) {
      toast({ title: "Error", description: "Post ID is missing.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchPost = async () => {
      setIsLoading(true);
      const postRef = doc(db, 'liveFeed', postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const postData = { id: postSnap.id, ...postSnap.data() } as LiveFeedPost;
        if (postData.authorId !== user.id) {
          toast({ title: "Unauthorized", description: "You don't have permission to edit this post.", variant: "destructive" });
          router.push('/');
          return;
        }
        setPost(postData);
        setContent(postData.content);
      } else {
        toast({ title: "Post not found", variant: "destructive" });
        router.push('/');
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [postId, user, authLoading, router, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !post) return;
    setIsSubmitting(true);

    const result = await updateLiveFeedPost(post.id, content, user.id);

    if (result.success) {
      toast({ title: "Post Updated!" });
      router.push('/');
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return null; // The useEffect hook handles redirection
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <header className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Feed
        </Button>
      </header>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Edit Post</CardTitle>
            <CardDescription>Make changes to your post. Image editing is not yet supported.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Your post content..."
              className="min-h-[200px] text-base"
              maxLength={500}
              disabled={isSubmitting}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
