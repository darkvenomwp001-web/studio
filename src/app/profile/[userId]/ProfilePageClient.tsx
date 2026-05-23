'use client';

import { useEffect, useState, FormEvent, useRef, ChangeEvent, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  MessageCircle, 
  UserPlus, 
  UserX, 
  Settings, 
  ShieldAlert, 
  MoreHorizontal, 
  Trash2, 
  Lock, 
  BookOpen,
  PencilLine,
  PenTool,
  ImagePlus,
  X,
  Send,
  Save,
  Plus,
  ChevronRight,
  Share2,
  Repeat,
  Tag,
  Star,
  LayoutGrid,
  Edit3,
  Quote,
  Heart,
  Edit2
} from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, Announcement, ThreadPost, UserSummary } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  runTransaction,
  increment
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import VerifiedBadge from '@/components/icons/VerifiedBadge';
import ThreadPostComments from '@/components/threads/ThreadPostComments';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from '@/components/ui/carousel';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const OWNER_HANDLES = ['arnv'];

function ShareToMootsDialog({ post, currentUser }: { post: ThreadPost, currentUser: AppUser | null }) {
    const [moots, setMoots] = useState<UserSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!currentUser?.followingIds || currentUser.followingIds.length === 0) return;
        setIsLoading(true);
        const fetchMoots = async () => {
            try {
                const followingBatch = currentUser.followingIds!.slice(0, 12);
                const q = query(collection(db, 'users'), where('__name__', 'in', followingBatch));
                const snap = await getDocs(q);
                const mootsData: UserSummary[] = [];
                snap.docs.forEach(d => {
                    const u = d.data() as AppUser;
                    if (u.followingIds?.includes(currentUser.id)) {
                        mootsData.push({ id: d.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl });
                    }
                });
                setMoots(mootsData);
            } catch (e) {
                console.error("Connection fetch failure:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMoots();
    }, [currentUser]);

    const handleShare = (username: string) => {
        toast({ title: `Post sent to @${username}` });
    };

    return (
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden bg-background">
            <DialogHeader className="p-6 bg-muted/30 border-b">
                <DialogTitle className="text-xl font-headline font-bold">Share</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Send to friends</DialogDescription>
            </DialogHeader>
            <div className="p-6">
                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : moots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-6">
                            {moots.map((moot) => (
                                <button 
                                    key={moot.id} 
                                    className="flex flex-col items-center gap-2 group transition-all"
                                    onClick={() => handleShare(moot.username)}
                                >
                                    <Avatar className="h-16 w-16 border-2 border-background shadow-md group-hover:scale-105 group-active:scale-95 transition-transform">
                                        <AvatarImage src={moot.avatarUrl} />
                                        <AvatarFallback className="bg-muted text-primary font-bold">{moot.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] font-bold truncate w-full text-center">@{moot.username}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground italic text-xs">
                            Follow friends to share posts with them.
                        </div>
                    )}
                </ScrollArea>
            </div>
            <DialogFooter className="p-4 bg-muted/20 border-t">
                <DialogClose asChild><Button variant="ghost" className="w-full rounded-full font-bold uppercase text-[10px] tracking-widest">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}

function VisualGalleryPost({ post, isOwnProfile }: { post: ThreadPost, isOwnProfile: boolean }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const lastTap = useRef<number>(0);

    useEffect(() => {
        if (!api) return;
        setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap() + 1);
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1);
        });
    }, [api]);

    useEffect(() => {
        if (!user || !post.id) return;
        const reactionRef = doc(db, 'feedPosts', post.id, 'reactions', user.id);
        return onSnapshot(reactionRef, (docSnap) => {
            setIsLiked(docSnap.exists());
        });
    }, [user, post.id]);

    const toggleLike = async () => {
        if (!user) {
            toast({ title: "Please sign in to like" });
            return;
        }
        const postRef = doc(db, 'feedPosts', post.id);
        const reactionRef = doc(db, 'feedPosts', post.id, 'reactions', user.id);

        try {
            await runTransaction(db, async (transaction) => {
                const reactionDoc = await transaction.get(reactionRef);
                const postDoc = await transaction.get(postRef);

                if (!postDoc.exists()) return;

                if (reactionDoc.exists()) {
                    transaction.delete(reactionRef);
                    transaction.update(postRef, { 
                        reactionsCount: increment(-1),
                        'reactionCounts.love': increment(-1)
                    });
                } else {
                    const reactionData = { 
                        userId: user.id, 
                        type: 'love',
                        timestamp: serverTimestamp(),
                        user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
                    };
                    transaction.set(reactionRef, reactionData, { merge: true });
                    transaction.update(postRef, { 
                        reactionsCount: increment(1),
                        'reactionCounts.love': increment(1)
                    });
                }
            });
        } catch (e) {
            console.error("Like failure:", e);
        }
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            if (!isLiked) toggleLike();
        }
        lastTap.current = now;
    };

    const imagesCount = post.images?.length || 0;

    return (
        <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-lg bg-card/60 backdrop-blur-sm group">
            <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border/20">
                        <AvatarImage src={post.author.avatarUrl} />
                        <AvatarFallback>{post.author.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h4 className="font-bold text-sm">@{post.author.username}</h4>
                        <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">
                            {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'now'}
                        </p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                        {isOwnProfile && (
                            <DropdownMenuItem className="text-destructive gap-2" onClick={() => deleteDoc(doc(db, 'feedPosts', post.id))}><Trash2 className="h-4 w-4" /> Delete Post</DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
                {post.content && (
                    <div className="px-6 pb-2">
                        <p className="text-sm leading-relaxed text-foreground/80">{post.content}</p>
                    </div>
                )}

                <div className="relative aspect-square w-full overflow-hidden bg-black" onDoubleClick={handleDoubleTap}>
                    {imagesCount > 0 ? (
                        <Carousel 
                            setApi={setApi} 
                            className="w-full h-full" 
                            opts={{ align: 'start', loop: false }}
                        >
                            <CarouselContent className="flex h-full ml-0">
                                {post.images!.map((img, idx) => (
                                    <CarouselItem 
                                        key={idx} 
                                        className="h-full w-full pl-0 basis-full flex-shrink-0 min-w-0"
                                    >
                                        <div className="relative w-full h-full">
                                            <NextImage src={img.url} alt="" fill className="object-cover" />
                                            {img.caption && (
                                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
                                                    <p className="text-sm font-medium drop-shadow-md">{img.caption}</p>
                                                </div>
                                            )}
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            
                            {imagesCount > 1 && (
                                <div className="absolute top-4 right-4 z-30">
                                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-none rounded-full px-2.5 h-6 font-bold text-[10px] shadow-lg">
                                        {current}/{count}
                                    </Badge>
                                </div>
                            )}

                            {imagesCount > 1 && (
                                <>
                                    <CarouselPrevious className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity bg-black/50 border-none text-white h-10 w-10 z-40" />
                                    <CarouselNext className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity bg-black/50 border-none text-white h-10 w-10 z-40" />
                                </>
                            )}
                        </Carousel>
                    ) : post.imageUrl && (
                        <NextImage src={post.imageUrl} alt="Post" fill className="object-cover" />
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-4 bg-transparent border-t border-border/10 flex items-center justify-start gap-1">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("rounded-full h-10 w-10 transition-all hover:scale-110 active:scale-90", isLiked ? "text-rose-500" : "text-foreground")}
                    onClick={toggleLike}
                >
                    <Heart className={cn("h-7 w-7", isLiked && "fill-current")} />
                </Button>
                
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-foreground hover:text-primary transition-all">
                            <MessageSquare className="h-7 w-7" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-3xl rounded-[32px]">
                        <DialogHeader className="p-6 bg-muted/30 border-b">
                            <DialogTitle className="text-xl font-headline font-bold">Comments</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 h-[60vh]">
                            <ThreadPostComments postId={post.id} />
                        </div>
                    </DialogContent>
                </Dialog>
                
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-foreground hover:text-accent transition-all -rotate-12">
                            <Send className="h-7 w-7" />
                        </Button>
                    </DialogTrigger>
                    <ShareToMootsDialog post={post} currentUser={user} />
                </Dialog>

                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-foreground hover:text-accent transition-all" onClick={() => toast({ title: "Reposted!" })}>
                    <Repeat className="h-7 w-7" />
                </Button>
            </CardFooter>
        </Card>
    );
}

function PhotoGallery({ profileUser, isOwnProfile }: { profileUser: AppUser, isOwnProfile: boolean }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [posts, setPosts] = useState<ThreadPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    
    const [newEntryContent, setNewEntryContent] = useState('');
    const [tempImages, setTempImages] = useState<{ file: File, preview: string, caption: string }[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsLoading(true);
        const q = query(
            collection(db, 'feedPosts'),
            where('author.id', '==', profileUser.id),
            where('type', 'in', ['studio_journal', 'identity_visual']),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadPost)));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [profileUser.id]);

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newTemps = files.map(file => ({
                file,
                preview: URL.createObjectURL(file),
                caption: ''
            }));
            setTempImages(prev => [...prev, ...newTemps]);
        }
    };

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset!);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
    };

    const handlePublishPost = async () => {
        if (!user || (!newEntryContent.trim() && tempImages.length === 0)) return;
        setIsPosting(true);
        try {
            const uploadedImages = await Promise.all(tempImages.map(async (img) => ({
                url: await uploadToCloudinary(img.file),
                caption: img.caption.trim()
            })));

            const postData = {
                author: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
                content: newEntryContent.trim(),
                images: uploadedImages,
                type: 'identity_visual',
                timestamp: serverTimestamp(),
                reactionsCount: 0,
                commentsCount: 0,
                repostCount: 0,
                reactionCounts: { love: 0 }
            };

            await addDoc(collection(db, 'feedPosts'), postData);
            setNewEntryContent('');
            setTempImages([]);
            toast({ title: "Posted!" });
        } catch (error) {
            toast({ title: "Post Failed", variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {isOwnProfile && (
                <Card className="rounded-[2.5rem] border-primary/5 bg-primary/5 shadow-inner">
                    <CardContent className="p-6 space-y-6">
                        <div className="flex gap-4">
                            <Avatar className="h-12 w-12 border-2 border-background">
                                <AvatarImage src={user?.avatarUrl} />
                                <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                            <Textarea 
                                value={newEntryContent}
                                onChange={e => setNewEntryContent(e.target.value)}
                                placeholder="What's happening?"
                                className="bg-background/40 border-none shadow-inner rounded-2xl resize-none min-h-[100px] text-base"
                                disabled={isPosting}
                            />
                        </div>

                        {tempImages.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-in zoom-in-95 duration-500">
                                {tempImages.map((img, i) => (
                                    <div key={i} className="space-y-2 group relative">
                                        <div className="relative aspect-square rounded-2xl overflow-hidden border border-border/40 shadow-lg">
                                            <NextImage src={img.preview} alt="" fill className="object-cover" />
                                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setTempImages(prev => prev.filter((_, idx) => idx !== i))}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Input 
                                            placeholder="Say something about this..." 
                                            value={img.caption} 
                                            onChange={e => {
                                                const newImgs = [...tempImages];
                                                newImgs[i].caption = e.target.value;
                                                setTempImages(newImgs);
                                            }}
                                            className="h-8 rounded-xl text-[10px] font-bold uppercase tracking-tight bg-background/50"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <Button variant="ghost" size="icon" className="rounded-full bg-background/50 h-11 w-11 shadow-sm text-primary hover:bg-primary/10" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
                                <ImagePlus className="h-5 w-5" />
                            </Button>
                            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
                            <Button onClick={handlePublishPost} disabled={isPosting || (!newEntryContent.trim() && tempImages.length === 0)} className="rounded-full px-10 h-11 font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                                {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Post
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="max-w-xl mx-auto space-y-10">
                {isLoading ? (
                    <div className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
                ) : posts.length > 0 ? (
                    posts.map(post => <VisualGalleryPost key={post.id} post={post} isOwnProfile={isOwnProfile} />)
                ) : (
                    <div className="text-center py-24 text-muted-foreground italic bg-muted/5 rounded-[3rem] border border-dashed border-border/40">
                        No photos shared yet.
                    </div>
                )}
            </div>
        </div>
    );
}

function ProfileStoryCard({ story, isPrivate = false }: { story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint' | 'genre' | 'status' | 'visibility'>, isPrivate?: boolean }) {
  const editLink = `/write/edit-details?storyId=${story.id}`;
  const viewLink = `/stories/${story.id}`;

  return (
    <div className="w-full group">
       <Link href={isPrivate ? editLink : viewLink} passHref>
        <div className={cn(
            "aspect-[2/3] relative rounded-md overflow-hidden shadow-sm transition-all bg-muted cursor-pointer mb-2",
             isPrivate && "opacity-70" 
        )}>
          <NextImage
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            fill
            className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 200px"
          />
           {isPrivate && ( 
            <Badge variant="outline" className="absolute top-2 right-2 text-[10px] bg-background/80 capitalize">{story.status === 'Draft' ? 'Draft' : story.visibility}</Badge>
          )}
        </div>
      </Link>
      <Link href={isPrivate ? editLink : viewLink} className="block">
          <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {story.title}
          </div>
      </Link>
      <p className="text-[10px] text-muted-foreground truncate">{story.genre}</p>
    </div>
  );
}

function UpdatesTab({ profileUser, isOwnProfile }: { profileUser: AppUser, isOwnProfile: boolean }) {
  const { user, addNotification } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const [editingPost, setEditingPost] = useState<Announcement | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const isAppOwner = user && OWNER_HANDLES.includes(user.username);

  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, 'announcements'),
      where('author.id', '==', profileUser.id),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [profileUser.id]);
  
  const handlePostAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newAnnouncement.trim()) return;

    setIsPosting(true);
    const authorSummary = { 
        id: user.id, 
        username: user.username, 
        displayName: user.displayName || user.username, 
        avatarUrl: user.avatarUrl 
    };
    const announcementData = {
        author: authorSummary,
        content: newAnnouncement.trim(),
        timestamp: serverTimestamp()
    };

    addDoc(collection(db, 'announcements'), announcementData)
        .then(async () => {
            setNewAnnouncement('');
            toast({ title: 'Posted!' });
            
            const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', user.id));
            const followersSnapshot = await getDocs(followersQuery);
            followersSnapshot.forEach(followerDoc => {
                addNotification({
                    userId: followerDoc.id,
                    type: 'author_announcement',
                    message: `posted a new update.`,
                    link: `/profile/${user.id}?tab=announcements`,
                    actor: authorSummary
                }).catch(() => {});
            });
        })
        .finally(() => setIsPosting(false));
  };

  const handleUpdateAnnouncement = () => {
    if (!editingPost || !user) return;
    setIsUpdating(true);
    const annoRef = doc(db, 'announcements', editingPost.id);
    updateDoc(annoRef, { content: editedContent, updatedAt: serverTimestamp() })
        .then(() => {
            toast({ title: "Updated!" });
            setIsEditDialogOpen(false);
            setEditingPost(null);
        })
        .finally(() => setIsUpdating(false));
  };

  const handleDeleteAnnouncement = () => {
    if (!deletingPostId || !user) return;
    setIsDeleting(true);
    const annoRef = doc(db, 'announcements', deletingPostId);
    deleteDoc(annoRef)
        .then(() => {
            toast({ title: "Deleted" });
            setIsDeleteDialogOpen(false);
        })
        .finally(() => {
            setIsDeleting(false);
            setDeletingPostId(null);
        });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {isOwnProfile && (
        <Card className="rounded-[1.5rem] border-none bg-muted/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Share an update..."
                  className="bg-transparent border-0 focus-visible:ring-0 resize-none min-h-[80px]"
                  disabled={isPosting}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePostAnnouncement} disabled={isPosting || !newAnnouncement.trim()} size="sm" className="rounded-full px-6">
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Post
                </Button>
              </div>
            </CardContent>
          </Card>
      )}

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
      ) : announcements.length > 0 ? (
        <div className="space-y-4">
            {announcements.map(post => {
            const canManage = isAppOwner || (user && post.author.id === user.id);
            return (
                <div key={post.id} className="group relative flex gap-4 p-4 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-all rounded-2xl">
                    <Link href={`/profile/${post.author.id}`}>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={post.author.avatarUrl} />
                            <AvatarFallback>{post.author.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 truncate">
                            <Link href={`/profile/${post.author.id}`} className="font-bold text-sm hover:underline truncate">@{post.author.username}</Link>
                            {OWNER_HANDLES.includes(post.author.username) && <VerifiedBadge className="h-3 w-3" />}
                            <span className="text-[10px] text-muted-foreground">&bull; {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'now'}</span>
                        </div>
                        {canManage && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem onClick={() => { setEditingPost(post); setEditedContent(post.content); setIsEditDialogOpen(true); }}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingPostId(post.id); setIsDeleteDialogOpen(true); }}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    <div className="whitespace-pre-line text-sm mt-1 leading-relaxed text-foreground/80">{post.content}</div>
                    </div>
                </div>
            );
            })}
        </div>
      ) : !isOwnProfile && (
        <div className="text-center py-12 text-muted-foreground italic">
          No updates yet.
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={5} className="bg-muted/20 border-none rounded-2xl" disabled={isUpdating} />
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button className="rounded-full px-8" onClick={handleUpdateAnnouncement} disabled={isUpdating || !editedContent.trim()}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>This action is permanent.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-destructive hover:bg-destructive/90 rounded-full px-8" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProfilePageClient({ userId }: { userId: string }) {
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading, updateUserProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);
  const [announcementCount, setAnnouncementCount] = useState(0);

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [privateWorks, setPrivateWorks] = useState<Story[]>([]); 

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const u = { id: docSnap.id, ...docSnap.data() } as AppUser;
        setProfileUser(u);
        setBioInput(u.authorBio || '');
      } else {
        setProfileUser(null);
      }
      setIsLoadingData(false);
    });

    const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', userId));
    const unsubscribeFollowersCount = onSnapshot(followersQuery, (snapshot) => {
      setLiveFollowersCount(snapshot.size);
    });

    const annoQuery = query(collection(db, 'announcements'), where('author.id', '==', userId));
    const unsubAnnoCount = onSnapshot(annoQuery, (snap) => setAnnouncementCount(snap.size));

    return () => {
      unsubscribeUser();
      unsubscribeFollowersCount();
      unsubAnnoCount();
    };
  }, [userId, router]);

  useEffect(() => {
    if (!profileUser) return;

    const storiesQuery = isOwnProfile 
        ? query(collection(db, 'stories'), where('author.id', '==', profileUser.id), orderBy('lastUpdated', 'desc'))
        : query(collection(db, 'stories'), where('author.id', '==', profileUser.id), where('visibility', '==', 'Public'), orderBy('lastUpdated', 'desc'));
    
    const unsubStories = onSnapshot(storiesQuery, (snapshot) => {
        const userWrittenStories = snapshot.docs.map(storyDoc => ({ id: storyDoc.id, ...storyDoc.data() } as Story));
        setPublishedWorks(userWrittenStories.filter(s => s.status !== 'Draft' && s.visibility === 'Public'));
        if (isOwnProfile) {
            setPrivateWorks(userWrittenStories.filter(s => s.status === 'Draft' || s.visibility !== 'Public'));
        }
    });

    return () => unsubStories();
  }, [profileUser, isOwnProfile]);

  const handleSaveBio = async () => {
    if (!currentUser) return;
    setIsSavingBio(true);
    try {
        await updateUserProfile({ authorBio: bioInput.trim() });
        setIsEditingBio(false);
        toast({ title: "Saved!" });
    } catch (e) {
        toast({ title: "Failed", variant: "destructive" });
    } finally {
        setIsSavingBio(false);
    }
  };

  const handleClearBio = () => {
    setBioInput('');
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileUser) {
    return (
        <div className="text-center py-20">
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-headline font-bold text-destructive">User Not Found</h2>
            <Button onClick={() => router.push('/')} variant="outline" className="mt-8">Go Home</Button>
        </div>
    );
  }

  const isFollowing = currentUser?.followingIds?.includes(profileUser.id) || false;
  const isFollower = profileUser?.followingIds?.includes(currentUser?.id || '') || false;
  const isMoot = isFollowing && isFollower;
  
  const displayName = profileUser.displayName || profileUser.username;
  const showAnnouncementsTab = isOwnProfile || announcementCount > 0;

  return (
    <div className="pb-20 animate-in fade-in duration-500">
      <div className="relative w-full aspect-[21/9] md:aspect-[4/1] bg-muted overflow-hidden">
        {profileUser.coverImageUrl ? (
            <NextImage 
                src={profileUser.coverImageUrl} 
                alt="Cover" 
                fill 
                className="object-cover" 
                priority
            />
        ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        )}
      </div>

      <div className="container mx-auto px-4 -mt-14 sm:-mt-20 md:-mt-24 relative z-10">
          <div className="flex flex-row items-end gap-3 sm:gap-6 md:gap-8">
              <div className="relative group flex-shrink-0">
                  <Avatar className="h-28 w-28 sm:h-36 sm:w-36 md:h-48 md:w-48 border-[3px] sm:border-[4px] md:border-[6px] border-background shadow-2xl">
                      <AvatarImage src={profileUser.avatarUrl} />
                      <AvatarFallback className="text-2xl sm:text-3xl md:text-4xl bg-muted text-primary">{displayName.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
              </div>
              
              <div className="flex-1 min-w-0 pb-1 sm:pb-2 relative">
                  {isOwnProfile && (
                      <div className="absolute top-1 sm:top-2 right-0 z-20">
                        <Link href="/settings">
                            <Button variant="outline" size="sm" className="rounded-full shadow-lg gap-2 border-border/60 bg-background/70 h-9 sm:h-10 px-3 sm:px-4">
                                <Settings className="h-4 w-4" />
                                <span className="hidden sm:inline">Settings</span>
                            </Button>
                        </Link>
                      </div>
                  )}
                  <div className="space-y-0.5 sm:space-y-1 mb-1 sm:mb-2 pr-10 sm:pr-0">
                      <h1 className="text-2xl sm:text-3xl md:text-5xl font-headline font-bold flex items-center gap-1.5 sm:gap-2 tracking-tight">
                        <span className="truncate">{displayName}</span>
                        {profileUser.isVerified && <VerifiedBadge className="h-5 w-5 md:h-6 md:w-6 shrink-0" />}
                      </h1>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium">@{profileUser.username}</p>
                      </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
                      <Link href={`/profile/${userId}/connections?tab=followers`} className="hover:text-primary transition-colors flex items-center gap-1.5">
                        <span className="font-bold">{liveFollowersCount ?? '...'}</span> 
                        <span className="text-muted-foreground font-medium uppercase text-[8px] sm:text-[10px] tracking-widest">Followers</span>
                      </Link>
                      <Link href={`/profile/${userId}/connections?tab=following`} className="hover:text-primary transition-colors flex items-center gap-1.5">
                        <span className="font-bold">{profileUser.followingCount || 0}</span>
                        <span className="text-muted-foreground font-medium uppercase text-[8px] sm:text-[10px] tracking-widest">Following</span>
                      </Link>
                  </div>

                  {profileUser.bio && <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl leading-relaxed line-clamp-2">{profileUser.bio}</p>}
                  
                  {!isOwnProfile && (
                    <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 sm:pt-4">
                        <Button onClick={() => isFollowing ? unfollowUser(profileUser.id) : followUser(profileUser.id)} disabled={followActionLoading} variant={isFollowing ? "outline" : "default"} className="rounded-full px-4 sm:px-8 font-bold h-10 sm:h-11 text-xs sm:text-sm">
                            {followActionLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : isFollowing ? <UserX className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                            {isFollowing ? 'Unfollow' : 'Follow'}
                        </Button>
                        <Link href={`/notifications?tab=messages&startConversationWith=${profileUser.id}`}>
                            <Button variant="outline" className="rounded-full px-4 sm:px-8 gap-2 border-border/60 h-10 sm:h-11 text-xs sm:text-sm">
                                <MessageCircle className="h-4 w-4" /> Message
                            </Button>
                        </Link>
                    </div>
                  )}
              </div>
          </div>
      </div>

      <main className="container mx-auto px-4 mt-10 md:mt-12 space-y-10">
        <Tabs defaultValue="works" className="w-full">
          <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-6 md:gap-10">
            <TabsTrigger value="works" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-4 px-0 transition-all text-xs md:text-sm uppercase tracking-widest">Stories</TabsTrigger>
            <TabsTrigger value="feed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-4 px-0 transition-all text-xs md:text-sm uppercase tracking-widest">Social</TabsTrigger>
            {showAnnouncementsTab && (
                <TabsTrigger value="announcements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-4 px-0 transition-all text-xs md:text-sm uppercase tracking-widest">Updates</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="works" className="mt-8 space-y-12">
            {publishedWorks.length > 0 && (
              <div>
                <h2 className="text-xl font-headline font-bold mb-6 flex items-center gap-2 tracking-tight">
                    <BookOpen className="h-5 w-5 text-primary" /> 
                    Published Stories
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
                    {publishedWorks.map(story => ( <ProfileStoryCard key={story.id} story={story} /> ))}
                </div>
              </div>
            )}
            
            {isOwnProfile && privateWorks.length > 0 && (
              <div>
                <h2 className="text-xl font-headline font-bold mb-6 flex items-center gap-2 tracking-tight"><Lock className="h-5 w-5 text-muted-foreground" /> Private Drafts</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
                    {privateWorks.map(story => ( <ProfileStoryCard key={story.id} story={story} isPrivate /> ))}
                </div>
              </div>
            )}

            {publishedWorks.length === 0 && !isOwnProfile && (
                 <div className="text-center py-32 text-muted-foreground border-2 border-dashed rounded-[3rem] border-border/40">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-bold text-foreground">Archive is Empty</h3>
                    <p className="text-sm">No public stories found.</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="feed" className="mt-8">
             <Tabs defaultValue="about" className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md">
                        <TabsTrigger value="about" className="rounded-full font-bold gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <PenTool className="h-4 w-4" /> About Me
                        </TabsTrigger>
                        <TabsTrigger value="archive" className="rounded-full font-bold gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <LayoutGrid className="h-4 w-4" /> Photos
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="about" className="space-y-10 animate-in fade-in duration-500">
                    <Card className="rounded-[2.5rem] border-none bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[400px]">
                        <CardHeader className="p-8 border-b border-border/10 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-headline font-bold text-foreground">About Me</CardTitle>
                            </div>
                            {isOwnProfile && (
                                <div className="flex gap-2">
                                    {!isEditingBio ? (
                                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5" onClick={() => setIsEditingBio(true)}>
                                            <Edit2 className="h-5 w-5 text-primary" />
                                        </Button>
                                    ) : (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:bg-destructive/5" onClick={handleClearBio}>
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setIsEditingBio(false); setBioInput(profileUser.authorBio || ''); }}>
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            {isEditingBio ? (
                                <div className="space-y-6">
                                    <Textarea 
                                        value={bioInput}
                                        onChange={e => setBioInput(e.target.value)}
                                        placeholder="Tell your story here..."
                                        className="min-h-[300px] text-lg leading-relaxed bg-muted/20 border-none shadow-inner rounded-3xl p-8 focus-visible:ring-primary/20"
                                        disabled={isSavingBio}
                                    />
                                    <Button 
                                        className="w-full h-12 rounded-full font-bold uppercase text-xs tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" 
                                        onClick={handleSaveBio} 
                                        disabled={isSavingBio || bioInput === (profileUser.authorBio || '')}
                                    >
                                        {isSavingBio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Info
                                    </Button>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-lg md:text-xl leading-relaxed text-foreground/80 whitespace-pre-line italic font-medium">
                                        {profileUser.authorBio ? (
                                            <>
                                                <Quote className="h-6 w-6 text-primary/20 -scale-x-100 inline mr-2 mb-1" />
                                                {profileUser.authorBio}
                                            </>
                                        ) : "No information shared yet."}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="archive" className="animate-in fade-in duration-500">
                    {(isOwnProfile || isMoot) ? (
                        <PhotoGallery profileUser={profileUser} isOwnProfile={isOwnProfile} />
                    ) : (
                        <div className="text-center py-24 text-muted-foreground italic bg-muted/5 rounded-[3rem] border border-dashed border-border/40">
                            This archive is for mutual friends only.
                        </div>
                    )}
                </TabsContent>
             </Tabs>
          </TabsContent>

          {showAnnouncementsTab && (
            <TabsContent value="announcements" className="mt-8">
                <UpdatesTab profileUser={profileUser} isOwnProfile={isOwnProfile} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
