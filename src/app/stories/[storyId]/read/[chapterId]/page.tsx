

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
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  MessageSquare,
  ThumbsUp,
  Share2,
  X,
  ListOrdered,
  Settings2,
  Loader2,
  Home,
  Moon,
  Sparkles,
  Lock,
  BookmarkCheck,
  Sun,
  Monitor,
  TextIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import type { Story, Chapter, UserSummary, AllowedUser } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { toggleChapterVote } from '@/app/actions/storyActions';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'


type FontSize = 'sm' | 'base' | 'lg' | 'xl';
const fontSizes: FontSize[] = ['sm', 'base', 'lg', 'xl'];

export default function StoryReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, addToLibrary, removeFromLibrary } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const storyId = Array.isArray(params.storyId) ? params.storyId[0] : params.storyId;
  const chapterIdParams = Array.isArray(params.chapterId) ? params.chapterId[0] : params.chapterId;

  const [story, setStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tocVisible, setTocVisible] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [isNightPortalActive, setIsNightPortalActive] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const viewIncrementedRef = useRef(false);

  const editor = useEditor({
    editable: false,
    content: '',
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
    ],
  });

  // Load reading preferences from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem('reader-font-size') as FontSize;
    const savedNightPortal = localStorage.getItem('reader-night-portal') === 'true';
    if (savedFontSize && fontSizes.includes(savedFontSize)) {
      setFontSize(savedFontSize);
    }
    setIsNightPortalActive(savedNightPortal);
  }, []);

  // Apply night portal class to body
  useEffect(() => {
    document.body.classList.toggle('night-portal', isNightPortalActive);
    localStorage.setItem('reader-night-portal', String(isNightPortalActive));
  }, [isNightPortalActive]);
  
  // Save font size to localStorage
  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize);
  }, [fontSize]);

  const incrementViewCount = useCallback(async () => {
    if (viewIncrementedRef.current || !storyId) return;
    try {
      const storyRef = doc(db, 'stories', storyId);
      await updateDoc(storyRef, { views: increment(1) });
      viewIncrementedRef.current = true;
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  }, [storyId]);


  useEffect(() => {
    if (!storyId) return;

    setIsLoading(true);
    const storyDocRef = doc(db, 'stories', storyId);

    const unsubscribe = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
        setStory(storyData);
        
        const chapterData = storyData.chapters.find(c => c.id === chapterIdParams);

        if (chapterData) {
            setCurrentChapter(chapterData);
            if (editor && chapterData.content) {
              editor.commands.setContent(chapterData.content);
            }
            
            const visibleChapters = storyData.chapters.filter(c => c.status === 'Published' || c.accessType === 'premium');
            const chapterIndex = visibleChapters.findIndex(c => c.id === chapterIdParams);
            const progress = visibleChapters.length > 0 ? ((chapterIndex + 1) / visibleChapters.length) * 100 : 0;
            setReadingProgress(Math.min(100, Math.max(0, progress)));

            // --- Access Control Logic ---
            let hasAccess = false;
            if (chapterData.accessType === 'premium') {
              if (currentUser) {
                // Author always has access
                if (storyData.author.id === currentUser.id) {
                  hasAccess = true;
                }
                // Check if user is in the allowed list and if access is still valid
                const userAccessRecord = chapterData.allowedUsers?.find(u => u.userId === currentUser.id);
                if (userAccessRecord && userAccessRecord.expiresAt) {
                  const expiryDate = (userAccessRecord.expiresAt as Timestamp).toDate();
                  if (expiryDate > new Date()) {
                    hasAccess = true;
                  }
                }
              }
            } else {
              // Public chapters are accessible to everyone
              hasAccess = chapterData.status === 'Published';
            }
            
            // Collaborators also have access
            if (currentUser && storyData.collaboratorIds?.includes(currentUser.id)) {
              hasAccess = true;
            }

            setIsAccessGranted(hasAccess);

            if (hasAccess) {
              incrementViewCount();
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

    return () => {
      unsubscribe();
      // Clean up night portal class on unmount
      document.body.classList.remove('night-portal');
    };
  }, [storyId, chapterIdParams, router, currentUser, toast, incrementViewCount, editor]);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [currentChapter]);


  const toggleMainControls = () => {
    setControlsVisible(prev => !prev);
    if (tocVisible) setTocVisible(false); 
  };
  
  const toggleToc = () => {
    setTocVisible(prev => !prev);
    if (!tocVisible && !controlsVisible) { 
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

  const handleVoteClick = async () => {
    if (!currentUser || !story || !currentChapter) {
        toast({ title: "Please sign in", description: "You need to be logged in to vote.", variant: "destructive" });
        return;
    }
    if (isVoting) return;

    setIsVoting(true);
    
    // Optimistic UI Update
    const originalChapter = { ...currentChapter };
    const wasVoting = originalChapter.voterIds?.includes(currentUser.id) || false;

    const newVoterIds = wasVoting
      ? originalChapter.voterIds?.filter(id => id !== currentUser.id)
      : [...(originalChapter.voterIds || []), currentUser.id];
    
    const newVoteCount = wasVoting
        ? Math.max(0, (originalChapter.votes || 0) - 1)
        : (originalChapter.votes || 0) + 1;

    const updatedOptimisticChapter: Chapter = {
        ...originalChapter,
        voterIds: newVoterIds,
        votes: newVoteCount,
    };
    setCurrentChapter(updatedOptimisticChapter);


    const result = await toggleChapterVote(story.id, currentChapter.id, currentUser.id);
    
    if (!result.success) {
        // Revert UI on failure
        setCurrentChapter(originalChapter);
        toast({ title: "Vote Failed", description: result.error, variant: "destructive" });
    }
    
    setIsVoting(false);
  };

  const handleLibraryAction = () => {
    if (!story) return;
    if (!currentUser) {
        toast({ title: "Please Sign In", description: "You must be logged in to manage your library.", variant: "destructive"});
        router.push('/auth/signin');
        return;
    }

    const isInLibrary = currentUser.readingList?.some(item => item.id === story.id);
    if (isInLibrary) {
      removeFromLibrary(story.id);
    } else {
      addToLibrary(story);
    }
  };

  if (isLoading || !story || !currentChapter) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const author = story.author;
  const visibleChapters = story.chapters.filter(ch => ch.status === 'Published' || (currentUser && (story.author.id === currentUser.id || story.collaboratorIds?.includes(currentUser.id))) || ch.accessType === 'premium');

  const currentVisibleChapterIndex = visibleChapters.findIndex(c => c.id === currentChapter.id);

  const prevChapterId = currentVisibleChapterIndex > 0 ? visibleChapters[currentVisibleChapterIndex - 1].id : null;
  const nextChapterId = currentVisibleChapterIndex < visibleChapters.length - 1 ? visibleChapters[currentVisibleChapterIndex + 1].id : null;

  const hasVoted = currentUser ? currentChapter?.voterIds?.includes(currentUser.id) : false;
  const isInLibrary = currentUser?.readingList?.some(item => item.id === story.id);

  return (
    <>
    <div className={cn("relative min-h-screen bg-background text-foreground overflow-hidden", {'select-none': currentChapter.accessType === 'premium'})}>
      <header
        className={cn(
          'fixed top-0 left-0 z-40 bg-card/80 backdrop-blur-md border-b shadow-sm transition-all duration-300 ease-in-out p-2 sm:p-3 flex items-center justify-between w-full',
          controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0',
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
                <DropdownMenuItem onClick={() => setIsNightPortalActive(!isNightPortalActive)}>
                    <Moon className="mr-2 h-4 w-4" /> Night Reading Portal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Font Size</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={fontSize} onValueChange={(v) => setFontSize(v as FontSize)}>
                    {fontSizes.map(size => (
                        <DropdownMenuRadioItem key={size} value={size} className="capitalize">
                            <TextIcon className="mr-2 h-4 w-4" /> {size}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenuRadioItem value="light"><Sun className="mr-2 h-4 w-4" />Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark"><Moon className="mr-2 h-4 w-4" />Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system"><Monitor className="mr-2 h-4 w-4" />System</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
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
            {visibleChapters.sort((a,b)=>a.order-b.order).map((chapter) => (
              <li key={chapter.id}>
                <Button
                  variant={chapter.id === currentChapter.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-left h-auto py-1.5 px-2 text-sm"
                  onClick={() => navigateToChapterById(chapter.id)}
                >
                  <span className={cn("truncate", chapter.id === currentChapter.id ? "font-semibold" : "")}>
                    {chapter.order}. {chapter.title}
                  </span>
                   {chapter.accessType === 'premium' && <Sparkles className="h-3 w-3 text-yellow-500 ml-auto flex-shrink-0" />}
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
            const target = e.target as HTMLElement;
            if (target.id === 'main-reader') {
                toggleMainControls();
            }
        }}
        id="main-reader"
        role="button" 
        tabIndex={0} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMainControls();}}
        aria-pressed={controlsVisible}
        aria-label="Reading area, click to toggle controls"
      >
        <div ref={contentRef} className="min-h-[calc(100vh-10rem)]" onClick={(e) => {
             const target = e.target as HTMLElement;
            // Toggle controls if clicking on the main background, but not on text content itself
            if (!editor?.isFocused && target.closest('.ProseMirror') === null) {
                toggleMainControls();
            }
        }}> 
             <article className={cn(
              "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-12 selection:bg-primary/20 prose-reading",
              {
                'prose-sm': fontSize === 'sm',
                'prose-base': fontSize === 'base',
                'prose-lg': fontSize === 'lg',
                'prose-xl': fontSize === 'xl',
              }
            )}>
              <h2 className="font-headline text-2xl sm:text-3xl mb-6 pt-4 text-center">{currentChapter.title}</h2>
              {isAccessGranted ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="text-center py-10 flex flex-col items-center gap-4">
                  <Sparkles className="w-16 h-16 text-yellow-500" />
                  <h2 className="text-2xl font-headline font-bold">Premium Chapter</h2>
                  <p className="text-muted-foreground max-w-md">This chapter is a special release available only to users granted premium access by the author.</p>
                  <Button onClick={() => router.push(`/stories/${storyId}`)}>Back to Story Overview</Button>
                </div>
              )}
            </article>
        </div>
      </main>

      <footer
        className={cn(
          'fixed bottom-0 left-0 z-40 bg-card/80 backdrop-blur-md border-t transform transition-transform duration-300 ease-in-out',
          controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
          tocVisible ? 'md:w-[calc(100%-20rem)]' : 'w-full'  
        )}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-3 px-2 py-2">
            <div className="flex items-center gap-3 w-full">
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">Ch. {currentChapter?.order || 'N/A'}</span>
                <Progress value={readingProgress} className="w-full h-1.5" aria-label={`Reading progress ${readingProgress.toFixed(0)}%`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{readingProgress.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center w-full">
                <Button variant="ghost" size="icon" onClick={() => prevChapterId && navigateToChapterById(prevChapterId)} disabled={!prevChapterId} aria-label="Previous Chapter">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-1">
                    <Button variant="ghost" size="icon" onClick={handleVoteClick} disabled={isVoting} aria-label="Vote for this chapter">
                        <ThumbsUp className={cn("h-5 w-5 transition-colors", hasVoted && "fill-primary text-primary")} />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Link href={`/stories/${storyId}/read/${chapterIdParams}/comments`} passHref>
                      <Button variant="ghost" size="icon" aria-label="View comments">
                          <MessageSquare className="h-5 w-5" />
                      </Button>
                    </Link>
                    <Separator orientation="vertical" className="h-6" />
                     <Button variant="ghost" size="icon" onClick={handleLibraryAction} aria-label="Add to library">
                       {isInLibrary ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        const shareData = {
                          title: `"${story?.title}" by ${story?.author.displayName || story?.author.username}`,
                          text: `Check out this chapter on D4RKV3NOM: ${currentChapter?.title}`,
                          url: window.location.href,
                        };
                        try {
                          if (navigator.share) {
                            await navigator.share(shareData);
                            toast({ title: 'Story Shared!', description: 'Thanks for spreading the word.' });
                          } else {
                            await navigator.clipboard.writeText(window.location.href);
                            toast({ title: 'Link Copied!', description: `Link to "${story?.title} - ${currentChapter?.title}" copied to clipboard.` });
                          }
                        } catch (error) {
                          console.error('Share failed:', error);
                          toast({ title: 'Share Failed', description: 'Could not share at this time.', variant: 'destructive' });
                        }
                      }}
                      aria-label="Share this story"
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                </div>
                
                <Button variant="ghost" size="icon" onClick={() => nextChapterId && navigateToChapterById(nextChapterId)} disabled={!nextChapterId} aria-label="Next Chapter">
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </footer>
    </div>
    <div className="hidden md:block">
      {/* This ensures the BottomNav is not rendered on desktop for this page */}
    </div>
    <div className="md:hidden">
       <BottomNavigationBar />
    </div>
    </>
  );
}

    
