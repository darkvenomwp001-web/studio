
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter }
from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  ArrowRight,
  BookCopy,
  MessageSquare,
  ThumbsUp,
  Share2,
  X,
  ListOrdered,
  Settings2,
  Loader2,
} from 'lucide-react';
import CommentSection from '@/components/comments/CommentSection';
import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
import type { Story, Chapter } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock function to fetch story data - in a real app, this would be an API call
async function getStoryData(storyId: string): Promise<Story | undefined> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return placeholderStories.find(story => story.id === storyId);
}

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.storyId as string;

  const [story, setStory] = useState<Story | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storyId) {
      setIsLoading(true);
      getStoryData(storyId).then(data => {
        if (data) {
          setStory(data);
          if (data.chapters && data.chapters.length > 0) {
            setCurrentChapterIndex(0);
          }
        } else {
          // Handle story not found, e.g., redirect or show message
          router.push('/404'); // Or a custom "story not found" page
        }
        setIsLoading(false);
      });
    }
  }, [storyId, router]);

  const currentChapter = story?.chapters[currentChapterIndex];

  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  const navigateToChapter = (index: number) => {
    if (story && index >= 0 && index < story.chapters.length) {
      setCurrentChapterIndex(index);
      setShowControls(false); // Hide controls after chapter navigation for better reading
      contentRef.current?.scrollTo(0, 0); // Scroll to top of new chapter
    }
  };

  const handleAddToLibrary = () => {
    toast({ title: 'Added to Library (Mock)', description: `"${story?.title}" has been added to your library.` });
  };

  const handleVote = () => {
    toast({ title: 'Voted (Mock)', description: `You voted for "${currentChapter?.title}".` });
  };

  const handleShare = () => {
    toast({ title: 'Shared (Mock)', description: `"${story?.title}" link copied to clipboard (mock).` });
  };

  const scrollToComments = () => {
    document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' });
    setShowControls(false);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
    return <div className="text-center py-10 text-lg">Story not found.</div>;
  }
  
  const author = story.author;


  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Left Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 w-72 md:w-80 bg-card shadow-lg p-4 transform transition-transform duration-300 ease-in-out flex flex-col',
          showControls ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline text-lg text-primary">Table of Contents</h3>
          <Button variant="ghost" size="icon" onClick={toggleControls}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="aspect-[2/3] w-full relative mb-4 rounded-md overflow-hidden shadow-md">
          <Image
            src={story.coverImageUrl || `https://placehold.co/200x300.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
        </div>
        <Button onClick={handleAddToLibrary} variant="outline" className="w-full mb-4">
          <BookCopy className="mr-2 h-4 w-4" /> Add to Library
        </Button>
        <ScrollArea className="flex-1 mb-4">
          <ul className="space-y-1">
            {story.chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <Button
                  variant={index === currentChapterIndex ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => navigateToChapter(index)}
                >
                  <span className={cn("truncate", index === currentChapterIndex ? "font-semibold" : "")}>
                    {chapter.order}. {chapter.title}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        {author && (
            <Link href={`/profile/${author.id}`} className="mt-auto pt-2 border-t">
                <div className="flex items-center gap-2 hover:bg-muted p-2 rounded-md">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={author.avatarUrl} alt={author.username} data-ai-hint="profile person" />
                    <AvatarFallback>{author.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{author.displayName || author.username}</span>
                </div>
            </Link>
        )}
      </aside>

      {/* Main Content Area */}
      <main
        className={cn(
          'transition-all duration-300 ease-in-out pb-24', // padding-bottom for bottom bar
           showControls && story.chapters.length > 0 ? 'lg:ml-72 md:lg:ml-80' : 'ml-0' // Only apply margin if sidebar is shown and there are chapters
        )}
      >
        {/* Top Control Bar */}
         <div
          className={cn(
            'sticky top-0 z-30 bg-background/80 backdrop-blur-md p-2 sm:p-3 border-b transition-opacity duration-300 flex items-center justify-between',
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleControls}>
              <ListOrdered className="h-5 w-5" />
            </Button>
            <div className="truncate">
                <h1 className="text-md sm:text-lg font-headline font-semibold text-primary truncate">{story.title}</h1>
                {currentChapter && <p className="text-xs text-muted-foreground truncate">Ch. {currentChapter.order}: {currentChapter.title}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => toast({title: "Appearance Settings (Mock)", description: "Font, theme choices would go here."})}>
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Chapter Content - Click to toggle controls */}
        <div ref={contentRef} className="min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-12rem)]" onClick={(e) => {
            // Only toggle if clicking directly on the content area, not on text selection or buttons inside
            if (e.target === e.currentTarget) {
               toggleControls();
            }
        }}>
            <article className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-8 selection:bg-primary/20 focus:outline-none" tabIndex={-1}>
            {currentChapter ? (
                <>
                <h2 className="font-headline text-2xl sm:text-3xl mb-6">{currentChapter.title}</h2>
                {/* In a real app, this would render HTML or parsed Markdown */}
                {currentChapter.content.split('\\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
                </>
            ) : (
                <div className="text-center py-10">
                <p className="text-muted-foreground">Select a chapter to start reading.</p>
                {story.chapters.length === 0 && <p className="text-muted-foreground mt-2">This story doesn't have any chapters yet.</p>}
                </div>
            )}
            </article>
        </div>
        
        {/* Static Comment Section - always below content */}
        <div id="comment-section" className="px-4 sm:px-6 md:px-8 pt-8">
            <CommentSection storyId={story.id} chapterId={currentChapter?.id} />
        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 bg-card/90 backdrop-blur-md border-t p-2 transform transition-transform duration-300 ease-in-out',
           showControls && story.chapters.length > 0 ? 'lg:left-72 md:lg:left-80' : 'left-0', // Adjust left offset when sidebar is open
          showControls ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="max-w-3xl mx-auto flex justify-around items-center">
          <Button variant="ghost" size="sm" onClick={() => navigateToChapter(currentChapterIndex - 1)} disabled={currentChapterIndex <= 0}>
            <ArrowLeft className="h-5 w-5" />
            <span className="ml-1 hidden sm:inline">Prev</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleVote}>
            <ThumbsUp className="h-5 w-5" />
            <span className="ml-1 hidden sm:inline">Vote</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={scrollToComments}>
            <MessageSquare className="h-5 w-5" />
             <span className="ml-1 hidden sm:inline">Comment</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
             <span className="ml-1 hidden sm:inline">Share</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateToChapter(currentChapterIndex + 1)} disabled={!story || currentChapterIndex >= story.chapters.length - 1}>
             <span className="mr-1 hidden sm:inline">Next</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

    