
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare as MessageSquareIcon, Loader2 } from 'lucide-react';
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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import Link from 'next/link';

interface CommentProps {
  comment: CommentType;
  onReply?: (commentId: string, username: string) => void;
  allComments: CommentType[]; // Pass all comments for finding replies
}

function Comment({ comment, onReply, allComments }: CommentProps) {
  const { user: currentUser } = useAuth();
  const [showReplies, setShowReplies] = useState(false);

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

  return (
    <div className="flex gap-3 py-4 border-b border-border/60 last:border-b-0">
      <Avatar className="h-10 w-10">
        <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} data-ai-hint="profile person" />
        <AvatarFallback>{comment.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-foreground">{comment.user.displayName || comment.user.username}</span>
          <span className="text-xs text-muted-foreground">
            {comment.timestamp instanceof Timestamp 
                ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true })
                : comment.timestamp ? formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true }) : 'Just now'}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mb-2 whitespace-pre-line">{comment.content}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
        {showReplies && replies.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-accent/30">
            {replies.map(reply => (
              <Comment key={reply.id} comment={reply} onReply={onReply} allComments={allComments} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentSectionProps {
  storyId: string;
  chapterId?: string;
}

export default function CommentSection({ storyId, chapterId }: CommentSectionProps) {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [allComments, setAllComments] = useState<CommentType[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{id: string; username: string} | null>(null);

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
      orderBy('timestamp', 'asc') // Fetch all, sort by oldest first to build tree, then reverse for display
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
      // Consider adding a toast message here for the user
      setIsLoadingComments(false);
    });

    return () => unsubscribe();
  }, [storyId, chapterId]);

  const topLevelComments = allComments
    .filter(comment => !comment.parentId)
    .sort((a,b) => {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return timeB - timeA; // Newest top-level comments first
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
    } catch (error) {
      console.error("Error posting comment: ", error);
      // Add toast notification for error
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({id: commentId, username});
    const textarea = document.getElementById("comment-textarea") as HTMLTextAreaElement;
    if (textarea) textarea.focus();
  };

  return (
    <section className="mt-10 bg-card p-4 sm:p-6 rounded-lg shadow-md">
      <h3 className="text-xl sm:text-2xl font-headline font-semibold mb-6 text-foreground">
        Interactive Comments ({topLevelComments.length})
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
              <Comment key={comment.id} comment={comment} onReply={handleReply} allComments={allComments} />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      )}
    </section>
  );
}
