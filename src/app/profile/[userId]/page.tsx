
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { placeholderStories, placeholderUsers, getUserById } from '@/lib/placeholder-data';
import { Loader2, MessageSquare, UserPlus, UserX, Edit, Edit3, Users, FileText, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser } from '@/types';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

interface ProfileStoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint' | 'genre' | 'status'>;
  isDraft?: boolean; // Only relevant for own profile, won't be passed true for other users
}

function ProfileStoryCard({ story, isDraft = false }: ProfileStoryCardProps) {
  return (
    <div className="w-36 md:w-40 flex-shrink-0 group text-center">
       <Link href={isDraft ? `/write/edit-details?storyId=${story.id}` : `/stories/${story.id}`} passHref>
        <div className={cn(
            "aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted cursor-pointer mb-2",
             isDraft && "opacity-70 group-hover:opacity-100" // This styling is only for viewing own drafts
        )}>
          <Image
            src={story.coverImageUrl || `https://placehold.co/512x800.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
           {isDraft && ( // Only show if it's an actual draft being displayed (on own profile)
            <Badge variant="outline" className="absolute top-2 right-2 text-xs bg-background/80">Draft</Badge>
          )}
        </div>
      </Link>
      <Link href={isDraft ? `/write/edit-details?storyId=${story.id}` : `/stories/${story.id}`} passHref>
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
          <AvatarImage src={user.avatarUrl || `https://placehold.co/100x100.png`} alt={user.displayName || user.username} data-ai-hint={user.dataAiHint || "profile person"} />
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

export default function UserProfilePage() {
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, authLoading: followActionLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [publishedWorks, setPublishedWorks] = useState<Story[]>([]);
  const [draftWorks, setDraftWorks] = useState<Story[]>([]); // Only populated if isOwnProfile
  const [followingDetails, setFollowingDetails] = useState<AppUser[]>([]);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    setIsLoading(true);
    const foundUser = getUserById(userId);

    if (foundUser) {
      setProfileUser(foundUser);

      const userWrittenStories = placeholderStories.filter(story => story.author.id === foundUser.id);
      
      // Publicly visible works
      setPublishedWorks(userWrittenStories.filter(s => s.status === 'Ongoing' || s.status === 'Completed' || s.status === 'Public' || (s.status === 'Unlisted' && isOwnProfile)));


      if (isOwnProfile) {
        setDraftWorks(userWrittenStories.filter(s => s.status === 'Draft' || s.status === 'Private' || s.status === 'Unlisted'));
      } else {
        setDraftWorks([]); // Don't show drafts for other users
      }

      const followedUsers = (foundUser.followingIds || [])
        .map(id => getUserById(id))
        .filter((u): u is AppUser => !!u);
      setFollowingDetails(followedUsers);

    } else {
      setProfileUser(null);
      setPublishedWorks([]);
      setDraftWorks([]);
      setFollowingDetails([]);
    }
    setIsLoading(false);
  }, [userId, currentUser, isOwnProfile]); // Added isOwnProfile dependency

  useEffect(() => {
    if (profileUser) {
      const potentiallyUpdatedUser = getUserById(profileUser.id);
      if (potentiallyUpdatedUser &&
          (potentiallyUpdatedUser.followersCount !== profileUser.followersCount ||
           potentiallyUpdatedUser.followingCount !== profileUser.followingCount)) {
        setProfileUser(prev => prev ? { ...prev,
            followersCount: potentiallyUpdatedUser.followersCount,
            followingCount: potentiallyUpdatedUser.followingCount,
            followingIds: potentiallyUpdatedUser.followingIds
        } : null);

        if (JSON.stringify(potentiallyUpdatedUser.followingIds) !== JSON.stringify(profileUser.followingIds)) {
            const followedUsers = (potentiallyUpdatedUser.followingIds || [])
                .map(id => getUserById(id))
                .filter((u): u is AppUser => !!u);
            setFollowingDetails(followedUsers);
        }
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

  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push('/auth/signin');
      return;
    }
    if (isFollowing) {
      await unfollowUser(profileUser.id);
    } else {
      await followUser(profileUser.id);
    }
    const updatedPUser = getUserById(profileUser.id);
    if(updatedPUser) {
        setProfileUser(prev => prev ? {...prev, followersCount: updatedPUser.followersCount} : null);
    }
  };

  const displayName = profileUser.displayName || profileUser.username;
  const totalVisibleWorksCount = publishedWorks.length + (isOwnProfile ? draftWorks.length : 0);

  return (
    <div className="space-y-10 pb-10">
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
              {isAuthor && profileUser.id === currentUser?.id && ( // Edit button for "Edit Story Details"
                  <Link href={`/write/edit-details?storyId=${publishedWorks[0]?.id || draftWorks[0]?.id || ''}`} passHref>
                    <Button variant="outline" size="sm" className="ml-auto">
                      <Edit className="mr-2 h-4 w-4" /> Edit My Story Details
                    </Button>
                  </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 self-center md:self-end">
            {isOwnProfile ? (
              <Link href="/settings" passHref>
                <Button variant="outline" className="w-full sm:w-auto"><Settings className="mr-2 h-4 w-4" /> Edit Profile</Button>
              </Link>
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
                <Button variant="outline" className="w-full sm:w-auto"><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
              </>
            ) : (
                <Button onClick={() => router.push('/auth/signin')} variant="default" className="min-w-[120px] w-full sm:w-auto">
                    <UserPlus className="mr-2 h-4 w-4" /> Follow
                </Button>
            )}
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{totalVisibleWorksCount}</strong> Works</span>
          <span><strong className="text-foreground">{profileUser.followersCount || 0}</strong> Followers</span>
          <span><strong className="text-foreground">{profileUser.followingCount || 0}</strong> Following</span>
        </div>
      </header>

      {/* Published Works Section */}
      {publishedWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Edit3 className="h-6 w-6" /> {isOwnProfile ? "My Published Works" : "Published Works"}
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

      {/* Drafts Section (only for own profile) */}
      {isOwnProfile && draftWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-accent flex items-center gap-2">
            <FileText className="h-6 w-6" /> My Drafts
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
            <div className="flex space-x-4">
              {draftWorks.map(story => (
                <ProfileStoryCard key={`draft-${story.id}`} story={story} isDraft />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {(publishedWorks.length === 0 && (!isOwnProfile || draftWorks.length === 0)) && (
         <div className="text-center py-10 text-muted-foreground">
            {isOwnProfile ? "You haven't written any stories yet." : `${displayName} hasn't published any stories yet.`}
            {isOwnProfile && <Link href="/write/edit-details" className="text-primary hover:underline ml-1">Start your first story!</Link>}
        </div>
      )}

      {/* Following Section */}
      {followingDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Following ({followingDetails.length})
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
      {followingDetails.length === 0 && profileUser.followingCount === 0 && (
         <div className="text-center py-6 text-muted-foreground">
            {isOwnProfile ? "You aren't" : `${displayName} isn't`} following anyone yet.
        </div>
      )}
    </div>
  );
}
