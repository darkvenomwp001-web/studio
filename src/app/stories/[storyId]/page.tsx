
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
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
  BookOpen,
  Users,
  Sun,
  Moon,
  Volume2,
  Sparkles
} from 'lucide-react';
import CommentSection from '@/components/comments/CommentSection';
import { placeholderStories } from '@/lib/placeholder-data';
import type { Story } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

async function getStoryData(storyId: string): Promise<Story | undefined> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return placeholderStories.find(story => story.id === storyId);
}

const mockStoryCharacters = (storyTitle?: string) => {
    if (!storyTitle) return [];
    if (storyTitle.includes("Stargazer")) return [{id: "char1", name: "Elara Vayne"}, {id: "char2", name: "Commander REX"}, {id: "char3", name: "The Oracle"}, {id: "char4", name: "Jax Nebula"}];
    if (storyTitle.includes("Shadow Forest")) return [{id: "char3", name: "Kaelen"}, {id: "char4", name: "Lyra the Sorceress"}];
    return [{id: "charGen1", name: "Protagonist"}, {id: "charGen2", name: "Antagonist"}];
}


export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.storyId as string;

  const [story, setStory] = useState<Story | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tocVisible, setTocVisible] = useState(false);
  const [mockReadingProgress, setMockReadingProgress] = useState(0);

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
          router.push('/404'); // Or a dedicated not found page for stories
        }
        setIsLoading(false);
      });
    }
  }, [storyId, router]);

  useEffect(() => {
    if (story && story.chapters.length > 0) {
      const progress = ((currentChapterIndex + 1) / story.chapters.length) * 100;
      setMockReadingProgress(Math.min(100, Math.max(0, progress)));
    } else {
      setMockReadingProgress(0);
    }
  }, [currentChapterIndex, story]);

  const currentChapter = story?.chapters[currentChapterIndex];
  const characters = story ? mockStoryCharacters(story.title) : [];

  const toggleMainControls = () => {
    setControlsVisible(prev => !prev);
    if (tocVisible) setTocVisible(false); 
  };
  
  const toggleToc = () => {
    setTocVisible(prev => !prev);
    if (!prev && !controlsVisible) { // If TOC is being opened and controls are hidden
      setControlsVisible(true);
    }
  };

  const navigateToChapter = (index: number) => {
    if (story && index >= 0 && index < story.chapters.length) {
      setCurrentChapterIndex(index);
      setTocVisible(false); 
      setControlsVisible(false); 
      contentRef.current?.scrollTo(0, 0);
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
  
  const handleAmbianceMode = (mode: string) => {
    toast({ title: "Ambiance Mode (Mock)", description: `${mode} activated. Imagine immersive sounds and visuals!`});
  }
  
  const handleCharacterClick = (characterName: string) => {
    toast({ title: "Character Info (Mock)", description: `Details for ${characterName}: A key figure in this tale... (Actual bio would show here).`});
  }

  const scrollToComments = () => {
    document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' });
    setControlsVisible(false);
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
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* Top Navigation Bar */}
      <header
        className={cn(
          'fixed top-0 left-0 z-40 bg-card/80 backdrop-blur-md border-b shadow-sm transition-all duration-300 ease-in-out p-2 sm:p-3 flex items-center justify-between',
          controlsVisible ? 'translate-y-0' : '-translate-y-full',
          tocVisible ? 'lg:right-72 md:lg:right-80 right-0' : 'right-0'
        )}
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back to Story Details">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="truncate text-center mx-2">
            <h1 className="text-md sm:text-lg font-headline font-semibold text-primary truncate">{story.title}</h1>
        </div>
        <div className="flex items-center">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Appearance Settings">
                <Settings2 className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Font Size (Soon)</DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Theme (Soon)</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem><Sun className="mr-2 h-4 w-4" /> Light</DropdownMenuItem>
                            <DropdownMenuItem><Moon className="mr-2 h-4 w-4" /> Dark</DropdownMenuItem>
                            <DropdownMenuItem><BookOpen className="mr-2 h-4 w-4" /> Sepia</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Ambiance Mode</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAmbianceMode("Forest Sounds")}>
                    <Volume2 className="mr-2 h-4 w-4" /> Forest Sounds
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAmbianceMode("Rainy Day")}>
                    <Sparkles className="mr-2 h-4 w-4" /> Rainy Day
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={toggleToc} aria-label="Table of Contents">
                <ListOrdered className="h-5 w-5" />
            </Button>
        </div>
      </header>

      {/* Right Table of Contents Sidebar */}
      <aside
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-72 md:w-80 bg-card shadow-xl p-4 transform transition-transform duration-300 ease-in-out flex flex-col',
          tocVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline text-lg text-primary">Contents</h3>
          <Button variant="ghost" size="icon" onClick={() => setTocVisible(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="aspect-[2/3] w-full relative mb-3 rounded-md overflow-hidden shadow-md">
          <Image
            src={story.coverImageUrl || `https://placehold.co/200x300.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
        </div>
        <Button onClick={handleAddToLibrary} variant="outline" className="w-full mb-3">
          <BookCopy className="mr-2 h-4 w-4" /> Add to Library
        </Button>
        
        <h4 className="font-semibold text-sm mt-2 mb-1 text-muted-foreground">Chapters</h4>
        <ScrollArea className="flex-1 mb-3 max-h-60">
          <ul className="space-y-1">
            {story.chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <Button
                  variant={index === currentChapterIndex ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-left h-auto py-1.5 px-2 text-sm"
                  onClick={() => navigateToChapter(index)}
                >
                  <span className={cn("truncate", index === currentChapterIndex ? "font-semibold" : "")}>
                    {chapter.order}. {chapter.title}
                  </span>
                </Button>
              </li>
            ))}
             {story.chapters.length === 0 && <p className="text-xs text-muted-foreground p-2">No chapters yet.</p>}
          </ul>
        </ScrollArea>

        {characters.length > 0 && (
            <>
            <h4 className="font-semibold text-sm mt-2 mb-1 text-muted-foreground">Characters</h4>
            <ScrollArea className="flex-1 mb-2 max-h-28">
            <ul className="space-y-1">
                {characters.map(char => (
                <li key={char.id}>
                    <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-1 px-2 text-xs"
                    onClick={() => handleCharacterClick(char.name)}
                    >
                    <Users className="mr-2 h-3 w-3" /> {char.name}
                    </Button>
                </li>
                ))}
            </ul>
            </ScrollArea>
            </>
        )}

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
          'transition-all duration-300 ease-in-out focus:outline-none',
          'pt-16 pb-20', 
          tocVisible ? 'lg:mr-72 md:lg:mr-80' : 'mr-0' 
        )}
        onClick={(e) => {
            if (e.target === e.currentTarget && e.button === 0) {
                toggleMainControls();
            }
        }}
        role="button" 
        tabIndex={0} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMainControls();}}
        aria-pressed={controlsVisible}
        aria-label="Reading area, click to toggle controls"
      >
        <div ref={contentRef} className="min-h-[calc(100vh-8rem)]">
            <article className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-12 selection:bg-primary/20">
            {currentChapter ? (
                <>
                <h2 className="font-headline text-2xl sm:text-3xl mb-6 pt-4">{currentChapter.title}</h2>
                {currentChapter.content.split('\n').map((paragraph, index) => ( // Ensure split by newline character
                  <p key={index} className="leading-relaxed my-4">{paragraph}</p>
                ))}
                </>
            ) : (
                <div className="text-center py-10">
                <p className="text-muted-foreground">Select a chapter to start reading.</p>
                {story.chapters.length === 0 && <p className="text-muted-foreground mt-2">This story doesn't have any chapters yet.</p>}
                </div>
            )}
            </article>
        </div>
        
        <div id="comment-section" className="px-4 sm:px-6 md:px-12 pt-8 pb-24">
            <CommentSection storyId={story.id} chapterId={currentChapter?.id} />
        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer
        className={cn(
          'fixed bottom-0 left-0 z-40 bg-card/80 backdrop-blur-md border-t p-2 transform transition-transform duration-300 ease-in-out',
          controlsVisible ? 'translate-y-0' : 'translate-y-full',
          tocVisible ? 'lg:right-72 md:lg:right-80 right-0' : 'right-0' 
        )}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2 px-2">
            <div className="flex items-center gap-2 w-full">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Ch. {currentChapter?.order || 'N/A'}</span>
                <Progress value={mockReadingProgress} className="w-full h-1.5" aria-label={`Reading progress ${mockReadingProgress.toFixed(0)}%`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{mockReadingProgress.toFixed(0)}%</span>
            </div>
            <div className="flex justify-around items-center w-full">
                <Button variant="ghost" size="sm" onClick={() => navigateToChapter(currentChapterIndex - 1)} disabled={currentChapterIndex <= 0} aria-label="Previous Chapter">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="ml-1 hidden sm:inline">Prev</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleVote} aria-label="Vote for this chapter">
                    <ThumbsUp className="h-5 w-5" />
                    <span className="ml-1 hidden sm:inline">Vote</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={scrollToComments} aria-label="View comments">
                    <MessageSquare className="h-5 w-5" />
                    <span className="ml-1 hidden sm:inline">Comment</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare} aria-label="Share this story">
                    <Share2 className="h-5 w-5" />
                    <span className="ml-1 hidden sm:inline">Share</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigateToChapter(currentChapterIndex + 1)} disabled={!story || currentChapterIndex >= story.chapters.length - 1} aria-label="Next Chapter">
                    <span className="mr-1 hidden sm:inline">Next</span>
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </footer>
    </div>
  );
}
        

    