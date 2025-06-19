
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Eye,
  Heart,
  MessageSquare,
  ListOrdered,
  BookCopy,
  Share2,
  Loader2,
  Info,
  Edit
} from 'lucide-react';
import { placeholderStories, formatDate } from '@/lib/placeholder-data'; // Ensure formatDate is exported
import type { Story, Chapter } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

async function getStoryData(storyId: string): Promise<Story | undefined> {
  // In a real app, fetch from API. For mock, find in placeholderStories (which includes localStorage data).
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  return placeholderStories.find(story => story.id === storyId);
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
          setStory(data);
        } else {
          // router.push('/404'); // Or a dedicated not found page for stories
          console.warn("Story not found, router push to 404 would happen here.");
        }
        setIsLoading(false);
      });
    }
  }, [storyId, router]);

  const handleAddToLibrary = () => {
    if (!story) return;
    toast({ title: 'Added to Library (Mock)', description: `"${story.title}" has been added to your library.` });
  };
  
  const handleShare = () => {
    if (!story) return;
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        toast({ title: 'Link Copied!', description: `Link to "${story.title}" copied to clipboard.` });
      })
      .catch(() => {
        toast({ title: 'Share (Mock)', description: `Link to "${story.title}" would be shareable here.`});
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
        <p className="text-muted-foreground mb-6">The story you're looking for doesn't exist or may have been moved.</p>
        <Link href="/stories" passHref>
          <Button variant="outline">Back to Stories</Button>
        </Link>
      </div>
    );
  }

  const firstChapterId = story.chapters?.[0]?.id;
  const totalChapters = story.chapters?.length || 0;
  const averageWordCountPerChapter = totalChapters > 0 
    ? Math.round(story.chapters.reduce((sum, chap) => sum + (chap.wordCount || 1500), 0) / totalChapters)
    : 1500; // Default average
  const estimatedReadTimeMinutes = Math.max(1, Math.round((totalChapters * averageWordCountPerChapter) / 200)); // 200 WPM average

  const isAuthor = user?.id === story.author.id;


  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left Column: Cover & Actions */}
        <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
          <div className="relative aspect-[2/3] w-full max-w-xs md:max-w-none rounded-lg overflow-hidden shadow-2xl mb-6">
            <Image
              src={story.coverImageUrl || `https://placehold.co/512x800.png`}
              alt={story.title}
              layout="fill"
              objectFit="cover"
              data-ai-hint={story.dataAiHint || "book cover"}
              priority
            />
          </div>
          <div className="w-full max-w-xs md:max-w-none space-y-3">
            {firstChapterId ? (
              <Link href={`/stories/${story.id}/read/${firstChapterId}`} passHref className="w-full">
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg">
                  <BookOpen className="mr-2 h-5 w-5" /> Read Now
                </Button>
              </Link>
            ) : (
              <Button size="lg" className="w-full text-lg" disabled>
                 <BookOpen className="mr-2 h-5 w-5" /> No Chapters Yet
              </Button>
            )}
            <Button size="lg" variant="outline" className="w-full text-lg" onClick={handleAddToLibrary}>
              <BookCopy className="mr-2 h-5 w-5" /> Add to Library
            </Button>
            {isAuthor && (
              <Link href={`/write/edit?storyId=${story.id}`} passHref className="w-full">
                <Button size="lg" variant="outline" className="w-full text-lg border-accent text-accent hover:bg-accent/10">
                  <Edit className="mr-2 h-5 w-5" /> Edit Story
                </Button>
              </Link>
            )}
             <Button size="lg" variant="outline" className="w-full text-lg" onClick={handleShare}>
              <Share2 className="mr-2 h-5 w-5" /> Share
            </Button>
          </div>
        </div>

        {/* Right Column: Details & Chapters */}
        <div className="w-full md:w-2/3">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-1">{story.title}</h1>
          <p className="text-md text-muted-foreground mb-4">
            by{' '}
            <Link href={`/profile/${story.author.id}`} className="text-primary hover:underline font-medium">
              {story.author.displayName || story.author.username}
            </Link>
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-1.5" title="Views">
              <Eye className="w-4 h-4 text-accent" />
              <span>{story.views ? (story.views / 1000).toFixed(1) + 'k' : '0'} reads</span>
            </div>
            <div className="flex items-center gap-1.5" title="Votes (Mock)">
              <Heart className="w-4 h-4 text-accent" />
              <span>{Math.floor((story.rating || 0) * (story.views || 0) / 5000) || 0} votes</span>
            </div>
            <div className="flex items-center gap-1.5" title="Chapters">
              <ListOrdered className="w-4 h-4 text-accent" />
              <span>{totalChapters} parts</span>
            </div>
            <div className="flex items-center gap-1.5" title="Estimated Read Time">
              <BookOpen className="w-4 h-4 text-accent" />
              <span>{estimatedReadTimeMinutes} min read</span>
            </div>
             <Badge variant={story.status === 'Completed' ? 'secondary' : 'default'} 
                    className={cn(
                        story.status === 'Completed' && 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
                        story.status === 'Ongoing' && 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
                        story.status === 'Draft' && 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600'
                    )}>
                {story.status || 'Draft'}
            </Badge>
          </div>
          
          <div className="mb-6 prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <h2 className="text-xl font-headline font-semibold mb-2 text-foreground">Description</h2>
            <p className={cn(!isDescriptionExpanded && "line-clamp-5")}>
              {story.summary || "No description available."}
            </p>
            {story.summary && story.summary.length > 200 && (
                 <Button variant="link" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="p-0 h-auto text-sm">
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
            <h2 className="text-xl font-headline font-semibold mb-3 text-foreground">Table of Contents ({totalChapters} Parts)</h2>
            {story.chapters && story.chapters.length > 0 ? (
              <ScrollArea className="max-h-[400px] pr-3"> {/* Added pr-3 for scrollbar spacing */}
                <ul className="space-y-1">
                  {story.chapters.sort((a, b) => a.order - b.order).map((chapter, index) => (
                    <li key={chapter.id}>
                      <Link href={`/stories/${story.id}/read/${chapter.id}`} passHref>
                        <div className="block p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-foreground truncate">
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
              <p className="text-muted-foreground">No chapters published yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
