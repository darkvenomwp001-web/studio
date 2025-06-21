
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowRight,
  BookCopy,
  MessageSquare as MessageSquareIcon, 
  MessagesSquare, // For Chapter Echoes icon
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
  Sparkles,
  Home
} from 'lucide-react';
import type { Story, Chapter, UserSummary } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import SendLetterForm from '@/components/letters/SendLetterForm';

export default function StoryReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const storyId = Array.isArray(params.storyId) ? params.storyId[0] : params.storyId;
  const chapterIdParams = Array.isArray(params.chapterId) ? params.chapterId[0] : params.chapterId;

  const [story, setStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tocVisible, setTocVisible] = useState(false);
  const [mockReadingProgress, setMockReadingProgress] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storyId) return;

    setIsLoading(true);
    const storyDocRef = doc(db, 'stories', storyId);

    const unsubscribe = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
        setStory(storyData);
        
        const chapterIndex = storyData.chapters.findIndex(c => c.id === chapterIdParams);
        if (chapterIndex !== -1) {
            const chapterData = storyData.chapters[chapterIndex];

            const canViewChapter = 
              chapterData.status === 'Published' || 
              (currentUser && (storyData.author.id === currentUser.id || storyData.collaborators?.some(c => c.id === currentUser.id)));

            if(canViewChapter) {
              setCurrentChapter(chapterData);
              const progress = ((chapterIndex + 1) / storyData.chapters.length) * 100;
              setMockReadingProgress(Math.min(100, Math.max(0, progress)));
            } else {
              toast({ title: "Chapter not available", description: "This chapter is not published yet.", variant: "destructive" });
              router.push(`/stories/${storyId}`);
            }
        } else {
            toast({ title: "Chapter not found", description: "This chapter does not seem to exist.", variant: "destructive" });
            router.push(`/stories/${storyId}`);
        }

      } else {
        toast({ title: "Story Not Found", description: "This story does not exist.", variant: "destructive" });
        router.push('/');
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching story for reader:", error);
      toast({ title: "Error", description: "Could not load the story.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [storyId, chapterIdParams, router, currentUser, toast]);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [currentChapter]);


  const toggleMainControls = () => {
    setControlsVisible(prev => !prev);
    if (tocVisible) setTocVisible(false); 
  };
  
  const toggleToc = () => {
    setTocVisible(prev => !prev);
    if (!prev && !controlsVisible) { 
      setControlsVisible(true);
    }
  };

  const navigateToChapterById = (targetChapterId: string) => {
    if (story) {
        const targetIndex = story.chapters.findIndex(c => c.id === targetChapterId);
        if (targetIndex !== -1) {
            router.push(`/stories/${story.id}/read/${targetChapterId}`);
            setTocVisible(false); 
            setControlsVisible(true); 
        }
    }
  };

  const handleVote = useCallback(async () => {
    if (!story || !currentChapter) return;
    
    // In a real app, you would track if the user has already voted for this chapter.
    // For now, we will just increment.
    
    const chapterIndex = story.chapters.findIndex(c => c.id === currentChapter.id);
    if (chapterIndex === -1) return;

    const newChapters = [...story.chapters];
    const newVotes = (newChapters[chapterIndex].votes || 0) + 1;
    newChapters[chapterIndex] = { ...newChapters[chapterIndex], votes: newVotes };

    const storyDocRef = doc(db, 'stories', story.id);
    try {
      await updateDoc(storyDocRef, { 
        chapters: newChapters,
        lastUpdated: serverTimestamp() 
      });
      toast({ title: 'Voted!', description: `You voted for "${currentChapter.title}".` });
    } catch (error) {
      console.error("Error voting for chapter:", error);
      toast({ title: 'Error', description: 'Could not cast your vote.', variant: 'destructive' });
    }
  }, [story, currentChapter, toast]);


  const handleShare = () => {
     navigator.clipboard.writeText(window.location.href)
      .then(() => {
        toast({ title: 'Link Copied!', description: `Link to "${story?.title} - ${currentChapter?.title}" copied to clipboard.` });
      })
      .catch(() => {
        toast({ title: 'Share (Mock)', description: `Link would be shareable here.`});
      });
  };
  
  const handleAmbianceMode = (mode: string) => {
    toast({ title: "Ambiance Mode (Mock)", description: `${mode} activated. Imagine immersive sounds and visuals!`});
  }

  if (isLoading || !story || !currentChapter) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const author = story.author;
  const visibleChapters = currentUser && (story.author.id === currentUser.id || story.collaborators?.some(c => c.id === currentUser.id))
    ? story.chapters // Author/collaborator sees all chapters
    : story.chapters.filter(ch => ch.status === 'Published');

  const currentVisibleChapterIndex = visibleChapters.findIndex(c => c.id === currentChapter.id);

  const prevChapterId = currentVisibleChapterIndex > 0 ? visibleChapters[currentVisibleChapterIndex - 1].id : null;
  const nextChapterId = currentVisibleChapterIndex < visibleChapters.length - 1 ? visibleChapters[currentVisibleChapterIndex + 1].id : null;


  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <header
        className={cn(
          'fixed top-0 left-0 z-40 bg-card/80 backdrop-blur-md border-b shadow-sm transition-all duration-300 ease-in-out p-2 sm:p-3 flex items-center justify-between w-full',
          controlsVisible ? 'translate-y-0' : '-translate-y-full',
          tocVisible ? 'md:w-[calc(100%-20rem)]' : 'w-full' 
        )}
      >
        <div className="flex items-center">
            <Link href={`/stories/${story.id}`} passHref>
                 <Button variant="ghost" size="icon" aria-label="Back to Story Overview">
                    <Home className="h-5 w-5" />
                </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleToc} aria-label="Table of Contents">
                <ListOrdered className="h-5 w-5" />
            </Button>
        </div>
        <div className="truncate text-center mx-2 flex-1">
            <h1 className="text-md sm:text-lg font-headline font-semibold text-primary truncate">{story.title}</h1>
            <p className="text-xs text-muted-foreground truncate">{currentChapter?.title || 'Chapter'}</p>
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
        </div>
      </header>

      <aside
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-72 md:w-80 bg-card shadow-xl p-4 transform transition-transform duration-300 ease-in-out flex flex-col border-l',
          tocVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline text-lg text-primary">Contents</h3>
          <Button variant="ghost" size="icon" onClick={() => setTocVisible(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="aspect-[2/3] w-full relative mb-3 rounded-md overflow-hidden shadow-md bg-muted">
          <Image
            src={story.coverImageUrl || `https://placehold.co/512x800.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
        </div>
        
        <h4 className="font-semibold text-sm mt-2 mb-1 text-muted-foreground">Chapters</h4>
        <ScrollArea className="flex-1 mb-3">
          <ul className="space-y-1">
            {visibleChapters.sort((a,b)=>a.order-b.order).map((chapter, index) => (
              <li key={chapter.id}>
                <Button
                  variant={chapter.id === currentChapter.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-left h-auto py-1.5 px-2 text-sm"
                  onClick={() => navigateToChapterById(chapter.id)}
                >
                  <span className={cn("truncate", chapter.id === currentChapter.id ? "font-semibold" : "")}>
                    {chapter.order}. {chapter.title}
                  </span>
                </Button>
              </li>
            ))}
             {visibleChapters.length === 0 && <p className="text-xs text-muted-foreground p-2">No chapters yet.</p>}
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

      <main
        className={cn(
          'transition-all duration-300 ease-in-out focus:outline-none',
          'pt-20 pb-24', 
          tocVisible ? 'md:w-[calc(100%-20rem)]' : 'w-full' 
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
        <div ref={contentRef} className="min-h-[calc(100vh-10rem)]"> 
            <article className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-12 selection:bg-primary/20">
            {currentChapter ? (
                <>
                <h2 className="font-headline text-2xl sm:text-3xl mb-6 pt-4">{currentChapter.title}</h2>
                {currentChapter.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="leading-relaxed my-4">{paragraph || '\u00A0'}</p>
                ))}
                </>
            ) : (
                <div className="text-center py-10">
                <p className="text-muted-foreground">Chapter not found or story has no chapters.</p>
                </div>
            )}
            </article>

            {currentUser && story && currentChapter && currentUser.id !== story.author.id && (
              <div className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-12">
                <SendLetterForm story={story} chapter={currentChapter} />
              </div>
            )}
        </div>
      </main>

      <footer
        className={cn(
          'fixed bottom-0 left-0 z-40 bg-card/80 backdrop-blur-md border-t p-2 transform transition-transform duration-300 ease-in-out',
          controlsVisible ? 'translate-y-0' : 'translate-y-full',
          tocVisible ? 'md:w-[calc(100%-20rem)]' : 'w-full'  
        )}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2 px-2">
            <div className="flex items-center gap-2 w-full">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Ch. {currentChapter?.order || 'N/A'}</span>
                <Progress value={mockReadingProgress} className="w-full h-1.5" aria-label={`Reading progress ${mockReadingProgress.toFixed(0)}%`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{mockReadingProgress.toFixed(0)}%</span>
            </div>
            <div className="flex justify-around items-center w-full">
                <Button variant="ghost" size="sm" onClick={() => prevChapterId && navigateToChapterById(prevChapterId)} disabled={!prevChapterId} aria-label="Previous Chapter">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="ml-1 hidden sm:inline">Prev</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleVote} aria-label="Vote for this chapter">
                    <ThumbsUp className="h-5 w-5" />
                    <span className="ml-1 hidden sm:inline">Vote ({currentChapter.votes || 0})</span>
                </Button>
                <Link href={`/stories/${storyId}/read/${chapterIdParams}/comments`} passHref>
                  <Button variant="ghost" size="sm" aria-label="View comments">
                      <MessageSquareIcon className="h-5 w-5" />
                      <span className="ml-1 hidden sm:inline">Comment</span>
                  </Button>
                </Link>
                <Link href={`/stories/${storyId}/read/${chapterIdParams}/echoes`} passHref>
                  <Button variant="ghost" size="sm" aria-label="Chapter Echoes">
                      <MessagesSquare className="h-5 w-5" />
                      <span className="ml-1 hidden sm:inline">Echoes</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleShare} aria-label="Share this story">
                    <Share2 className="h-5 w-5" />
                    <span className="ml-1 hidden sm:inline">Share</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => nextChapterId && navigateToChapterById(nextChapterId)} disabled={!nextChapterId} aria-label="Next Chapter">
                    <span className="mr-1 hidden sm:inline">Next</span>
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </footer>
    </div>
  );
}
