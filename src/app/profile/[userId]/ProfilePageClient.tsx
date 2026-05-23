'use client';

import { useEffect, useState, FormEvent, useRef, ChangeEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  MessageSquare, 
  UserPlus, 
  UserX, 
  Settings, 
  ShieldAlert, 
  MoreHorizontal, 
  Trash2, 
  Lock, 
  BookOpen,
  PencilLine,
  Coffee,
  CloudRain,
  Zap,
  Moon,
  GraduationCap,
  Heart,
  Headphones,
  History,
  Trophy,
  PenTool,
  Quote,
  ImagePlus,
  X,
  Send,
  Edit,
  Save,
  Plus,
  ChevronRight,
  Download,
  Share2,
  Repeat,
  Tag,
  Star,
  Maximize2,
  LayoutGrid,
  FileText
} from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, Announcement, WritingStatus, ThreadPost, UserSummary } from '@/types';
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
  arrayRemove
} from 'firebase/firestore';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ProfilePhotoGrid from '@/components/profile/ProfilePhotoGrid';
import VerifiedBadge from '@/components/icons/VerifiedBadge';
import ReactionButton from '@/components/threads/ReactionButton';
import ThreadPostComments from '@/components/threads/ThreadPostComments';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const OWNER_HANDLES = ['arnv'];

const WRITING_STATUS_MAP: Record<WritingStatus, { label: string; icon: any; color: string }> = {
    none: { label: '', icon: null, color: '' },
    writing: { label: 'Currently Writing', icon: PencilLine, color: 'text-primary' },
    break: { label: 'Taking a Short Break', icon: Coffee, color: 'text-orange-400' },
    hiatus: { label: 'On Hiatus', icon: CloudRain, color: 'text-blue-400' },
    update: { label: 'Preparing Big Update', icon: Zap, color: 'text-yellow-500' },
    burnout: { label: 'Burned Out', icon: Moon, color: 'text-purple-400' },
    school: { label: 'Busy With School', icon: GraduationCap, color: 'text-emerald-500' },
    rewriting: { label: 'Rewriting Story', icon: Heart, color: 'text-rose-500' },
    brainstorming: { label: 'Brainstorming Arc', icon: Headphones, color: 'text-cyan-500' },
};

