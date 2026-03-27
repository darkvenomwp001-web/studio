'use client';

import { useEffect, useState, FormEvent, useTransition } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, UserPlus, UserX, Settings, LogOut, Edit3, FileText, ShieldAlert, PenSquare, Send, MoreHorizontal, Edit, Trash2, LayoutGrid, Megaphone, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, Announcement } from '@/types';
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
  deleteDoc
} from 'firebase/firestore';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ProfilePhotoGrid from '@/components/profile/ProfilePhotoGrid';
import VerifiedBadge from '@/components/icons/VerifiedBadge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const OWNER_HANDLES = ['authorrafaelnv', 'd4rkv3nom'];

interface ProfileStoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint' | 'genre' | 'status' | 'visibility'>;
  isPrivate?: boolean; 
}

function ProfileStoryCard({ story, isPrivate = false }: ProfileStoryCardProps) {
  const editLink = `/write/edit-details?storyId=${story.id}`;
  const viewLink = `/stories/${story.id}`;

  return (
    <div className="w-36 md:w-40 flex-shrink-0 group text-center">
       <Link href={isPrivate ? editLink : viewLink} passHref>
        <div className={cn(
            "aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted cursor-pointer mb-2",
             isPrivate && "opacity-70 group-hover:opacity-100" 
        )}>
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
            sizes="(max-width: 768px) 30vw, 160px"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
           {isPrivate && ( 
            <Badge variant="outline" className="absolute top-2 right-2 text-xs bg-background/80 capitalize">{story.status === 'Draft' ? 'Draft' : story.visibility}</Badge>
          )}
        </div>
      </Link>
      <Link href={isPrivate ? editLink : viewLink} passHref>
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
            {story.title}
          </p>
      </Link>
      <p className="text-xs text-muted-foreground truncate">{story.genre}</p>
    </div>
  );
}

