'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  ThumbsUp,
  X,
  ListOrdered,
  Loader2,
  Home,
  Sparkles,
  Lock,
  BookmarkCheck,
  Type,
  Palette,
  Users,
  Music,
  Wind,
  Plus,
  CheckCircle,
  Timer,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Search, 
  BookOpen,
  Maximize2,
  Minimize2,
  MousePointer2,
  RotateCcw,
  FileText,
  Highlighter,
  Quote,
  ShieldCheck,
  Eye,
  Volume2,
  VolumeX,
  Coffee,
  CloudRain,
  Sun,
  Moon,
  Monitor,
  EyeOff,
  Contrast,
  Zap,
  Scaling,
  MousePointer,
  Tally3
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Story, Chapter, Annotation } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatCompactNumber } from '@/lib/utils';
import { db, rtdb } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { ref, onValue } from 'firebase/database';
import { doc, onSnapshot, updateDoc, Timestamp, addDoc, collection, serverTimestamp, increment } from 'firebase/firestore';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type FontFamily = 'sans' | 'serif';
type LineHeight = 'tight' | 'normal' | 'loose';

const HIGHLIGHT_COLORS = [
    { name: 'Gold', value: '#fde047' },
    { name: 'Emerald', value: '#6ee7b7' },
    { name: 'Rose', value: '#f472b6' },
    { name: 'Blue', value: '#60a5fa' },
    { name: 'Purple', value: '#c084fc' },
];

