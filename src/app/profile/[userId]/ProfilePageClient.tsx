
'use client';

import { useEffect, useState, FormEvent, useTransition } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, UserPlus, UserX, Settings, LogOut, Edit3, FileText, ShieldAlert, PenSquare, Send, MoreHorizontal, Edit, Trash2, LayoutGrid, Megaphone, CheckCircle, Star, Sparkles, Music, Lock, Pin, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, Announcement, UserSummary, Letter as LetterType } from '@/types';
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
  limit
} from 'firebase/firestore';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ProfilePhotoGrid from '@/components/profile/ProfilePhotoGrid';
import VerifiedBadge from '@/components/icons/VerifiedBadge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const OWNER_HANDLES = ['authorrafaelnv', 'd4rkv3nom'];

function ProfileStoryCard({ story, isPrivate = false }: { story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint' | 'genre' | 'status' | 'visibility'>, isPrivate?: boolean }) {
  const editLink = `/write/edit-details?storyId=${story.id}`;
  const viewLink = `/stories/${story.id}`;

  return (
    <div className="w-full group text-center">
       <Link href={isPrivate ? editLink : viewLink} passHref>
        <div className={cn(
            "aspect-[2/3] relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 bg-muted cursor-pointer mb-3 group-hover:-translate-y-1",
             isPrivate && "opacity-70 group-hover:opacity-100" 
        )}>
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            fill
            className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 200px"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
           {isPrivate && ( 
            <Badge variant="outline" className="absolute top-2 right-2 text-[10px] bg-background/80 capitalize font-bold uppercase tracking-widest">{story.status === 'Draft' ? 'Draft' : story.visibility}</Badge>
          )}
        </div>
      </Link>
      <Link href={isPrivate ? editLink : viewLink} passHref>
          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors cursor-pointer leading-tight">
            {story.title}
          </p>
      </Link>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1 truncate">{story.genre}</p>
    </div>
  );
}

function AnnouncementsTab({ profileUser, isOwnProfile }: { profileUser: AppUser, isOwnProfile: boolean }) {
  const { user, addNotification } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isPosting, setIsPosting] = useState(false);

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
        <form onSubmit={handlePostAnnouncement}>
          <Card className="border-border/40 shadow-sm overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <div className="p-5 flex gap-4">
                <Avatar className="h-12 w-12 border border-border/20 hidden sm:block">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <Textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Share an update with your followers..."
                    className="bg-transparent border-0 focus-visible:ring-0 shadow-none resize-none p-0 text-base min-h-[100px]"
                    disabled={isPosting}
                    />
                </div>
              </div>
              <div className="bg-muted/30 px-5 py-3 flex justify-between items-center border-t border-border/40">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Post as @{user?.username}</p>
                <Button disabled={isPosting || !newAnnouncement.trim()} size="sm" className="rounded-full px-6 shadow-md shadow-primary/20 font-bold">
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Post Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-50">Syncing updates...</p>
        </div>
      ) : announcements.length > 0 ? (
        announcements.map(post => {
          const canManage = isAppOwner || (user && post.author.id === user.id);
          return (
            <Card key={post.id} className="border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-3xl">
                <CardContent className="p-5">
                <div className="flex gap-4">
                    <Link href={`/profile/${post.author.id}`}>
                        <Avatar className="h-12 w-12 border border-border/20">
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                    <DropdownMenuItem onClick={() => { setEditingPost(post); setEditedContent(post.content); setIsEditDialogOpen(true); }} className="gap-2">
                                        <Edit className="h-4 w-4"/>Edit Update
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2" onClick={() => { setDeletingPostId(post.id); setIsDeleteDialogOpen(true); }}>
                                        <Trash2 className="h-4 w-4"/>Delete Update
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter -mt-0.5 mb-3">{post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'now'}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{post.content}</p>
                    </div>
                </div>
                </CardContent>
            </Card>
          );
        })
      ) : !isOwnProfile && (
        <div className="text-center py-24 text-muted-foreground bg-card/50 rounded-3xl border-2 border-dashed border-border/40">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <h3 className="font-headline font-bold text-lg text-foreground">Silence in the archives</h3>
          <p className="text-sm max-w-[200px] mx-auto mt-1">{`${profileUser.displayName || profileUser.username} hasn't posted any updates yet.`}</p>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <DialogTitle className="font-headline text-xl">Edit Update</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Update your announcement</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <Textarea 
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
                className="bg-muted/30 focus-visible:ring-primary border-none shadow-inner resize-none text-base rounded-2xl"
                disabled={isUpdating}
            />
          </div>
          <DialogFooter className="p-4 bg-muted/30 border-t gap-2">
            <DialogClose asChild><Button variant="ghost" className="rounded-full" disabled={isUpdating}>Cancel</Button></DialogClose>
            <Button onClick={handleUpdateAnnouncement} disabled={isUpdating || !editedContent.trim()} className="rounded-full px-6 shadow-lg shadow-primary/20">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-2xl">Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your followers will no longer be able to see this announcement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-destructive hover:bg-destructive/90 rounded-full px-6" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProfilePageClient({ userId }: { userId: string }) {
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading, signOutFirebase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [pinnedLetters, setPinnedLetters] = useState<LetterType[]>([]);
  const defaultTab = searchParams.get('tab') || 'works';

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [privateWorks, setPrivateWorks] = useState<Story[]>([]); 

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
        setProfileUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
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

    // Fetch Reader Praise (Pinned Letters)
    const pinnedLettersQuery = query(
        collection(db, 'letters'),
        where('authorId', '==', userId),
        where('isPinned', '==', true),
        where('visibility', '==', 'public'),
        orderBy('timestamp', 'desc'),
        limit(6)
    );
    const unsubPinned = onSnapshot(pinnedLettersQuery, (snapshot) => {
        setPinnedLetters(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LetterType)));
    });

    return () => {
      unsubscribeUser();
      unsubscribeFollowersCount();
      unsubAnnoCount();
      unsubPinned();
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
            <h2 className="text-xl font-headline font-bold text-destructive">Archive Record Missing</h2>
            <p className="text-muted-foreground mt-1">This creator may have unlisted their profile.</p>
            <Button onClick={() => router.push('/')} variant="outline" className="mt-8 rounded-full px-8">Return to Discovery</Button>
        </div>
    );
  }

  const isFollowing = currentUser?.followingIds?.includes(profileUser.id) || false;
  const displayName = profileUser.displayName || profileUser.username;
  const showAnnouncementsTab = isOwnProfile || announcementCount > 0;
  
  // Progression Logic
  const currentLevel = profileUser.level || 1;
  const currentXP = profileUser.xp || 0;
  const xpForNextLevel = currentLevel * 500;
  const xpPercentage = (currentXP / xpForNextLevel) * 100;

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative flex-shrink-0">
                  <Avatar className="h-32 w-32 md:h-48 md:w-48 border-4 border-background shadow-2xl ring-1 ring-border/40">
                      <AvatarImage src={profileUser.avatarUrl} />
                      <AvatarFallback className="text-4xl font-headline bg-primary/10 text-primary">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                      <Link href="/settings/profile" className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-full shadow-lg border-2 border-background hover:scale-110 transition-transform">
                          <Edit className="h-4 w-4" />
                      </Link>
                  )}
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-4 pt-2">
                  <div>
                      <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center justify-center md:justify-start gap-3 tracking-tight">
                        {displayName}
                        {profileUser.isVerified && <VerifiedBadge className="h-7 w-7" />}
                      </h1>
                      <p className="text-sm md:text-base font-bold text-primary/60 uppercase tracking-widest mt-1">@{profileUser.username}</p>
                  </div>

                  <div className="max-w-md mx-auto md:mx-0 space-y-2">
                      <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Star className="h-3 w-3 text-yellow-500 fill-current" /> Level {currentLevel}</span>
                          <span className="text-primary">{currentXP} / {xpForNextLevel} XP</span>
                      </div>
                      <Progress value={xpPercentage} className="h-1.5 bg-muted/40 shadow-inner" />
                  </div>

                  {profileUser.bio && <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">{profileUser.bio}</p>}
                  
                  {profileUser.achievements && profileUser.achievements.length > 0 && (
                      <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                          {profileUser.achievements.map(ach => (
                              <TooltipProvider key={ach.id}>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <div className="bg-muted/50 p-1.5 rounded-lg border border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-default group">
                                              <Sparkles className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100" />
                                          </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">{ach.name}</TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          ))}
                      </div>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 mt-4 md:mt-0 w-full sm:w-auto self-center">
              {isOwnProfile ? (
                <>
                  <Link href="/settings" passHref className="w-full">
                    <Button variant="outline" className="w-full rounded-full h-11 border-border/60 hover:bg-muted font-bold"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
                  </Link>
                  <Button variant="ghost" onClick={signOutFirebase} className="w-full rounded-full h-11 text-destructive hover:bg-destructive/10 font-bold"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
                </>
              ) : currentUser ? (
                <>
                  <Button onClick={() => isFollowing ? unfollowUser(profileUser.id) : followUser(profileUser.id)} disabled={followActionLoading} variant={isFollowing ? "outline" : "default"} className={cn("min-w-[140px] w-full rounded-full h-11 shadow-lg font-bold", !isFollowing && "shadow-primary/20 bg-primary")}>
                    {followActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFollowing ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                   <Link href={`/notifications?tab=messages&startConversationWith=${profileUser.id}`} passHref className="w-full">
                      <Button variant="outline" className="w-full rounded-full h-11 font-bold"><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
                  </Link>
                </>
              ) : (
                  <Button onClick={() => router.push('/auth/signin')} variant="default" className="min-w-[140px] w-full rounded-full h-11 font-bold shadow-lg shadow-primary/20 bg-primary">
                      <UserPlus className="mr-2 h-4 w-4" /> Follow
                  </Button>
              )}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 sm:flex justify-center md:justify-start gap-x-12 gap-y-6 py-6 border-y border-border/40">
            <div className="text-center md:text-left">
                <p className="text-2xl font-bold tracking-tight">{publishedWorks.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Works</p>
            </div>
            <Link href={`/profile/${userId}/connections?tab=followers`} className="text-center md:text-left group">
                <p className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">{liveFollowersCount ?? '...'}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground">Followers</p>
            </Link>
            <Link href={`/profile/${userId}/connections?tab=following`} className="text-center md:text-left group">
                <p className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">{profileUser.followingCount || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground">Following</p>
            </Link>
          </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {profileUser.profileSongUrl && (
            <section className="animate-in slide-in-from-bottom-2 duration-700">
                <div className="flex items-center gap-2 mb-4 ml-1">
                    <Music className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Current Writing Loop</h3>
                </div>
                <Card className="overflow-hidden border-none shadow-xl rounded-3xl bg-card/40 backdrop-blur-sm">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1">
                                <SpotifyPlayer trackUrl={profileUser.profileSongUrl} />
                            </div>
                            {profileUser.profileSongNote && (
                                <div className="p-6 md:w-80 flex items-center bg-primary/5 border-l border-border/40">
                                    <p className="text-sm italic text-foreground/80 font-serif leading-relaxed">"{profileUser.profileSongNote}"</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </section>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={cn("grid w-full max-w-2xl mx-auto bg-muted/50 p-1 rounded-full border shadow-inner", showAnnouncementsTab ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="works" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold h-10"><PenSquare className="mr-2 h-4 w-4" />Manuscripts</TabsTrigger>
            <TabsTrigger value="feed" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold h-10"><LayoutGrid className="mr-2 h-4 w-4" />Feed</TabsTrigger>
            {showAnnouncementsTab && (
                <TabsTrigger value="announcements" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold h-10"><Megaphone className="mr-2 h-4 w-4" />Updates</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="works" className="mt-10 animate-in fade-in duration-500 space-y-12">
            {publishedWorks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-headline font-bold text-foreground tracking-tight flex items-center gap-2">
                        <Edit3 className="h-6 w-6 text-primary" /> Published Works
                    </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
                    {publishedWorks.map(story => ( <ProfileStoryCard key={`published-${story.id}`} story={story} /> ))}
                </div>
              </section>
            )}
            
            {pinnedLetters.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Star className="h-6 w-6 text-yellow-500 fill-current" />
                        <h2 className="text-2xl font-headline font-bold text-foreground tracking-tight">Reader Praise</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {pinnedLetters.map(letter => (
                            <Card key={letter.id} className="rounded-3xl border-border/40 shadow-sm bg-card/30 backdrop-blur-sm relative group overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border border-border/40">
                                            <AvatarImage src={letter.reader.avatarUrl} />
                                            <AvatarFallback>{letter.reader.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-xs">@{letter.reader.username}</p>
                                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">Sent about {letter.storyTitle}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm font-serif italic text-foreground/80 line-clamp-4">"{letter.content}"</p>
                                </CardContent>
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Pin className="h-3 w-3 text-primary fill-current" />
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {isOwnProfile && privateWorks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                    <Lock className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-headline font-bold text-foreground tracking-tight">Private Archives</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
                    {privateWorks.map(story => ( <ProfileStoryCard key={`draft-${story.id}`} story={story} isPrivate /> ))}
                </div>
              </section>
            )}

            {publishedWorks.length === 0 && !isOwnProfile && (
                 <div className="text-center py-24 bg-card/50 rounded-3xl border-2 border-dashed border-border/40">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <h3 className="font-headline font-bold text-lg text-foreground">The ink is still drying</h3>
                    <p className="text-sm max-w-[200px] mx-auto mt-1">This creator hasn't published any public manuscripts yet.</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="feed" className="mt-10 animate-in fade-in duration-500">
            <ProfilePhotoGrid userId={profileUser.id} isOwnProfile={isOwnProfile} />
          </TabsContent>

          {showAnnouncementsTab && (
            <TabsContent value="announcements" className="mt-10 animate-in fade-in duration-500">
                <AnnouncementsTab profileUser={profileUser} isOwnProfile={isOwnProfile} />
            </TabsContent>
          )}
        </Tabs>
      </main>
      
      <footer className="pt-20 pb-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">&bull; End of Dossier &bull;</p>
      </footer>
    </div>
  );
}
