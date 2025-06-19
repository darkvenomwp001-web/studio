'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit2, Trash2, FileText, Eye } from 'lucide-react';
import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import type { Story } from '@/types';


// Mock function to get current user's stories.
// In a real app this would fetch from an API or use a hook.
async function getUserStoriesClient(): Promise<Story[]> {
  // This is a simplified mock. In a real client component,
  // you'd likely use `useEffect` and `useState` to fetch/manage data.
  // Or better, use a data fetching library like SWR or React Query.
  const currentUser = placeholderUsers[0]; // Assume current user for now
  return placeholderStories.filter(story => story.author.id === currentUser.id);
}

export default function WriteDashboardPage() {
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStories() {
      setIsLoading(true);
      const stories = await getUserStoriesClient();
      setUserStories(stories);
      setIsLoading(false);
    }
    loadStories();
  }, []);

  if (isLoading) {
    // Basic loading state, can be improved with skeletons
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-6 border-b">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">My Writing Dashboard</h1>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" disabled>
            <PlusCircle className="mr-2 h-5 w-5" /> Start a New Story
          </Button>
        </div>
        <p className="text-center text-muted-foreground py-10">Loading your stories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-6 border-b">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">My Writing Dashboard</h1>
        <Link href="/write/edit" passHref>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Start a New Story
          </Button>
        </Link>
      </div>

      {userStories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userStories.map(story => (
            <Card key={story.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="relative p-0 aspect-video overflow-hidden">
                <Image
                  src={story.coverImageUrl || `https://placehold.co/400x225.png`}
                  alt={story.title}
                  width={400}
                  height={225}
                  className="object-cover w-full h-full"
                  data-ai-hint={story.dataAiHint || "abstract illustration"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <CardTitle className="absolute bottom-4 left-4 text-xl font-headline text-white">
                  {story.title}
                </CardTitle>
                 <Badge variant={story.status === 'Completed' ? 'secondary' : 'default'} className={`absolute top-2 right-2 ${story.status === 'Completed' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                    {story.status || 'Draft'}
                 </Badge>
              </CardHeader>
              <CardContent className="pt-4 flex-grow">
                <CardDescription className="text-sm text-muted-foreground line-clamp-3 mb-2">
                  {story.summary}
                </CardDescription>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Chapters:</strong> {story.chapters.length}</p>
                  <p><strong>Views:</strong> {story.views ? (story.views / 1000).toFixed(1) + 'k' : '0'}</p>
                  <p><strong>Last Updated:</strong> {new Date(story.lastUpdated).toLocaleDateString()}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Link href={`/stories/${story.id}`} passHref>
                  <Button variant="outline" size="sm"><Eye className="mr-1.5 h-4 w-4" /> View</Button>
                </Link>
                <Link href={`/write/edit?storyId=${story.id}`} passHref>
                  <Button variant="default" size="sm"><Edit2 className="mr-1.5 h-4 w-4" /> Edit</Button>
                </Link>
                <Button variant="destructive" size="sm" onClick={() => alert('Delete functionality not implemented.')}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-lg shadow-sm">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-headline font-semibold mb-2">No Stories Yet</h2>
          <p className="text-muted-foreground mb-6">It looks like you haven't started any stories. <br/>Click the button above to begin your writing journey!</p>
          <Link href="/write/edit" passHref>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Create Your First Story
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
