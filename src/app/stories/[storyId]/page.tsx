
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Eye,
  Heart,
  ListOrdered,
  BookmarkPlus,
  Loader2,
  Info,
  Edit,
  Sparkles
} from 'lucide-react';
import { formatDate } from '@/lib/placeholder-data';
import type { Story, Chapter } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function getStoryData(storyId: string): Promise<Story | null> {
  try {
    const storyDocRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyDocRef);
    if (storySnap.exists()) {
      const data = storySnap.data();
       return { 
        id: storySnap.id, 
        ...data,
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
      } as Story;
    }
    return null;
  } catch (error) {
    console.error("Error fetching story data:", error);
    return null;
  }
}

export default function StoryOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const storyId = params.storyId as string;

  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (storyId) {
      setIsLoading(true);
      getStoryData(storyId).then(data => {
        if (data) {
          const canView = 
            data.visibility === 'Public' ||
            data.visibility === 'Unlisted' ||
            (data.visibility === 'Private' && user && (data.author.id === user.id || data.collaborators?.some(c => c.id === user.id))) ||
            (data.status === 'Draft' && user && (data.author.id === user.id || data.collaborators?.some(c => c.id === user.id)));

          if (canView) {
            setStory(data);
          } else {
            setStory(null);
          }
        } else {
          setStory(null);
        }
        setIsLoading(false);
      });
    }
  }, [storyId, user]);

  const handleAddToLibrary = () => {
    if (!story) return;
    toast({ title: 'Added to Library (Mock)', description: `"${story.title}" has been added to your library.` });
  };
  
  const handleMoodMatcherClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "Mood Matcher (Coming Soon!)",
      description: "Tell us how you feel, and we'll find stories to match your vibe!",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <Info className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Story Not Found</h1>
        <p className="text-muted-foreground mb-6">The story you're looking for doesn't exist or you may not have permission to view it.</p>
        <Link href="/stories" passHref>
          <Button variant="outline">Back to Stories</Button>
        </Link>
      </div>
    );
  }

  const firstChapterId = story.chapters?.find(ch => ch.status === 'Published')?.id;
  const publishedChapters = story.chapters?.filter(ch => ch.status === 'Published') || [];
  const totalPublishedChapters = publishedChapters.length;
  
  const averageWordCountPerChapter = totalPublishedChapters > 0
    ? Math.round(publishedChapters.reduce((sum, chap) => sum + (chap.wordCount || 1500), 0) / totalPublishedChapters)
    : 1500;
  const estimatedReadTimeMinutes = Math.max(1, Math.round((totalPublishedChapters * averageWordCountPerChapter) / 200));

  const isAuthorOrCollaborator = user && (story.author.id === user.id || story.collaborators?.some(c => c.id === user.id));

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      <div className="flex justify-center">
        <div className="relative aspect-[2/3] w-full max-w-xs rounded-lg overflow-hidden shadow-2xl group">
          <Image
            src={story.coverImageUrl || `https://placehold.co/512x800.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={story.dataAiHint || "book cover"}
            priority
          />
          <button
            onClick={handleMoodMatcherClick}
            aria-label="Mood Matcher"
            className="absolute top-3 left-3 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-primary/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Mood Matcher (Find similar vibes)"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">{story.title}</h1>
        <Link
          href={`/profile/${story.author.id}`}
          className="inline-flex items-center gap-2.5 text-md text-muted-foreground hover:text-primary transition-colors group"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={story.author.avatarUrl} alt={story.author.username} data-ai-hint="profile person" />
            <AvatarFallback>{story.author.username?.substring(0, 1).toUpperCase() || 'A'}</AvatarFallback>
          </Avatar>
          <span className="font-medium group-hover:underline">{story.author.displayName || story.author.username}</span>
        </Link>
      </div>

      <div className="flex justify-center items-center gap-2">
        {firstChapterId ? (
          <Link href={`/stories/${story.id}/read/${firstChapterId}`} passHref>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <BookOpen className="mr-2 h-5 w-5" /> Start Reading
            </Button>
          </Link>
        ) : (
          <Button size="lg" disabled>
            <BookOpen className="mr-2 h-5 w-5" /> No Chapters Yet
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={handleAddToLibrary} title="Add to Library">
          <BookmarkPlus className="h-5 w-5" />
        </Button>
        {isAuthorOrCollaborator && (
          <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
            <Button size="lg" variant="outline" title="Edit Story Details">
              <Edit className="h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4 text-center text-muted-foreground py-4 border-y">
        <div className="flex flex-col items-center" title="Reads">
          <strong className="text-xl font-bold text-foreground">{story.views ? (story.views / 1000).toFixed(1) + 'k' : '0'}</strong>
          <span className="text-xs">Reads</span>
        </div>
        <div className="flex flex-col items-center" title="Votes (Mock)">
          <strong className="text-xl font-bold text-foreground">{Math.floor((story.rating || 0) * (story.views || 0) / 5000) || 0}</strong>
          <span className="text-xs">Votes</span>
        </div>
        <div className="flex flex-col items-center" title="Published Chapters">
          <strong className="text-xl font-bold text-foreground">{totalPublishedChapters}</strong>
          <span className="text-xs">Parts</span>
        </div>
        <div className="flex flex-col items-center" title="Estimated Read Time">
          <strong className="text-xl font-bold text-foreground">{estimatedReadTimeMinutes}</strong>
          <span className="text-xs">min read</span>
        </div>
      </div>
      
      <Badge variant={story.status === 'Completed' ? 'secondary' : 'default'}
          className={cn(
              "mx-auto block w-fit",
              story.status === 'Completed' && 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
              (story.status === 'Ongoing' || story.status === 'Public') && 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
              story.status === 'Draft' && 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600',
              (story.visibility === 'Private' || story.visibility === 'Unlisted') && 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700'
          )}>
          {story.visibility === 'Public' && story.status !== 'Completed' && story.status !== 'Draft' ? 'Ongoing' : story.status || 'Public'}
      </Badge>


      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none pt-4">
        <h2 className="text-xl font-headline font-semibold mb-2 text-foreground">Description</h2>
        <p className={cn(!isDescriptionExpanded && "line-clamp-5", "whitespace-pre-line text-muted-foreground")}>
          {story.summary || "No description available."}
        </p>
        {story.summary && story.summary.length > 200 && (
              <Button variant="link" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="p-0 h-auto text-sm text-primary hover:underline">
                {isDescriptionExpanded ? "Show Less" : "Show More"}
            </Button>
        )}
      </div>

      <div className="mb-6">
          <h3 className="text-lg font-headline font-semibold mb-2 text-foreground">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {story.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
            {story.tags.length === 0 && <p className="text-xs text-muted-foreground">No tags for this story.</p>}
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <h2 className="text-xl font-headline font-semibold mb-3 text-foreground">Table of Contents ({totalPublishedChapters} Published Parts)</h2>
        {publishedChapters.length > 0 ? (
          <ScrollArea className="max-h-[400px] pr-3 border rounded-md">
            <ul className="space-y-0 divide-y divide-border">
              {publishedChapters.sort((a, b) => a.order - b.order).map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`/stories/${story.id}/read/${chapter.id}`} passHref>
                    <div className="block p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground truncate pr-2">
                          Part {chapter.order}: {chapter.title}
                        </span>
                        {chapter.publishedDate && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatDate(chapter.publishedDate)}
                          </span>
                        )}
                      </div>
                      {chapter.wordCount && (
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            {Math.round(chapter.wordCount / 200) || 1} min read
                          </span>
                        )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-4 border rounded-md">No chapters published yet for this story.</p>
        )}
      </div>
    </div>
  );
}
