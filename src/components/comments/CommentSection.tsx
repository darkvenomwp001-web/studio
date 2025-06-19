'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { placeholderComments, placeholderUsers } from '@/lib/placeholder-data';
import type { Comment as CommentType } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface CommentProps {
  comment: CommentType;
  onReply?: (commentId: string) => void;
}

function Comment({ comment, onReply }: CommentProps) {
  return (
    <div className="flex gap-3 py-4 border-b border-border/60 last:border-b-0">
      <Avatar className="h-10 w-10">
        <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} data-ai-hint="profile person" />
        <AvatarFallback>{comment.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-foreground">{comment.user.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mb-2 whitespace-pre-line">{comment.content}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-primary transition-colors">
            <ThumbsUp className="h-3.5 w-3.5" /> Like ({comment.likes || 0})
          </button>
          {onReply && (
            <button 
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Reply
            </button>
          )}
        </div>
        {/* Placeholder for replies */}
        {placeholderComments.filter(c => c.parentId === comment.id).map(reply => (
             <div key={reply.id} className="mt-3 pl-4 border-l-2 border-accent/30">
                 <Comment comment={reply} />
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
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<CommentType[]>(
    placeholderComments.filter(c => c.storyId === storyId && (chapterId ? c.chapterId === chapterId : !c.chapterId) && !c.parentId)
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null);


  const handleSubmitComment = () => {
    if (newComment.trim() === '') return;

    const currentUser = placeholderUsers[0]; // Mock current user
    const commentToAdd: CommentType = {
      id: `comment${Date.now()}`,
      user: { id: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatarUrl },
      storyId,
      chapterId,
      parentId: replyingTo || undefined,
      content: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
    };
    
    if (replyingTo) {
        // This logic is simplified. A real app would update nested comments.
        // For now, we add it as a top-level comment for demonstration.
        setComments(prev => [commentToAdd, ...prev]);
    } else {
        setComments(prev => [commentToAdd, ...prev]);
    }

    setNewComment('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    // Potentially focus the textarea here
  };

  return (
    <section className="mt-10 bg-card p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-headline font-semibold mb-6 text-foreground">
        Interactive Comments ({comments.length})
      </h3>
      
      <div className="mb-6">
        <Textarea
          placeholder={replyingTo ? `Replying to comment... (@mention feature coming soon!)` : "Share your thoughts... (@mention someone!)"}
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