function VisualGallery({ profileUser, isOwnProfile }: { profileUser: AppUser, isOwnProfile: boolean }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [posts, setPosts] = useState<ThreadPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsSubmitting] = useState(false);
    
    const [newEntryContent, setNewEntryContent] = useState('');
    const [tempImages, setTempImages] = useState<{ file: File, preview: string, caption: string }[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerImage, setViewerImage] = useState<{ url: string, caption?: string } | null>(null);

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
        setIsSubmitting(true);
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
                repostCount: 0
            };

            await addDoc(collection(db, 'feedPosts'), postData);
            setNewEntryContent('');
            setTempImages([]);
            toast({ title: "Archived to Visual Feed" });
        } catch (error) {
            toast({ title: "Archive Failed", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadImage = async (url: string, name: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = name || 'D4RKV3NOM-Archive.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast({ title: "Saved to Device" });
        } catch (e) {
            toast({ title: "Save Failed", variant: "destructive" });
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
                                placeholder="What visual nodes are you archiving today?"
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
                                            placeholder="Add caption..." 
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
                                Sync Archive
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="max-w-xl mx-auto space-y-10">
                {isLoading ? (
                    <div className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
                ) : posts.length > 0 ? (
                    posts.map(post => (
                        <Card key={post.id} className="rounded-[2.5rem] overflow-hidden border-none shadow-lg bg-card/60 backdrop-blur-sm group">
                            <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-border/20">
                                        <AvatarImage src={post.author.avatarUrl} />
                                        <AvatarFallback>OW</AvatarFallback>
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
                                        <DropdownMenuItem className="gap-2"><Share2 className="h-4 w-4" /> Share to Mutuals</DropdownMenuItem>
                                        {isOwnProfile && (
                                            <DropdownMenuItem className="text-destructive gap-2" onClick={() => deleteDoc(doc(db, 'feedPosts', post.id))}><Trash2 className="h-4 w-4" /> Delete Visual</DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>

                            <CardContent className="p-0 space-y-4">
                                {post.content && (
                                    <div className="px-6 pb-2">
                                        <p className="text-sm md:text-base leading-relaxed text-foreground/80">{post.content}</p>
                                    </div>
                                )}

                                {post.images && post.images.length > 0 ? (
                                    <div className="relative">
                                        <Carousel className="w-full">
                                            <CarouselContent>
                                                {post.images.map((img, idx) => (
                                                    <CarouselItem key={idx}>
                                                        <div className="relative aspect-square w-full cursor-pointer group/img" onClick={() => { setViewerImage(img); setViewerOpen(true); }}>
                                                            <NextImage src={img.url} alt="" fill className="object-cover transition-transform duration-700 group-hover/img:scale-105" />
                                                            {img.caption && (
                                                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
                                                                    <p className="text-sm font-medium drop-shadow-md">{img.caption}</p>
                                                                </div>
                                                            )}
                                                            <div className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                                <Maximize2 className="h-5 w-5 text-white" />
                                                            </div>
                                                        </div>
                                                    </CarouselItem>
                                                ))}
                                            </CarouselContent>
                                            {post.images.length > 1 && (
                                                <>
                                                    <CarouselPrevious className="left-4 bg-black/20 text-white border-none h-10 w-10" />
                                                    <CarouselNext className="right-4 bg-black/20 text-white border-none h-10 w-10" />
                                                </>
                                            )}
                                        </Carousel>
                                        {post.images.length > 1 && (
                                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xl px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest z-10">
                                                Visual Archive: 1/{post.images.length}
                                            </div>
                                        )}
                                    </div>
                                ) : post.imageUrl && (
                                    <div className="relative aspect-square w-full cursor-pointer group/img" onClick={() => { setViewerImage({ url: post.imageUrl! }); setViewerOpen(true); }}>
                                        <NextImage src={post.imageUrl} alt="" fill className="object-cover transition-transform duration-700 group-hover/img:scale-105" />
                                        <div className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <Maximize2 className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="p-4 bg-muted/10 border-t border-border/10 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <ReactionButton postId={post.id} parentCollection="feedPosts" initialReactionsCount={post.reactionsCount || 0} reactionCounts={post.reactionCounts} />
                                    
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="rounded-full h-9 px-4 gap-2 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                                                <MessageSquare className="h-4 w-4" />
                                                <span>{post.commentsCount || 0}</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-3xl rounded-[32px]">
                                            <DialogHeader className="p-6 bg-muted/30 border-b">
                                                <DialogTitle className="text-xl font-headline font-bold">Thoughts & Echoes</DialogTitle>
                                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Community feedback on this visual node</DialogDescription>
                                            </DialogHeader>
                                            <div className="p-6 h-[60vh]">
                                                <ThreadPostComments postId={post.id} />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-accent" onClick={() => {}}>
                                        <Repeat className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => {
                                        const url = post.images?.[0]?.url || post.imageUrl;
                                        if(url) downloadImage(url, `D4RKV3NOM-${post.id}.jpg`);
                                    }}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-24 text-muted-foreground italic bg-muted/5 rounded-[3rem] border border-dashed border-border/40">
                        The visual archives for this creator are currently sealed.
                    </div>
                )}
            </div>

            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="max-w-screen-xl h-[95vh] p-0 border-none bg-black/95 backdrop-blur-3xl rounded-none shadow-none flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 relative bg-black flex items-center justify-center p-4">
                        {viewerImage && (
                            <div className="relative w-full h-full">
                                <NextImage 
                                    src={viewerImage.url} 
                                    alt="Archive" 
                                    fill 
                                    className="object-contain animate-in fade-in zoom-in-95 duration-500" 
                                />
                            </div>
                        )}
                        <Button variant="ghost" size="icon" className="absolute top-6 left-6 text-white bg-white/10 rounded-full h-12 w-12" onClick={() => setViewerOpen(false)}>
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="w-full md:w-[400px] bg-background border-l border-border/40 flex flex-col h-full">
                        <div className="p-6 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-border/20">
                                    <AvatarImage src={profileUser.avatarUrl} />
                                    <AvatarFallback>OW</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-sm">@{profileUser.username}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Identity Post</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => viewerImage && downloadImage(viewerImage.url, 'Archive-Full.jpg')}>
                                <Download className="h-5 w-5" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-8">
                                {viewerImage?.caption && (
                                    <div className="p-5 bg-muted/20 rounded-2xl border border-dashed border-border/40">
                                        <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                                            <Quote className="h-4 w-4 text-primary/20 inline mr-2 mb-1" />
                                            {viewerImage.caption}
                                        </p>
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Community Discussion</h5>
                                    <p className="text-xs italic text-center py-10 opacity-40">Contextual discussion available on post view.</p>
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 text-rose-500 bg-rose-500/10"><Heart className="h-5 w-5 fill-current" /></Button>
                                <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 text-primary bg-primary/10"><MessageSquare className="h-5 w-5" /></Button>
                            </div>
                            <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 text-accent bg-accent/10"><Share2 className="h-5 w-5" /></Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
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
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 200px"
            data-ai-hint={story.dataAiHint || "book cover"}
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

function AnnouncementsTab({ profileUser, isOwnProfile }: { profileUser: AppUser, isOwnProfile: boolean }) {
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
            toast({ title: 'Update posted!' });
            
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
            toast({ title: "Update saved!" });
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
            toast({ title: "Update deleted" });
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
        <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Share an update with your followers..."
                  className="bg-muted/30 border-0 focus-visible:ring-0 resize-none min-h-[80px]"
                  disabled={isPosting}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePostAnnouncement} disabled={isPosting || !newAnnouncement.trim()} size="sm">
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Post Update
                </Button>
              </div>
            </CardContent>
          </Card>
      )}

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
      ) : announcements.length > 0 ? (
        announcements.map(post => {
          const canManage = isAppOwner || (user && post.author.id === user.id);
          return (
            <Card key={post.id}>
                <CardContent className="p-4">
                <div className="flex gap-4">
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
                        </div>
                        {canManage && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setEditingPost(post); setEditedContent(post.content); setIsEditDialogOpen(true); }}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingPostId(post.id); setIsDeleteDialogOpen(true); }}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground -mt-0.5 mb-2">{post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'now'}</p>
                    <div className="whitespace-pre-line text-sm">{post.content}</div>
                    </div>
                </div>
                </CardContent>
            </Card>
          );
        })
      ) : !isOwnProfile && (
        <div className="text-center py-12 text-muted-foreground italic">
          No updates posted yet.
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Update</DialogTitle>
            <DialogDescription>Update your announcement</DialogDescription>
          </DialogHeader>
          <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={5} disabled={isUpdating} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdateAnnouncement} disabled={isUpdating || !editedContent.trim()}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Update
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

  // About Author Inline Editor States
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
        toast({ title: "Author Identity Updated" });
    } catch (e) {
        toast({ title: "Update Failed", variant: "destructive" });
    } finally {
        setIsSavingBio(false);
    }
  };

  const handleClearBio = () => {
    if (confirm("Are you sure you want to clear your full author identity bio?")) {
        setBioInput('');
    }
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
  const displayName = profileUser.displayName || profileUser.username;
  const showAnnouncementsTab = isOwnProfile || announcementCount > 0;
  const writingStatus = profileUser.writingStatus && profileUser.writingStatus !== 'none' 
    ? WRITING_STATUS_MAP[profileUser.writingStatus] 
    : null;

  return (
    <div className="pb-20 animate-in fade-in duration-500">
      <div className="relative w-full aspect-[21/9] md:aspect-[4/1] bg-muted overflow-hidden">
        {profileUser.coverImageUrl ? (
            <NextImage 
                src={profileUser.coverImageUrl} 
                alt="Profile Cover" 
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
                  {writingStatus && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background border shadow-xl px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 whitespace-nowrap z-10">
                        <writingStatus.icon className={cn("h-3 w-3 sm:h-4 sm:w-4", writingStatus.color)} />
                        <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-foreground/80">{writingStatus.label}</span>
                      </div>
                  )}
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
                                <MessageSquare className="h-4 w-4" /> Message
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
            <TabsTrigger value="works" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-4 px-0 transition-all text-xs md:text-sm uppercase tracking-widest">Works</TabsTrigger>
            <TabsTrigger value="feed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-4 px-0 transition-all text-xs md:text-sm uppercase tracking-widest">Feed</TabsTrigger>
            {showAnnouncementsTab && (
                <TabsTrigger value="announcements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-4 px-0 transition-all text-xs md:text-sm uppercase tracking-widest">Updates</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="works" className="mt-8 space-y-12">
            {publishedWorks.length > 0 && (
              <div>
                <Link href="/write" className="inline-block group">
                  <h2 className="text-xl font-headline font-bold mb-6 flex items-center gap-2 tracking-tight group-hover:text-primary transition-colors cursor-pointer">
                    <BookOpen className="h-5 w-5 text-primary" /> 
                    Published Works
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                  </h2>
                </Link>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
                    {publishedWorks.map(story => ( <ProfileStoryCard key={story.id} story={story} /> ))}
                </div>
              </div>
            )}
            
            {isOwnProfile && privateWorks.length > 0 && (
              <div>
                <h2 className="text-xl font-headline font-bold mb-6 flex items-center gap-2 tracking-tight"><Lock className="h-5 w-5 text-muted-foreground" /> Private Archives</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
                    {privateWorks.map(story => ( <ProfileStoryCard key={story.id} story={story} isPrivate /> ))}
                </div>
              </div>
            )}

            {publishedWorks.length === 0 && !isOwnProfile && (
                 <div className="text-center py-32 text-muted-foreground border-2 border-dashed rounded-[3rem] border-border/40">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-bold text-foreground">Archive is Empty</h3>
                    <p className="text-sm">This creator hasn't published any public manuscripts yet.</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="feed" className="mt-8">
             <Tabs defaultValue="about" className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md">
                        <TabsTrigger value="about" className="rounded-full font-bold gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <PenTool className="h-4 w-4" /> About Author
                        </TabsTrigger>
                        <TabsTrigger value="archive" className="rounded-full font-bold gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <LayoutGrid className="h-4 w-4" /> Visual Archive
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="about" className="space-y-10 animate-in fade-in duration-500">
                    <Card className="rounded-[2.5rem] border-none bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[400px]">
                        <CardHeader className="p-8 border-b border-border/10 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-headline font-bold text-foreground">About the Author</CardTitle>
                                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Identity Archival Hub</CardDescription>
                            </div>
                            {isOwnProfile && (
                                <div className="flex gap-2">
                                    {!isEditingBio ? (
                                        <Button variant="ghost" size="sm" className="rounded-full gap-2 text-primary hover:bg-primary/5" onClick={() => setIsEditingBio(true)}>
                                            <Edit className="h-4 w-4" /> Edit Identity
                                        </Button>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="sm" className="rounded-full text-destructive hover:bg-destructive/5" onClick={handleClearBio}>
                                                <Trash2 className="h-4 w-4" /> Clear All
                                            </Button>
                                            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setIsEditingBio(false); setBioInput(profileUser.authorBio || ''); }}>
                                                Cancel
                                            </Button>
                                        </>
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
                                        placeholder="What do you want your readers to know about you? This is your private author archival space..."
                                        className="min-h-[300px] text-lg leading-relaxed bg-muted/20 border-none shadow-inner rounded-3xl p-8 focus-visible:ring-primary/20"
                                        disabled={isSavingBio}
                                    />
                                    <Button 
                                        className="w-full h-16 rounded-full font-bold uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all hover:scale-[1.01] active:scale-95" 
                                        onClick={handleSaveBio} 
                                        disabled={isSavingBio || bioInput === (profileUser.authorBio || '')}
                                    >
                                        {isSavingBio ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                        Save Identity Bio
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
                                        ) : "The author has not yet archived their identity bio."}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4 pt-8 border-t border-border/10">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
                                    <Tag className="h-3 w-3" /> Life Nodes (Favorites)
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {profileUser.lifeTags?.map((tag, i) => (
                                        <Badge key={i} variant="outline" className="rounded-full px-4 h-8 bg-muted/20 border-primary/20 text-primary font-bold text-[10px] uppercase tracking-widest">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {(!profileUser.lifeTags || profileUser.lifeTags.length === 0) && (
                                        <span className="text-[10px] italic text-muted-foreground/40 px-1">No life nodes archived yet.</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="archive" className="animate-in fade-in duration-500">
                    <VisualGallery profileUser={profileUser} isOwnProfile={isOwnProfile} />
                </TabsContent>
             </Tabs>
          </TabsContent>

          {showAnnouncementsTab && (
            <TabsContent value="announcements" className="mt-8">
                <AnnouncementsTab profileUser={profileUser} isOwnProfile={isOwnProfile} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
