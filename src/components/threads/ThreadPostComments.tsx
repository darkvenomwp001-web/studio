'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, EllipsisVertical, Edit3, Trash2, Save } from 'lucide-react';
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
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const OWNER_HANDLES = ['arnv'];

interface ThreadCommentProps {
    comment: CommentType;
    postId: string;
    parentCollection: string;
    onUpdate: (commentId: string, content: string) => Promise<void>;
    onDelete: (commentId: string) => Promise<void>;
}

function ThreadComment({ comment, postId, parentCollection, onUpdate, onDelete }: ThreadCommentProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);
    const [isProcessing, setIsProcessing] = useState(false);

    const isPostAuthor = user?.id === comment.user.id;
    const isAppOwner = user && OWNER_HANDLES.includes(user.username);
    const canManage = isPostAuthor || isAppOwner;

    const handleUpdate = async () => {
        if (!editedContent.trim() || editedContent === comment.content) {
            setIsEditing(false);
            return;
        }
        setIsProcessing(true);
        onUpdate(comment.id, editedContent.trim())
            .then(() => {
                setIsEditing(false);
                toast({ title: "Comment updated" });
            })
            .finally(() => setIsProcessing(false));
    };

    return (
        <div className="flex gap-3 group">
            <Link href={`/profile/${comment.user.id}`} className="flex-shrink-0">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} data-ai-hint="profile person" />
                    <AvatarFallback>{comment.user.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
                <div className="bg-muted p-3 rounded-2xl relative">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <Link href={`/profile/${comment.user.id}`} className="font-bold text-xs hover:underline truncate">
                            {comment.user.displayName || `@${comment.user.username}`}
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {comment.timestamp?.toDate ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                            </span>
                            {canManage && !isEditing && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative z-10">
                                            <EllipsisVertical className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32 rounded-xl border-border/40">
                                        <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                                            <Edit3 className="h-3 w-3" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <AlertDialogTrigger asChild>
                                                <div className="flex items-center w-full gap-2">
                                                    <Trash2 className="h-3 w-3" /> Delete
                                                </div>
                                            </AlertDialogTrigger>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                    
                    {isEditing ? (
                        <div className="space-y-2 mt-1">
                            <Textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="min-h-[60px] text-sm bg-background"
                                disabled={isProcessing}
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isProcessing}>Cancel</Button>
                                <Button size="sm" onClick={handleUpdate} disabled={isProcessing || !editedContent.trim()}>
                                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{comment.content}</p>
                    )}
                </div>
            </div>

            <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-headline text-2xl">Delete comment?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        This action cannot be undone. Your comment will be permanently removed from this thread.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        className="bg-destructive hover:bg-destructive/90 rounded-full px-8"
                        onClick={() => onDelete(comment.id).then(() => toast({ title: "Comment deleted" }))}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </div>
    );
}

interface ThreadPostCommentsProps {
    postId: string;
    parentCollection?: string;
}

export default function ThreadPostComments({ postId, parentCollection = 'feedPosts' }: ThreadPostCommentsProps) {
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
            collection(db, parentCollection, postId, 'comments'),
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
                    path: `${parentCollection}/${postId}/comments`,
                    operation: 'list',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                setIsLoadingComments(false);
            }
        );

        return () => unsubscribe();
    }, [postId, parentCollection, toast]);

    const handleSubmitComment = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser || newComment.trim() === '' || !postId) return;

        setIsPostingComment(true);
        const commentData = {
            user: { 
                id: currentUser.id, 
                username: currentUser.username, 
                displayName: currentUser.displayName || currentUser.username,
                avatarUrl: currentUser.avatarUrl 
            },
            content: newComment.trim(),
            timestamp: serverTimestamp(),
        };

        const postRef = doc(db, parentCollection, postId);
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
                path: `${parentCollection}/${postId}/comments`,
                operation: 'create',
                requestResourceData: commentData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsPostingComment(false);
        });
    };

    const handleUpdateComment = async (commentId: string, content: string) => {
        const commentRef = doc(db, parentCollection, postId, 'comments', commentId);
        updateDoc(commentRef, { content, updatedAt: serverTimestamp() })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: commentRef.path,
                    operation: 'update',
                    requestResourceData: { content },
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleDeleteComment = async (commentId: string) => {
        const postRef = doc(db, parentCollection, postId);
        const commentRef = doc(db, parentCollection, postId, 'comments', commentId);

        runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) throw "Post not found";
            
            const newCount = Math.max(0, (postDoc.data().commentsCount || 0) - 1);
            transaction.update(postRef, { commentsCount: newCount });
            transaction.delete(commentRef);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: commentRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
    };
    
    return (
        <AlertDialog>
            <div className="flex flex-col h-[60vh]">
                <ScrollArea className="flex-grow pr-4 -mr-4">
                    <div className="space-y-6">
                        {isLoadingComments ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : comments.length > 0 ? (
                            comments.map(comment => (
                                <ThreadComment 
                                    key={comment.id} 
                                    comment={comment} 
                                    postId={postId}
                                    parentCollection={parentCollection}
                                    onUpdate={handleUpdateComment}
                                    onDelete={handleDeleteComment}
                                />
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-12 text-sm italic">
                                The conversation hasn't started yet. Be the first to chime in!
                            </p>
                        )}
                    </div>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t">
                    {!authLoading && currentUser ? (
                        <form onSubmit={handleSubmitComment} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 border shadow-sm">
                            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} data-ai-hint="profile person" />
                            <AvatarFallback>{currentUser.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                            <Textarea
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="min-h-[20px] text-sm rounded-xl focus-visible:ring-primary shadow-inner"
                                rows={1}
                                disabled={isPostingComment}
                            />
                            <Button type="submit" size="icon" className="rounded-full flex-shrink-0 shadow-lg shadow-primary/20" disabled={isPostingComment || !newComment.trim()}>
                                {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                        </form>
                    ) : (
                        <p className="text-muted-foreground text-center text-sm py-2">
                            <Link href="/auth/signin" className="text-primary font-bold hover:underline">Sign in</Link> to join the conversation.
                        </p>
                    )}
                </div>
            </div>
        </AlertDialog>
    );
}