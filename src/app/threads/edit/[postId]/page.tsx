
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ThreadPost } from '@/types';
import { Loader2, ArrowLeft, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { updateThreadPost } from '@/app/actions/threadActions';

export default function EditThreadPostPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const postId = params.postId as string;

    const [post, setPost] = useState<ThreadPost | null>(null);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSavingTransition] = useTransition();

    useEffect(() => {
        if (!postId) {
            router.push('/');
            return;
        }

        const fetchPost = async () => {
            const postRef = doc(db, 'feedPosts', postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                const postData = { id: postSnap.id, ...postSnap.data() } as ThreadPost;
                
                // Security check: ensure the current user is the author
                if (authLoading) return; // Wait for auth to finish
                if (postData.author.id !== user?.id) {
                    toast({ title: 'Access Denied', description: 'You do not have permission to edit this post.', variant: 'destructive'});
                    router.push('/');
                    return;
                }
                
                setPost(postData);
                setContent(postData.content);
            } else {
                toast({ title: 'Post not found', variant: 'destructive'});
                router.push('/');
            }
            setIsLoading(false);
        };

        fetchPost();

    }, [postId, user, authLoading, router, toast]);

    const handleSaveChanges = () => {
        if (!post || !user) return;
        startSavingTransition(async () => {
            const result = await updateThreadPost(post.id, content, user.id);
            if (result.success) {
                toast({ title: 'Post Updated!' });
                router.push('/');
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!post) {
         return (
             <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <Info className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
                <p className="text-muted-foreground mb-6">The post you are trying to edit does not exist or has been removed.</p>
                <Button variant="outline" onClick={() => router.push('/')}>Go to Home</Button>
            </div>
         );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <header>
                <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-3xl font-headline font-bold text-primary">Edit Post</h1>
            </header>

            <Card>
                <CardContent className="p-4">
                     <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Your thoughts..."
                        className="min-h-[200px] text-base border-0 focus-visible:ring-0 p-1 shadow-none"
                    />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button onClick={handleSaveChanges} disabled={isSaving || content === post.content}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
