
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Type,
  Baseline,
  RectangleHorizontal,
  RotateCcw,
  Search,
  Pencil,
  Snowflake,
  BookmarkPlus,
  Trash2,
  Zap,
  Target,
  Timer,
  Play,
  Pause,
  Eye,
  AlertCircle,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import type { Story, Chapter } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, Timestamp, increment, addDoc, collection } from 'firebase/firestore';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const OWNER_HANDLES = ['arnv', '@arnv'];

type FontSize = 'sm' | 'base' | 'lg' | 'xl';
const fontSizes: FontSize[] = ['sm', 'base', 'lg', 'xl'];
type FontFamily = 'sans' | 'serif';
type LineHeight = 'tight' | 'normal' | 'loose';
type LayoutWidth = 'normal' | 'wide';

export default function ChapterReaderClient({ storyId, chapterId }: { storyId: string, chapterId: string }) {
  const router = useRouter();
  const { user: currentUser, addToLibrary, removeFromLibrary } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
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
  
  // New Features
  const [isZenFocus, setIsZenFocus] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ from: number; to: number; snippet: string }[]>([]);

  // Annotation state
  const [annotationNote, setAnnotationNote] = useState("");
  const [selectedHighlightColor, setSelectedHighlightColor] = useState("#fde047"); // Default yellow
  const [lastSelectionRange, setLastSelectionRange] = useState<{ from: number, to: number } | null>(null);

  // Disclaimer state
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const viewIncrementedRef = useRef(false);

  const editor = useEditor({
    editable: false, 
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

  const isAppOwner = currentUser && (OWNER_HANDLES.includes(currentUser.username || '') || currentUser.id === 'rpTmIq5pnKc91aSSgMJiF26zIYy2');
  const isAuthorOrCollaborator = currentUser && story && (story.author.id === currentUser.id || story.collaboratorIds?.includes(currentUser.id) || isAppOwner);

  useEffect(() => {
    if (editor) {
      const isNowEditable = isAuthorOrCollaborator && !isFrozen;
      if (editor.isEditable !== isNowEditable) {
        editor.setEditable(!!isNowEditable);
      }
    }
  }, [isAuthorOrCollaborator, isFrozen, editor]);

  useEffect(() => {
    const savedFontSize = localStorage.getItem('reader-font-size') as FontSize;
    const savedFontFamily = localStorage.getItem('reader-font-family') as FontFamily;
    const savedLineHeight = localStorage.getItem('reader-line-height') as LineHeight;
    const savedLayoutWidth = localStorage.getItem('reader-layout-width') as LayoutWidth;
    const savedNightPortal = localStorage.getItem('reader-night-portal') === 'true';
    const savedZenFocus = localStorage.getItem('reader-zen-focus') === 'true';

    if (savedFontSize && fontSizes.includes(savedFontSize)) setFontSize(savedFontSize);
    if (savedFontFamily) setFontFamily(savedFontFamily);
    if (savedLineHeight) setLineHeight(savedLineHeight);
    if (savedLayoutWidth) setLayoutWidth(savedLayoutWidth);
    setIsNightPortalActive(savedNightPortal);
    setIsZenFocus(savedZenFocus);
  }, []);

  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize);
    localStorage.setItem('reader-font-family', fontFamily);
    localStorage.setItem('reader-line-height', lineHeight);
    localStorage.setItem('reader-layout-width', layoutWidth);
    localStorage.setItem('reader-night-portal', String(isNightPortalActive));
    localStorage.setItem('reader-zen-focus', String(isZenFocus));
  }, [fontSize, fontFamily, lineHeight, layoutWidth, isNightPortalActive, isZenFocus]);
  
  useEffect(() => {
    document.body.classList.toggle('night-portal', isNightPortalActive);
  }, [isNightPortalActive]);

  useEffect(() => {
    if (autoScrollSpeed > 0) {
        autoScrollInterval.current = setInterval(() => {
            window.scrollBy({ top: autoScrollSpeed, behavior: 'smooth' });
        }, 50);
    } else {
        if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    }
    return () => { if (autoScrollInterval.current) clearInterval(autoScrollInterval.current); };
  }, [autoScrollSpeed]);

  const resetAppearanceSettings = () => {
    setFontSize('base');
    setFontFamily('sans');
    setLineHeight('normal');
    setLayoutWidth('normal');
    setIsNightPortalActive(false);
    setIsZenFocus(false);
    setAutoScrollSpeed(0);
    setTheme('system');
    toast({ title: "Reader preferences reset." });
  };

  const incrementViewCount = useCallback(async () => {
    if (viewIncrementedRef.current || !storyId) return;
    try {
      const storyRef = doc(db, 'stories', storyId);
      updateDoc(storyRef, { views: increment(1) }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: storyRef.path,
              operation: 'update',
              requestResourceData: { views: 'increment' },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      });
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
        
        const chapterData = storyData.chapters.find(c => c.id === chapterId);

        if (chapterData) {
            setCurrentChapter(chapterData);
            if (editor && chapterData.content) {
              editor.commands.setContent(chapterData.content, false);
            }
            
            const visibleChaptersList = storyData.chapters
                .filter(c => c.status === 'Published' || c.accessType === 'premium')
                .sort((a,b) => a.order - b.order);
            
            const chIndex = visibleChaptersList.findIndex(c => c.id === chapterId);
            const progress = visibleChaptersList.length > 0 ? ((chIndex + 1) / visibleChaptersList.length) * 100 : 0;
            setReadingProgress(Math.min(100, Math.max(0, progress)));

            // Disclaimer Logic
            if (storyData.disclaimer && chIndex === 0) {
                const sessionKey = `disclaimer-seen-${storyData.id}`;
                if (sessionStorage.getItem(sessionKey) !== 'true') {
                    setIsDisclaimerOpen(true);
                }
            }

            let hasAccess = false;
            if (chapterData.accessType === 'premium') {
              if (currentUser) {
                if (storyData.author.id === currentUser.id) {
                  hasAccess = true;
                }
                const userAccessRecord = chapterData.allowedUsers?.find(u => u.userId === currentUser.id);
                if (userAccessRecord && userAccessRecord.expiresAt) {
                  const expiryDate = (userAccessRecord.expiresAt as Timestamp).toDate();
                  if (expiryDate > new Date()) {
                    hasAccess = true;
                  }
                }
              }
            } else {
              hasAccess = chapterData.status === 'Published';
            }
            
            if (currentUser && storyData.collaboratorIds?.includes(currentUser.id)) {
              hasAccess = true;
            }

            setIsAccessGranted(hasAccess);

            if (hasAccess) {
              incrementViewCount();
            }

        } else {
            toast({ title: "Chapter not found", variant: "destructive" });
            router.push(`/stories/${storyId}`);
        }

      } else {
        toast({ title: "Story Not Found", variant: "destructive" });
        router.push('/');
      }
      setIsLoading(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
          path: storyDocRef.path,
          operation: 'get',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      document.body.classList.remove('night-portal');
    };
  }, [storyId, chapterId, router, currentUser, toast, incrementViewCount, editor]);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [currentChapter]);
  
  useEffect(() => {
    if (!editor || !searchTerm.trim()) {
        setSearchResults([]);
        return;
    }

    const results: { from: number; to: number; snippet: string }[] = [];
    const { doc: prosemirrorDoc } = editor.state;
    const queryStr = searchTerm.toLowerCase();

    prosemirrorDoc.descendants((node, pos) => {
        if (!node.isText) return;

        const text = node.text?.toLowerCase() || '';
        let index = text.indexOf(queryStr);
        while (index !== -1) {
            const from = pos + index;
            const to = from + queryStr.length;
            
            const contextStart = Math.max(pos, from - 20);
            const contextEnd = Math.min(pos + node.nodeSize, to + 20);
            const snippet = prosemirrorDoc.textBetween(contextStart, contextEnd, ' ');
            
            results.push({ from, to, snippet });
            index = text.indexOf(queryStr, index + 1);
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
        toast({ title: "Please sign in", variant: "destructive" });
        return;
    }
    if (isVoting) return;

    setIsVoting(true);
    
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

    const storyRef = doc(db, 'stories', story.id);
    const updatedChapters = story.chapters.map(ch => {
        if (ch.id === currentChapter.id) return updatedOptimisticChapter;
        return ch;
    });

    updateDoc(storyRef, { chapters: updatedChapters }).catch(async (serverError) => {
        setCurrentChapter(originalChapter);
        const permissionError = new FirestorePermissionError({
            path: storyRef.path,
            operation: 'update',
            requestResourceData: { chapters: 'voted' },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => setIsVoting(false));
  };

  const handleLibraryAction = () => {
    if (!story) return;
    if (!currentUser) {
        toast({ title: "Please Sign In", description: "You must be logged in to manage your library.", variant: "destructive"});
        router.push('/auth/signin');
        return;
    }

    const isInLibraryStatus = currentUser.readingList?.some(item => item.id === story.id);
    if (isInLibraryStatus) {
      removeFromLibrary(story.id);
    } else {
      addToLibrary(story);
    }
  };

  const handleSaveAnnotation = async () => {
    if (!editor || !currentUser || !story || !currentChapter) {
        toast({ title: "Cannot Annotate", variant: "destructive" });
        return;
    }

    const { from, to, empty } = editor.state.selection;
    const range = empty && lastSelectionRange ? lastSelectionRange : { from, to };
    
    if (!range || range.from === range.to) {
        toast({ title: "No Text Selected", variant: "destructive" });
        return;
    }

    const highlightedText = editor.state.doc.textBetween(range.from, range.to, " ");
    const previouslyEditable = editor.isEditable;

    try {
        if (!previouslyEditable) {
            editor.setEditable(true);
        }
        
        editor.chain().focus().setTextSelection(range).toggleHighlight({ color: selectedHighlightColor }).run();
        
        const annotationData = {
            userId: currentUser.id,
            storyId: story.id,
            storyTitle: story.title,
            chapterId: currentChapter.id,
            chapterTitle: currentChapter.title,
            highlightedText,
            highlightColor: selectedHighlightColor,
            note: annotationNote || undefined,
            timestamp: serverTimestamp(),
        };

        const annoColRef = collection(db, 'annotations');
        addDoc(annoColRef, annotationData)
            .then(() => {
                toast({ title: "Annotation Saved!" });
                setAnnotationNote("");
                setLastSelectionRange(null);
            })
            .catch(async (serverError) => {
                editor.chain().focus().setTextSelection(range).unsetHighlight().run();
                const permissionError = new FirestorePermissionError({
                    path: 'annotations',
                    operation: 'create',
                    requestResourceData: annotationData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });

    } catch (error) {
        toast({ title: "Error saving annotation.", variant: "destructive" });
        editor.chain().focus().setTextSelection(range).unsetHighlight().run();
    } finally {
        if (!previouslyEditable) {
            editor.setEditable(false);
        }
    }
  };

  const handleAcknowledgeDisclaimer = () => {
      if (story) {
          sessionStorage.setItem(`disclaimer-seen-${story.id}`, 'true');
          setIsDisclaimerOpen(false);
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
      isZenFocus && "zen-focus-enabled",
      {
        'prose-sm': fontSize === 'sm', 'prose-base': fontSize === 'base', 'prose-lg': fontSize === 'lg', 'prose-xl': fontSize === 'xl',
        'font-body': fontFamily === 'sans', 'font-serif': fontFamily === 'serif',
        'leading-tight': lineHeight === 'tight', 'leading-normal': lineHeight === 'normal', 'leading-loose': lineHeight === 'loose',
        'max-w-3xl mx-auto': layoutWidth === 'normal', 'max-w-5xl mx-auto': layoutWidth === 'wide',
      }
  );

  return (
    <TooltipProvider delayDuration={300}>
    <div className={cn("relative min-h-screen bg-background text-foreground", {'select-none': currentChapter.accessType === 'premium'})}>
      {/* Disclaimer Modal */}
      <AlertDialog open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-3xl p-0 overflow-hidden max-w-lg">
            <div className="p-8 space-y-6">
                <div className="flex items-center gap-3 text-primary">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-xl font-headline font-bold text-foreground">Message from Author</AlertDialogTitle>
                        <AlertDialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Required Reader Disclaimer</AlertDialogDescription>
                    </div>
                </div>

                <ScrollArea className="max-h-[300px] pr-4">
                    <div className="prose dark:prose-invert prose-sm">
                        <p className="whitespace-pre-line leading-relaxed text-muted-foreground text-sm font-medium">
                            {story.disclaimer}
                        </p>
                    </div>
                </ScrollArea>

                <div className="pt-4 border-t border-border/40">
                    <p className="text-[10px] text-muted-foreground/40 leading-relaxed italic text-center mb-6">
                        By proceeding, you acknowledge that you have read and understood the author's terms and content warnings for this manuscript.
                    </p>
                    <AlertDialogAction 
                        onClick={handleAcknowledgeDisclaimer}
                        className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                    >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        I Understand & Proceed
                    </AlertDialogAction>
                </div>
            </div>
        </AlertDialogContent>
      </AlertDialog>

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
        <div className="flex items-center gap-1">
            <AlertDialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Quick Preview">
                                <Eye className="h-5 w-5" />
                            </Button>
                        </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">Preview Mode</TooltipContent>
                </Tooltip>
                <AlertDialogContent className="max-w-4xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <AlertDialogHeader className="bg-muted/30 p-6 border-b flex flex-row justify-between items-center space-y-0">
                        <div>
                            <AlertDialogTitle className="text-2xl font-headline font-bold text-foreground">{currentChapter.title || 'Untitled Part'}</AlertDialogTitle>
                            <AlertDialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reader Simulation</AlertDialogDescription>
                        </div>
                        <AlertDialogCancel className="rounded-full h-8 w-8 p-0 border-none bg-transparent hover:bg-muted"><X className="h-4 w-4"/></AlertDialogCancel>
                    </AlertDialogHeader>
                    <div className={cn(
                        "prose dark:prose-invert max-h-[70vh] overflow-y-auto p-8 sm:p-12 leading-relaxed text-base",
                        fontFamily === 'serif' ? 'font-serif' : 'font-body'
                    )} dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
                    <AlertDialogFooter className="p-4 bg-muted/30 border-t">
                        <AlertDialogCancel className="rounded-full px-6">Close Preview</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Appearance Settings">
                        <Palette className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-background/20 backdrop-blur-2xl border-white/10 shadow-3xl rounded-3xl overflow-hidden">
                    <ScrollArea className="max-h-[85vh]">
                    <div className="p-6 space-y-6">
                        <header className="flex items-center justify-between mb-2">
                            <div>
                                <h4 className="font-headline font-bold text-foreground tracking-tight">Appearance</h4>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Customize workspace</p>
                            </div>
                        </header>

                        <div className="grid gap-3">
                            <div className="p-4 rounded-2xl bg-card/50 border border-border/40 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="zen-focus" className="flex items-center gap-3 cursor-pointer group">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                            <Target className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold block">Zen Focus</span>
                                            <span className="text-[10px] text-muted-foreground">Dim non-active text</span>
                                        </div>
                                    </Label>
                                    <Switch id="zen-focus" checked={isZenFocus} onCheckedChange={setIsZenFocus} />
                                </div>
                                
                                <Separator className="opacity-40" />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-accent/10 text-accent">
                                                <Zap className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold block">Auto-Pilot</span>
                                                <span className="text-[10px] text-muted-foreground">Hands-free scrolling</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {autoScrollSpeed > 0 ? (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-red-500/10 text-red-500" onClick={() => setAutoScrollSpeed(0)}><Pause className="h-4 w-4"/></Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-green-500/10 text-green-500" onClick={() => setAutoScrollSpeed(2)}><Play className="h-4 w-4"/></Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground mb-2">
                                            <span>Speed</span>
                                            <span>{autoScrollSpeed === 0 ? "Off" : `${autoScrollSpeed}x`}</span>
                                        </div>
                                        <Slider
                                            value={[autoScrollSpeed]}
                                            onValueChange={([v]) => setAutoScrollSpeed(v)}
                                            max={10}
                                            step={1}
                                            className="py-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            {isAuthorOrCollaborator && (
                                <div className="p-4 rounded-2xl bg-muted/30 border border-dashed flex flex-col gap-2 group">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="freeze-mode" className="flex items-center gap-3 cursor-pointer">
                                            <Snowflake className="h-4 w-4 text-blue-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">Freeze Mode</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">Writer Perspective</span>
                                            </div>
                                        </Label>
                                        <Switch id="freeze-mode" checked={isFrozen} onCheckedChange={setIsFrozen} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/60 leading-tight">
                                        Stop accidental typing while reviewing. Readers are always frozen.
                                    </p>
                                </div>
                            )}
                        </div>

                         <Tabs defaultValue="theme" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-xl p-1">
                                <TabsTrigger value="theme" className="rounded-lg font-bold text-[10px] uppercase">Vibe</TabsTrigger>
                                <TabsTrigger value="text" className="rounded-lg font-bold text-[10px] uppercase">Type</TabsTrigger>
                                <TabsTrigger value="layout" className="rounded-lg font-bold text-[10px] uppercase">View</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="theme" className="pt-4 space-y-4">
                                <RadioGroup defaultValue={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
                                    <Label htmlFor="light" className="flex flex-col items-center justify-center rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 group">
                                        <RadioGroupItem value="light" id="light" className="sr-only" />
                                        <Sun className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold uppercase">Light</span>
                                    </Label>
                                    <Label htmlFor="dark" className="flex flex-col items-center justify-center rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 group">
                                        <RadioGroupItem value="dark" id="dark" className="sr-only" />
                                        <Moon className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold uppercase">Dark</span>
                                    </Label>
                                    <Label htmlFor="system" className="flex flex-col items-center justify-center rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 group">
                                        <RadioGroupItem value="system" id="system" className="sr-only" />
                                        <Monitor className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold uppercase">Auto</span>
                                    </Label>
                                </RadioGroup>
                                <Button 
                                    variant={isNightPortalActive ? "default" : "outline"} 
                                    size="sm" 
                                    className={cn("w-full h-11 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest", isNightPortalActive ? "bg-black text-white" : "border-black/10")} 
                                    onClick={() => setIsNightPortalActive(!isNightPortalActive)}
                                >
                                    <Moon className="h-4 w-4" /> 
                                    Night Portal
                                </Button>
                            </TabsContent>

                             <TabsContent value="text" className="pt-4 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Font Size</Label>
                                        <span className="text-xs font-bold uppercase text-primary">{fontSize}</span>
                                    </div>
                                    <RadioGroup defaultValue={fontSize} onValueChange={(v) => setFontSize(v as FontSize)} className="grid grid-cols-4 gap-2">
                                        {fontSizes.map(size => (
                                            <Label key={size} htmlFor={`font-${size}`} className="flex flex-col items-center justify-center rounded-xl border-2 border-transparent bg-muted/30 p-2 hover:bg-muted/50 transition-all cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 group">
                                                <RadioGroupItem value={size} id={`font-${size}`} className="sr-only" />
                                                <Type className={cn("h-4 w-4 mb-1", size === 'sm' ? 'scale-75' : size === 'lg' ? 'scale-110' : size === 'xl' ? 'scale-125' : '')} />
                                                <span className="text-[8px] font-bold uppercase">{size}</span>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                                 <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Typography</Label>
                                    <RadioGroup defaultValue={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)} className="grid grid-cols-2 gap-2">
                                        <Label htmlFor="font-sans" className="rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer text-xs font-bold text-center data-[state=checked]:border-primary data-[state=checked]:bg-primary/5">Modern Sans</Label>
                                        <RadioGroupItem value="sans" id="font-sans" className="sr-only" />
                                        <Label htmlFor="font-serif" className="rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer text-xs font-bold text-center font-serif data-[state=checked]:border-primary data-[state=checked]:bg-primary/5">Classic Serif</Label>
                                        <RadioGroupItem value="serif" id="font-serif" className="sr-only" />
                                    </RadioGroup>
                                </div>
                             </TabsContent>

                             <TabsContent value="layout" className="pt-4 space-y-6">
                                 <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Line Spacing</Label>
                                    <RadioGroup defaultValue={lineHeight} onValueChange={(v) => setLineHeight(v as LineHeight)} className="grid grid-cols-3 gap-2">
                                        <Label htmlFor="lh-tight" className="rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer flex justify-center data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"><RadioGroupItem value="tight" id="lh-tight" className="sr-only" /><Baseline className="h-5 w-5"/></Label>
                                        <Label htmlFor="lh-normal" className="rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer flex justify-center data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"><RadioGroupItem value="normal" id="lh-normal" className="sr-only" /><Baseline className="h-5 w-5"/></Label>
                                        <Label htmlFor="lh-loose" className="rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer flex justify-center data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"><RadioGroupItem value="loose" id="lh-loose" className="sr-only" /><Baseline className="h-5 w-5"/></Label>
                                    </RadioGroup>
                                </div>
                                 <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Canvas Width</Label>
                                    <RadioGroup defaultValue={layoutWidth} onValueChange={(v) => setLayoutWidth(v as LayoutWidth)} className="grid grid-cols-2 gap-2">
                                       <Label htmlFor="lw-normal" className="rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer flex justify-center data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 group"><RadioGroupItem value="normal" id="lw-normal" className="sr-only" /><RectangleHorizontal className="h-5 w-5 group-hover:scale-x-90 transition-transform"/></Label>
                                       <Label htmlFor="lw-wide" className="rounded-xl border-2 border-transparent bg-muted/30 p-3 hover:bg-muted/50 transition-all cursor-pointer flex justify-center data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 group"><RadioGroupItem value="wide" id="lw-wide" className="sr-only" /><RectangleHorizontal className="h-5 w-5 group-hover:scale-x-110 transition-transform"/></Label>
                                    </RadioGroup>
                                </div>
                             </TabsContent>
                         </Tabs>
                    </div>
                    <footer className="p-4 bg-muted/30 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <Timer className="h-3 w-3" />
                            <span>Adaptive Reader</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[10px] font-bold uppercase tracking-widest gap-1.5" onClick={resetAppearanceSettings}>
                            <RotateCcw className="h-3 w-3" /> 
                            Reset
                        </Button>
                    </footer>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
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
                        {visibleChapters.sort((a,b)=>a.order-b.order).map((ch) => (
                        <li key={ch.id}>
                            <Button
                            variant={ch.id === currentChapter.id ? 'secondary' : 'ghost'}
                            className="w-full justify-start text-left h-auto py-1.5 px-2 text-sm"
                            onClick={() => navigateToChapterById(ch.id)}
                            >
                            <span className={cn("truncate", ch.id === currentChapter.id ? "font-semibold" : "")}>
                                {ch.order}. {ch.title}
                            </span>
                            {ch.accessType === 'premium' && <Sparkles className="h-3 w-3 text-yellow-500 ml-auto flex-shrink-0" />}
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
                    shouldShow={({ from, to }) => {
                        return from !== to
                    }}
                 >
                    <div className="flex gap-1.5 bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl p-1.5 rounded-2xl">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" 
                                    title="Annotate"
                                    onClick={() => {
                                        const { from, to } = editor.state.selection;
                                        setLastSelectionRange({ from, to });
                                    }}
                                >
                                    <Pencil className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                                onOpenAutoFocus={(e) => e.preventDefault()} 
                                className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-card/95 backdrop-blur-xl"
                            >
                                <div className="bg-primary/10 p-4 border-b border-primary/10 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h4 className="font-headline font-bold text-sm">Capture a Moment</h4>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Ink Color</Label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {[
                                                { id: 'yellow', hex: '#fde047', label: 'Sunset' },
                                                { id: 'emerald', hex: '#6ee7b7', label: 'Jade' },
                                                { id: 'rose', hex: '#f87171', label: 'Petal' },
                                                { id: 'violet', hex: '#c084fc', label: 'Aura' },
                                                { id: 'blue', hex: '#60a5fa', label: 'Ocean' },
                                                { id: 'orange', hex: '#fb923c', label: 'Ember' },
                                            ].map(color => (
                                                <Tooltip key={color.id}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => setSelectedHighlightColor(color.hex)}
                                                            className={cn(
                                                                "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                                                selectedHighlightColor === color.hex ? "border-primary shadow-md scale-110" : "border-transparent"
                                                            )}
                                                            style={{ backgroundColor: color.hex }}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">{color.label}</TooltipContent>
                                                </Tooltip>
                                            ))}
                                            <Separator orientation="vertical" className="h-6 mx-1" />
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive" 
                                                onClick={() => editor.chain().focus().unsetHighlight().run()}
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="annotation-note" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Archive Note</Label>
                                        <Textarea 
                                            id="annotation-note" 
                                            value={annotationNote} 
                                            onChange={(e) => setAnnotationNote(e.target.value)} 
                                            placeholder="Why did this line resonate with you?"
                                            rows={4} 
                                            className="bg-muted/30 border-none shadow-inner resize-none text-sm rounded-xl focus-visible:ring-primary/30"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleSaveAnnotation} 
                                        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-xl"
                                    >
                                        <BookmarkPlus className="mr-2 h-4 w-4" />
                                        Save to Highlights
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => {
                                const { from, to } = editor.state.selection;
                                const selectedText = editor.state.doc.textBetween(from, to, ' ');
                                router.push(`/stories/${storyId}/read/${chapterId}/comments?quote=${encodeURIComponent(selectedText)}`);
                            }}
                            title="Comment on Selection"
                        >
                            <MessageSquare className="h-5 w-5" />
                        </Button>
                    </div>
                 </BubbleMenu>
             )}
             <article className={articleClasses}>
              {currentChapter.artworkUrl && (
                <div className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-[32px] overflow-hidden mb-12 shadow-2xl ring-1 ring-border/40">
                  <Image src={currentChapter.artworkUrl} alt="" fill className="object-cover" priority />
                </div>
              )}
              <h2 className="font-headline text-2xl sm:text-3xl mb-6 pt-4 text-center">{currentChapter.title}</h2>
              {isAccessGranted ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="text-center py-10 flex flex-col items-center gap-4">
                  <Sparkles className="w-16 h-16 text-yellow-500" />
                  <h2 className="text-2xl font-headline font-bold">Premium Chapter</h2>
                  <p className="text-muted-foreground max-md">This chapter is a special release available only to users granted premium access by the author.</p>
                  <Button onClick={() => router.push(`/stories/${storyId}`)}>Back to Story Overview</Button>
                </div>
              )}
            </article>
        </div>
      </main>

      <footer
        className={cn(
          'fixed bottom-0 left-0 z-40 bg-card/80 backdrop-blur-md border-t transform transition-transform duration-300 ease-in-out',
          controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0',
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
                    <Link href={`/stories/${storyId}/read/${chapterId}/comments`} passHref>
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
                            toast({ title: 'Story Shared!' });
                          } else {
                            await navigator.clipboard.writeText(window.location.href);
                            toast({ title: 'Link Copied!' });
                          }
                        } catch (error) {
                          if ((error as Error).name !== 'AbortError') {
                            toast({ title: 'Share Failed', variant: 'destructive' });
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
      <BottomNavigationBar />
    </div>
    <style jsx global>{`
        .zen-focus-enabled .ProseMirror p {
            opacity: 0.2;
            transition: opacity 0.4s ease, filter 0.4s ease;
            filter: blur(1px);
        }
        .zen-focus-enabled .ProseMirror p:hover,
        .zen-focus-enabled .ProseMirror p:focus,
        .zen-focus-enabled .ProseMirror p:active {
            opacity: 1;
            filter: blur(0);
        }
    `}</style>
    </TooltipProvider>
  );
}
