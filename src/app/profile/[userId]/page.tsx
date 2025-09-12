
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, UserPlus, UserX, Settings, LogOut, Edit3, FileText, Users, ShieldAlert, Trash2, Music } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser, StatusUpdate } from '@/types';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import FollowerUserCard from '@/components/shared/FollowerUserCard';
import placeholderImages from '@/app/lib/placeholder-images.json';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Card } from '@/components/ui/card';
import StatusViewer from '@/components/status/StatusViewer';


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
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
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
            <div className="p-4">
                {user.profileSongNote && (
                    <p className="text-center text-lg font-medium mb-4">“{user.profileSongNote}”</p>
                )}
                <SpotifyPlayer />
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
  const [followingDetails, setFollowingDetails] = useState<AppUser[]>([]);
  const [followersDetails, setFollowersDetails] = useState<AppUser[]>([]);
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
    setFollowingDetails([]);
    setFollowersDetails([]);
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
    }, (error) => {
      console.error("Error fetching live follower count:", error);
    });

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
        setFollowingDetails([]);
        setFollowersDetails([]);
        return;
    }

    let unsubStories: Unsubscribe | undefined;
    let unsubFollowersDetails: Unsubscribe | undefined;
    
    let storiesQuery;
    if (isOwnProfile) {
        storiesQuery = query(
            collection(db, 'stories'),
            where('author.id', '==', profileUser.id),
            orderBy('lastUpdated', 'desc')
        );
    } else {
        storiesQuery = query(
            collection(db, 'stories'),
            where('author.id', '==', profileUser.id),
            where('visibility', '==', 'Public'),
            orderBy('lastUpdated', 'desc')
        );
    }
    
    unsubStories = onSnapshot(storiesQuery, (snapshot) => {
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

    const fetchFollowingDetails = async () => {
        if (profileUser.followingIds && profileUser.followingIds.length > 0) {
            const limitedFollowingIds = profileUser.followingIds.slice(0, 20); // Limit for display
            const followingPromises = limitedFollowingIds.map(id => getDoc(doc(db, 'users', id)));
            try {
                const followingDocsArray = await Promise.all(followingPromises);
                const followedUsers = followingDocsArray
                    .filter(docSnap => docSnap.exists())
                    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUser));
                setFollowingDetails(followedUsers);
            } catch (error) {
                console.error("Error fetching following details:", error);
                toast({ title: "Error", description: "Could not load following list.", variant: "destructive" });
            }
        } else {
            setFollowingDetails([]);
        }
    };
    fetchFollowingDetails();

    const followersDetailsQuery = query(
        collection(db, 'users'),
        where('followingIds', 'array-contains', profileUser.id),
        limit(20)
    );
    unsubFollowersDetails = onSnapshot(followersDetailsQuery, (snapshot) => {
        const fetchedFollowers = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUser));
        setFollowersDetails(fetchedFollowers);
    }, (error) => {
        console.error("Error fetching followers:", error);
        toast({ title: "Error", description: "Could not load followers list.", variant: "destructive" });
    });
    

    return () => {
        if (unsubStories) unsubStories();
        if (unsubFollowersDetails) unsubFollowersDetails();
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
      <header className="bg-card p-6 md:p-8 rounded-lg shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 md:h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-t-lg -z-10">
             <Image src={placeholderImages.profile.banner} alt="Profile banner" layout="fill" objectFit="cover" className="rounded-t-lg opacity-50" data-ai-hint="abstract landscape"/>
        </div>
        
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-16 md:pt-24">
            <div 
                className={cn(
                    "relative p-1 rounded-full",
                    hasActiveStatus && "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 cursor-pointer"
                )}
                onClick={() => hasActiveStatus && setIsStatusViewerOpen(true)}
            >
                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
                    <AvatarImage src={profileUser.avatarUrl || 'https://placehold.co/160x160.png'} alt={displayName} data-ai-hint="profile person" />
                    <AvatarFallback className="text-4xl">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
            {profileUser.profileSongUrl ? (
                <div className="mt-2"><ProfileSong user={profileUser} /></div>
            ) : (
                profileUser.bio && <p className="text-muted-foreground mt-1 max-w-xl">{profileUser.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              {profileUser.role && <Badge variant={profileUser.role === 'writer' ? 'default' : 'secondary'} className="capitalize">{profileUser.role}</Badge>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 self-center md:self-end">
            {isOwnProfile ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/settings/profile" passHref>
                  <Button variant="outline" className="w-full sm:w-auto"><Settings className="mr-2 h-4 w-4" /> Profile Settings</Button>
                </Link>
                <Button variant="destructive" onClick={signOutFirebase} className="w-full sm:w-auto"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
              </div>
            ) : currentUser ? (
              <>
                <Button
                    onClick={handleFollowToggle}
                    disabled={followActionLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className="min-w-[120px] w-full sm:w-auto"
                >
                  {followActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                    isFollowing ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />
                  }
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

      {publishedWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Edit3 className="h-6 w-6" /> Published Works
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {publishedWorks.map(story => (
                <ProfileStoryCard key={`published-${story.id}`} story={story} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {isOwnProfile && privateWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-accent flex items-center gap-2">
            <FileText className="h-6 w-6" /> My Private Works & Drafts
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {privateWorks.map(story => (
                <ProfileStoryCard key={`draft-${story.id}`} story={story} isPrivate />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {(publishedWorks.length === 0 && (!isOwnProfile || privateWorks.length === 0)) && (
         <div className="text-center py-10 text-muted-foreground">
            {isOwnProfile ? "You haven't published any stories yet." : `${displayName} hasn't published any stories yet.`}
            {isOwnProfile && <Link href="/write/edit-details" className="text-primary hover:underline ml-1">Start your first story!</Link>}
        </div>
      )}

      {followersDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Followers ({liveFollowersCount ?? followersDetails.length})
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {followersDetails.map(followerUser => (
                <FollowerUserCard key={`follower-${followerUser.id}`} user={followerUser} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}
      {followersDetails.length === 0 && (liveFollowersCount === null || liveFollowersCount === 0) && (
         <div className="text-center py-6 text-muted-foreground">
            {isOwnProfile ? "You don't" : `${displayName} doesn't`} have any followers yet.
        </div>
      )}
      
      {followingDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Following ({profileUser.followingCount || followingDetails.length})
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {followingDetails.map(followedUser => (
                <FollowerUserCard key={`following-${followedUser.id}`} user={followedUser} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}
      {followingDetails.length === 0 && profileUser.followingCount === 0 && (
         <div className="text-center py-6 text-muted-foreground">
            {isOwnProfile ? "You aren't" : `${displayName} isn't`} following anyone yet.
        </div>
      )}
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