export default function ChapterReaderClient({ storyId, chapterId }: { storyId: string, chapterId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser, addToLibrary, removeFromLibrary, authLoading } = useAuth();
  const { showIsland } = useDynamicIsland();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [story, setStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [accessReason, setAccessReason] = useState<'locked' | 'scheduled' | 'exclusive' | 'none'>('none');
  const [isVoting, setIsVoting] = useState(false);
  const [activeReaders, setActiveReaders] = useState(1);

  // Disclaimer Protocol State
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  // Annotation/Highlight States
  const [isAnnotationDialogOpen, setIsAnnotationDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [annotationNote, setAnnotationNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);

  // High-Fidelity Style States
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');
  const [layoutWidth, setLayoutWidth] = useState<'normal' | 'wide'>('normal');
  const [isNightPortalActive, setIsNightPortalActive] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const [ambientSound, setAmbientSound] = useState<'none' | 'lofi' | 'rain'>('none');
  
  // NEW: Reading Improvement System states
  const [isEyeStrainGuard, setIsEyeStrainGuard] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLineFocus, setIsLineFocus] = useState(false);
  const [isParchmentMode, setIsParchmentMode] = useState(false);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);

  // NEW: Type Improvements states
  const [letterSpacing, setLetterSpacing] = useState<'normal' | 'wide'>('normal');

  // NEW: Atmosphere Improvements states
  const [atmosphereVolume, setAtmosphereVolume] = useState(30);
  const [isHapticFeedback, setIsHapticFeedback] = useState(false);
  const [isVignette, setIsVignette] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // High-Velocity Swipe Engine
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const editor = useEditor({
    extensions: [
        StarterKit, 
        TiptapUnderline, 
        TiptapHighlight.configure({ multicolor: true }),
        CharacterCount,
    ],
    content: '',
    editable: false,
  });

  useEffect(() => {
    if (editor && currentChapter) {
      editor.commands.setContent(currentChapter.content, false);
    }
  }, [editor, currentChapter?.id, currentChapter?.content]);

  // Reading Time Estimation
  const wordCount = useMemo(() => editor?.storage.characterCount.words() || 0, [editor?.storage.characterCount.words()]);
  const totalMinutes = useMemo(() => Math.max(1, Math.round(wordCount / 225)), [wordCount]);
  const minutesLeft = useMemo(() => Math.max(0, Math.round(totalMinutes * (1 - readingProgress / 100))), [totalMinutes, readingProgress]);

  // Audio Atmosphere Protocol
  useEffect(() => {
    if (isLoading || ambientSound === 'none') {
        if (audioRef.current) audioRef.current.pause();
        return;
    }

    if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
    }

    audioRef.current.volume = atmosphereVolume / 100;

    const soundUrls = {
        lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        rain: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    };

    audioRef.current.src = soundUrls[ambientSound];
    audioRef.current.play().catch(() => console.warn("Audio blocked by browser."));

    return () => {
        if (audioRef.current) audioRef.current.pause();
    };
  }, [ambientSound, isLoading, atmosphereVolume]);

  // STRICT VIEW COUNT PROTOCOL (24-Hour Throttling)
  useEffect(() => {
    if (!story?.id || !currentChapter?.id || !isAccessGranted) return;

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const viewToken = `view_v3_${story.id}_${currentChapter.id}`;
    const lastViewedTime = localStorage.getItem(viewToken);

    let shouldTally = false;
    if (!lastViewedTime) {
        shouldTally = true;
    } else {
        const timeDiff = now - parseInt(lastViewedTime, 10);
        if (timeDiff > twentyFourHours) {
            shouldTally = true;
        }
    }

    if (shouldTally) {
        const storyRef = doc(db, 'stories', story.id);
        
        const updatedChapters = story.chapters.map(ch => {
            if (ch.id === currentChapter.id) {
                return { ...ch, views: (ch.views || 0) + 1 };
            }
            return ch;
        });

        updateDoc(storyRef, { 
            views: increment(1),
            chapters: updatedChapters 
        })
        .then(() => { 
            localStorage.setItem(viewToken, now.toString()); 
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: storyRef.path,
                operation: 'update',
                requestResourceData: { views: 'increment' },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  }, [story?.id, currentChapter?.id, isAccessGranted]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (currentScrollY / docHeight) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setControlsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setControlsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sortedChapters = useMemo(() => {
      if (!story) return [];
      return [...story.chapters].sort((a,b)=>a.order - b.order);
  }, [story]);

  const nextChapterId = useMemo(() => {
      if (!currentChapter) return null;
      return sortedChapters.find(c => c.order > (currentChapter.order || 0))?.id;
  }, [sortedChapters, currentChapter]);

  const prevChapterId = useMemo(() => {
      if (!currentChapter) return null;
      return [...sortedChapters].reverse().find(c => c.order < (currentChapter.order || 0))?.id;
  }, [sortedChapters, currentChapter]);

  // High-Velocity TikTok Style Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isInteractionLocked) return;
    touchStartY.current = e.targetTouches[0].clientY;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isInteractionLocked) return;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - touchEndY;
    const diffX = touchStartX.current - touchEndX;

    const threshold = 120; // Velocity threshold
    const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 10;
    const isAtTop = window.scrollY <= 10;

    // Check for Vertical Flick (TikTok Style)
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > threshold) {
        if (diffY > 0 && isAtBottom && nextChapterId) {
            router.push(`/stories/${storyId}/read/${nextChapterId}`);
        } else if (diffY < 0 && isAtTop && prevChapterId) {
            router.push(`/stories/${storyId}/read/${prevChapterId}`);
        }
    }

    // Traditional Horizontal Swipe Support
    if (currentUser?.readerSettings?.swipeToNavigate && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
        if (diffX > 0 && nextChapterId) {
            router.push(`/stories/${storyId}/read/${nextChapterId}`);
        } else if (diffX < 0 && prevChapterId) {
            router.push(`/stories/${storyId}/read/${prevChapterId}`);
        }
    }
  };

  const toggleControls = () => {
      if (isInteractionLocked) return;
      setControlsVisible(!controlsVisible);
  };

  const handleManuscriptClick = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="dialog"]') || target.closest('.tippy-box')) return;
    toggleControls();
  };

  useEffect(() => {
    if (autoScrollSpeed <= 0) return;
    const interval = setInterval(() => { window.scrollBy({ top: 1, behavior: 'auto' }); }, 100 / autoScrollSpeed);
    return () => clearInterval(interval);
  }, [autoScrollSpeed]);

  useEffect(() => {
    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
        const data = snapshot.val() || {};
        let readers = 0;
        Object.keys(data).forEach(uid => {
            if (data[uid].state === 'online' && data[uid].active_path === pathname) readers++;
        });
        setActiveReaders(Math.max(1, readers));
    });
    return () => unsubscribe();
  }, [pathname]);

  useEffect(() => {
    if (!storyId || !chapterId) { setIsLoading(false); return; }
    setIsLoading(true);
    const storyDocRef = doc(db, 'stories', storyId);
    const unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
        setStory(storyData);
        
        const disclaimerKey = `disclaimer-seen-${storyId}`;
        if (storyData.disclaimer && !sessionStorage.getItem(disclaimerKey)) {
            setIsDisclaimerOpen(true);
        }

        const chapterData = storyData.chapters?.find(c => c.id === chapterId);
        if (chapterData) {
          setCurrentChapter(chapterData);
          const isOwner = currentUser && (storyData.author.id === currentUser.id || storyData.collaboratorIds?.includes(currentUser.id));
          let hasAccess = false;
          let reason: 'locked' | 'scheduled' | 'exclusive' | 'none' = 'none';
          if (isOwner) hasAccess = true;
          else {
              if (chapterData.scheduledAt) {
                  const scheduledTime = (chapterData.scheduledAt as Timestamp).toDate();
                  if (scheduledTime > new Date()) reason = 'scheduled';
                  else hasAccess = true;
              }
              if (chapterData.accessType === 'exclusive') {
                  if (currentUser && chapterData.invitedUserIds?.includes(currentUser.id)) hasAccess = true;
                  else { hasAccess = false; reason = 'exclusive'; }
              } else if (!chapterData.scheduledAt || reason !== 'scheduled') {
                  if (chapterData.status === 'Published' || chapterData.accessType === 'premium') hasAccess = true;
                  else reason = 'locked';
              }
          }
          setIsAccessGranted(hasAccess);
          setAccessReason(reason);
        } else { router.push(`/stories/${storyId}`); }
      } else { router.push('/'); }
      setIsLoading(false);
    });
    return () => unsubscribeStory();
  }, [storyId, chapterId, currentUser?.id, router, toast, authLoading]);

  const handleAcceptDisclaimer = () => {
      const disclaimerKey = `disclaimer-seen-${storyId}`;
      sessionStorage.setItem(disclaimerKey, 'true');
      setIsDisclaimerOpen(false);
      showIsland({ title: "Disclaimer accepted", description: "Entry granted.", type: 'success' });
  };

  const handleVoteClick = async () => {
    if (!currentUser || !story || !currentChapter || isVoting) return;
    setIsVoting(true);
    if (isHapticFeedback && window.navigator.vibrate) window.navigator.vibrate(10);
    const wasVoting = currentChapter?.voterIds?.includes(currentUser.id) || false;
    const newVoterIds = wasVoting ? currentChapter?.voterIds!.filter(id => id !== currentUser.id) : [...(currentChapter?.voterIds || []), currentUser.id];
    const newVoteCount = wasVoting ? Math.max(0, (currentChapter?.votes || 0) - 1) : (currentChapter?.votes || 0) + 1;
    const updatedChapters = story.chapters.map(ch => ch.id === currentChapter?.id ? { ...ch, voterIds: newVoterIds, votes: newVoteCount } : ch);
    updateDoc(doc(db, 'stories', story.id), { chapters: updatedChapters }).finally(() => setIsVoting(false));
  };

  const handleLibraryAction = () => {
    if (!story || !currentUser) { router.push('/auth/signin'); return; }
    if (isHapticFeedback && window.navigator.vibrate) window.navigator.vibrate(5);
    const isInLib = currentUser.readingList?.some(item => item.id === story.id);
    if (isInLib) removeFromLibrary(story.id);
    else addToLibrary(story);
  };

  const handleAnnotationAction = useCallback((type: 'highlight' | 'comment') => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;
    setSelectedText(text);
    setAnnotationNote('');
    if (type === 'highlight') {
        setIsAnnotationDialogOpen(true);
    } else {
        router.push(`/stories/${story?.id}/read/${currentChapter?.id}/comments?quote=${encodeURIComponent(text.trim())}`);
    }
  }, [editor, story?.id, currentChapter?.id, router]);

  const saveAnnotation = async () => {
    if (!currentUser || !story || !currentChapter || !selectedText.trim()) return;
    setIsSavingAnnotation(true);
    const annotationData: Omit<Annotation, 'id'> = {
        userId: currentUser.id,
        authorInfo: { id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName || currentUser.username, avatarUrl: currentUser.avatarUrl },
        storyId: story.id,
        chapterId: currentChapter.id,
        storyTitle: story.title,
        chapterTitle: currentChapter.title,
        highlightedText: selectedText.trim(),
        highlightColor: selectedColor,
        note: annotationNote.trim(),
        timestamp: serverTimestamp(),
        visibility: 'public',
        reactionsCount: 0,
        commentsCount: 0
    };
    try {
        await addDoc(collection(db, 'annotations'), annotationData);
        editor?.chain().focus().setHighlight({ color: selectedColor }).run();
        showIsland({ title: "Highlight archived", type: 'success' });
        setIsAnnotationDialogOpen(false);
    } catch (error) { toast({ title: "Capture Failed" }); } finally { setIsSavingAnnotation(false); }
  };

  const articleClasses = cn(
      "prose dark:prose-invert max-w-none pt-8 pb-0 px-4 sm:px-6 md:px-12 selection:bg-primary/20 transition-all duration-500 transform-gpu",
      isFocusMode && "zen-mode",
      isParchmentMode && "parchment-mode",
      isVignette && "vignette-fx",
      isEyeStrainGuard && "eye-guard-active",
      isHighContrast && "high-contrast-active",
      isLineFocus && "line-focus-active",
      {
        'prose-sm': fontSize === 'sm', 'prose-base': fontSize === 'base', 'prose-lg': fontSize === 'lg', 'prose-xl': fontSize === 'xl',
        'font-body': fontFamily === 'sans', 'font-serif': fontFamily === 'serif',
        'leading-tight': lineHeight === 'tight', 'leading-normal': lineHeight === 'normal', 'leading-loose': lineHeight === 'loose',
        'tracking-normal': letterSpacing === 'normal', 'tracking-wide': letterSpacing === 'wide',
        'max-w-3xl mx-auto': layoutWidth === 'normal', 'max-w-5xl mx-auto': layoutWidth === 'wide',
      }
  );

  const zenFocusStyles = `
    .zen-mode .ProseMirror p {
        opacity: 0.15;
        transition: opacity 0.5s ease, filter 0.5s ease, transform 0.3s ease;
        filter: blur(4px);
    }
    .zen-mode .ProseMirror p:hover,
    .zen-mode .ProseMirror p:focus-within,
    .zen-mode .ProseMirror p:active {
        opacity: 1;
        filter: blur(0);
        transform: scale(1.02);
    }
    .line-focus-active .ProseMirror p {
        background: transparent;
        transition: background 0.3s;
    }
    .line-focus-active .ProseMirror p:hover {
        background: hsla(var(--primary), 0.05);
        border-radius: 0.5rem;
    }
    .eye-guard-active {
        filter: sepia(0.2) saturate(0.8);
    }
    .high-contrast-active {
        filter: contrast(1.25) saturate(1.1);
    }
    .vignette-fx::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 5;
        box-shadow: inset 0 0 150px rgba(0,0,0,0.5);
        transition: opacity 0.5s;
    }
    .ProseMirror {
        padding-bottom: 0 !important;
        outline: none !important;
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  if (isLoading || !editor) return <div className="flex justify-center items-center h-screen bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!story || !currentChapter) return null;

  return (
    <TooltipProvider delayDuration={300}>
    <div className={cn(
        "relative min-h-screen bg-background text-foreground transition-colors duration-700 transform-gpu",
        isNightPortalActive && "dark night-portal",
        isFocusMode && "zen-focus-mode"
    )} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      
      {/* Slick Floating Header */}
      <header className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl md:max-w-2xl bg-card/70 backdrop-blur-3xl border border-white/10 p-2.5 flex items-center justify-between transition-all duration-700 transform-gpu rounded-full shadow-2xl',
        controlsVisible && !isInteractionLocked ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0 scale-95'
      )}>
        <div className="flex items-center ml-1">
            <Link href="/" passHref><Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10"><Home className="h-5 w-5" /></Button></Link>
        </div>
        
        <div className="truncate text-center mx-2 flex-1 flex flex-col items-center">
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">{story.title}</h1>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{currentChapter.title}</span>
                <span className="w-1 h-1 bg-muted-foreground/20 rounded-full" />
                <span className="text-[9px] font-black text-accent uppercase tracking-widest">{minutesLeft} MIN LEFT</span>
            </div>
        </div>

        <div className="flex items-center gap-1 mr-1">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10" onClick={() => setIsTocOpen(true)}><ListOrdered className="h-5 w-5" /></Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 relative">
                        <Palette className="h-5 w-5" />
                        {(fontSize !== 'base' || lineHeight !== 'normal' || ambientSound !== 'none' || isEyeStrainGuard || isHighContrast) && <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[90vw] max-w-sm p-6 bg-background/95 backdrop-blur-3xl border border-white/10 shadow-3xl rounded-[2.5rem] mt-4" align="center">
                    <Tabs defaultValue="vibe" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/40 p-1 rounded-2xl h-11 mb-6 border border-white/5">
                            <TabsTrigger value="vibe" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Vibe</TabsTrigger>
                            <TabsTrigger value="type" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Type</TabsTrigger>
                            <TabsTrigger value="sound" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Atmos</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="vibe" className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Archive Style</Label>
                                <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
                                    {['light', 'dark', 'system'].map(t => (
                                        <Label key={t} htmlFor={t} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-transparent bg-muted/30 cursor-pointer transition-all hover:bg-muted/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5">
                                            <RadioGroupItem value={t} id={t} className="sr-only" />
                                            {t === 'light' ? <Sun className="h-4 w-4 mb-1 text-orange-500" /> : t === 'dark' ? <Moon className="h-4 w-4 mb-1 text-blue-500" /> : <Monitor className="h-4 w-4 mb-1" />}
                                            <span className="text-[9px] font-black uppercase tracking-tighter">{t}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                            
                            <Separator className="opacity-10" />

                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reading Improvements</Label>
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                            <Label htmlFor="eye-strain" className="text-[10px] font-bold uppercase">Strain Guard</Label>
                                        </div>
                                        <Switch id="eye-strain" checked={isEyeStrainGuard} onCheckedChange={setIsEyeStrainGuard} className="scale-75" />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Contrast className="h-3.5 w-3.5 text-primary" />
                                            <Label htmlFor="high-contrast" className="text-[10px] font-bold uppercase">Contrast</Label>
                                        </div>
                                        <Switch id="high-contrast" checked={isHighContrast} onCheckedChange={setIsHighContrast} className="scale-75" />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Eye className="h-3.5 w-3.5 text-primary" />
                                            <Label htmlFor="line-focus" className="text-[10px] font-bold uppercase">Line Focus</Label>
                                        </div>
                                        <Switch id="line-focus" checked={isLineFocus} onCheckedChange={setIsLineFocus} className="scale-75" />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                                            <Label htmlFor="parchment" className="text-[10px] font-bold uppercase">Parchment</Label>
                                        </div>
                                        <Switch id="parchment" checked={isParchmentMode} onCheckedChange={setIsParchmentMode} className="scale-75" />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Lock className="h-3.5 w-3.5 text-red-500" />
                                            <Label htmlFor="freeze" className="text-[10px] font-bold uppercase">Freeze Node</Label>
                                        </div>
                                        <Switch id="freeze" checked={isInteractionLocked} onCheckedChange={setIsInteractionLocked} className="scale-75" />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="type" className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Font Family</Label>
                                    <RadioGroup value={fontFamily} onValueChange={(v: any) => setFontFamily(v)} className="flex gap-2">
                                        {['sans', 'serif'].map(f => (
                                            <div key={f} className="flex-1">
                                                <RadioGroupItem value={f} id={`font-${f}`} className="sr-only" />
                                                <Label htmlFor={`font-${f}`} className={cn("flex items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest shadow-sm", fontFamily === f ? "bg-primary text-white border-primary" : "bg-muted/30 border-transparent hover:bg-muted/50")}>{f}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Font Size</Label>
                                    <RadioGroup value={fontSize} onValueChange={(v: any) => setFontSize(v)} className="grid grid-cols-4 gap-1.5">
                                        {['sm', 'base', 'lg', 'xl'].map(s => (
                                            <div key={s}>
                                                <RadioGroupItem value={s} id={`size-${s}`} className="sr-only" />
                                                <Label htmlFor={`size-${s}`} className={cn("flex items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-[10px] font-black uppercase shadow-sm", fontSize === s ? "bg-primary text-white border-primary" : "bg-muted/30 border-transparent hover:bg-muted/50")}>{s}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <Separator className="opacity-10" />

                                <div className="space-y-3">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Advanced Type Nodes</Label>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between px-1"><span className="text-[9px] font-bold uppercase">Line Height</span></div>
                                            <RadioGroup value={lineHeight} onValueChange={(v: any) => setLineHeight(v)} className="grid grid-cols-3 gap-2">
                                                {['tight', 'normal', 'loose'].map(l => (
                                                    <div key={l}>
                                                        <RadioGroupItem value={l} id={`lh-${l}`} className="sr-only" />
                                                        <Label htmlFor={`lh-${l}`} className={cn("flex items-center justify-center h-9 rounded-xl border transition-all cursor-pointer text-[8px] font-black uppercase tracking-tighter", lineHeight === l ? "bg-primary/20 text-primary border-primary/30" : "bg-muted/30 border-transparent")}>{l}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between px-1"><span className="text-[9px] font-bold uppercase">Letter Spacing</span></div>
                                            <div className="flex gap-2">
                                                <Button variant={letterSpacing === 'normal' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase" onClick={() => setLetterSpacing('normal')}>Normal</Button>
                                                <Button variant={letterSpacing === 'wide' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest" onClick={() => setLetterSpacing('wide')}>Wide</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between px-1"><span className="text-[9px] font-bold uppercase">Archival Width</span></div>
                                            <div className="flex gap-2">
                                                <Button variant={layoutWidth === 'normal' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase" onClick={() => setLayoutWidth('normal')}>Normal</Button>
                                                <Button variant={layoutWidth === 'wide' ? 'default' : 'outline'} size="sm" className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase" onClick={() => setLayoutWidth('wide')}>Wide</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="sound" className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                             <div className="space-y-4">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Soundscape</Label>
                                <RadioGroup value={ambientSound} onValueChange={(v: any) => setAmbientSound(v)} className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'none', icon: VolumeX, label: 'Silent' },
                                        { id: 'lofi', icon: Coffee, label: 'Lo-fi' },
                                        { id: 'rain', icon: CloudRain, label: 'Rain' }
                                    ].map(s => (
                                        <Label key={s.id} htmlFor={`sound-${s.id}`} className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer gap-1.5 shadow-sm",
                                            ambientSound === s.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50"
                                        )}>
                                            <RadioGroupItem value={s.id} id={`sound-${s.id}`} className="sr-only" />
                                            <s.icon className={cn("h-4 w-4", ambientSound === s.id ? "text-primary" : "text-muted-foreground")} />
                                            <span className="text-[8px] font-black uppercase tracking-tighter">{s.label}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>

                                <Separator className="opacity-10" />

                                <div className="space-y-4">
                                    <div className="space-y-2 px-1">
                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest">Environment Volume</span><span className="text-[10px] font-mono">{atmosphereVolume}%</span></div>
                                        <Slider value={[atmosphereVolume]} onValueChange={([v]) => setAtmosphereVolume(v)} max={100} step={1} className="py-2" />
                                    </div>
                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <Zap className="h-3.5 w-3.5 text-primary" />
                                                <Label htmlFor="haptic" className="text-[10px] font-bold uppercase">Haptic Signal</Label>
                                            </div>
                                            <Switch id="haptic" checked={isHapticFeedback} onCheckedChange={setIsHapticFeedback} className="scale-75" />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <Maximize2 className="h-3.5 w-3.5 text-primary" />
                                                <Label htmlFor="vignette" className="text-[10px] font-bold uppercase">Vignette Focus</Label>
                                            </div>
                                            <Switch id="vignette" checked={isVignette} onCheckedChange={setIsVignette} className="scale-75" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </PopoverContent>
            </Popover>
        </div>
      </header>

      <Sheet open={isTocOpen} onOpenChange={setIsTocOpen}>
          <SheetContent side="right" className="w-[85vw] sm:w-96 p-0 border-none shadow-3xl bg-background/95 backdrop-blur-3xl flex flex-col">
              <Tabs defaultValue="chapters" className="h-full flex flex-col">
                  <SheetHeader className="p-6 bg-muted/30 border-b flex-shrink-0">
                      <SheetTitle className="sr-only">Manuscript Navigation</SheetTitle>
                      <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl h-11 mb-2">
                          <TabsTrigger value="chapters" className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">Chapters</TabsTrigger>
                          <TabsTrigger value="search" className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">Find</TabsTrigger>
                      </TabsList>
                  </SheetHeader>
                  <TabsContent value="chapters" className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                          <div className="p-4 space-y-1">
                              {sortedChapters.map(ch => (
                                  <Link key={ch.id} href={`/stories/${story.id}/read/${ch.id}`} onClick={() => setIsTocOpen(false)} className={cn("flex items-center gap-3 p-4 rounded-2xl transition-all border border-transparent", ch.id === chapterId ? "bg-primary/10 text-primary border-primary/20 shadow-inner" : "hover:bg-primary/5")}>
                                      <span className={cn("text-[10px] font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm", ch.id === chapterId ? "bg-primary text-white" : "bg-muted")}>{ch.order}</span>
                                      <div className="flex-1 min-w-0"><span className={cn("text-sm font-bold truncate block", ch.id === chapterId ? "text-primary" : "text-foreground")}>{ch.title}</span></div>
                                      {ch.id === chapterId && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
                                  </Link>
                              ))}
                          </div>
                      </ScrollArea>
                  </TabsContent>
                  <TabsContent value="search" className="flex-1 overflow-hidden flex flex-col">
                      <div className="p-4 bg-muted/20 border-b"><Input placeholder="Search within manuscript..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-12 rounded-2xl bg-background border-none shadow-inner" /></div>
                      <ScrollArea className="flex-1"><div className="p-10 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Ready to search...</div></ScrollArea>
                  </TabsContent>
              </Tabs>
          </SheetContent>
      </Sheet>

      <main className="pt-28 pb-0 min-h-screen">
        <AlertDialog open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen}>
            <AlertDialogContent className="max-w-xl rounded-[3rem] border-none shadow-3xl p-0 overflow-hidden bg-background/95 backdrop-blur-3xl">
                <AlertDialogHeader className="p-10 bg-muted/30 border-b">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-2xl">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <AlertDialogTitle className="font-headline text-3xl font-bold">Author's Note</AlertDialogTitle>
                            <AlertDialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Crucial Manuscript Transmission</AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>
                <div className="p-10">
                    <ScrollArea className="h-[40vh] pr-4 -mr-4">
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="whitespace-pre-line text-lg text-foreground/80 leading-relaxed italic font-medium">
                                {story.disclaimer}
                            </p>
                        </div>
                    </ScrollArea>
                </div>
                <AlertDialogFooter className="p-8 bg-muted/20 border-t flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button 
                        onClick={handleAcceptDisclaimer}
                        className="w-full sm:w-auto rounded-full px-12 h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 border-none"
                    >
                        I Acknowledge & Enter
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {isAccessGranted ? (
            <div className="relative" onClick={handleManuscriptClick}>
                {editor && (
                    <BubbleMenu 
                        editor={editor} 
                        shouldShow={({ editor }) => editor ? !editor.state.selection.empty : false}
                        tippyOptions={{ duration: 150, zIndex: 10000, appendTo: 'parent' }}
                        className="flex items-center gap-1 p-1.5 bg-card/95 backdrop-blur-3xl border border-white/20 rounded-full shadow-3xl transform-gpu animate-in zoom-in-95 duration-200"
                    >
                        <Button variant="ghost" size="icon" onClick={() => handleAnnotationAction('highlight')} className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary transition-all active:scale-95 flex items-center justify-center" title="Highlight"><Highlighter className="h-5 w-5" /></Button>
                        <div className="w-px h-6 bg-border/40 mx-0.5" />
                        <Button variant="ghost" size="icon" onClick={() => handleAnnotationAction('comment')} className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary transition-all active:scale-95 flex items-center justify-center" title="Discuss Selection"><MessageSquare className="h-5 w-5" /></Button>
                    </BubbleMenu>
                )}
                <article className={articleClasses}>
                    <div className="text-center mb-20 space-y-4 px-6 animate-in slide-in-from-top-6 duration-1000">
                        <Badge variant="outline" className="rounded-full px-5 py-1.5 font-black text-[10px] uppercase tracking-[0.4em] bg-primary/5 text-primary border-primary/20 shadow-sm">Entry {currentChapter?.order}</Badge>
                        <h2 className="font-headline text-5xl md:text-8xl font-bold tracking-tighter leading-none text-foreground">{currentChapter?.title}</h2>
                        
                        <div className="flex items-center justify-center gap-8 mt-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground/40 animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
                            <div className="flex items-center gap-2.5">
                                <Eye className="h-4 w-4 text-primary/30" />
                                <span>{formatCompactNumber(currentChapter?.views || 0)} Reads</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <ThumbsUp className="h-4 w-4 text-primary/30" />
                                <span>{formatCompactNumber(currentChapter?.votes || 0)} Votes</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Timer className="h-4 w-4 text-primary/30" />
                                <span>{totalMinutes} MIN READ</span>
                            </div>
                        </div>
                    </div>
                    <EditorContent editor={editor} />
                </article>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center animate-in fade-in zoom-in-95 duration-700"><Lock className="h-20 w-20 text-yellow-500/30 mb-6" /><h2 className="text-3xl font-headline font-bold mb-2">Access Re-routed</h2><p className="text-muted-foreground max-xs mb-10">This archive entry is currently locked or scheduled for later release.</p><Button variant="outline" className="rounded-full px-12 h-14 font-black uppercase tracking-widest text-xs border-border/40" onClick={() => router.push(`/stories/${storyId}`)}>Back to Overview</Button></div>
        )}
      </main>

      {/* Slick Floating Footer Actions */}
      <footer className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl md:max-w-3xl px-4 transition-all duration-700 transform-gpu',
        controlsVisible && !isInteractionLocked ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 scale-95'
      )}>
        <div className="bg-card/70 backdrop-blur-3xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-2 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-12 w-12 md:h-14 md:w-14 rounded-full transition-all active:scale-90" onClick={() => prevChapterId && router.push(`/stories/${storyId}/read/${prevChapterId}`)} disabled={!prevChapterId}><ArrowLeft className="h-6 w-6" /></Button>
            
            <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1 border border-white/5 shadow-inner">
                <Button variant="ghost" size="sm" className="rounded-full h-10 md:h-12 px-5 gap-2.5 hover:bg-primary/10 hover:text-primary transition-all active:scale-95" onClick={handleVoteClick} disabled={isVoting}>
                    <ThumbsUp className={cn("h-5 w-5", currentChapter?.voterIds?.includes(currentUser?.id || '') && "fill-primary text-primary")} />
                    <span className="text-xs font-black">{formatCompactNumber(currentChapter?.votes || 0)}</span>
                </Button>
                <Link href={`/stories/${storyId}/read/${chapterId}/comments`} passHref>
                    <Button variant="ghost" size="sm" className="rounded-full h-10 md:h-12 px-5 gap-2.5 hover:bg-primary/10 hover:text-primary transition-all active:scale-95">
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-xs font-black">{formatCompactNumber(currentChapter?.commentsCount || 0)}</span>
                    </Button>
                </Link>
                <div className="w-px h-6 bg-border/40 mx-1" />
                <Button variant="ghost" size="icon" className={cn("rounded-full h-10 md:h-12 w-10 md:w-12 transition-all active:scale-95", isInLibrary ? "text-primary bg-primary/5" : "")} onClick={handleLibraryAction}>
                    {isInLibrary ? <BookmarkCheck className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </Button>
            </div>

            <Button variant="ghost" size="icon" className="h-12 w-12 md:h-14 md:w-14 rounded-full transition-all active:scale-90" onClick={() => nextChapterId && router.push(`/stories/${storyId}/read/${nextChapterId}`)} disabled={!nextChapterId}><ArrowRight className="h-6 w-6" /></Button>
        </div>
      </footer>
      
      <Sheet open={isAnnotationDialogOpen} onOpenChange={setIsAnnotationDialogOpen}>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-[3rem] border-none shadow-3xl bg-background/95 backdrop-blur-3xl">
              <div className="mx-auto w-16 h-1.5 rounded-full bg-muted/40 mb-8" />
              <SheetHeader className="text-left mb-8">
                  <SheetTitle className="font-headline text-3xl font-bold">Archive Highlight</SheetTitle>
                  <SheetDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Capture this transmission for the community archives</SheetDescription>
              </SheetHeader>
              
              <div className="space-y-8 pb-12">
                  <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-inner relative group/quote overflow-hidden">
                      <Quote className="absolute -top-4 -right-4 h-24 w-24 text-primary/5 -scale-x-100 transition-transform group-hover/quote:scale-110" />
                      <p className="italic text-lg md:text-xl leading-relaxed text-foreground/90 font-serif relative z-10">"{selectedText}"</p>
                  </div>

                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Context Note (Optional)</Label>
                      <Textarea 
                        value={annotationNote} 
                        onChange={e => setAnnotationNote(e.target.value)} 
                        placeholder="Why does this line resonate?..." 
                        className="bg-muted/20 border-none rounded-2xl text-base p-6 min-h-[120px] shadow-inner focus-visible:ring-primary/20"
                      />
                  </div>

                  <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Archive Color</Label>
                      <div className="flex gap-4 px-2">
                          {HIGHLIGHT_COLORS.map(color => (
                              <button 
                                key={color.value} 
                                onClick={() => setSelectedColor(color.value)}
                                className={cn(
                                    "w-12 h-12 rounded-full border-[3px] transition-all duration-500 transform-gpu hover:scale-110 shadow-lg",
                                    selectedColor === color.value ? "border-primary scale-110 shadow-primary/20" : "border-transparent opacity-60"
                                )}
                                style={{ backgroundColor: color.value }}
                              />
                          ))}
                      </div>
                  </div>

                  <Button 
                    onClick={saveAnnotation} 
                    disabled={isSavingAnnotation} 
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 transition-all hover:scale-[1.01] active:scale-95 border-none"
                  >
                      {isSavingAnnotation ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Sparkles className="h-5 w-5 mr-3" />}
                      Finalize Archival
                  </Button>
              </div>
          </SheetContent>
      </Sheet>
      
      <style dangerouslySetInnerHTML={{ __html: zenFocusStyles }} />
    </div>
    </TooltipProvider>
  );
}