
'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { placeholderComments, placeholderUsers } from '@/lib/placeholder-data';
import type { Comment as CommentType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

interface CommentProps {
  comment: CommentType;
  onReply?: (commentId: string, username: string) => void;
}

function Comment({ comment, onReply }: CommentProps) {
  const { user: currentUser } = useAuth(); // Get current user
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
            {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mb-2 whitespace-pre-line">{comment.content}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-primary transition-colors">
            <ThumbsUp className="h-3.5 w-3.5" /> Like ({comment.likes || 0})
          </button>
          {currentUser && onReply && ( // Only show reply if user is logged in
            <button 
              onClick={() => onReply(comment.id, comment.user.displayName || comment.user.username)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Reply
            </button>
          )}
        </div>
        {/* Recursive rendering for replies */}
        {placeholderComments.filter(c => c.parentId === comment.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(reply => (
             <div key={reply.id} className="mt-3 pl-4 border-l-2 border-accent/30">
                 <Comment comment={reply} onReply={onReply} />
             </div>
        ))}
      </div>
    </div>
  );
}


interface CommentSectionProps {
  storyId: string;
  chapterId?: string;
}

export default function CommentSection({ storyId, chapterId }: CommentSectionProps) {
  const { user: currentUser, loading: authLoading } = useAuth(); // Get current user and loading state
  const [newComment, setNewComment] = useState('');
  // Filter comments based on storyId AND chapterId, and ensure they are top-level
  const [comments, setComments] = useState<CommentType[]>(
    placeholderComments
      .filter(c => c.storyId === storyId && c.chapterId === chapterId && !c.parentId)
      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort newest first
  );
  const [replyingTo, setReplyingTo] = useState<{id: string; username: string} | null>(null);


  const handleSubmitComment = () => {
    if (!currentUser || newComment.trim() === '') return;

    const commentToAdd: CommentType = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
      user: { 
        id: currentUser.id, 
        username: currentUser.username, 
        displayName: currentUser.displayName || currentUser.username,
        avatarUrl: currentUser.avatarUrl 
      },
      storyId,
      chapterId, // Ensure chapterId is associated
      parentId: replyingTo?.id || undefined,
      content: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
    };
    
    // Add to placeholderComments (global for mock)
    placeholderComments.push(commentToAdd);

    // Update local state
    if (replyingTo) {
        // For simplicity in mock, we'll just re-filter. A real app would update nested structures.
        setComments(
            placeholderComments
                .filter(c => c.storyId === storyId && c.chapterId === chapterId && !c.parentId)
                .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
    } else {
        setComments(prev => [commentToAdd, ...prev]); // Add to top for immediate visibility
    }

    setNewComment('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({id: commentId, username});
    // Potentially focus the textarea here
    const textarea = document.getElementById("comment-textarea") as HTMLTextAreaElement;
    if (textarea) textarea.focus();
  };

  return (
    <section className="mt-10 bg-card p-4 sm:p-6 rounded-lg shadow-md">
      <h3 className="text-xl sm:text-2xl font-headline font-semibold mb-6 text-foreground">
        Interactive Comments ({comments.length})
      </h3>
      
      {!authLoading && currentUser && ( // Only show comment box if user is logged in
        <div className="mb-6">
          <Textarea
            id="comment-textarea"
            placeholder={replyingTo ? `Replying to ${replyingTo.username}...` : "Share your thoughts on this chapter..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] bg-background focus:ring-primary"
            rows={4}
          />
          {replyingTo && (
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="mt-2 text-xs text-muted-foreground">
                  Cancel Reply
              </Button>
          )}
          <Button onClick={handleSubmitComment} className="mt-3 bg-primary hover:bg-primary/90">
            Post Comment
          </Button>
        </div>
      )}
      {!authLoading && !currentUser && (
         <p className="text-muted-foreground text-center py-4 border rounded-md bg-background">
            Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to post a comment.
        </p>
      )}


      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map(comment => (
            <Comment key={comment.id} comment={comment} onReply={handleReply}/>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </section>
  );
}
