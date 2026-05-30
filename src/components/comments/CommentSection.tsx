'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare as MessageSquareIcon, Loader2, Edit3, Trash2, Save, EllipsisVertical, Smile, EyeOff, Send } from 'lucide-react';
import type { Comment as CommentType, Story } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
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
  Timestamp,
  runTransaction,
  getDoc
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CommentProps {
  comment: CommentType;
  onReply?: (commentId: string, username: string) => void;
  allComments: CommentType[]; 
  onCommentUpdate: (commentId: string, newContent: string) => Promise<void>;
  onCommentDelete: (commentId: string) => Promise<void>;
}

function Comment({ comment, onReply, allComments, onCommentUpdate, onCommentDelete }: CommentProps) {
  const { user: currentUser } = useAuth();
  const { showIsland } = useDynamicIsland();
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!comment.isSpoiler);
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
    onCommentUpdate(comment.id, editedContent.trim())
        .then(() => {
            setIsEditing(false);
            showIsland({ title: "Comment updated", type: 'success' });
        })
        .finally(() => setIsSavingEdit(false));
  };
  
  const isOwner = currentUser?.id === comment.user.id;

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
            <div className="flex items-center gap-2">
                <Link href={`/profile/${comment.user.id}`} className="font-semibold text-sm text-foreground hover:underline">{comment.user.displayName || comment.user.username}</Link>
                <span className="text-[10px] text-muted-foreground">
                    {comment.timestamp instanceof Timestamp 
                        ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true })
                        : comment.timestamp ? formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true }) : 'Just now'}
                </span>
                {comment.isSpoiler && (
                    <Badge variant="outline" className="h-4 text-[8px] uppercase tracking-widest border-red-500/20 text-red-500 bg-red-500/5 px-1.5 font-bold">Spoiler</Badge>
                )}
            </div>
             {isOwner && !isEditing && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative z-10">
                            <EllipsisVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-border/40">
                        <DropdownMenuItem onClick={handleEdit} className="gap-2">
                            <Edit3 className="h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <AlertDialogTrigger asChild>
                                <div className="flex items-center w-full gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </div>
                            </AlertDialogTrigger>
                        </DropdownMenuItem>
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
            <div className="mt-1 relative group">
                {comment.quote && (
                    <blockquote className="border-l-2 pl-2 text-xs italic text-muted-foreground mb-1">"{comment.quote}"</blockquote>
                )}
                
                <div className="relative">
                    <p className={cn(
                        "text-sm text-foreground/90 whitespace-pre-line transition-all duration-500",
                        comment.isSpoiler && !isRevealed && "blur-sm select-none grayscale"
                    )}>
                        {comment.content}
                    </p>
                    
                    {comment.isSpoiler && !isRevealed && (
                        <div 
                            className="absolute inset-0 flex items-center justify-center cursor-pointer"
                            onClick={() => setIsRevealed(true)}
                        >
                            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg animate-in zoom-in-95 duration-300">
                                <EyeOff className="h-3 w-3 text-red-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Tap to reveal spoiler</span>
                            </div>
                        </div>
                    )}
                </div>
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
        
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="font-headline text-2xl">Delete Comment?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to delete this comment? This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => {
                        onCommentDelete(comment.id)
                            .then(() => showIsland({ title: "Comment deleted", type: 'success' }));
                    }} 
                    className="bg-destructive hover:bg-destructive/90 rounded-full px-8"
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
  const { user: currentUser, addNotification, loading: authLoading } = useAuth();
  const { showIsland } = useDynamicIsland();
  const [newComment, setNewComment] = useState('');
  const [allComments, setAllComments] = useState<CommentType[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{id: string; username: string} | null>(null);
  const [isSpoiler, setIsSpoiler] = useState(false);
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
      console.warn("Comment stream error:", error);
      setIsLoadingComments(false);
    });

    return () => unsubscribe();
  }, [storyId, chapterId]);

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
    const commentData: any = {
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
      isSpoiler: isSpoiler
    };
    
    if (quote && !replyingTo) {
      commentData.quote = quote;
    }

    const storyRef = doc(db, 'stories', storyId);

    runTransaction(db, async (transaction) => {
        const storySnap = await transaction.get(storyRef);
        if (!storySnap.exists()) throw "Story not found";
        
        const storyData = storySnap.data() as Story;
        const updatedChapters = storyData.chapters.map(ch => {
            if (ch.id === chapterId) {
                return { ...ch, commentsCount: (ch.commentsCount || 0) + 1 };
            }
            return ch;
        });

        transaction.update(storyRef, { chapters: updatedChapters });
        transaction.set(doc(collection(db, 'comments')), commentData);
        
        // Trigger Notification
        if (storyData.author.id !== currentUser.id) {
            addNotification({
                userId: storyData.author.id,
                type: 'comment',
                message: `commented on your story "${storyData.title}".`,
                link: `/stories/${storyId}/read/${chapterId}/comments`,
                actor: { id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl }
            }).catch(() => {});
        }
    })
    .then(() => {
        setNewComment('');
        setReplyingTo(null);
        setIsSpoiler(false);
        showIsland({
          title: "Comment posted",
          description: "Your thought is now in the archives.",
          type: 'success',
          image: currentUser.avatarUrl
        });
    })
    .catch((error) => {
        console.error("Comment submit error:", error);
        toast({ title: "Failed to post comment", variant: "destructive" });
    })
    .finally(() => dispatchEvent(new CustomEvent('revalidate-story', { detail: { storyId } })));
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({id: commentId, username});
    const textarea = document.getElementById("comment-textarea") as HTMLTextAreaElement;
    if (textarea) textarea.focus();
  };

  const handleCommentUpdate = async (commentId: string, newContent: string) => {
    const commentRef = doc(db, 'comments', commentId);
    updateDoc(commentRef, {
      content: newContent,
    });
  };

  const handleCommentDelete = async (commentId: string) => {
    const storyRef = doc(db, 'stories', storyId);
    
    runTransaction(db, async (transaction) => {
        const storySnap = await transaction.get(storyRef);
        if (!storySnap.exists()) throw "Story not found";

        const storyData = storySnap.data() as Story;
        const updatedChapters = storyData.chapters.map(ch => {
            if (ch.id === chapterId) {
                return { ...ch, commentsCount: Math.max(0, (ch.commentsCount || 0) - 1) };
            }
            return ch;
        });

        transaction.update(storyRef, { chapters: updatedChapters });
        transaction.delete(doc(db, 'comments', commentId));
    });
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
            <form onSubmit={handleSubmitComment} className="flex flex-col gap-3 mb-8 bg-muted/20 p-4 rounded-2xl border border-border/40">
              <div className="flex items-start gap-3">
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
                            className="min-h-[80px] bg-background border-none focus-visible:ring-primary rounded-xl pr-10 shadow-inner"
                            rows={3}
                            disabled={isPostingComment}
                        />
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 bottom-1 h-8 w-8 rounded-full">
                                <Smile className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0">
                            <EmojiPicker onEmojiClick={onEmojiClick} />
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>
              </div>

              <div className="flex items-center justify-between pl-12">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="spoiler-toggle" className="flex items-center gap-2 cursor-pointer group">
                        <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isSpoiler ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground group-hover:bg-muted/50"
                        )}>
                            <EyeOff className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Spoiler Warning</span>
                    </Label>
                    <Switch id="spoiler-toggle" checked={isSpoiler} onCheckedChange={setIsSpoiler} className="scale-75" />
                  </div>

                  <div className="flex items-center gap-2">
                    {replyingTo && (
                        <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-8 text-[10px] font-bold uppercase tracking-widest">Cancel</Button>
                    )}
                    <Button type="submit" size="sm" disabled={isPostingComment || !newComment.trim()} className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">
                        {isPostingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Post
                    </Button>
                  </div>
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
