'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
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
  addDoc,
  Timestamp
} from 'firebase/firestore';
import type { Annotation, UserSummary, Comment as CommentType } from '@/types';
import { 
  Loader2, 
  Quote, 
  Edit, 
  Share, 
  BookOpen, 
  Heart, 
  Eye, 
  Lock, 
  Globe, 
  Copy, 
  Check, 
  Download, 
  Image as ImageIcon,
  MoreHorizontal,
  Trash2,
  ThumbsUp,
  Smile,
  Frown,
  Angry,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const REACTION_TYPES = [
    { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
    { type: 'haha', icon: Smile, label: 'Haha', color: 'text-yellow-500' },
    { type: 'sad', icon: Frown, label: 'Sad', color: 'text-purple-500' },
    { type: 'happy', icon: Heart, label: 'Happy', color: 'text-red-500' },
    { type: 'angry', icon: Angry, label: 'Angry', color: 'text-orange-500' },
];

function HighlightPoster({ annotation }: { annotation: Annotation }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        const text = `"${annotation.highlightedText}"\n\n— from ${annotation.storyTitle}\nShared via D4RKV3NOM`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied to clipboard!" });
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
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-black/60 mb-1">{annotation.storyTitle}</p>
                        <p className="text-[10px] font-bold uppercase tracking-tighter text-black/40">{annotation.chapterTitle}</p>
                    </div>
                </div>

                <div className="absolute bottom-8 right-8 flex items-center gap-2 opacity-40">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black">D4RKV3NOM</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-2xl h-12 gap-2 font-bold uppercase text-[10px] tracking-widest" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy Text'}
                </Button>
                <Button variant="outline" className="rounded-2xl h-12 gap-2 font-bold uppercase text-[10px] tracking-widest" onClick={() => toast({ title: "Feature coming soon", description: "Image export is being calibrated." })}>
                    <Download className="h-4 w-4" />
                    Save Image
                </Button>
            </div>
        </div>
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

        addDoc(collection(db, 'annotations', annotationId, 'comments'), commentData)
            .then(() => {
                setNewComment('');
                toast({ title: "Comment posted!" });
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

    return (
        <div className="mt-4 space-y-4 animate-in fade-in duration-500">
            <Separator className="opacity-40" />
            <ScrollArea className="max-h-[300px] pr-4">
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.user.avatarUrl} />
                                <AvatarFallback>{comment.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/30 p-3 rounded-2xl">
                                <p className="text-xs font-bold text-foreground">@{comment.user.username}</p>
                                <p className="text-sm text-foreground/80 mt-1">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-4 italic">No thoughts yet. Start the conversation!</p>
                    )}
                </div>
            </ScrollArea>

            {user && (
                <form onSubmit={handlePostComment} className="flex gap-2 items-center">
                    <Input 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)} 
                        placeholder="Add a thought..." 
                        className="bg-muted/30 border-none h-10 rounded-xl"
                        disabled={isPosting}
                    />
                    <Button type="submit" size="icon" disabled={isPosting || !newComment.trim()} className="rounded-xl h-10 w-10 flex-shrink-0">
                        {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            )}
        </div>
    );
}

interface CommentProps {
  comment: CommentType;
  onReply?: (commentId: string, username: string) => void;
  allComments: CommentType[]; 
  onCommentUpdate: (commentId: string, newContent: string) => Promise<void>;
  onCommentDelete: (commentId: string) => Promise<void>;
}

function AnnotationCard({ annotation, isOwnArchive }: { annotation: Annotation, isOwnArchive: boolean }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isReacting, setIsReacting] = useState(false);
    const [isPosterOpen, setIsPosterOpen] = useState(false);
    const [showComments, setShowComments] = useState(false);

    const handleReaction = async (reactionType: string) => {
        if (!user) {
            toast({ title: "Sign in to react", variant: "destructive" });
            return;
        }
        setIsReacting(true);
        const annoRef = doc(db, 'annotations', annotation.id);
        
        updateDoc(annoRef, { 
            reactionsCount: increment(1),
            [`reactionCounts.${reactionType}`]: increment(1)
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: annoRef.path,
                operation: 'update',
                requestResourceData: { reactionsCount: 'increment' },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsReacting(false));
    };

    const handleToggleVisibility = async () => {
        if (!isOwnArchive) return;
        const newVisibility = annotation.visibility === 'public' ? 'private' : 'public';
        const annoRef = doc(db, 'annotations', annotation.id);
        updateDoc(annoRef, { visibility: newVisibility })
            .then(() => toast({ title: `Annotation is now ${newVisibility}` }))
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
            .then(() => toast({ title: "Highlight removed from archive" }))
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: annoRef.path,
                    operation: 'delete',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    return (
        <Card className="flex flex-col rounded-[32px] overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all group">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    {!isOwnArchive && annotation.authorInfo && (
                        <Avatar className="h-8 w-8 border">
                            <AvatarImage src={annotation.authorInfo.avatarUrl} />
                            <AvatarFallback>{annotation.authorInfo.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    )}
                    <div>
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {isOwnArchive ? (
                                <Link href={`/stories/${annotation.storyId}`} className="hover:text-primary transition-colors truncate block max-w-[150px]">
                                    {annotation.storyTitle}
                                </Link>
                            ) : (
                                <span className="text-foreground">@{annotation.authorInfo?.username}</span>
                            )}
                        </CardTitle>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isOwnArchive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {isOwnArchive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleToggleVisibility}>
                            {annotation.visibility === 'public' ? <Globe className="h-3.5 w-3.5 text-primary" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow pt-0">
                <div className="relative">
                    <Quote className="absolute -top-1 -left-1 h-6 w-10 text-primary/5 -scale-x-100" />
                    <blockquote className="border-l-4 p-4 rounded-r-2xl bg-muted/20" style={{ borderColor: annotation.highlightColor || 'hsl(var(--primary))' }}>
                        <p className="italic text-sm md:text-base text-foreground/90 font-serif leading-relaxed">“{annotation.highlightedText}”</p>
                    </blockquote>
                </div>
                {annotation.note && (
                    <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-bold text-primary mr-1">Note:</span>
                            {annotation.note}
                        </p>
                    </div>
                )}
                {showComments && <AnnotationComments annotationId={annotation.id} />}
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/10 p-4 border-t border-border/40">
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn("h-8 px-2 gap-1.5 rounded-lg font-bold text-[10px] uppercase", annotation.reactionsCount && "text-primary")}
                                onClick={(e) => { e.stopPropagation(); }}
                                disabled={isReacting}
                            >
                                <Heart className={cn("h-4 w-4", annotation.reactionsCount && "fill-current")} />
                                {annotation.reactionsCount || 0}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit p-2 rounded-2xl shadow-2xl border-white/10 bg-card/95 backdrop-blur-xl" side="top">
                            <div className="flex gap-2">
                                {REACTION_TYPES.map((reaction) => (
                                    <Button 
                                        key={reaction.type} 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("h-10 w-10 rounded-full hover:bg-muted", reaction.color)}
                                        onClick={() => handleReaction(reaction.type)}
                                    >
                                        <reaction.icon className="h-5 w-5" />
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("h-8 px-2 gap-1.5 rounded-lg font-bold text-[10px] uppercase", showComments && "text-primary")}
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageSquare className="h-4 w-4" />
                        Discuss
                    </Button>
                </div>
                <div className="flex gap-1">
                    <Link href={`/stories/${annotation.storyId}/read/${annotation.chapterId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary" title="Read Context">
                            <BookOpen className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Dialog open={isPosterOpen} onOpenChange={setIsPosterOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent/10 hover:text-accent" title="Share Highlight">
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-[40px] border-none shadow-3xl p-8 overflow-hidden">
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-2xl font-headline font-bold">Share Your Highlight</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Generate a beautiful snapshot of this moment</DialogDescription>
                            </DialogHeader>
                            <HighlightPoster annotation={annotation} />
                            <DialogFooter className="mt-4 pt-4 border-t border-border/40">
                                <DialogClose asChild><Button variant="ghost" className="w-full rounded-2xl font-bold uppercase text-[10px] tracking-widest">Close Studio</Button></DialogClose>
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
        }, (error) => {
            console.error("Error fetching community annotations:", error);
            setIsLoading(false);
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
        }, (error) => {
            console.error("Error fetching my annotations:", error);
            setIsLoading(false);
        });

        return () => unsubscribeMy();
    }, [user, activeTab]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[40vh] gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing archives...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            <Tabs defaultValue="community" className="w-full" onValueChange={setActiveTab}>
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md">
                        <TabsTrigger value="community" className="rounded-full font-bold gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <Eye className="h-4 w-4" /> Community
                        </TabsTrigger>
                        <TabsTrigger value="mine" className="rounded-full font-bold gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <Lock className="h-4 w-4" /> My Archive
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="community" className="mt-0 focus-visible:outline-none animate-in fade-in duration-700">
                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                    ) : communityAnnotations.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {communityAnnotations.map(anno => <AnnotationCard key={anno.id} annotation={anno} isOwnArchive={user?.id === anno.userId} />)}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-card/40 rounded-[40px] border-2 border-dashed border-border/40 max-w-2xl mx-auto">
                            <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Globe className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-2xl font-headline font-bold mb-2">No public highlights yet</h3>
                            <p className="text-muted-foreground max-sm mx-auto px-6">Public community moments will appear here. Be the first to share a striking line with the world!</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="mine" className="mt-0 focus-visible:outline-none animate-in fade-in duration-700">
                    {!user ? (
                        <div className="text-center py-24 bg-card/40 rounded-[40px] border border-border/40 max-w-2xl mx-auto">
                            <Lock className="h-16 w-16 text-muted-foreground/20 mx-auto mb-6" />
                            <h3 className="text-2xl font-headline font-bold mb-4">Your Private Archive</h3>
                            <p className="text-muted-foreground mb-8">Sign in to start capturing lines that move you.</p>
                            <Link href="/auth/signin">
                                <Button className="rounded-full px-10 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-lg font-bold">Sign In</Button>
                            </Link>
                        </div>
                    ) : myAnnotations.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {myAnnotations.map(anno => <AnnotationCard key={anno.id} annotation={anno} isOwnArchive={true} />)}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-card/40 rounded-[40px] border-2 border-dashed border-border/40 max-w-2xl mx-auto">
                            <Quote className="h-16 w-16 text-muted-foreground/20 mx-auto mb-6" />
                            <h3 className="text-2xl font-headline font-bold mb-2">The manuscript is clean</h3>
                            <p className="text-muted-foreground mb-8">You haven't archived any highlights yet. Highlight text in any story to save it here.</p>
                            <Link href="/stories">
                                <Button className="rounded-full px-8 h-12 font-bold shadow-lg">Discover Stories</Button>
                            </Link>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}