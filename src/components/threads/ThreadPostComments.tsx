
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import type { Comment as CommentType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  runTransaction,
} from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface ThreadPostCommentsProps {
    postId: string;
}

export default function ThreadPostComments({ postId }: ThreadPostCommentsProps) {
    const { user: currentUser, loading: authLoading } = useAuth();
    const [newComment, setNewComment] = useState('');
    const [comments, setComments] = useState<CommentType[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!postId) {
            setIsLoadingComments(false);
            return;
        }
        setIsLoadingComments(true);
        const commentsQuery = query(
            collection(db, 'feedPosts', postId, 'comments'),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(
            commentsQuery, 
            (querySnapshot) => {
                const fetchedComments = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as CommentType));
                setComments(fetchedComments);
                setIsLoadingComments(false);
            }, 
            async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: `feedPosts/${postId}/comments`,
                    operation: 'list',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                setIsLoadingComments(false);
            }
        );

        return () => unsubscribe();
    }, [postId, toast]);

    const handleSubmitComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser || newComment.trim() === '' || !postId) return;

        setIsPostingComment(true);
        const commentData: Omit<CommentType, 'id' | 'storyId' | 'chapterId'> = {
            user: { 
                id: currentUser.id, 
                username: currentUser.username, 
                displayName: currentUser.displayName || currentUser.username,
                avatarUrl: currentUser.avatarUrl 
            },
            content: newComment.trim(),
            timestamp: serverTimestamp(),
        };

        const postRef = doc(db, 'feedPosts', postId);
        const commentsRef = collection(postRef, 'comments');
        
        runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw "Post does not exist.";
            }
            const newCommentsCount = (postDoc.data().commentsCount || 0) + 1;
            transaction.update(postRef, { commentsCount: newCommentsCount });
            transaction.set(doc(commentsRef), commentData);
        })
        .then(() => {
            setNewComment('');
            toast({ title: "Comment posted!" });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: `feedPosts/${postId}/comments`,
                operation: 'create',
                requestResourceData: commentData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsPostingComment(false);
        });
    };
    
    return (
        <div className="flex flex-col h-[60vh]">
            <ScrollArea className="flex-grow pr-4 -mr-4">
                <div className="space-y-4">
                    {isLoadingComments ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : comments.length > 0 ? (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <Link href={`/profile/${comment.user.id}`}>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} data-ai-hint="profile person" />
                                        <AvatarFallback>{comment.user.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className="flex-1 bg-muted p-3 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <Link href={`/profile/${comment.user.id}`} className="font-semibold text-sm text-foreground hover:underline">{comment.user.displayName || comment.user.username}</Link>
                                        <span className="text-xs text-muted-foreground">
                                            {comment.timestamp?.toDate ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-sm mt-1">{comment.content}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center py-8 text-sm">No comments yet. Be the first!</p>
                    )}
                </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t">
                {!authLoading && currentUser ? (
                    <form onSubmit={handleSubmitComment} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} data-ai-hint="profile person" />
                        <AvatarFallback>{currentUser.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                        <Textarea
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[20px] text-sm"
                            rows={1}
                            disabled={isPostingComment}
                        />
                        <Button type="submit" size="icon" disabled={isPostingComment || !newComment.trim()}>
                            {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                    </form>
                ) : (
                    <p className="text-muted-foreground text-center text-sm">
                        <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link> to join the conversation.
                    </p>
                )}
            </div>
        </div>
    );
}
