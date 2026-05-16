
'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
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
  Globe,
  TriangleAlert,
  Cloud,
  CheckCircle,
  ImagePlus,
  Users,
  Music,
  Wind,
  Plus
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import type { Story, Chapter, Annotation } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatCompactNumber } from '@/lib/utils';
import { db, rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
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
import TextAlign from '@tiptap/extension-text-align'
import FontFamilyExt from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import CharacterCount from '@tiptap/extension-character-count'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const OWNER_HANDLES = ['arnv', '@arnv'];
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type FontFamily = 'sans' | 'serif';
type LineHeight = 'tight' | 'normal' | 'loose';
type LayoutWidth = 'normal' | 'wide';

export default function ChapterReaderClient({ storyId, chapterId }: { storyId: string, chapterId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser, addToLibrary, removeFromLibrary } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [story, setStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tocVisible, setTocVisible] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [accessReason, setAccessReason] = useState<'locked' | 'scheduled' | 'exclusive' | 'none'>('none');
  const [isVoting, setIsVoting] = useState(false);

  const [activeReaders, setActiveReaders] = useState(1);

  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');
  const [layoutWidth, setLayoutWidth] = useState<'normal' | 'wide'>('normal');
  const [isNightPortalActive, setIsNightPortalActive] = useState(false);
  
  const [isZenFocus, setIsZenFocus] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ from: number; to: number; snippet: string }[]>([]);

  const [annotationNote, setAnnotationNote] = useState("");
  const [selectedHighlightColor, setSelectedHighlightColor] = useState("#fde047"); 
  const [lastSelectionRange, setLastSelectionRange] = useState<{ from: number, to: number } | null>(null);

  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  const editor = useEditor({
    editable: false, 
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert focus:outline-none transition-all duration-300',
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
    if (editor && currentChapter && !editor.isDestroyed) {
      if (editor.getHTML() !== currentChapter.content) {
        editor.commands.setContent(currentChapter.content, false);
      }
    }
  }, [editor, currentChapter?.id, currentChapter?.content]);

  useEffect(() => {
    const savedFontSize = localStorage.getItem('reader-font-size') as FontSize;
    const savedFontFamily = localStorage.getItem('reader-font-family') as FontFamily;
    const savedLineHeight = localStorage.getItem('reader-line-height') as LineHeight;
    const savedLayoutWidth = localStorage.getItem('reader-layout-width') as LayoutWidth;
    const savedNightPortal = localStorage.getItem('reader-night-portal') === 'true';
    const savedZenFocus = localStorage.getItem('reader-zen-focus') === 'true';

    if (savedFontSize && ['sm', 'base', 'lg', 'xl'].includes(savedFontSize)) setFontSize(savedFontSize);
    if (savedFontFamily) setFontFamily(savedFontFamily as FontFamily);
    if (savedLineHeight) setLineHeight(savedLineHeight as LineHeight);
    if (savedLayoutWidth) setLayoutWidth(savedLayoutWidth as LayoutWidth);
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
    if (typeof document !== 'undefined') {
        document.body.classList.toggle('night-portal', isNightPortalActive);
    }
  }, [isNightPortalActive]);

  // Real-time Presence Sync
  useEffect(() => {
    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
        const data = snapshot.val() || {};
        let readers = 0;
        Object.keys(data).forEach(uid => {
            if (data[uid].state === 'online' && data[uid].active_path === pathname) {
                readers++;
            }
        });
        setActiveReaders(Math.max(1, readers));
    });
    return () => unsubscribe();
  }, [pathname]);

  // Main Data Fetcher
  useEffect(() => {
    if (!storyId || !chapterId) return;

    setIsLoading(true);
    setHasError(false);

    const storyDocRef = doc(db, 'stories', storyId);

    const unsubscribe = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
        setStory(storyData);

        const chapterData = storyData.chapters.find(c => c.id === chapterId);

        if (chapterData) {
            setCurrentChapter(chapterData);
            
            const visibleChaptersList = storyData.chapters
                .filter(c => c.status === 'Published' || c.accessType === 'premium' || c.accessType === 'exclusive' || c.scheduledAt)
                .sort((a,b) => a.order - b.order);
            
            const chIndex = visibleChaptersList.findIndex(c => c.id === chapterId);
            const progress = visibleChaptersList.length > 0 ? ((chIndex + 1) / visibleChaptersList.length) * 100 : 0;
            setReadingProgress(Math.min(100, Math.max(0, progress)));

            let hasAccess = false;
            let reason: 'locked' | 'scheduled' | 'exclusive' | 'none' = 'none';

            // Authorization logic
            const isOwner = currentUser && (storyData.author.id === currentUser.id || storyData.collaboratorIds?.includes(currentUser.id) || isAppOwner);

            if (isOwner) {
                hasAccess = true;
            } else {
                // 1. Check Scheduling
                if (chapterData.scheduledAt) {
                    const scheduledTime = (chapterData.scheduledAt as Timestamp).toDate();
                    if (scheduledTime > new Date()) {
                        reason = 'scheduled';
                    } else {
                        hasAccess = true;
                    }
                }

                // 2. Check Exclusive Access
                if (chapterData.accessType === 'exclusive') {
                    if (currentUser && chapterData.invitedUserIds?.includes(currentUser.id)) {
                        hasAccess = true;
                    } else {
                        hasAccess = false;
                        reason = 'exclusive';
                    }
                } else if (!chapterData.scheduledAt || (chapterData.scheduledAt && reason !== 'scheduled')) {
                    // Standard Chapter
                    if (chapterData.status === 'Published' || chapterData.accessType === 'premium') {
                        hasAccess = true;
                    } else {
                        reason = 'locked';
                    }
                }
            }
            
            setIsAccessGranted(hasAccess);
            setAccessReason(reason);

            if (hasAccess && storyData.disclaimer && chIndex === 0) {
                const sessionKey = `disclaimer-seen-${storyData.id}`;
                if (sessionStorage.getItem(sessionKey) !== 'true') setIsDisclaimerOpen(true);
            }
            setIsLoading(false);
        } else {
            setIsLoading(false);
            router.push(`/stories/${storyId}`);
        }
      } else {
        setIsLoading(false);
        router.push('/');
      }
    }, (error) => {
      setHasError(true);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [storyId, chapterId, router, isAppOwner, currentUser?.id]);

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

    updateDoc(storyRef, { chapters: updatedChapters }).catch(() => {
        setCurrentChapter(originalChapter);
    }).finally(() => setIsVoting(false));
  };

  const handleLibraryAction = () => {
    if (!story) return;
    if (!currentUser) {
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

  const zenFocusStyles = `
    .zen-mode .ProseMirror p {
        opacity: 0.2;
        transition: opacity 0.4s ease, filter 0.4s ease;
        filter: blur(1px);
    }
    .zen-mode .ProseMirror p:hover,
    .zen-mode .ProseMirror p:focus,
    .zen-mode .ProseMirror p:active {
        opacity: 1;
        filter: blur(0);
    }
  `;

  if (isLoading || !story || !currentChapter || !editor) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isInLibrary = currentUser?.readingList?.some(item => item.id === story.id);
  const nextChapterId = story.chapters.sort((a,b)=>a.order-b.order).find(c => c.order > currentChapter.order)?.id;
  const prevChapterId = story.chapters.sort((a,b)=>a.order-b.order).reverse().find(c => c.order < currentChapter.order)?.id;
  const visibleChapters = story.chapters.filter(c => c.status === 'Published' || isAuthorOrCollaborator || c.accessType === 'exclusive' || c.scheduledAt);

  return (
    <TooltipProvider delayDuration={300}>
    <div className={cn("relative min-h-screen bg-background text-foreground", {'select-none': currentChapter.accessType === 'premium'})}>
      <AlertDialog open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden max-w-xl w-[95vw] bg-background">
            <div className="relative h-40 w-full overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/40 to-transparent" />
                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/disclaimer/800/400')] bg-cover bg-center opacity-30 mix-blend-overlay" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div className="space-y-0.5">
                            <AlertDialogTitle className="text-2xl font-headline font-bold leading-none tracking-tight">Manuscript Entry</AlertDialogTitle>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Community Guidelines & Safety</p>
                        </div>
                    </div>
                </div>
                <AlertDialogCancel className="absolute top-4 right-4 rounded-full h-8 w-8 p-0 border-none bg-black/20 hover:bg-black/40 text-white transition-colors"><X className="h-4 w-4"/></AlertDialogCancel>
            </div>

            <div className="p-8 flex flex-col">
                <div className="mb-6 flex items-center gap-2">
                    <div className="h-1 w-8 bg-primary rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Author's Disclaimer</span>
                </div>
                <ScrollArea className="max-h-[40vh] mb-6">
                    <p className="whitespace-pre-line leading-relaxed text-foreground/80 text-sm font-serif italic">{story.disclaimer}</p>
                </ScrollArea>
                <AlertDialogAction onClick={() => { sessionStorage.setItem(`disclaimer-seen-${story.id}`, 'true'); setIsDisclaimerOpen(false); }} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl transition-all hover:scale-[1.02] text-base">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Acknowledge & Start
                </AlertDialogAction>
            </div>
        </AlertDialogContent>
      </AlertDialog>

      <header className={cn('fixed top-0 left-0 z-40 bg-card/80 backdrop-blur-md border-b shadow-sm transition-all duration-300 p-2 sm:p-3 flex items-center justify-between w-full', controlsVisible ? 'translate-y-0' : '-translate-y-full')}>
        <div className="flex items-center">
            <Link href="/" passHref><Button variant="ghost" size="icon"><Home className="h-5 w-5" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={() => setTocVisible(!tocVisible)}><ListOrdered className="h-5 w-5" /></Button>
        </div>
        <div className="truncate text-center mx-2 flex-1 flex flex-col items-center">
            <h1 className="text-sm sm:text-base font-headline font-semibold text-primary truncate max-w-[200px] sm:max-w-md">{story.title}</h1>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[8px] uppercase font-bold text-primary animate-pulse">
                    <Users className="h-2 w-2" />
                    <span>{activeReaders} Live</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-1">
            <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon"><Palette className="h-5 w-5" /></Button></PopoverTrigger>
                <PopoverContent className="w-80 p-6 bg-background/95 backdrop-blur-2xl border-white/10 shadow-3xl rounded-3xl">
                    <div className="space-y-6">
                         <div className="p-4 rounded-2xl bg-card/50 border border-border/40 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="zen-focus" className="text-sm font-bold block cursor-pointer">Zen Focus</Label>
                                <Switch id="zen-focus" checked={isZenFocus} onCheckedChange={setIsZenFocus} />
                            </div>
                        </div>
                        <Tabs defaultValue="theme" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-xl p-1">
                                <TabsTrigger value="theme" className="rounded-lg font-bold text-[10px] uppercase">Vibe</TabsTrigger>
                                <TabsTrigger value="text" className="rounded-lg font-bold text-[10px] uppercase">Type</TabsTrigger>
                                <TabsTrigger value="layout" className="rounded-lg font-bold text-[10px] uppercase">View</TabsTrigger>
                            </TabsList>
                            <TabsContent value="theme" className="pt-4 space-y-4">
                                <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
                                    {['light', 'dark', 'system'].map(t => (
                                        <Label key={t} htmlFor={t} className="flex flex-col items-center p-3 rounded-xl border-2 border-transparent bg-muted/30 cursor-pointer data-[state=checked]:border-primary">
                                            <RadioGroupItem value={t} id={t} className="sr-only" />
                                            <span className="text-[10px] font-bold uppercase">{t}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </TabsContent>
                             <TabsContent value="text" className="pt-4 space-y-4">
                                <RadioGroup value={fontSize} onValueChange={(v) => setFontSize(v as FontSize)} className="grid grid-cols-4 gap-2">
                                    {['sm', 'base', 'lg', 'xl'].map(size => (
                                        <Label key={size} htmlFor={`font-${size}`} className="flex flex-col items-center p-2 rounded-xl border-2 border-transparent bg-muted/30 cursor-pointer data-[state=checked]:border-primary">
                                            <RadioGroupItem value={size} id={`font-${size}`} className="sr-only" />
                                            <span className="text-[10px] font-bold uppercase">{size}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                             </TabsContent>
                        </Tabs>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
      </header>

      <aside className={cn('fixed right-0 top-0 bottom-0 z-50 w-72 md:w-80 bg-card shadow-xl transition-transform duration-300 flex flex-col border-l', tocVisible ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-headline text-lg text-primary truncate">{story.title}</h3>
            <Button variant="ghost" size="icon" onClick={() => setTocVisible(false)}><X className="h-5 w-5" /></Button>
        </div>
        <ScrollArea className="flex-1 px-2">
            <ul className="space-y-1 p-2">
                {visibleChapters.sort((a,b)=>a.order-b.order).map((ch) => (
                <li key={ch.id}>
                    <Button variant={ch.id === currentChapter.id ? 'secondary' : 'ghost'} className="w-full justify-start text-left h-auto py-1.5 px-2 text-sm" onClick={() => { router.push(`/stories/${story.id}/read/${ch.id}`); setTocVisible(false); }}>
                    <span className={cn("truncate", ch.id === currentChapter.id ? "font-semibold text-primary" : "")}>{ch.order}. {ch.title}</span>
                    </Button>
                </li>
                ))}
            </ul>
        </ScrollArea>
      </aside>

      <main className={cn('transition-all duration-300 pt-20 pb-24')} onClick={() => setControlsVisible(!controlsVisible)}>
        {isAccessGranted ? (
            <article className={articleClasses}>
                {currentChapter.artworkUrl && (
                    <div className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-[32px] overflow-hidden mb-12 shadow-2xl">
                        <NextImage src={currentChapter.artworkUrl} alt="" fill className="object-cover" />
                    </div>
                )}
                <div className="text-center space-y-4 mb-12">
                    <h2 className="font-headline text-3xl sm:text-5xl font-bold tracking-tight">{currentChapter.title}</h2>
                </div>
                <EditorContent editor={editor} />
            </article>
        ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-700">
                <div className="p-6 rounded-[2.5rem] bg-muted/20 border-2 border-dashed border-primary/20 mb-6">
                    {accessReason === 'scheduled' ? <Calendar className="h-12 w-12 text-primary animate-pulse" /> : <Lock className="h-12 w-12 text-yellow-500" />}
                </div>
                <h2 className="text-2xl font-headline font-bold mb-2">
                    {accessReason === 'scheduled' ? 'Opening Soon' : (accessReason === 'exclusive' ? 'Exclusive Entry' : 'Chapter Locked')}
                </h2>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
                    {accessReason === 'scheduled' ? `This part is scheduled to be released on ${formatDate(currentChapter.scheduledAt)}.` : 
                     (accessReason === 'exclusive' ? "This is a special chapter. You must be invited by the author to read it." : "This part is not yet available for public reading.")}
                </p>
                <Button variant="outline" className="mt-8 rounded-full px-8" onClick={() => router.push(`/stories/${storyId}`)}>Back to Overview</Button>
            </div>
        )}
      </main>

      <footer className={cn('fixed bottom-0 left-0 z-40 bg-background/80 backdrop-blur-xl border-t transform transition-all duration-500 w-full', controlsVisible ? 'translate-y-0' : 'translate-y-full')}>
        <div className="absolute top-0 left-0 w-full h-1 bg-muted/30">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${readingProgress}%` }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => prevChapterId && router.push(`/stories/${storyId}/read/${prevChapterId}`)} disabled={!prevChapterId}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="bg-muted/40 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 border">
                <Button variant="ghost" size="sm" className={cn("rounded-full", currentChapter.voterIds?.includes(currentUser?.id || '') && "text-primary")} onClick={handleVoteClick} disabled={isVoting}>
                    <ThumbsUp className="h-4 w-4" /> <span className="text-[10px] font-bold ml-1">{formatCompactNumber(currentChapter?.votes || 0)}</span>
                </Button>
                <Link href={`/stories/${storyId}/read/${chapterId}/comments`} passHref>
                    <Button variant="ghost" size="sm" className="rounded-full">
                        <MessageSquare className="h-4 w-4" /> <span className="text-[10px] font-bold ml-1">{formatCompactNumber(currentChapter?.commentsCount || 0)}</span>
                    </Button>
                </Link>
                <Button variant="ghost" size="icon" className={cn("rounded-full", isInLibrary && "text-primary")} onClick={handleLibraryAction}>
                    {isInLibrary ? <BookmarkCheck className="h-5 w-5" /> : <BookmarkPlus className="h-5 w-5" />}
                </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => nextChapterId && router.push(`/stories/${storyId}/read/${nextChapterId}`)} disabled={!nextChapterId}><ArrowRight className="h-5 w-5" /></Button>
        </div>
      </footer>
      <BottomNavigationBar />
    </div>
    <style dangerouslySetInnerHTML={{ __html: zenFocusStyles }} />
    </TooltipProvider>
  );
}
