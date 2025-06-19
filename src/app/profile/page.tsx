
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { placeholderStories } from '@/lib/placeholder-data';
import StoryCard from '@/components/shared/StoryCard';
import { Settings, LogOut, Loader2, MessageSquare, UserPlus, Pencil } from 'lucide-react'; 
import Image from 'next/image';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading, signOutFirebase } = useAuth();
  const router = useRouter();


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by AuthProvider redirection in useAuth,
    // but as a fallback:
    return (
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-12rem)] text-center">
            <p className="text-lg text-muted-foreground mb-4">No user data. Redirecting...</p>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  const userWrittenStories = placeholderStories.filter(story => story.author.id === user.id);
  const readingListStories = placeholderStories.slice(0,2).map(s => ({...s, id: s.id + "-rl"})); 
  const activityFeed = [
    { id: 'act1', type: 'commented', on: 'The Last Stargazer', time: '2h ago' },
    { id: 'act2', type: 'published a new chapter for', on: 'Echoes of Tomorrow', time: '1d ago' },
    { id: 'act3', type: 'started reading', on: 'Chronicles of the Shadow Forest', time: '3d ago' },
  ];
  const displayName = user.displayName || user.username;

  return (
    <div className="space-y-8">
      <header className="bg-card p-6 md:p-8 rounded-lg shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-32 md:h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-t-lg -z-10">
             <Image src="https://placehold.co/1200x300.png" alt="Profile banner" layout="fill" objectFit="cover" className="rounded-t-lg opacity-50" data-ai-hint="abstract background"/>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-16 md:pt-24">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl">
            <AvatarImage src={user.avatarUrl || `https://placehold.co/160x160.png`} alt={displayName} data-ai-hint="profile person" />
            <AvatarFallback className="text-4xl">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="text-muted-foreground mt-1 max-w-xl">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              {user.role && <Badge variant={user.role === 'writer' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge>}
              {/* <Badge variant="secondary">Reader</Badge> */}
            </div>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Link href="/settings" passHref>
              <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Profile Settings</Button>
            </Link>
            <Button variant="destructive" onClick={signOutFirebase}><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{userWrittenStories.length}</strong> Works</span>
          <span><strong className="text-foreground">{user.followersCount || 0}</strong> Followers</span>
          <span><strong className="text-foreground">{user.followingCount || 0}</strong> Following</span>
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
            <p className="text-muted-foreground text-center py-8">No stories written yet.</p>
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
            <p className="text-muted-foreground text-center py-8">Reading list is empty.</p>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ul className="space-y-4">
            {activityFeed.map(activity => (
              <li key={activity.id} className="p-4 bg-card rounded-md shadow-sm text-sm">
                <span className="font-semibold">{displayName}</span> {activity.type} <Link href="#" className="text-primary hover:underline">{activity.on}</Link>
                <span className="text-xs text-muted-foreground ml-2">- {activity.time}</span>
              </li>
            ))}
             {activityFeed.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No recent activity.</p>
             )}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