function ProfileSong({ user }: { user: AppUser }) {
    if (!user.profileSongUrl) return null;

    return (
        <Card className="bg-muted/50 border-dashed shadow-none">
            <div className="p-4 space-y-4">
                {user.profileSongNote && (
                    <p className="text-center text-lg font-medium italic">“{user.profileSongNote}”</p>
                )}
                <SpotifyPlayer trackUrl={user.profileSongUrl} />
            </div>
        </Card>
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
      const permissionError = new FirestorePermissionError({
          path: 'announcements',
          operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
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
            
            // Notify followers
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
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: 'announcements',
                operation: 'create',
                requestResourceData: announcementData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsPosting(false));
  };

  const handleUpdateAnnouncement = () => {
    if (!editingPost || !user) return;
    setIsUpdating(true);
    const annoRef = doc(db, 'announcements', editingPost.id);
    const updateData = { content: editedContent, updatedAt: serverTimestamp() };

    updateDoc(annoRef, updateData)
        .then(() => {
            toast({ title: "Update saved!" });
            setIsEditDialogOpen(false);
            setEditingPost(null);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: annoRef.path,
                operation: 'update',
                requestResourceData: updateData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
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
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: annoRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsDeleting(false);
            setDeletingPostId(null);
        });
  };

  const getFormattedTimestamp = (timestamp: any) => {
    if (!timestamp) return 'now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {isOwnProfile && (
        <form onSubmit={handlePostAnnouncement}>
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 flex gap-4">
                <Avatar className="h-10 w-10 border border-border/20 hidden sm:block">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <Textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Share an update with your followers..."
                    className="bg-transparent border-0 focus-visible:ring-0 shadow-none resize-none p-0 text-base min-h-[80px]"
                    disabled={isPosting}
                    />
                </div>
              </div>
              <div className="bg-muted/30 px-4 py-2 flex justify-between items-center border-t border-border/40">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Post as @{user?.username}</p>
                <Button disabled={isPosting || !newAnnouncement.trim()} size="sm" className="rounded-full px-6 shadow-md shadow-primary/20">
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
            <Card key={post.id} className="border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                <div className="flex gap-3">
                    <Link href={`/profile/${post.author.id}`}>
                        <Avatar className="h-10 w-10 border border-border/20">
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
                                <DropdownMenuContent align="end" className="w-40">
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
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter -mt-0.5 mb-3">{getFormattedTimestamp(post.timestamp)}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{post.content}</p>
                    </div>
                </div>
                </CardContent>
            </Card>
          );
        })
      ) : !isOwnProfile && (
        <div className="text-center py-24 text-muted-foreground bg-card/50 rounded-2xl border-2 border-dashed border-border/40">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <h3 className="font-headline font-bold text-lg text-foreground">Silence in the archives</h3>
          <p className="text-sm max-w-[200px] mx-auto mt-1">{`${profileUser.displayName || profileUser.username} hasn't posted any updates yet.`}</p>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Edit Update</DialogTitle>
            <DialogDescription className="sr-only">Form to edit your profile announcement.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
                className="bg-muted/30 focus-visible:ring-primary border-none shadow-inner resize-none text-base"
                disabled={isUpdating}
            />
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="ghost" disabled={isUpdating}>Cancel</Button></DialogClose>
            <Button onClick={handleUpdateAnnouncement} disabled={isUpdating || !editedContent.trim()} className="rounded-full px-6">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline">Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your followers will no longer be able to see this announcement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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

export default function UserProfilePage() {
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading, signOutFirebase } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const defaultTab = searchParams.get('tab') || 'works';

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [privateWorks, setPrivateWorks] = useState<Story[]>([]); 

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) {
      setIsLoadingData(false);
      return;
    }

    setProfileUser(null);
    setPublishedWorks([]);
    setPrivateWorks([]);
    setLiveFollowersCount(null);
    setIsLoadingData(true);

    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfileUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        setProfileUser(null);
      }
      setIsLoadingData(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'get',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setProfileUser(null);
      setIsLoadingData(false);
    });

    const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', userId));
    const unsubscribeFollowersCount = onSnapshot(followersQuery, (snapshot) => {
      setLiveFollowersCount(snapshot.size);
    }, console.error);

    const annoQuery = query(collection(db, 'announcements'), where('author.id', '==', userId));
    const unsubAnnoCount = onSnapshot(annoQuery, (snap) => setAnnouncementCount(snap.size));

    return () => {
      unsubscribeUser();
      unsubscribeFollowersCount();
      unsubAnnoCount();
    };
  }, [userId, router, toast]);

  useEffect(() => {
    if (!profileUser) {
        setPublishedWorks([]);
        setPrivateWorks([]);
        return;
    }

    const storiesQuery = isOwnProfile 
        ? query(collection(db, 'stories'), where('author.id', '==', profileUser.id), orderBy('lastUpdated', 'desc'))
        : query(collection(db, 'stories'), where('author.id', '==', profileUser.id), where('visibility', '==', 'Public'), orderBy('lastUpdated', 'desc'));
    
    const unsubStories = onSnapshot(storiesQuery, (snapshot) => {
        const userWrittenStories = snapshot.docs.map(storyDoc => ({ id: storyDoc.id, ...storyDoc.data() } as Story));
        const published = userWrittenStories.filter(s => s.status !== 'Draft' && s.visibility === 'Public');
        setPublishedWorks(published);
        if (isOwnProfile) {
            const privateAndDrafts = userWrittenStories.filter(s => s.status === 'Draft' || s.visibility !== 'Public');
            setPrivateWorks(privateAndDrafts);
        } else {
            setPrivateWorks([]);
        }
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'stories',
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
        unsubStories();
    };
  }, [profileUser, isOwnProfile]);


  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push('/auth/signin');
      return;
    }
    if (!profileUser) return;

    if (currentUser.followingIds?.includes(profileUser.id)) {
      await unfollowUser(profileUser.id);
    } else {
      await followUser(profileUser.id);
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
        <div className="text-center py-10">
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">Profile Not Found</h2>
            <p className="text-muted-foreground">The user profile you are looking for does not exist.</p>
            <Button onClick={() => router.push('/')} variant="outline" className="mt-4">Go to Homepage</Button>
        </div>
    );
  }

  const isFollowing = currentUser?.followingIds?.includes(profileUser.id) || false;
  const displayName = profileUser.displayName || profileUser.username;
  const showAnnouncementsTab = isOwnProfile || announcementCount > 0;

  return (
    <>
    <div className="space-y-10 pb-10">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
                  <AvatarImage src={profileUser.avatarUrl || 'https://placehold.co/160x160.png'} alt={displayName} data-ai-hint="profile person" />
                  <AvatarFallback className="text-4xl">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                {displayName}
                {profileUser.isVerified && <VerifiedBadge className="h-6 w-6" />}
              </h1>
              <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
              {profileUser.bio && <p className="text-muted-foreground mt-2 max-w-xl">{profileUser.bio}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 self-center md:self-end">
              {isOwnProfile ? (
                <>
                  <Link href="/settings/profile" passHref>
                    <Button variant="outline" className="w-full sm:w-auto"><Settings className="mr-2 h-4 w-4" /> Profile Settings</Button>
                  </Link>
                  <Button variant="destructive" onClick={signOutFirebase} className="w-full sm:w-auto"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
                </>
              ) : currentUser ? (
                <>
                  <Button onClick={handleFollowToggle} disabled={followActionLoading} variant={isFollowing ? "outline" : "default"} className="min-w-[120px] w-full sm:w-auto">
                    {followActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFollowing ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                   <Link href={`/notifications?tab=messages&startConversationWith=${profileUser.id}`} passHref>
                      <Button variant="outline" className="w-full sm:w-auto"><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
                  </Link>
                </>
              ) : (
                  <Button onClick={() => router.push('/auth/signin')} variant="default" className="min-w-[120px] w-full sm:w-auto">
                      <UserPlus className="mr-2 h-4 w-4" /> Follow
                  </Button>
              )}
            </div>
          </div>
            <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground font-semibold">
              <span><strong className="text-foreground">{publishedWorks.length}</strong> Public Works</span>
              <Link href={`/profile/${userId}/connections?tab=followers`} className="hover:text-primary transition-colors">
                <span><strong className="text-foreground">{liveFollowersCount ?? '...'}</strong> Followers</span>
              </Link>
              <Link href={`/profile/${userId}/connections?tab=following`} className="hover:text-primary transition-colors">
                <span><strong className="text-foreground">{profileUser.followingCount || 0}</strong> Following</span>
              </Link>
            </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={cn("grid w-full max-w-2xl mx-auto bg-muted/50 p-1 rounded-full border shadow-sm", showAnnouncementsTab ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="works" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold"><PenSquare className="mr-2 h-4 w-4" />Works</TabsTrigger>
            <TabsTrigger value="feed" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold"><LayoutGrid className="mr-2 h-4 w-4" />Feed</TabsTrigger>
            {showAnnouncementsTab && (
                <TabsTrigger value="announcements" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold"><Megaphone className="mr-2 h-4 w-4" />Updates</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="works" className="mt-8 animate-in fade-in duration-500">
            {profileUser.profileSongUrl && <div className="mb-8"><ProfileSong user={profileUser} /></div>}

            {publishedWorks.length > 0 && (
              <section className="mb-10">
                {isOwnProfile ? (
                  <Link href="/write" className="group">
                    <h2 className="text-xl font-headline font-semibold mb-4 text-primary flex items-center gap-2 group-hover:underline">
                      <Edit3 className="h-5 w-5" /> Published Works
                    </h2>
                  </Link>
                ) : (
                  <h2 className="text-xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
                    <Edit3 className="h-5 w-5" /> Published Works
                  </h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {publishedWorks.map(story => ( <ProfileStoryCard key={`published-${story.id}`} story={story} /> ))}
                </div>
              </section>
            )}
            
            {isOwnProfile && privateWorks.length > 0 && (
              <section>
                 <Link href="/write" className="group">
                    <h2 className="text-xl font-headline font-semibold mb-4 text-accent flex items-center gap-2 group-hover:underline">
                    <FileText className="h-5 w-5" /> My Private Works & Drafts
                    </h2>
                </Link>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {privateWorks.map(story => ( <ProfileStoryCard key={`draft-${story.id}`} story={story} isPrivate /> ))}
                </div>
              </section>
            )}

            {(publishedWorks.length === 0 && (!isOwnProfile || privateWorks.length === 0)) && (
              <div className="text-center py-20 text-muted-foreground bg-card/50 rounded-2xl border-2 border-dashed border-border/40">
                  <p className="font-bold text-foreground">No literary artifacts found</p>
                  <p className="text-sm mt-1">{isOwnProfile ? "Your creative journey starts with a single word." : `${displayName} hasn't published any stories yet.`}</p>
                  {isOwnProfile && <Link href="/write/edit-details" className="text-primary font-bold hover:underline mt-4 block">Start your first story &rarr;</Link>}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="feed" className="mt-8 animate-in fade-in duration-500">
            <ProfilePhotoGrid userId={profileUser.id} isOwnProfile={isOwnProfile} />
          </TabsContent>

          {showAnnouncementsTab && (
            <TabsContent value="announcements" className="mt-8 animate-in fade-in duration-500">
                <AnnouncementsTab profileUser={profileUser} isOwnProfile={isOwnProfile} />
            </TabsContent>
          )}
          
        </Tabs>
      </main>
    </div>
    </>
  );
}
