
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
import StoryCard from '@/components/shared/StoryCard';
import { Loader2, MessageSquare, UserPlus, UserCheck, UserX, Edit } from 'lucide-react'; 
import Image from 'next/image';
import Link from 'next/link';
import type { User as AppUser } from '@/types';

export default function UserProfilePage() {
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // In a real app, fetch user by ID. For mock, find in placeholderUsers.
    const foundUser = placeholderUsers.find(u => u.id === userId);
    if (foundUser) {
      // Simulate potential updates to follower count from auth hook's placeholderUsers manipulation
      const updatedFollowerCount = placeholderUsers.find(u => u.id === userId)?.followersCount;
      setProfileUser({...foundUser, followersCount: updatedFollowerCount ?? foundUser.followersCount});
    } else {
      setProfileUser(null);
      // Optionally redirect if user not found, or show a "not found" message
      // router.push('/404'); 
    }
    setIsLoading(false);
  }, [userId, router, currentUser]); // Re-run if currentUser changes (e.g., follow status)

  // This effect is to refresh the profileUser's follower count if it's updated in placeholderUsers
  // This is a mock for reactivity. In a real app, this would come from a real-time DB or re-fetch.
  useEffect(() => {
    if (profileUser) {
      const potentiallyUpdatedUser = placeholderUsers.find(u => u.id === profileUser.id);
      if (potentiallyUpdatedUser && potentiallyUpdatedUser.followersCount !== profileUser.followersCount) {
        setProfileUser(prev => prev ? { ...prev, followersCount: potentiallyUpdatedUser.followersCount } : null);
      }
    }
  }, [placeholderUsers, profileUser]);


  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileUser) {
    return <div className="text-center py-10 text-xl text-muted-foreground">User profile not found.</div>;
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const isFollowing = currentUser?.followingIds?.includes(profileUser.id) || false;

  const handleFollowToggle = async () => {
    if (isFollowing) {
      await unfollowUser(profileUser.id);
    } else {
      await followUser(profileUser.id);
    }
    // Re-fetch or update profileUser state to reflect new follower count
    // For mock, placeholderUsers is mutated, and useEffect above *should* catch it.
    const updatedPUser = placeholderUsers.find(u => u.id === profileUser.id);
    if(updatedPUser) {
        setProfileUser(prev => prev ? {...prev, followersCount: updatedPUser.followersCount} : null);
    }
  };

  const userWrittenStories = placeholderStories.filter(story => story.author.id === profileUser.id);
  // Mock reading list for any user
  const readingListStories = placeholderStories.slice(Math.floor(Math.random() * 2), Math.floor(Math.random() * 2) + 2).map(s => ({...s, id: s.id + "-rl"})); 
  // Mock activity feed
  const activityFeed = [
    { id: 'act1', type: 'commented on', on: placeholderStories[0]?.title || 'a story', time: '2h ago', link: `/stories/${placeholderStories[0]?.id}` },
    { id: 'act2', type: 'published a new chapter for', on: userWrittenStories[0]?.title || 'their story', time: '1d ago', link: userWrittenStories[0] ? `/stories/${userWrittenStories[0].id}` : '#' },
  ].filter(act => act.on);


  const displayName = profileUser.displayName || profileUser.username;

  return (
    <div className="space-y-8">
      <header className="bg-card p-6 md:p-8 rounded-lg shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 md:h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-t-lg -z-10">
             <Image src="https://placehold.co/1200x300.png" alt="Profile banner" layout="fill" objectFit="cover" className="rounded-t-lg opacity-50" data-ai-hint="abstract landscape"/>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-16 md:pt-24">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
            <AvatarImage src={profileUser.avatarUrl || `https://placehold.co/160x160.png`} alt={displayName} data-ai-hint="profile person" />
            <AvatarFallback className="text-4xl">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
            {profileUser.bio && <p className="text-muted-foreground mt-1 max-w-xl">{profileUser.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              {profileUser.role && <Badge variant={profileUser.role === 'writer' ? 'default' : 'secondary'} className="capitalize">{profileUser.role}</Badge>}
            </div>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            {isOwnProfile ? (
              <Link href="/settings" passHref>
                <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
              </Link>
            ) : currentUser ? ( // Only show follow/message if a user is logged in and it's not their own profile
              <>
                <Button 
                    onClick={handleFollowToggle} 
                    disabled={followActionLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className="min-w-[120px]"
                >
                  {followActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                    isFollowing ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />
                  }
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
                <Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
              </>
            ) : null /* No buttons if not logged in and not own profile */}
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{userWrittenStories.length}</strong> Works</span>
          <span><strong className="text-foreground">{profileUser.followersCount || 0}</strong> Followers</span>
          <span><strong className="text-foreground">{profileUser.followingCount || 0}</strong> Following</span>
        </div>
      </header>

      <Tabs defaultValue="works" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-2 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="works" className="font-headline data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">Works</TabsTrigger>
          <TabsTrigger value="reading-list" className="font-headline data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">Reading List</TabsTrigger>
          <TabsTrigger value="activity" className="font-headline data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md col-span-2 md:col-span-1">Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="works" className="mt-6">
          {userWrittenStories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userWrittenStories.map(story => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{displayName} hasn't published any stories yet.</p>
          )}
        </TabsContent>

        <TabsContent value="reading-list" className="mt-6">
           {readingListStories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {readingListStories.map(story => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{displayName}'s reading list is empty.</p>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ul className="space-y-4">
            {activityFeed.map(activity => (
              <li key={activity.id} className="p-4 bg-card rounded-md shadow-sm text-sm">
                <span className="font-semibold">{displayName}</span> {activity.type} <Link href={activity.link || '#'} className="text-primary hover:underline">{activity.on}</Link>
                <span className="text-xs text-muted-foreground ml-2">- {activity.time}</span>
              </li>
            ))}
             {activityFeed.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No recent activity for {displayName}.</p>
             )}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
