
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { placeholderStories, placeholderUsers, getUserById } from '@/lib/placeholder-data';
import { Settings, LogOut, Loader2, Edit3, Users } from 'lucide-react'; 
import Image from 'next/image';
import Link from 'next/link';
import type { Story, User as AppUser } from '@/types';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Story card specifically for profile Works/Drafts sections
interface ProfileStoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint' | 'genre' | 'status'>;
  isDraft?: boolean;
}

function ProfileStoryCard({ story, isDraft = false }: ProfileStoryCardProps) {
  return (
    <div className="w-36 md:w-40 flex-shrink-0 group">
      <Link href={isDraft ? `/write/edit?storyId=${story.id}` : `/stories/${story.id}`} passHref>
        <div className="aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted cursor-pointer">
          <Image
            src={story.coverImageUrl || `https://placehold.co/512x800.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className={`group-hover:scale-105 transition-transform duration-300 ease-in-out ${isDraft ? 'opacity-70 group-hover:opacity-100' : ''}`}
            data-ai-hint={story.dataAiHint || "book cover"}
          />
          {isDraft && (
            <Badge variant="outline" className="absolute top-2 right-2 text-xs bg-background/80">Draft</Badge>
          )}
        </div>
      </Link>
      <div className="mt-2 text-center">
        <Link href={isDraft ? `/write/edit?storyId=${story.id}` : `/stories/${story.id}`} passHref>
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
            {story.title}
          </p>
        </Link>
        <p className="text-xs text-muted-foreground truncate">{story.genre}</p>
      </div>
    </div>
  );
}

// Card for the "Following" section
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


export default function ProfilePage() {
  const { user, loading, signOutFirebase } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin'); 
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const userWrittenStories = placeholderStories.filter(story => story.author.id === user.id);
  const publishedWorks = userWrittenStories.filter(story => story.status === 'Ongoing' || story.status === 'Completed');
  const draftWorks = userWrittenStories.filter(story => story.status === 'Draft');
  
  const followingDetails: AppUser[] = (user.followingIds || [])
    .map(id => getUserById(id))
    .filter((u): u is AppUser => !!u);

  const displayName = user.displayName || user.username;

  return (
    <div className="space-y-10 pb-10">
      <header className="bg-card p-6 md:p-8 rounded-lg shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 md:h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-t-lg -z-10">
             <Image src="https://placehold.co/1200x300.png" alt="Profile banner" layout="fill" objectFit="cover" className="rounded-t-lg opacity-50" data-ai-hint="abstract background"/>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-16 md:pt-24">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
            <AvatarImage src={user.avatarUrl || `https://placehold.co/160x160.png`} alt={displayName} data-ai-hint="profile person" />
            <AvatarFallback className="text-4xl">{displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="text-muted-foreground mt-1 max-w-xl">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              {user.role && <Badge variant={user.role === 'writer' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge>}
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
          <span><strong className="text-foreground">{publishedWorks.length + draftWorks.length}</strong> Total Works</span>
          <span><strong className="text-foreground">{user.followersCount || 0}</strong> Followers</span>
          <span><strong className="text-foreground">{user.followingCount || 0}</strong> Following</span>
        </div>
      </header>

      {/* Published Works Section */}
      {publishedWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Edit3 className="h-6 w-6" /> My Published Works
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex space-x-4 pb-4">
              {publishedWorks.map(story => (
                <ProfileStoryCard key={`published-${story.id}`} story={story} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* Drafts Section */}
      {draftWorks.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-accent flex items-center gap-2">
            <FileText className="h-6 w-6" /> My Drafts
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex space-x-4 pb-4">
              {draftWorks.map(story => (
                <ProfileStoryCard key={`draft-${story.id}`} story={story} isDraft />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}
      
      {(publishedWorks.length === 0 && draftWorks.length === 0) && (
         <div className="text-center py-10 text-muted-foreground">
            You haven&apos;t written any stories yet. <Link href="/write/edit" className="text-primary hover:underline">Start your first story!</Link>
        </div>
      )}


      {/* Following Section */}
      {followingDetails.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-4 text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Following ({followingDetails.length})
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex space-x-4 pb-4">
              {followingDetails.map(followedUser => (
                <FollowingUserCard key={`following-${followedUser.id}`} user={followedUser} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}
       {followingDetails.length === 0 && user.followingCount === 0 && (
         <div className="text-center py-6 text-muted-foreground">
            You aren&apos;t following anyone yet. Explore and connect with other authors!
        </div>
      )}

    </div>
  );
}
