
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, UserPlus, UserX, Settings, LogOut, Edit3, FileText, Users, ShieldAlert, Music, PenSquare, Quote } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, StatusUpdate, ThreadPost } from '@/types';
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
  Timestamp
} from 'firebase/firestore';
import FollowerUserCard from '@/components/shared/FollowerUserCard';
import placeholderImages from '@/app/lib/placeholder-images.json';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Card } from '@/components/ui/card';
import StatusViewer from '@/components/status/StatusViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ThreadPostCard from '@/components/threads/ThreadPostCard';

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
            src={story.coverImageUrl || 'https://placehold.co/512x800.png'}
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

export default function UserProfilePage() {
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading, signOutFirebase } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [privateWorks, setPrivateWorks] = useState<Story[]>([]); 
  const [userThreads, setUserThreads] = useState<ThreadPost[]>([]);

  const [userActiveStatuses, setUserActiveStatuses] = useState<StatusUpdate[]>([]);
  const [isStatusViewerOpen, setIsStatusViewerOpen] = useState(false);
  
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
    setUserThreads([]);
    setLiveFollowersCount(null);
    setUserActiveStatuses([]);
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

    const activeStatusesQuery = query(
      collection(db, 'statusUpdates'), 
      where('authorId', '==', userId), 
      where('status', '==', 'published'),
      where('expiresAt', '>', new Date()),
      orderBy('expiresAt', 'desc')
    );
    const unsubscribeStatuses = onSnapshot(activeStatusesQuery, (snapshot) => {
        const statuses = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as StatusUpdate));
        setUserActiveStatuses(statuses);
    });

    return () => {
      unsubscribeUser();
      unsubscribeFollowersCount();
      unsubscribeStatuses();
    };
  }, [userId, router, toast]);

  useEffect(() => {
    if (!profileUser) {
        setPublishedWorks([]);
        setPrivateWorks([]);
        setUserThreads([]);
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

    const threadsQuery = query(collection(db, 'feedPosts'), where('author.id', '==', profileUser.id), orderBy('timestamp', 'desc'));
    const unsubThreads = onSnapshot(threadsQuery, (snapshot) => {
        setUserThreads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadPost)));
    }, console.error);

    return () => {
        unsubStories();
        unsubThreads();
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

  const onStatusArchived = (archivedUserId: string, statusId: string) => {
        setUserActiveStatuses(prev => prev.filter(s => s.id !== statusId));
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
  const hasActiveStatus = userActiveStatuses.length > 0;

  return (
    <>
    <div className="space-y-10 pb-10">
      <header className="relative mb-16">
          <div className="h-48 md:h-64 bg-gradient-to-br from-primary/30 to-accent/30 -z-10 overflow-hidden">
             <Image src={placeholderImages.profile.banner} alt="Profile banner" fill objectFit="cover" className="opacity-50" data-ai-hint="abstract landscape" priority />
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-20">
              <div 
                  className={cn(
                      "relative p-1.5 rounded-full bg-background/80 backdrop-blur-sm shadow-xl",
                      hasActiveStatus && "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 cursor-pointer"
                  )}
                  onClick={() => hasActiveStatus && setIsStatusViewerOpen(true)}
              >
                  <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background">
                      <AvatarImage src={profileUser.avatarUrl || 'https://placehold.co/160x160.png'} alt={displayName} data-ai-hint="profile person" />
                      <AvatarFallback className="text-4xl">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
              </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{displayName}</h1>
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
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="works" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="works"><PenSquare className="mr-2 h-4 w-4" />Works</TabsTrigger>
            <TabsTrigger value="threads"><Quote className="mr-2 h-4 w-4" />Threads</TabsTrigger>
          </TabsList>
          
          <TabsContent value="works" className="mt-6">
            {profileUser.profileSongUrl && <div className="mb-8"><ProfileSong user={profileUser} /></div>}

            {publishedWorks.length > 0 && (
              <section className="mb-10">
                <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
                  <Edit3 className="h-6 w-6" /> Published Works
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {publishedWorks.map(story => ( <ProfileStoryCard key={`published-${story.id}`} story={story} /> ))}
                </div>
              </section>
            )}
            
            {isOwnProfile && privateWorks.length > 0 && (
              <section>
                <h2 className="text-2xl font-headline font-semibold mb-4 text-accent flex items-center gap-2">
                  <FileText className="h-6 w-6" /> My Private Works & Drafts
                </h2>
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

          <TabsContent value="threads" className="mt-6">
             <div className="max-w-2xl mx-auto space-y-6">
                {userThreads.length > 0 ? (
                    userThreads.map(post => <ThreadPostCard key={post.id} post={post} onHide={() => {}} />)
                ) : (
                    <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
                        <p>{isOwnProfile ? "You haven't" : `${displayName} hasn't`} posted anything yet.</p>
                    </div>
                )}
             </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
    
    <StatusViewer
        isOpen={isStatusViewerOpen}
        onOpenChange={setIsStatusViewerOpen}
        selectedUser={profileUser}
        userStatuses={userActiveStatuses}
        onNext={() => setIsStatusViewerOpen(false)} // No next user on this page
        onPrev={() => setIsStatusViewerOpen(false)} // No prev user on this page
        onStatusArchived={onStatusArchived}
    />
    </>
  );
}

    