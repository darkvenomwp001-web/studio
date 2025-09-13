

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare as MessageSquareIcon, Loader2, Edit3, Trash2, Save, MoreHorizontal, Smile } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
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

  // Real-time update for edited content
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(comment.content);
    }
  }, [comment.content, isEditing]);


  return (
    <div className="flex gap-3 py-4">
      <Link href={`/profile/${comment.user.id}`}>
        <Avatar className="h-10 w-10">
            <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} data-ai-hint="profile person" />
            <AvatarFallback>{comment.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="flex items-center justify-between">
            <div>
                <Link href={`/profile/${comment.user.id}`} className="font-semibold text-sm text-foreground hover:underline">{comment.user.displayName || comment.user.username}</Link>
                <span className="text-xs text-muted-foreground ml-2">
                    {comment.timestamp instanceof Timestamp 
                        ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true })
                        : comment.timestamp ? formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true }) : 'Just now'}
                </span>
            </div>
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
        
        {isEditing ? (
          <div className="space-y-2 mt-2">
            <Textarea 
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={3}
              className="text-sm bg-background focus-visible:ring-primary"
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
            <div className="mt-1">
                {comment.quote && (
                    <blockquote className="border-l-2 pl-2 text-xs italic text-muted-foreground mb-1">"{comment.quote}"</blockquote>
                )}
                <p className="text-sm text-foreground/90 whitespace-pre-line">{comment.content}</p>
            </div>
        )}

        {!isEditing && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <button className="flex items-center gap-1 hover:text-primary transition-colors font-medium">
                <ThumbsUp className="h-4 w-4" /> ({comment.likes || 0})
            </button>
            {currentUser && onReply && (
                <button 
                onClick={() => onReply(comment.id, comment.user.displayName || comment.user.username)}
                className="hover:text-primary transition-colors font-medium"
                >
                Reply
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

        {replies.length > 0 && (
            <button onClick={handleToggleReplies} className="text-xs font-semibold text-muted-foreground hover:text-primary mt-3 flex items-center gap-2">
                <div className="w-6 border-t"></div>
                {showReplies ? 'Hide' : `View ${replies.length}`} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
        )}

        {showReplies && (
          <div className="mt-3">
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
  quote?: string;
}

export default function CommentSection({ storyId, chapterId, quote }: CommentSectionProps) {
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
    const commentData: Omit<CommentType, 'id'> & { quote?: string } = {
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
    
    if (quote && !replyingTo) {
      commentData.quote = quote;
    }

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
  
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewComment(prev => prev + emojiData.emoji);
  };

  return (
    <AlertDialog>
        <section>
        <h3 className="text-xl sm:text-2xl font-headline font-semibold mb-6 text-foreground">
            Comments ({topLevelComments.length})
        </h3>
        
        {!authLoading && currentUser && (
            <form onSubmit={handleSubmitComment} className="flex items-start gap-3 mb-8">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} data-ai-hint="profile person" />
                <AvatarFallback>{currentUser.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="relative">
                    <Textarea
                        id="comment-textarea"
                        placeholder={replyingTo ? `Replying to ${replyingTo.username}...` : (quote ? "Commenting on quote..." : "Add a comment...")}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[40px] bg-background border-border focus-visible:ring-primary rounded-xl pr-10"
                        rows={1}
                        disabled={isPostingComment}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                         <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full">
                            <Smile className="h-5 w-5 text-muted-foreground" />
                         </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-0">
                          <EmojiPicker onEmojiClick={onEmojiClick} />
                      </PopoverContent>
                    </Popover>
                </div>
                 {replyingTo && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Replying to {replyingTo.username}. <button type="button" className="text-primary hover:underline" onClick={() => setReplyingTo(null)}>Cancel</button>
                    </p>
                )}
                 {newComment.length > 0 && (
                    <Button type="submit" size="sm" className="mt-2" disabled={isPostingComment || !newComment.trim()}>
                        {isPostingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Post
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
            <div className="divide-y divide-border/60">
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
                <p className="text-muted-foreground text-center py-8">Be the first to share your thoughts!</p>
            )}
            </div>
        )}
        </section>
    </AlertDialog>
  );
}
