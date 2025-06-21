
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare as MessageSquareIcon, Loader2, Edit3, Trash2, Save, MoreHorizontal } from 'lucide-react';
import type { Comment as CommentType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import Link from 'next/link';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

interface CommentProps {
  comment: CommentType;
  onReply?: (commentId: string, username: string) => void;
  allComments: CommentType[]; 
  onCommentUpdate: (commentId: string, newContent: string) => Promise<void>;
  onCommentDelete: (commentId: string) => Promise<void>;
}

function Comment({ comment, onReply, allComments, onCommentUpdate, onCommentDelete }: CommentProps) {
  const { user: currentUser } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { toast } = useToast();

  const replies = allComments
    .filter(c => c.parentId === comment.id)
    .sort((a, b) => {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return timeA - timeB;
    });

  const handleToggleReplies = () => {
    setShowReplies(prev => !prev);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(comment.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (editedContent.trim() === '') {
        toast({ title: "Cannot save empty comment", variant: "destructive" });
        return;
    }
    if (editedContent.trim() === comment.content) {
        setIsEditing(false);
        return;
    }
    setIsSavingEdit(true);
    try {
        await onCommentUpdate(comment.id, editedContent.trim());
        setIsEditing(false);
        toast({ title: "Comment updated" });
    } catch (error) {
        toast({ title: "Error updating comment", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSavingEdit(false);
    }
  };
  
  const isOwner = currentUser?.id === comment.user.id;

  return (
    <div className="flex gap-3 py-4 border-b border-border/60 last:border-b-0">
      <Avatar className="h-10 w-10">
        <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} data-ai-hint="profile person" />
        <AvatarFallback>{comment.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-foreground">{comment.user.displayName || comment.user.username}</span>
           <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {comment.timestamp instanceof Timestamp 
                  ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true })
                  : comment.timestamp ? formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true }) : 'Just now'}
            </span>
             {isOwner && !isEditing && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleEdit}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                         <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
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
              rows={3}
              className="text-sm bg-background focus:ring-primary"
              disabled={isSavingEdit}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSavingEdit}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90 mb-2 whitespace-pre-line">{comment.content}</p>
        )}

        {!isEditing && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button className="flex items-center gap-1 hover:text-primary transition-colors">
                <ThumbsUp className="h-3.5 w-3.5" /> Like ({comment.likes || 0})
            </button>
            {currentUser && onReply && (
                <button 
                onClick={() => onReply(comment.id, comment.user.displayName || comment.user.username)}
                className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                <MessageSquareIcon className="h-3.5 w-3.5" /> Reply
                </button>
            )}
            {replies.length > 0 && (
                <button onClick={handleToggleReplies} className="flex items-center gap-1 hover:text-primary transition-colors">
                {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                </button>
            )}
            </div>
        )}
        
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                <AlertDialogDescription>
                Are you sure you want to delete this comment? This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={async () => {
                        try {
                           await onCommentDelete(comment.id);
                           toast({ title: "Comment deleted" });
                        } catch (error) {
                           toast({ title: "Error deleting comment", description: (error as Error).message, variant: "destructive"});
                        }
                    }} 
                    className="bg-destructive hover:bg-destructive/90"
                >
                Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>

        {showReplies && replies.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-accent/30">
            {replies.map(reply => (
              <Comment 
                key={reply.id} 
                comment={reply} 
                onReply={onReply} 
                allComments={allComments} 
                onCommentUpdate={onCommentUpdate}
                onCommentDelete={onCommentDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentSectionProps {
  storyId: string;
  chapterId: string;
}

export default function CommentSection({ storyId, chapterId }: CommentSectionProps) {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [allComments, setAllComments] = useState<CommentType[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{id: string; username: string} | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!storyId || !chapterId) {
        setIsLoadingComments(false);
        return;
    }
    setIsLoadingComments(true);
    const commentsQuery = query(
      collection(db, 'comments'),
      where('storyId', '==', storyId),
      where('chapterId', '==', chapterId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (querySnapshot) => {
      const fetchedComments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as CommentType));
      setAllComments(fetchedComments);
      setIsLoadingComments(false);
    }, (error) => {
      console.error("Error fetching comments: ", error);
      toast({ title: "Error loading comments", description: error.message, variant: "destructive"});
      setIsLoadingComments(false);
    });

    return () => unsubscribe();
  }, [storyId, chapterId, toast]);

  const topLevelComments = allComments
    .filter(comment => !comment.parentId)
    .sort((a,b) => {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return timeB - timeA; 
    });

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || newComment.trim() === '' || !storyId || !chapterId) return;

    setIsPostingComment(true);
    const commentData: Omit<CommentType, 'id'> = {
      user: { 
        id: currentUser.id, 
        username: currentUser.username, 
        displayName: currentUser.displayName || currentUser.username,
        avatarUrl: currentUser.avatarUrl 
      },
      storyId,
      chapterId,
      parentId: replyingTo?.id || null,
      content: newComment.trim(),
      timestamp: serverTimestamp(),
      likes: 0,
    };
    
    try {
      await addDoc(collection(db, 'comments'), commentData);
      setNewComment('');
      setReplyingTo(null);
      toast({ title: "Comment posted!" });
    } catch (error) {
      console.error("Error posting comment: ", error);
      toast({ title: "Error posting comment", description: (error as Error).message, variant: "destructive"});
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({id: commentId, username});
    const textarea = document.getElementById("comment-textarea") as HTMLTextAreaElement;
    if (textarea) textarea.focus();
  };

  const handleCommentUpdate = async (commentId: string, newContent: string) => {
    const commentRef = doc(db, 'comments', commentId);
    await updateDoc(commentRef, {
      content: newContent,
    });
  };

  const handleCommentDelete = async (commentId: string) => {
    const commentRef = doc(db, 'comments', commentId);
    await deleteDoc(commentRef);
  };

  return (
    <AlertDialog>
        <section className="bg-card p-4 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xl sm:text-2xl font-headline font-semibold mb-6 text-foreground">
            Comments ({topLevelComments.length})
        </h3>
        
        {!authLoading && currentUser && (
            <form onSubmit={handleSubmitComment} className="mb-6">
            <Textarea
                id="comment-textarea"
                placeholder={replyingTo ? `Replying to ${replyingTo.username}...` : "Share your thoughts on this chapter..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] bg-background focus:ring-primary"
                rows={4}
                disabled={isPostingComment}
            />
            <div className="mt-3 flex items-center justify-between">
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isPostingComment || !newComment.trim()}>
                {isPostingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Post Comment
                </Button>
                {replyingTo && (
                <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="text-xs text-muted-foreground" disabled={isPostingComment}>
                    Cancel Reply
                </Button>
                )}
            </div>
            </form>
        )}
        {!authLoading && !currentUser && (
            <p className="text-muted-foreground text-center py-4 border rounded-md bg-background mb-6">
                Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to post a comment.
            </p>
        )}

        {isLoadingComments ? (
            <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading comments...</p>
            </div>
        ) : (
            <div className="space-y-0">
            {topLevelComments.length > 0 ? (
                topLevelComments.map(comment => (
                <Comment 
                    key={comment.id} 
                    comment={comment} 
                    onReply={handleReply} 
                    allComments={allComments}
                    onCommentUpdate={handleCommentUpdate}
                    onCommentDelete={handleCommentDelete}
                />
                ))
            ) : (
                <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to share your thoughts!</p>
            )}
            </div>
        )}
        </section>
    </AlertDialog>
  );
}
