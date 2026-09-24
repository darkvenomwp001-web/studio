'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  deleteDoc,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import type { Annotation, Comment as CommentType } from '@/types';
import { 
  Loader2, 
  Quote, 
  BookOpen, 
  Eye, 
  Lock, 
  Globe, 
  Copy, 
  Check, 
  Download, 
  Image as ImageIcon,
  EllipsisVertical,
  Trash2,
  MessageSquare,
  Send,
  X,
  Edit3,
  Save,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import ReactionButton from '../threads/ReactionButton';
import { useDynamicIsland } from '@/context/DynamicIslandContext';

const OWNER_HANDLES = ['arnv'];

function HighlightPoster({ annotation }: { annotation: Annotation }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        const text = `"${annotation.highlightedText}"\n\n— from ${annotation.storyTitle}\nArchived via D4RKV3NOM`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Text copied for sharing" });
    };

    return (
        <div className="space-y-6">
            <div 
                className="relative p-10 rounded-[32px] shadow-2xl overflow-hidden aspect-square flex flex-col justify-center text-center animate-in zoom-in-95 duration-500 transform-gpu"
                style={{ backgroundColor: annotation.highlightColor || '#fde047' }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                <Quote className="absolute top-8 left-8 h-12 w-12 text-black/10 -scale-x-100" />
                
                <div className="relative z-10 space-y-6">
                    <p className="text-xl md:text-2xl font-serif font-bold text-black leading-relaxed italic px-4">
                        “{annotation.highlightedText}”
                    </p>
                    <div className="pt-4 border-t border-black/10 w-24 mx-auto" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">{annotation.storyTitle}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-black/40">{annotation.chapterTitle}</p>
                    </div>
                </div>

                <div className="absolute bottom-8 right-8 flex items-center gap-2 opacity-40">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-black">D4RKV3NOM</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-2xl h-12 gap-2 font-bold uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy Quote'}
                </Button>
                <Button variant="outline" className="rounded-2xl h-12 gap-2 font-bold uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted" onClick={() => toast({ title: "Image Archive Ready", description: "This visual has been saved to your digital studio." })}>
                    <Download className="h-4 w-4" />
                    Save Image
                </Button>
            </div>
        </div>
    );
}

function AnnotationCommentItem({ comment, onUpdate, onDelete }: { comment: CommentType, onUpdate: any, onDelete: any }) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const isOwner = user?.id === comment.user.id;
    const isAppOwner = user && OWNER_HANDLES.includes(user.username);
    const canManage = isOwner || isAppOwner;

    const handleSave = () => {
        if (!editedContent.trim() || editedContent === comment.content) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        onUpdate(comment.id, editedContent.trim())
            .then(() => {
                setIsEditing(false);
                toast({ title: "Thought updated" });
            })
            .finally(() => setIsSaving(false));
    };

    return (
        <AlertDialog>
            <div className="flex gap-3 group">
                <Link href={`/profile/${comment.user.id}`} className="flex-shrink-0">
                    <Avatar className="h-8 w-8 border shadow-sm">
                        <AvatarImage src={comment.user.avatarUrl} />
                        <AvatarFallback>{(comment.user.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="bg-muted/30 p-3 rounded-2xl relative border border-transparent hover:border-primary/10 transition-all">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <Link href={`/profile/${comment.user.id}`} className="font-bold text-[10px] uppercase tracking-widest hover:text-primary truncate">
                                @{comment.user.username}
                            </Link>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-muted-foreground/60 whitespace-nowrap">
                                    {comment.timestamp?.toDate ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                                </span>
                                {canManage && !isEditing && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground relative z-10 opacity-0 group-hover:opacity-100 transition-all">
                                                <EllipsisVertical className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-border/40 shadow-xl">
                                            <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2 font-bold text-[10px] uppercase">
                                                <Edit3 className="h-3.5 w-3.5" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive font-bold text-[10px] uppercase">
                                                <AlertDialogTrigger asChild>
                                                    <div className="flex items-center w-full gap-2">
                                                        <Trash2 className="h-3.5 w-3.5" /> Delete
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
                                    className="min-h-[60px] text-sm bg-background rounded-xl border-none shadow-inner"
                                    disabled={isSaving}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="rounded-full text-[10px] font-bold uppercase" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button size="sm" className="rounded-full text-[10px] font-bold uppercase px-4" onClick={handleSave} disabled={isSaving || !editedContent.trim()}>
                                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                        Save
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{comment.content}</p>
                        )}
                    </div>
                </div>

                <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-headline text-2xl font-bold">Erase this thought?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground leading-relaxed">This action is permanent and will remove your perspective from this highlight.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full font-bold uppercase text-[10px] tracking-widest px-6">Keep it</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-destructive hover:bg-destructive/90 rounded-full font-bold uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-destructive/20"
                            onClick={() => onDelete(comment.id)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </div>
        </AlertDialog>
    );
}

function AnnotationComments({ annotationId }: { annotationId: string }) {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentType[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(
            collection(db, 'annotations', annotationId, 'comments'),
            orderBy('timestamp', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType)));
        });
        return () => unsubscribe();
    }, [annotationId]);

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;

        setIsPosting(true);
        const commentData = {
            user: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl },
            content: newComment.trim(),
            timestamp: serverTimestamp(),
        };

        const annoRef = doc(db, 'annotations', annotationId);
        const commentsRef = collection(annoRef, 'comments');

        runTransaction(db, async (transaction) => {
            const annoDoc = await transaction.get(annoRef);
            if (!annoDoc.exists()) throw "Moment no longer exists.";
            const newCount = (annoDoc.data().commentsCount || 0) + 1;
            transaction.update(annoRef, { commentsCount: newCount });
            transaction.set(doc(commentsRef), commentData);
        })
        .then(() => {
            setNewComment('');
            toast({ title: "Thought archived!" });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: `annotations/${annotationId}/comments`,
                operation: 'create',
                requestResourceData: commentData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsPosting(false));
    };

    const handleUpdateComment = async (commentId: string, content: string) => {
        const commentRef = doc(db, 'annotations', annotationId, 'comments', commentId);
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
        const annoRef = doc(db, 'annotations', annotationId);
        const commentRef = doc(db, 'annotations', annotationId, 'comments', commentId);

        runTransaction(db, async (transaction) => {
            const annoDoc = await transaction.get(annoRef);
            if (!annoDoc.exists()) throw "Moment not found";
            const newCount = Math.max(0, (annoDoc.data().commentsCount || 0) - 1);
            transaction.update(annoRef, { commentsCount: newCount });
            transaction.delete(commentRef);
        })
        .then(() => toast({ title: "Comment removed" }))
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: commentRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
    };

    return (
        <div className="flex flex-col h-[50vh]">
            <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-8">
                    {comments.map((comment) => (
                        <AnnotationCommentItem 
                            key={comment.id} 
                            comment={comment} 
                            onUpdate={handleUpdateComment}
                            onDelete={handleDeleteComment}
                        />
                    ))}
                    {comments.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground/40 italic">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">No community thoughts yet</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="mt-6 pt-6 border-t border-border/40">
                {user ? (
                    <form onSubmit={handlePostComment} className="flex gap-3 items-center">
                        <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Input 
                            value={newComment} 
                            onChange={e => setNewComment(e.target.value)} 
                            placeholder="Share your perspective..." 
                            className="bg-muted/30 border-none h-12 rounded-2xl shadow-inner text-sm px-5"
                            disabled={isPosting}
                        />
                        <Button type="submit" size="icon" disabled={isPosting || !newComment.trim()} className="rounded-2xl h-12 w-12 flex-shrink-0 shadow-xl shadow-primary/20">
                            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                ) : (
                    <div className="text-center py-4 bg-muted/20 rounded-2xl border border-dashed border-border/40">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                            Sign in to contribute
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function AnnotationCard({ annotation, isOwnArchive }: { annotation: Annotation, isOwnArchive: boolean }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { showIsland } = useDynamicIsland();
    const [isPosterOpen, setIsPosterOpen] = useState(false);

    const handleToggleVisibility = async () => {
        if (!isOwnArchive) return;
        const newVisibility = annotation.visibility === 'public' ? 'private' : 'public';
        const annoRef = doc(db, 'annotations', annotation.id);
        updateDoc(annoRef, { visibility: newVisibility })
            .then(() => {
                showIsland({ title: `Moment is now ${newVisibility === 'public' ? 'Public' : 'Private'}`, type: 'info' });
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: annoRef.path,
                    operation: 'update',
                    requestResourceData: { visibility: newVisibility },
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleDelete = async () => {
        if (!isOwnArchive) return;
        const annoRef = doc(db, 'annotations', annotation.id);
        deleteDoc(annoRef)
            .then(() => toast({ title: "Removed from collection" }))
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: annoRef.path,
                    operation: 'delete',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    return (
        <Card className="flex flex-col rounded-[2.5rem] overflow-hidden border-border/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 transform-gpu group bg-card/40 backdrop-blur-md">
            <CardHeader className="p-6 pb-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    {!isOwnArchive && annotation.authorInfo && (
                        <Avatar className="h-9 w-9 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
                            <AvatarImage src={annotation.authorInfo.avatarUrl} />
                            <AvatarFallback>{(annotation.authorInfo.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    )}
                    <div className="min-w-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                            {isOwnArchive ? (
                                <Link href={`/stories/${annotation.storyId}`} className="hover:text-primary transition-colors truncate block max-w-[140px]">
                                    {annotation.storyTitle}
                                </Link>
                            ) : (
                                <span className="text-foreground">@{annotation.authorInfo?.username}</span>
                            )}
                        </CardTitle>
                        <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter truncate max-w-[140px]">{annotation.chapterTitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isOwnArchive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    {isOwnArchive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary" onClick={handleToggleVisibility}>
                            {annotation.visibility === 'public' ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow pt-0 px-6">
                <div className="relative group/quote">
                    <Quote className="absolute -top-2 -left-2 h-10 w-16 text-primary/5 -scale-x-100 transition-all group-hover/quote:scale-110" />
                    <blockquote className="border-l-4 p-5 rounded-r-3xl bg-primary/5 border-primary/20 shadow-inner relative z-10" style={{ borderLeftColor: annotation.highlightColor || 'hsl(var(--primary))' }}>
                        <p className="italic text-base md:text-lg text-foreground/90 font-serif leading-relaxed line-clamp-6">“{annotation.highlightedText}”</p>
                    </blockquote>
                </div>
                {annotation.note && (
                    <div className="mt-5 p-4 bg-muted/20 rounded-2xl border border-border/20 shadow-sm animate-in slide-in-from-top-1 duration-300">
                        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                            <Edit3 className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                            <span>{annotation.note}</span>
                        </p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/10 p-5 border-t border-border/40">
                <div className="flex items-center gap-2">
                    <ReactionButton postId={annotation.id} authorId={annotation.userId} parentCollection="annotations" initialReactionsCount={annotation.reactionsCount || 0} reactionCounts={annotation.reactionCounts} />

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 px-3 gap-2 rounded-full font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-all hover:bg-primary/5"
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span>{annotation.commentsCount || 0}</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-3xl rounded-[32px] bg-background/95 backdrop-blur-3xl">
                            <DialogHeader className="p-8 bg-muted/30 border-b">
                                <DialogTitle className="text-2xl font-headline font-bold">Community Thoughts</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Exploring the impact of this prose</DialogDescription>
                            </DialogHeader>
                            <div className="p-8">
                                <AnnotationComments annotationId={annotation.id} />
                            </div>
                            <DialogFooter className="p-4 bg-muted/20 border-t flex-row justify-center">
                                <DialogClose asChild><Button variant="ghost" className="rounded-full font-bold text-[10px] uppercase tracking-widest px-8 h-10 hover:bg-primary/5 hover:text-primary">Close Discussion</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="flex gap-1">
                    <Link href={`/stories/${annotation.storyId}/read/${annotation.chapterId}`}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all" title="Enter Manuscript">
                            <BookOpen className="h-5 w-5" />
                        </Button>
                    </Link>
                    <Dialog open={isPosterOpen} onOpenChange={setIsPosterOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/10 hover:text-accent transition-all" title="Share Snapshot">
                                <ImageIcon className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-[40px] border-none shadow-3xl p-8 overflow-hidden bg-background/95 backdrop-blur-3xl">
                            <DialogHeader className="mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 rounded-2xl bg-accent/10 text-accent shadow-sm">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <DialogTitle className="text-2xl font-headline font-bold">Highlight Snapshot</DialogTitle>
                                </div>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Generate a beautiful visual of this moment</DialogDescription>
                            </DialogHeader>
                            <HighlightPoster annotation={annotation} />
                            <DialogFooter className="mt-6 pt-4 border-t border-border/10">
                                <DialogClose asChild><Button variant="ghost" className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-muted">Exit Studio</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function AnnotationFeed() {
    const { user, loading } = useAuth();
    const [myAnnotations, setMyAnnotations] = useState<Annotation[]>([]);
    const [communityAnnotations, setCommunityAnnotations] = useState<Annotation[]>([]);
    const [activeTab, setActiveTab] = useState('community');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const communityQuery = query(
            collection(db, 'annotations'),
            where('visibility', '==', 'public'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribeCommunity = onSnapshot(communityQuery, (snapshot) => {
            setCommunityAnnotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation)));
            if (activeTab === 'community') setIsLoading(false);
        });

        return () => unsubscribeCommunity();
    }, [activeTab]);

    useEffect(() => {
        if (!user) return;
        
        const myQuery = query(
            collection(db, 'annotations'), 
            where('userId', '==', user.id), 
            orderBy('timestamp', 'desc')
        );

        const unsubscribeMy = onSnapshot(myQuery, (snapshot) => {
            setMyAnnotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation)));
            if (activeTab === 'mine') setIsLoading(false);
        });

        return () => unsubscribeMy();
    }, [user, activeTab]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[40vh] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 animate-pulse">Syncing archives...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-24">
            <Tabs defaultValue="community" className="w-full" onValueChange={setActiveTab}>
                <div className="flex justify-center mb-10">
                    <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md h-12 w-full max-w-sm">
                        <TabsTrigger value="community" className="rounded-full font-black uppercase text-[10px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                            <Eye className="h-4 w-4" /> Community
                        </TabsTrigger>
                        <TabsTrigger value="mine" className="rounded-full font-black uppercase text-[10px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                            <Lock className="h-4 w-4" /> My Collection
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="community" className="mt-0 focus-visible:outline-none animate-in fade-in duration-1000 transform-gpu">
                    {isLoading ? (
                        <div className="flex justify-center py-32"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : communityAnnotations.length > 0 ? (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {communityAnnotations.map(anno => <AnnotationCard key={anno.id} annotation={anno} isOwnArchive={user?.id === anno.userId} />)}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-card/20 rounded-[4rem] border-4 border-dashed border-border/20 max-w-2xl mx-auto flex flex-col items-center gap-6">
                            <div className="p-8 bg-muted/40 rounded-full shadow-inner">
                                <Globe className="h-16 w-16 text-muted-foreground/20" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-headline font-bold uppercase tracking-tight">Empty Feed</h3>
                                <p className="text-sm text-muted-foreground px-12 leading-relaxed font-medium italic">Public community moments will appear here. Be the first to capture a striking line!</p>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="mine" className="mt-0 focus-visible:outline-none animate-in fade-in duration-1000 transform-gpu">
                    {!user ? (
                        <div className="text-center py-32 bg-card/20 rounded-[4rem] border border-border/20 max-w-2xl mx-auto flex flex-col items-center gap-6">
                            <Lock className="h-20 w-20 text-muted-foreground/20 animate-pulse" />
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-headline font-bold uppercase tracking-tight">Your Private Collection</h3>
                                    <p className="text-sm text-muted-foreground font-medium">Sign in to start capturing lines that move you.</p>
                                </div>
                                <Link href="/auth/signin">
                                    <Button className="rounded-full px-12 h-14 bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95">Sign In</Button>
                                </Link>
                            </div>
                        </div>
                    ) : myAnnotations.length > 0 ? (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {myAnnotations.map(anno => <AnnotationCard key={anno.id} annotation={anno} isOwnArchive={true} />)}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-card/20 rounded-[4rem] border-4 border-dashed border-border/20 max-w-2xl mx-auto flex flex-col items-center gap-6">
                            <Quote className="h-20 w-20 text-muted-foreground/20 opacity-40" />
                            <div className="space-y-2">
                                <h3 className="text-3xl font-headline font-bold uppercase tracking-tight">Collection Empty</h3>
                                <p className="text-sm text-muted-foreground px-12 mb-8 italic">Highlight text in any manuscript to save it to your personal vault.</p>
                            </div>
                            <Link href="/stories">
                                <Button variant="outline" className="rounded-full px-12 h-14 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">Explore Discoveries</Button>
                            </Link>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
