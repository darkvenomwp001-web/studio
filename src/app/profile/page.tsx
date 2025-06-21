
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Loader2, Edit3, Users, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser } from '@/types';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import FollowerUserCard from '@/components/shared/FollowerUserCard'; // New component

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

interface FollowingUserCardProps {
  user: AppUser;
}
function FollowingUserCard({ user }: FollowingUserCardProps) {
  return (
    <div className="w-28 md:w-32 flex-shrink-0 text-center group">
      <Link href={`/profile/${user.id}`} passHref>
        <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto border-2 border-border group-hover:border-primary transition-colors cursor-pointer">
          <AvatarImage src={user.avatarUrl || 'https://placehold.co/100x100.png'} alt={user.displayName || user.username} data-ai-hint={user.dataAiHint || "profile person"} />
          <AvatarFallback>{(user.displayName || user.username).substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <Link href={`/profile/${user.id}`} passHref>
        <p className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
          {user.displayName || user.username}
        </p>
      </Link>
      <p className="text-xs text-muted-foreground">{user.followersCount || 0} Followers</p>
    </div>
  );
}


export default function ProfilePage() {
  const { user: currentUser, loading: authLoadingGlobal, signOutFirebase } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [privateWorks, setPrivateWorks] = useState<Story[]>([]);
  const [followingDetails, setFollowingDetails] = useState<AppUser[]>([]);
  const [followersDetails, setFollowersDetails] = useState<AppUser[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);


  useEffect(() => {
    if (!authLoadingGlobal && !currentUser) {
      router.push('/auth/signin');
      return;
    }

    if (!currentUser) {
      setIsLoadingData(false); // Not loading if no user yet
      return;
    }
    
    setIsLoadingData(true);
    let unsubStories: Unsubscribe | undefined;
    let unsubFollowers: Unsubscribe | undefined;

    // Fetch User's Stories (Published and Drafts) using onSnapshot
    const storiesQuery = query(
      collection(db, 'stories'),
      where('author.id', '==', currentUser.id),
      orderBy('lastUpdated', 'desc')
    );
    unsubStories = onSnapshot(storiesQuery, (snapshot) => {
      const userWrittenStories = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Story));
      setPublishedWorks(userWrittenStories.filter(s => s.visibility === 'Public' && s.status !== 'Draft'));
      setPrivateWorks(userWrittenStories.filter(s => s.status === 'Draft' || s.visibility !== 'Public'));
    }, (error) => {
      console.error("Error fetching user stories:", error);
      toast({ title: "Error", description: "Could not load your stories.", variant: "destructive" });
    });

    // Fetch Following Details (one-time fetch as current user's followingIds updates from useAuth real-time)
    const fetchFollowingDetails = async () => {
        if (currentUser.followingIds && currentUser.followingIds.length > 0) {
            const limitedFollowingIds = currentUser.followingIds.slice(0, 20); // Limit for display
            const followingPromises = limitedFollowingIds.map(id => getDoc(doc(db, 'users', id)));
            try {
                const followingDocsArray = await Promise.all(followingPromises);
                const followedUsers = followingDocsArray
                    .filter(docSnap => docSnap.exists())
                    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUser));
                setFollowingDetails(followedUsers);
            } catch (error) {
                console.error("Error fetching following details:", error);
                toast({ title: "Error", description: "Could not load your following list.", variant: "destructive" });
            }
        } else {
            setFollowingDetails([]);
        }
    };
    fetchFollowingDetails(); // Call immediately

    // Fetch Followers Details (real-time)
    const followersQuery = query(
        collection(db, 'users'),
        where('followingIds', 'array-contains', currentUser.id),
        limit(20) // Limit for display
    );
    unsubFollowers = onSnapshot(followersQuery, (snapshot) => {
        const fetchedFollowers = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AppUser));
        setFollowersDetails(fetchedFollowers);
        setIsLoadingData(false); // All data fetches initiated
    }, (error) => {
        console.error("Error fetching followers:", error);
        toast({ title: "Error", description: "Could not load your followers list.", variant: "destructive" });
        setIsLoadingData(false);
    });

    return () => {
      if (unsubStories) unsubStories();
      if (unsubFollowers) unsubFollowers();
    };
  }, [currentUser, authLoadingGlobal, router, toast]);


  if (authLoadingGlobal || isLoadingData || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const displayName = currentUser.displayName || currentUser.username;
  const publicWorksCount = publishedWorks.length;

  return (
    <div className="space-y-10 pb-10">
      <header className="bg-card p-6 md:p-8 rounded-lg shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 md:h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-t-lg -z-10">
             <Image src="https://placehold.co/1200x300.png" alt="Profile banner" layout="fill" objectFit="cover" className="rounded-t-lg opacity-50" data-ai-hint="abstract background"/>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-16 md:pt-24">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
            <AvatarImage src={currentUser.avatarUrl || 'https://placehold.co/160x160.png'} alt={displayName} data-ai-hint="profile person" />
            <AvatarFallback className="text-4xl">{displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
            {currentUser.bio && <p className="text-muted-foreground mt-1 max-w-xl">{currentUser.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              {currentUser.role && <Badge variant={currentUser.role === 'writer' ? 'default' : 'secondary'} className="capitalize">{currentUser.role}</Badge>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 self-center md:self-end">
            <Link href="/settings" passHref>
              <Button variant="outline" className="w-full sm:w-auto"><Settings className="mr-2 h-4 w-4" /> Profile Settings</Button>
            </Link>
            <Button variant="destructive" onClick={signOutFirebase} className="w-full sm:w-auto"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{publicWorksCount}</strong> Public Works</span>
          <span><strong className="text-foreground">{currentUser.followersCount || 0}</strong> Followers</span>
          <span><strong className="text-foreground">{currentUser.followingCount || 0}</strong> Following</span>
        </div>
      </header>

      {publishedWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Edit3 className="h-6 w-6" /> My Published Works
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

      {privateWorks.length > 0 && (
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

      {(publishedWorks.length === 0 && privateWorks.length === 0) && (
         <div className="text-center py-10 text-muted-foreground">
            You haven&apos;t written any stories yet. <Link href="/write/edit-details" className="text-primary hover:underline">Start your first story!</Link>
        </div>
      )}

      {followersDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Followers ({currentUser.followersCount || followersDetails.length})
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
       {followersDetails.length === 0 && currentUser.followersCount === 0 && (
         <div className="text-center py-6 text-muted-foreground">
            You don&apos;t have any followers yet.
        </div>
      )}

      {followingDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Following ({currentUser.followingCount || followingDetails.length})
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {followingDetails.map(followedUser => (
                <FollowingUserCard key={`following-${followedUser.id}`} user={followedUser} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}
       {followingDetails.length === 0 && currentUser.followingCount === 0 && (
         <div className="text-center py-6 text-muted-foreground">
            You aren&apos;t following anyone yet. Explore and connect with other authors!
        </div>
      )}

    </div>
  );
}
