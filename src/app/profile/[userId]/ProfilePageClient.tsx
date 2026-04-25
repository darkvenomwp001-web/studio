'use client';

import { useEffect, useState, FormEvent } from 'react';
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
  LogOut, 
  Edit3, 
  ShieldAlert, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Megaphone, 
  Star, 
  Music, 
  Lock, 
  Pin, 
  BookOpen 
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, Announcement, Letter as LetterType } from '@/types';
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
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ProfilePhotoGrid from '@/components/profile/ProfilePhotoGrid';
import VerifiedBadge from '@/components/icons/VerifiedBadge';

const OWNER_HANDLES = ['authorrafaelnv', 'd4rkv3nom'];

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
          <Image
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
      <Link href={isPrivate ? editLink : viewLink} passHref>
          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {story.title}
          </p>
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
                <Button disabled={isPosting || !newAnnouncement.trim()} size="sm">
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Post Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
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
                    <p className="whitespace-pre-line text-sm">{post.content}</p>
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
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading, signOutFirebase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <header className="container mx-auto px-4 mt-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative">
                  <Avatar className="h-32 w-32 md:h-40 md:w-40 border-2 border-border shadow-md">
                      <AvatarImage src={profileUser.avatarUrl} />
                      <AvatarFallback className="text-4xl bg-muted text-primary">{displayName.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                      <Link href="/settings/profile" className="absolute bottom-1 right-1 p-2 bg-primary text-white rounded-full shadow-lg border-2 border-background">
                          <Edit className="h-4 w-4" />
                      </Link>
                  )}
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-3">
                  <div>
                      <h1 className="text-3xl font-headline font-bold flex items-center justify-center md:justify-start gap-2">
                        {displayName}
                        {profileUser.isVerified && <VerifiedBadge className="h-5 w-5" />}
                      </h1>
                      <p className="text-muted-foreground text-sm font-medium">@{profileUser.username}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-semibold">
                      <Link href={`/profile/${userId}/connections?tab=followers`} className="hover:underline">{liveFollowersCount ?? '...'} Followers</Link>
                      <Link href={`/profile/${userId}/connections?tab=following`} className="hover:underline">{profileUser.followingCount || 0} Following</Link>
                  </div>

                  {profileUser.bio && <p className="text-muted-foreground text-sm max-w-2xl">{profileUser.bio}</p>}
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                    {isOwnProfile ? (
                        <>
                        <Link href="/settings" passHref>
                            <Button variant="outline" size="sm"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={signOutFirebase} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
                        </>
                    ) : (
                        <>
                        <Button onClick={() => isFollowing ? unfollowUser(profileUser.id) : followUser(profileUser.id)} disabled={followActionLoading} variant={isFollowing ? "outline" : "default"} size="sm">
                            {followActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFollowing ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            {isFollowing ? 'Unfollow' : 'Follow'}
                        </Button>
                        <Link href={`/notifications?tab=messages&startConversationWith=${profileUser.id}`} passHref>
                            <Button variant="outline" size="sm"><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
                        </Link>
                        </>
                    )}
                  </div>
              </div>
          </div>
      </header>

      <main className="container mx-auto px-4 space-y-10">
        {profileUser.profileSongUrl && (
            <section className="animate-in slide-in-from-bottom-2 duration-500">
                <Card className="bg-muted/10 border-none shadow-sm overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        <div className="flex-1">
                            <SpotifyPlayer trackUrl={profileUser.profileSongUrl} />
                        </div>
                        {profileUser.profileSongNote && (
                            <div className="p-4 md:w-64 flex items-center bg-background/50 border-l border-border/50">
                                <p className="text-xs italic text-muted-foreground">"{profileUser.profileSongNote}"</p>
                            </div>
                        )}
                    </div>
                </Card>
            </section>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
            <TabsTrigger value="works" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-2 px-0">Works</TabsTrigger>
            <TabsTrigger value="feed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-2 px-0">Feed</TabsTrigger>
            {showAnnouncementsTab && (
                <TabsTrigger value="announcements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent font-bold pb-2 px-0">Updates</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="works" className="mt-8 space-y-12">
            {publishedWorks.length > 0 && (
              <div>
                <h2 className="text-xl font-headline font-bold mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5" /> Published Works</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {publishedWorks.map(story => ( <ProfileStoryCard key={story.id} story={story} /> ))}
                </div>
              </div>
            )}
            
            {isOwnProfile && privateWorks.length > 0 && (
              <div>
                <h2 className="text-xl font-headline font-bold mb-4 flex items-center gap-2"><Lock className="h-5 w-5" /> Private Archives</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {privateWorks.map(story => ( <ProfileStoryCard key={story.id} story={story} isPrivate /> ))}
                </div>
              </div>
            )}

            {publishedWorks.length === 0 && !isOwnProfile && (
                 <div className="text-center py-20 text-muted-foreground border border-dashed rounded-lg">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No public works found.</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="feed" className="mt-8">
            <ProfilePhotoGrid userId={profileUser.id} isOwnProfile={isOwnProfile} />
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