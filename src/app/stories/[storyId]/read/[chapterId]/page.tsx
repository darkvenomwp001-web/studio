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
  ArrowLeft,
  ArrowRight,
  Bookmark,
  MessageSquare,
  ThumbsUp,
  Share2,
  X,
  ListOrdered,
  Loader2,
  Home,
  Moon,
  Sparkles,
  Lock,
  BookmarkCheck,
  Sun,
  Monitor,
  TextIcon,
  Highlighter,
  Palette,
  Type,
  Baseline,
  RectangleHorizontal,
  RotateCcw,
  Search,
  Pencil,
  Snowflake,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import type { Story, Chapter } from '@/types'; 
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
import { BubbleMenu, Editor, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createAnnotation } from '@/app/actions/annotationActions';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';


type FontSize = 'sm' | 'base' | 'lg' | 'xl';
const fontSizes: FontSize[] = ['sm', 'base', 'lg', 'xl'];
type FontFamily = 'sans' | 'serif';
type LineHeight = 'tight' | 'normal' | 'loose';
type LayoutWidth = 'normal' | 'wide';


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

  // Appearance Settings
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');
  const [layoutWidth, setLayoutWidth] = useState<LayoutWidth>('normal');
  const [isNightPortalActive, setIsNightPortalActive] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ from: number; to: number; snippet: string }[]>([]);

  // Annotation state
  const [annotationNote, setAnnotationNote] = useState("");
  const [selectedHighlightColor, setSelectedHighlightColor] = useState("#fde047"); // Default yellow

  const contentRef = useRef<HTMLDivElement>(null);
  const viewIncrementedRef = useRef(false);

  const isAuthorOrCollaborator = currentUser && story && (story.author.id === currentUser.id || story.collaborators?.some(c => c.id === currentUser.id));

  const editor = useEditor({
    editable: false, // Start as non-editable; useEffect will manage this state.
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert focus:outline-none',
        },
    },
    content: '',
    extensions: [
        StarterKit,
        TiptapUnderline,
        TiptapHighlight.configure({ multicolor: true }),
    ],
});

  useEffect(() => {
    if (editor) {
      const isNowEditable = isAuthorOrCollaborator && !isFrozen;
      if (editor.isEditable !== isNowEditable) {
        editor.setEditable(isNowEditable);
      }
    }
  }, [isAuthorOrCollaborator, isFrozen, editor]);


  // Load reading preferences from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem('reader-font-size') as FontSize;
    const savedFontFamily = localStorage.getItem('reader-font-family') as FontFamily;
    const savedLineHeight = localStorage.getItem('reader-line-height') as LineHeight;
    const savedLayoutWidth = localStorage.getItem('reader-layout-width') as LayoutWidth;
    const savedNightPortal = localStorage.getItem('reader-night-portal') === 'true';

    if (savedFontSize && fontSizes.includes(savedFontSize)) setFontSize(savedFontSize);
    if (savedFontFamily) setFontFamily(savedFontFamily);
    if (savedLineHeight) setLineHeight(savedLineHeight);
    if (savedLayoutWidth) setLayoutWidth(savedLayoutWidth);
    setIsNightPortalActive(savedNightPortal);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize);
    localStorage.setItem('reader-font-family', fontFamily);
    localStorage.setItem('reader-line-height', lineHeight);
    localStorage.setItem('reader-layout-width', layoutWidth);
    localStorage.setItem('reader-night-portal', String(isNightPortalActive));
  }, [fontSize, fontFamily, lineHeight, layoutWidth, isNightPortalActive]);
  
  // Apply night portal class to body
  useEffect(() => {
    document.body.classList.toggle('night-portal', isNightPortalActive);
  }, [isNightPortalActive]);

  const resetAppearanceSettings = () => {
    setFontSize('base');
    setFontFamily('sans');
    setLineHeight('normal');
    setLayoutWidth('normal');
    setIsNightPortalActive(false);
    setTheme('system');
    toast({ title: "Appearance settings reset to default." });
  };


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
              editor.commands.setContent(chapterData.content, false);
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
  
  // Search logic
  useEffect(() => {
    if (!editor || !searchTerm.trim()) {
        setSearchResults([]);
        return;
    }

    const results: { from: number; to: number; snippet: string }[] = [];
    const { doc } = editor.state;
    const query = searchTerm.toLowerCase();

    doc.descendants((node, pos) => {
        if (!node.isText) return;

        const text = node.text?.toLowerCase() || '';
        let index = text.indexOf(query);
        while (index !== -1) {
            const from = pos + index;
            const to = from + query.length;
            
            const contextStart = Math.max(pos, from - 20);
            const contextEnd = Math.min(pos + node.nodeSize, to + 20);
            const snippet = doc.textBetween(contextStart, contextEnd, ' ');
            
            results.push({ from, to, snippet });
            index = text.indexOf(query, index + 1);
        }
    });

    setSearchResults(results);
  }, [searchTerm, editor]);
  
  const handleGoToSearchResult = (from: number, to: number) => {
      if (!editor) return;
      editor.commands.setTextSelection({ from, to });
      editor.view.dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toggleMainControls();
  };

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

  const handleSaveAnnotation = async () => {
    if (!editor || !currentUser || !story || !currentChapter) {
        toast({ title: "Cannot Annotate", description: "You must be signed in to save annotations.", variant: "destructive" });
        return;
    }

    const { from, to, empty } = editor.state.selection;
    if (empty) {
        toast({ title: "No Text Selected", description: "Please select some text to annotate.", variant: "destructive" });
        return;
    }

    const highlightedText = editor.state.doc.textBetween(from, to, " ");
    const previouslyEditable = editor.isEditable;

    try {
        if (!previouslyEditable) {
            editor.setEditable(true);
        }
        editor.chain().focus().toggleHighlight({ color: selectedHighlightColor }).run();
        
        await createAnnotation({
            userId: currentUser.id,
            storyId: story.id,
            storyTitle: story.title,
            chapterId: currentChapter.id,
            chapterTitle: currentChapter.title,
            highlightedText,
            highlightColor: selectedHighlightColor,
            note: annotationNote || undefined,
        });
        toast({ title: "Annotation Saved!", description: "Your highlight and note have been saved." });
        setAnnotationNote(""); // Reset note field

    } catch (error) {
        console.error("Failed to save annotation:", error);
        toast({ title: "Error", description: "Could not save your annotation.", variant: "destructive" });
        // Attempt to undo the visual highlight if DB save fails
        editor.chain().focus().unsetHighlight().run();
    } finally {
        if (!previouslyEditable) {
            editor.setEditable(false);
        }
    }
  };

  if (isLoading || !story || !currentChapter || !editor) {
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

  const articleClasses = cn(
      "prose dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-12 selection:bg-primary/20",
      {
        'prose-sm': fontSize === 'sm', 'prose-base': fontSize === 'base', 'prose-lg': fontSize === 'lg', 'prose-xl': fontSize === 'xl',
        'font-body': fontFamily === 'sans', 'font-serif': fontFamily === 'serif',
        'leading-tight': lineHeight === 'tight', 'leading-normal': lineHeight === 'normal', 'leading-loose': lineHeight === 'loose',
        'max-w-3xl mx-auto': layoutWidth === 'normal', 'max-w-5xl mx-auto': layoutWidth === 'wide',
      }
  );


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
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Appearance Settings">
                    <Palette className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-background/80 backdrop-blur-lg border-border/50 shadow-2xl">
                <ScrollArea className="max-h-[80vh]">
                <div className="grid gap-4 p-1">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Appearance</h4>
                        <p className="text-sm text-muted-foreground">
                            Customize the look of the reader.
                        </p>
                    </div>
                     <div className="flex items-center space-x-2 p-2 rounded-md border border-border/50 bg-background/40">
                        <Label htmlFor="freeze-mode" className="flex-grow">Freeze Mode</Label>
                        <Switch id="freeze-mode" checked={isFrozen} onCheckedChange={setIsFrozen} disabled={!isAuthorOrCollaborator} />
                        <Snowflake className="h-4 w-4 text-muted-foreground" />
                     </div>
                     <Tabs defaultValue="theme">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                            <TabsTrigger value="theme">Theme</TabsTrigger>
                            <TabsTrigger value="text">Text</TabsTrigger>
                            <TabsTrigger value="layout">Layout</TabsTrigger>
                        </TabsList>
                        <TabsContent value="theme" className="pt-2">
                            <div className="grid gap-2">
                                <RadioGroup defaultValue={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
                                    <Label htmlFor="light" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="light" id="light" className="sr-only" /><Sun className="h-5 w-5" /></Label>
                                    <Label htmlFor="dark" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="dark" id="dark" className="sr-only" /><Moon className="h-5 w-5" /></Label>
                                    <Label htmlFor="system" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="system" id="system" className="sr-only" /><Monitor className="h-5 w-5" /></Label>
                                </RadioGroup>
                                <Button variant="outline" size="sm" className="bg-background/40" onClick={() => setIsNightPortalActive(!isNightPortalActive)}><Moon className="mr-2 h-4 w-4" /> Night Portal</Button>
                            </div>
                        </TabsContent>
                         <TabsContent value="text" className="pt-2 space-y-4">
                            <div className="grid gap-2">
                                <Label>Font Size</Label>
                                <RadioGroup defaultValue={fontSize} onValueChange={(v) => setFontSize(v as FontSize)} className="grid grid-cols-4 gap-2">
                                    {fontSizes.map(size => <Label key={size} htmlFor={`font-${size}`} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer capitalize text-[10px]"><RadioGroupItem value={size} id={`font-${size}`} className="sr-only" /><TextIcon className="h-3 w-3 mb-1" />{size}</Label>)}
                                </RadioGroup>
                            </div>
                             <div className="grid gap-2">
                                <Label>Font Family</Label>
                                <RadioGroup defaultValue={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)} className="grid grid-cols-2 gap-2">
                                    <Label htmlFor="font-sans" className="rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer font-sans text-xs"><RadioGroupItem value="sans" id="font-sans" className="sr-only" />Sans-Serif</Label>
                                    <Label htmlFor="font-serif" className="rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer font-serif text-xs"><RadioGroupItem value="serif" id="font-serif" className="sr-only" />Serif</Label>
                                </RadioGroup>
                            </div>
                             <div className="grid gap-2">
                                <Label>Line Height</Label>
                                <RadioGroup defaultValue={lineHeight} onValueChange={(v) => setLineHeight(v as LineHeight)} className="grid grid-cols-3 gap-2">
                                    <Label htmlFor="lh-tight" className="rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="tight" id="lh-tight" className="sr-only" /><Baseline className="h-5 w-5"/></Label>
                                    <Label htmlFor="lh-normal" className="rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="normal" id="lh-normal" className="sr-only" /><Baseline className="h-5 w-5"/></Label>
                                    <Label htmlFor="lh-loose" className="rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="loose" id="lh-loose" className="sr-only" /><Baseline className="h-5 w-5"/></Label>
                                </RadioGroup>
                            </div>
                         </TabsContent>
                         <TabsContent value="layout" className="pt-2">
                             <div className="grid gap-2">
                                <Label>Layout Width</Label>
                                <RadioGroup defaultValue={layoutWidth} onValueChange={(v) => setLayoutWidth(v as LayoutWidth)} className="grid grid-cols-2 gap-2">
                                   <Label htmlFor="lw-normal" className="rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="normal" id="lw-normal" className="sr-only" /><RectangleHorizontal className="h-5 w-5"/></Label>
                                   <Label htmlFor="lw-wide" className="rounded-md border-2 border-muted bg-popover/50 p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="wide" id="lw-wide" className="sr-only" /><RectangleHorizontal className="h-5 w-5"/></Label>
                                </RadioGroup>
                            </div>
                         </TabsContent>
                     </Tabs>
                    <Button variant="ghost" size="sm" className="hover:bg-destructive/10 hover:text-destructive" onClick={resetAppearanceSettings}><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
                </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
      </header>

      <aside
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-72 md:w-80 bg-card shadow-xl transition-transform duration-300 ease-in-out flex flex-col border-l',
          tocVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex justify-between items-center mb-1 p-4 border-b">
            <h3 className="font-headline text-lg text-primary truncate">{story.title}</h3>
            <Button variant="ghost" size="icon" onClick={() => setTocVisible(false)}>
                <X className="h-5 w-5" />
            </Button>
        </div>
        <Tabs defaultValue="contents" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-auto sticky top-0 px-4">
                <TabsTrigger value="contents">Contents</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>
            <TabsContent value="contents" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full px-2">
                    <ul className="space-y-1 p-2">
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
            </TabsContent>
            <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden">
                 <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search in chapter..." 
                            className="pl-10" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                 <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                        {searchResults.length > 0 ? (
                            searchResults.map((result, index) => (
                                <div key={index} className="p-2 border-b">
                                    <p 
                                        className="text-xs text-muted-foreground line-clamp-2"
                                        dangerouslySetInnerHTML={{
                                            __html: result.snippet.replace(new RegExp(searchTerm, 'gi'), (match) => `<strong class="text-primary">${match}</strong>`)
                                        }}
                                    />
                                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleGoToSearchResult(result.from, result.to)}>
                                        Go to result
                                    </Button>
                                </div>
                            ))
                        ) : searchTerm ? (
                            <p className="text-xs text-muted-foreground text-center">No results found.</p>
                        ) : (
                             <p className="text-xs text-muted-foreground text-center">Start typing to search.</p>
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>
        </Tabs>
        {author && (
            <div className="mt-auto p-2 border-t">
                <Link href={`/profile/${author.id}`}>
                    <div className="flex items-center gap-2 hover:bg-muted p-2 rounded-md">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={author.avatarUrl} alt={author.username} data-ai-hint="profile person" />
                        <AvatarFallback>{author.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{author.displayName || author.username}</span>
                    </div>
                </Link>
            </div>
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
            if (!editor?.isFocused && target.closest('.ProseMirror') === null) {
                toggleMainControls();
            }
        }}> 
             {editor && (
                 <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    shouldShow={({ editor, from, to }) => {
                        // Show the menu when there is a selection
                        return from !== to
                    }}
                 >
                    <div className="flex gap-1 bg-card border shadow-lg p-1 rounded-md">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" title="Annotate"><Pencil className="h-5 w-5" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Annotate</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Highlight this selection and add a private note.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Highlight Color</Label>
                                        <div className="flex items-center gap-2">
                                            <Button variant={selectedHighlightColor === '#fde047' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedHighlightColor('#fde047')}><div className="w-5 h-5 rounded-full bg-yellow-300 border-2 border-border" /></Button>
                                            <Button variant={selectedHighlightColor === '#6ee7b7' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedHighlightColor('#6ee7b7')}><div className="w-5 h-5 rounded-full bg-emerald-300 border-2 border-border" /></Button>
                                            <Button variant={selectedHighlightColor === '#f87171' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedHighlightColor('#f87171')}><div className="w-5 h-5 rounded-full bg-red-400 border-2 border-border" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().unsetHighlight().run()}><X className="w-4 w-4"/></Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="annotation-note">Private Note (optional)</Label>
                                        <Textarea id="annotation-note" value={annotationNote} onChange={(e) => setAnnotationNote(e.target.value)} rows={3} />
                                    </div>
                                    <Button onClick={handleSaveAnnotation}>Save Annotation</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                const { from, to } = editor.state.selection;
                                const selectedText = editor.state.doc.textBetween(from, to, ' ');
                                router.push(`/stories/${storyId}/read/${chapterIdParams}/comments?quote=${encodeURIComponent(selectedText)}`);
                            }}
                            title="Comment on Selection"
                        >
                            <MessageSquare className="h-5 w-5" />
                        </Button>
                    </div>
                </BubbleMenu>
             )}
             <article className={articleClasses}>
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
                          if ((error as Error).name !== 'AbortError') {
                            toast({ title: 'Share Failed', description: 'Could not share at this time.', variant: 'destructive' });
                          }
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
    </div>
    <div className="md:hidden">
       <BottomNavigationBar />
    </div>
    </>
  );
}
