

'use client';

import { useEffect, useState, FormEvent, useMemo, useTransition } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, UserPlus, UserX, Settings, LogOut, Edit3, FileText, Users, ShieldAlert, Music, PenSquare, Quote, Annoyed, Send, MoreHorizontal, Edit, Trash2, Mailbox, BarChart2, LayoutGrid, Megaphone, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, Announcement, Question } from '@/types';
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
  limit,
  type Unsubscribe,
  getDoc,
  Timestamp,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import FollowerUserCard from '@/components/shared/FollowerUserCard';
import placeholderImages from '@/app/lib/placeholder-images.json';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import StatusViewer from '@/components/status/StatusViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { addNotification } from '@/app/actions/notificationActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { updateAnnouncement, deleteAnnouncement } from '@/app/actions/announcementActions';
import { askQuestion, answerQuestion } from '@/app/actions/userActions';
import ProfilePhotoGrid from '@/components/profile/ProfilePhotoGrid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


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
        <Card className="bg-muted/50 border-dashed">
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const [editingPost, setEditingPost] = useState<Announcement | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isUpdating, startUpdateTransition] = useTransition();
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

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
      console.error("Error fetching announcements:", error);
      toast({ title: 'Error loading updates', variant: 'destructive' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [profileUser.id, toast]);
  
  const handlePostAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newAnnouncement.trim()) return;

    setIsPosting(true);
    try {
      const authorSummary = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
      
      const docRef = await addDoc(collection(db, 'announcements'), {
        author: authorSummary,
        content: newAnnouncement.trim(),
        timestamp: serverTimestamp()
      });

      const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', user.id));
      const followersSnapshot = await getDocs(followersQuery);
      
      const batch = [];
      for (const followerDoc of followersSnapshot.docs) {
          const notification = {
            userId: followerDoc.id,
            type: 'author_announcement',
            message: `posted a new update.`,
            link: `/profile/${user.id}?tab=announcements`,
            actor: authorSummary
          };
          batch.push(addNotification(notification));
      }
      
      await Promise.all(batch);

      setNewAnnouncement('');
      toast({ title: 'Update posted!' });
    } catch (error) {
      console.error("Error posting update:", error);
      toast({ title: 'Could not post update', variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdateAnnouncement = () => {
    if (!editingPost || !user) return;
    startUpdateTransition(async () => {
      const result = await updateAnnouncement(editingPost.id, editedContent, user.id);
      if (result.success) {
        toast({ title: "Update saved!" });
        setEditingPost(null);
      } else {
        toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleDeleteAnnouncement = () => {
    if (!deletingPostId || !user) return;
    startDeleteTransition(async () => {
      const result = await deleteAnnouncement(deletingPostId, user.id);
      if (result.success) {
        toast({ title: "Update deleted" });
      } else {
        toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
      setDeletingPostId(null);
    });
  };

  const getFormattedTimestamp = (timestamp: any) => {
    if (!timestamp) return 'now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return (
     <Dialog onOpenChange={(open) => !open && setEditingPost(null)}>
        <AlertDialog onOpenChange={(open) => !open && setDeletingPostId(null)}>
    <div className="max-w-2xl mx-auto space-y-6">
      {isOwnProfile && (
        <form onSubmit={handlePostAnnouncement}>
          <Card>
            <CardContent className="p-4 flex gap-4">
              <Avatar className="hidden sm:block">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Post an update for your followers..."
                  className="bg-transparent border-0 focus-visible:ring-0 shadow-none resize-none p-0"
                  disabled={isPosting}
                />
                 <Button disabled={isPosting || !newAnnouncement.trim()}>
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : announcements.length > 0 ? (
        announcements.map(post => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={post.author.avatarUrl} />
                    <AvatarFallback>{post.author.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{post.author.displayName}</p>
                     {isOwnProfile ? (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={() => { setEditingPost(post); setEditedContent(post.content); }}>
                                        <Edit className="mr-2 h-4 w-4"/>Edit
                                    </DropdownMenuItem>
                                </DialogTrigger>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive" onSelect={() => setDeletingPostId(post.id)}>
                                        <Trash2 className="mr-2 h-4 w-4"/>Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                         </DropdownMenu>
                     ) : <p className="text-xs text-muted-foreground">{getFormattedTimestamp(post.timestamp)}</p> }
                  </div>
                   {!isOwnProfile && <p className="text-xs text-muted-foreground -mt-1 mb-2">{getFormattedTimestamp(post.timestamp)}</p>}
                  <p className="whitespace-pre-line mt-2">{post.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
          <p>{isOwnProfile ? "You haven't" : `${profileUser.displayName} hasn't`} posted any updates yet.</p>
        </div>
      )}
    </div>

        {/* Edit Dialog */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Update</DialogTitle>
          </DialogHeader>
          <Textarea 
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={5}
            className="my-4"
          />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateAnnouncement} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>

        {/* Delete Alert Dialog */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
    </Dialog>
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
  const defaultTab = searchParams.get('tab') || 'works';

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [privateWorks, setPrivateWorks] = useState<Story[]>([]); 

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) {
      toast({ title: "Error", description: "User ID is missing.", variant: "destructive" });
      router.push('/');
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
      console.error("Error fetching profile user:", error);
      toast({ title: "Error", description: "Could not load profile.", variant: "destructive" });
      setProfileUser(null);
      setIsLoadingData(false);
    });

    const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', userId));
    const unsubscribeFollowersCount = onSnapshot(followersQuery, (snapshot) => {
      setLiveFollowersCount(snapshot.size);
    }, console.error);


    return () => {
      unsubscribeUser();
      unsubscribeFollowersCount();
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
        console.error("Error fetching stories:", error);
        toast({ title: "Error", description: "Could not load stories.", variant: "destructive" });
    });

    return () => {
        unsubStories();
    };
  }, [profileUser, isOwnProfile, toast]);


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
                {profileUser.isVerified && <ShieldCheck className="h-7 w-7 text-primary" title="Verified User" />}
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
            <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{publishedWorks.length}</strong> Public Works</span>
              <span><strong className="text-foreground">{liveFollowersCount ?? '...'}</strong> Followers</span>
              <span><strong className="text-foreground">{profileUser.followingCount || 0}</strong> Following</span>
            </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
            <TabsTrigger value="works"><PenSquare className="mr-2 h-4 w-4" />Works</TabsTrigger>
            <TabsTrigger value="feed"><LayoutGrid className="mr-2 h-4 w-4" />Feed</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4" />Updates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="works" className="mt-6">
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
              <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
                  <p>{isOwnProfile ? "You haven't published any stories yet." : `${displayName} hasn't published any stories yet.`}</p>
                  {isOwnProfile && <Link href="/write/edit-details" className="text-primary hover:underline mt-1 block">Start your first story!</Link>}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="feed" className="mt-6">
            <ProfilePhotoGrid userId={profileUser.id} />
          </TabsContent>

          <TabsContent value="announcements" className="mt-6">
             <AnnouncementsTab profileUser={profileUser} isOwnProfile={isOwnProfile} />
          </TabsContent>
          
        </Tabs>
      </main>
    </div>
    </>
  );
}
