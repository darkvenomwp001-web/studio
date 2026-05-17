'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Calendar,
  ImagePlus,
  Search, 
  Eye, 
  Languages, 
  BookOpen,
  Maximize2,
  Minimize2,
  MousePointer2,
  RotateCcw,
  FileText,
  Highlighter,
  Quote
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import type { Story, Chapter, Annotation } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatCompactNumber } from '@/lib/utils';
import { db, rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { doc, onSnapshot, updateDoc, Timestamp, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatDate } from '@/lib/placeholder-data';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

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
  const { user: currentUser, addToLibrary, removeFromLibrary } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [story, setStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [accessReason, setAccessReason] = useState<'locked' | 'scheduled' | 'exclusive' | 'none'>('none');
  const [isVoting, setIsVoting] = useState(false);
  const [activeReaders, setActiveReaders] = useState(1);

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
  const [isZenFocus, setIsZenFocus] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);

  const editor = useEditor({
    extensions: [
        StarterKit, 
        TiptapUnderline, 
        TiptapHighlight.configure({ multicolor: true })
    ],
    content: '',
    editable: false,
  });

  useEffect(() => {
    if (editor && currentChapter) {
      editor.commands.setContent(currentChapter.content, false);
    }
  }, [editor, currentChapter?.id, currentChapter?.content]);

  // Auto-Scroll Logic
  useEffect(() => {
    if (autoScrollSpeed <= 0) return;
    const interval = setInterval(() => {
        window.scrollBy({ top: 1, behavior: 'auto' });
    }, 100 / autoScrollSpeed);
    return () => clearInterval(interval);
  }, [autoScrollSpeed]);

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

  useEffect(() => {
    if (!storyId || !chapterId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const storyDocRef = doc(db, 'stories', storyId);

    const unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
        setStory(storyData);
        
        const chapterData = storyData.chapters?.find(c => c.id === chapterId);

        if (chapterData) {
          setCurrentChapter(chapterData);
          const visibleList = storyData.chapters.filter(c => c.status === 'Published' || c.accessType === 'premium').sort((a,b) => a.order - b.order);
          const chIndex = visibleList.findIndex(c => c.id === chapterId);
          setReadingProgress(visibleList.length > 0 ? ((chIndex + 1) / visibleList.length) * 100 : 0);

          const isOwner = currentUser && (storyData.author.id === currentUser.id || storyData.collaboratorIds?.includes(currentUser.id));
          let hasAccess = false;
          let reason: 'locked' | 'scheduled' | 'exclusive' | 'none' = 'none';

          if (isOwner) {
              hasAccess = true;
          } else {
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
        } else {
          toast({ title: "Chapter Not Found", variant: "destructive" });
          router.push(`/stories/${storyId}`);
        }
      } else {
        toast({ title: "Story Not Found", variant: "destructive" });
        router.push('/');
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching story:", error);
      toast({ title: "Error", description: "Could not load the story.", variant: "destructive" });
      router.push('/');
      setIsLoading(false);
    });

    return () => unsubscribeStory();
  }, [storyId, chapterId, currentUser?.id, router, toast]);

  const handleVoteClick = async () => {
    if (!currentUser || !story || !currentChapter || isVoting) return;
    setIsVoting(true);
    const wasVoting = currentChapter?.voterIds?.includes(currentUser.id) || false;
    const newVoterIds = wasVoting ? currentChapter?.voterIds!.filter(id => id !== currentUser.id) : [...(currentChapter?.voterIds || []), currentUser.id];
    const newVoteCount = wasVoting ? Math.max(0, (currentChapter?.votes || 0) - 1) : (currentChapter?.votes || 0) + 1;
    const updatedChapters = story.chapters.map(ch => ch.id === currentChapter?.id ? { ...ch, voterIds: newVoterIds, votes: newVoteCount } : ch);
    updateDoc(doc(db, 'stories', story.id), { chapters: updatedChapters }).finally(() => setIsVoting(false));
  };

  const handleLibraryAction = () => {
    if (!story || !currentUser) { router.push('/auth/signin'); return; }
    const isInLib = currentUser.readingList?.some(item => item.id === story.id);
    if (isInLib) removeFromLibrary(story.id);
    else addToLibrary(story);
  };

  const handleAnnotationAction = (type: 'highlight' | 'comment') => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;

    setSelectedText(text);
    setAnnotationNote('');
    setIsAnnotationDialogOpen(true);
  };

  const saveAnnotation = async (type: 'highlight' | 'comment') => {
    if (!currentUser || !story || !currentChapter || !selectedText.trim()) return;
    setIsSavingAnnotation(true);

    const annotationData: Omit<Annotation, 'id'> = {
        userId: currentUser.id,
        authorInfo: { id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl },
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
        if (type === 'highlight') {
            await addDoc(collection(db, 'annotations'), annotationData);
            editor?.chain().focus().setHighlight({ color: selectedColor }).run();
            toast({ title: "Highlight Captured", description: "Prose archived in your highlights." });
        } else {
            // wattpad style: go straight to comments with a quote
            router.push(`/stories/${story.id}/read/${currentChapter.id}/comments?quote=${encodeURIComponent(selectedText.trim())}`);
        }
        setIsAnnotationDialogOpen(false);
    } catch (error) {
        toast({ title: "Capture Failed", variant: "destructive" });
    } finally {
        setIsSavingAnnotation(false);
    }
  };

  const resetPreferences = () => {
    setFontSize('base');
    setFontFamily('sans');
    setLineHeight('normal');
    setLayoutWidth('normal');
    setIsNightPortalActive(false);
    setIsZenFocus(false);
    setAutoScrollSpeed(0);
    toast({ title: "Preferences Reset" });
  };

  const articleClasses = cn(
      "prose dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-12 selection:bg-primary/20 transition-all duration-300 transform-gpu",
      isZenFocus && "zen-mode",
      {
        'prose-sm': fontSize === 'sm', 'prose-base': fontSize === 'base', 'prose-lg': fontSize === 'lg', 'prose-xl': fontSize === 'xl',
        'font-body': fontFamily === 'sans', 'font-serif': fontFamily === 'serif',
        'leading-tight': lineHeight === 'tight', 'leading-normal': lineHeight === 'normal', 'leading-loose': lineHeight === 'loose',
        'max-w-3xl mx-auto': layoutWidth === 'normal', 'max-w-5xl mx-auto': layoutWidth === 'wide',
      }
  );

  const searchResults = useMemo(() => {
      if (!searchTerm || !currentChapter?.content) return [];
      const text = currentChapter.content.replace(/<[^>]*>/g, '');
      const regex = new RegExp(searchTerm, 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
          const start = Math.max(0, match.index - 30);
          const end = Math.min(text.length, match.index + searchTerm.length + 30);
          matches.push({
              index: match.index,
              snippet: '...' + text.substring(start, end).replace(regex, (m) => `<span class="bg-primary/30 font-bold">${m}</span>`) + '...'
          });
          if (matches.length > 50) break;
      }
      return matches;
  }, [searchTerm, currentChapter?.content]);

  if (isLoading || !editor) {
    return <div className="flex justify-center items-center h-screen bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!story || !currentChapter) return null;

  const isInLibrary = currentUser?.readingList?.some(item => item.id === story.id);
  const nextChapterId = story.chapters.sort((a,b)=>a.order-b.order).find(c => c.order > (currentChapter?.order || 0))?.id;
  const prevChapterId = story.chapters.sort((a,b)=>a.order-b.order).reverse().find(c => c.order < (currentChapter?.order || 0))?.id;

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
    .ProseMirror {
        padding-bottom: 300px !important;
        outline: none !important;
    }
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
  `;

  return (
    <TooltipProvider delayDuration={300}>
    <div className={cn(
        "relative min-h-screen bg-background text-foreground transition-colors duration-500",
        isNightPortalActive && "dark night-portal",
        isZenFocus && "zen-focus-mode",
        currentChapter?.accessType === 'premium' && "select-none"
    )}>
      <header className={cn('fixed top-0 left-0 z-40 bg-card/80 backdrop-blur-md border-b p-3 flex items-center justify-between w-full transition-all duration-300', controlsVisible ? 'translate-y-0' : '-translate-y-full shadow-lg')}>
        <div className="flex items-center">
            <Link href="/" passHref><Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10"><Home className="h-5 w-5" /></Button></Link>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => setIsTocOpen(true)}><ListOrdered className="h-5 w-5" /></Button>
        </div>
        <div className="truncate text-center mx-2 flex-1 flex flex-col items-center">
            <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">{story.title}</h1>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary animate-pulse tracking-widest bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                <Users className="h-2.5 w-2.5" /> <span>{activeReaders} Active Readers</span>
            </div>
        </div>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 relative">
                    <Palette className="h-5 w-5" />
                    {(fontSize !== 'base' || lineHeight !== 'normal' || layoutWidth !== 'wide') && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-6 bg-background/95 backdrop-blur-2xl border border-border/40 shadow-3xl rounded-3xl overflow-hidden" side="bottom" align="center">
                <Tabs defaultValue="vibe" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-2xl h-11 mb-6">
                        <TabsTrigger value="vibe" className="rounded-xl text-[10px] font-bold uppercase tracking-widest">Vibe</TabsTrigger>
                        <TabsTrigger value="type" className="rounded-xl text-[10px] font-bold uppercase tracking-widest">Type</TabsTrigger>
                        <TabsTrigger value="view" className="rounded-xl text-[10px] font-bold uppercase tracking-widest">View</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="vibe" className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Archive Atmosphere</Label>
                            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
                                {['light', 'dark', 'system'].map(t => (
                                    <Label key={t} htmlFor={t} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-transparent bg-muted/30 cursor-pointer transition-all hover:bg-muted/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 group">
                                        <RadioGroupItem value={t} id={t} className="sr-only" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter transition-transform group-active:scale-90">{t}</span>
                                    </Label>
                                ))}
                            </RadioGroup>
                        </div>
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-primary/10 rounded-lg"><Sparkles className="h-4 w-4 text-primary" /></div>
                                    <Label htmlFor="zen-focus" className="text-xs font-bold uppercase tracking-tight">Zen Focus</Label>
                                </div>
                                <Switch id="zen-focus" checked={isZenFocus} onCheckedChange={setIsZenFocus} />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-primary/10 rounded-lg"><Eye className="h-4 w-4 text-primary" /></div>
                                    <Label htmlFor="night-portal" className="text-xs font-bold uppercase tracking-tight">Night Portal</Label>
                                </div>
                                <Switch id="night-portal" checked={isNightPortalActive} onCheckedChange={setIsNightPortalActive} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="type" className="space-y-6">
                         <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Typeface</Label>
                                <RadioGroup value={fontFamily} onValueChange={(v: any) => setFontFamily(v)} className="flex gap-2">
                                    {['sans', 'serif'].map(f => (
                                        <div key={f} className="flex-1">
                                            <RadioGroupItem value={f} id={`font-${f}`} className="sr-only" />
                                            <Label htmlFor={`font-${f}`} className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-xs font-bold uppercase tracking-tighter", fontFamily === f ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent hover:bg-muted/50")}>{f}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Scale</Label>
                                <RadioGroup value={fontSize} onValueChange={(v: any) => setFontSize(v)} className="grid grid-cols-4 gap-1">
                                    {['sm', 'base', 'lg', 'xl'].map(s => (
                                        <div key={s}>
                                            <RadioGroupItem value={s} id={`size-${s}`} className="sr-only" />
                                            <Label htmlFor={`size-${s}`} className={cn("flex items-center justify-center h-9 rounded-xl border transition-all cursor-pointer text-[10px] font-black uppercase", fontSize === s ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent hover:bg-muted/50")}>{s}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Line Height</Label>
                                <RadioGroup value={lineHeight} onValueChange={(v: any) => setLineHeight(v)} className="grid grid-cols-3 gap-1">
                                    {['tight', 'normal', 'loose'].map(l => (
                                        <div key={l}>
                                            <RadioGroupItem value={l} id={`line-${l}`} className="sr-only" />
                                            <Label htmlFor={`line-${l}`} className={cn("flex items-center justify-center h-9 rounded-xl border transition-all cursor-pointer text-[9px] font-black uppercase tracking-tighter", lineHeight === l ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent hover:bg-muted/50")}>{l}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                         </div>
                    </TabsContent>

                    <TabsContent value="view" className="space-y-6">
                         <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Focus Width</Label>
                                <RadioGroup value={layoutWidth} onValueChange={(v: any) => setLayoutWidth(v)} className="flex gap-2">
                                    <div className="flex-1">
                                        <RadioGroupItem value="normal" id="width-norm" className="sr-only" />
                                        <Label htmlFor="width-norm" className={cn("flex flex-col items-center justify-center h-12 rounded-2xl border transition-all cursor-pointer gap-1", layoutWidth === 'normal' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>
                                            <Minimize2 className="h-4 w-4" />
                                            <span className="text-[8px] font-bold uppercase tracking-widest">Normal</span>
                                        </Label>
                                    </div>
                                    <div className="flex-1">
                                        <RadioGroupItem value="wide" id="width-wide" className="sr-only" />
                                        <Label htmlFor="width-wide" className={cn("flex flex-col items-center justify-center h-12 rounded-2xl border transition-all cursor-pointer gap-1", layoutWidth === 'wide' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>
                                            <Maximize2 className="h-4 w-4" />
                                            <span className="text-[8px] font-bold uppercase tracking-widest">Wide</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-3 p-4 bg-muted/20 rounded-3xl border border-border/20">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <MousePointer2 className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Auto Scroll</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-primary font-bold">{autoScrollSpeed}x</span>
                                </div>
                                <Slider value={[autoScrollSpeed]} onValueChange={([v]) => setAutoScrollSpeed(v)} max={10} step={0.5} className="py-2" />
                            </div>
                            <Button variant="ghost" className="w-full rounded-2xl h-11 font-bold uppercase text-[9px] tracking-[0.2em] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all" onClick={resetPreferences}>
                                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset Preferences
                            </Button>
                         </div>
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
      </header>

      {/* Chapters & Search Panel */}
      <Sheet open={isTocOpen} onOpenChange={setIsTocOpen}>
          <SheetContent side="left" className="w-80 p-0 border-none shadow-3xl bg-background/95 backdrop-blur-xl flex flex-col">
              <SheetHeader className="p-6 bg-muted/30 border-b flex-shrink-0">
                  <SheetTitle className="sr-only">Manuscript Navigation</SheetTitle>
                  <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search prose..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-9 h-11 rounded-xl bg-muted/30 border-none shadow-inner"
                      />
                  </div>
                  <SheetDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Archive Navigation</SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1">
                  <div className="p-4 space-y-6">
                      {searchTerm ? (
                          <div className="space-y-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-primary ml-1">Results in this Part</p>
                              {searchResults.length > 0 ? (
                                  searchResults.map((res, i) => (
                                      <div key={i} className="p-3 bg-muted/10 rounded-xl border border-border/20 text-xs leading-relaxed text-muted-foreground cursor-pointer hover:bg-primary/5 transition-all" onClick={() => setIsTocOpen(false)}>
                                          <p dangerouslySetInnerHTML={{ __html: res.snippet }} />
                                      </div>
                                  ))
                              ) : (
                                  <p className="text-center py-10 text-muted-foreground italic text-xs">No matches found.</p>
                              )}
                          </div>
                      ) : (
                          <div className="space-y-1">
                              {story.chapters.sort((a,b)=>a.order-b.order).map(ch => (
                                  <Link 
                                    key={ch.id} 
                                    href={`/stories/${story.id}/read/${ch.id}`} 
                                    onClick={() => setIsTocOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl transition-all group",
                                        ch.id === chapterId ? "bg-primary text-white shadow-lg" : "hover:bg-primary/10"
                                    )}
                                  >
                                      <span className={cn("text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0", ch.id === chapterId ? "bg-white text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white")}>{ch.order}</span>
                                      <span className="text-sm font-bold truncate flex-1">{ch.title}</span>
                                      {ch.accessType === 'premium' && <Lock className="h-3 w-3 opacity-50" />}
                                  </Link>
                              ))}
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </SheetContent>
      </Sheet>

      <main className="pt-20 pb-24 min-h-screen">
        {isAccessGranted ? (
            <div className="relative">
                <article className={articleClasses}>
                    <div className="text-center mb-16 space-y-4 px-6 animate-in slide-in-from-top-4 duration-1000">
                        <Badge variant="outline" className="rounded-full px-4 py-1 font-black text-[10px] uppercase tracking-[0.3em] bg-primary/5 text-primary border-primary/20">Part {currentChapter?.order}</Badge>
                        <h2 className="font-headline text-4xl md:text-7xl font-bold tracking-tight leading-none text-foreground">{currentChapter?.title}</h2>
                        <div className="flex justify-center items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {currentChapter?.wordCount || 0} Words</span>
                            <div className="h-1 w-1 bg-border rounded-full" />
                            <span className="flex items-center gap-1.5"><Timer className="h-3 w-3" /> {Math.max(1, Math.round((currentChapter?.wordCount || 0) / 225))} Min Read</span>
                        </div>
                    </div>
                    
                    {editor && (
                        <BubbleMenu 
                            editor={editor} 
                            tippyOptions={{ duration: 100, animation: 'scale' }}
                            className="flex items-center gap-1 p-1 bg-card/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-3xl transform-gpu"
                        >
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-3 rounded-full gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                onClick={() => handleAnnotationAction('highlight')}
                            >
                                <Highlighter className="h-3.5 w-3.5" />
                                <span>Highlight</span>
                            </Button>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-3 rounded-full gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                                onClick={() => handleAnnotationAction('comment')}
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Comment</span>
                            </Button>
                        </BubbleMenu>
                    )}

                    <div className="relative">
                        <EditorContent editor={editor} />
                        {isZenFocus && <div className="fixed inset-0 bg-background pointer-events-none z-[-1] transition-opacity duration-1000" />}
                    </div>
                </article>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-700">
                <div className="p-8 rounded-[40px] bg-muted/20 border-2 border-dashed border-border/40 max-w-sm w-full space-y-6">
                    <Lock className="h-16 w-16 text-yellow-500 mx-auto drop-shadow-2xl animate-bounce" />
                    <div>
                        <h2 className="text-2xl font-headline font-bold">Archive Restricted</h2>
                        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                            {accessReason === 'scheduled' ? `Scheduled for automatic release on ${formatDate(currentChapter?.scheduledAt)}.` : 'This entry is restricted to authorized nodes only.'}
                        </p>
                    </div>
                    <Button variant="outline" className="w-full h-14 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-transform" onClick={() => router.push(`/stories/${storyId}`)}>Return to Overview</Button>
                </div>
            </div>
        )}
      </main>

      {/* Annotation / Highlight Dialog */}
      <Dialog open={isAnnotationDialogOpen} onOpenChange={setIsAnnotationDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-3xl p-0 overflow-hidden bg-background">
              <DialogHeader className="p-8 bg-muted/30 border-b">
                  <DialogTitle className="text-2xl font-headline font-bold">Annotate Prose</DialogTitle>
                  <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Capture your thoughts on this excerpt</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-6">
                  <div className="bg-muted/10 p-5 rounded-2xl border border-border/40 relative">
                      <Quote className="absolute top-2 left-2 h-4 w-4 text-primary/20 -scale-x-100" />
                      <p className="italic text-sm text-foreground/80 leading-relaxed pl-4">“{selectedText}”</p>
                  </div>

                  <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Archive Tint</Label>
                      <div className="flex gap-2">
                          {HIGHLIGHT_COLORS.map(c => (
                              <button 
                                key={c.value} 
                                onClick={() => setSelectedColor(c.value)}
                                className={cn(
                                    "w-8 h-8 rounded-full border-2 transition-all transform-gpu hover:scale-110",
                                    selectedColor === c.value ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-transparent"
                                )}
                                style={{ backgroundColor: c.value }}
                              />
                          ))}
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Personal Note (Optional)</Label>
                      <Textarea 
                        placeholder="Why does this line resonate? Reflect or analyze..." 
                        value={annotationNote}
                        onChange={e => setAnnotationNote(e.target.value)}
                        className="rounded-xl bg-muted/20 border-none shadow-inner resize-none h-24 text-sm"
                      />
                  </div>
              </div>
              <DialogFooter className="p-6 bg-muted/20 border-t flex-row justify-end gap-2">
                  <DialogClose asChild><Button variant="ghost" className="rounded-full px-6 font-bold uppercase text-[10px] tracking-widest">Discard</Button></DialogClose>
                  <Button 
                    onClick={() => saveAnnotation('highlight')} 
                    disabled={isSavingAnnotation} 
                    className="rounded-full px-8 bg-primary hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                  >
                      {isSavingAnnotation ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Highlighter className="h-3 w-3 mr-2" />}
                      Archive Highlight
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <footer className={cn('fixed bottom-0 left-0 z-40 bg-background/90 backdrop-blur-2xl border-t w-full transition-all duration-500 transform-gpu', controlsVisible ? 'translate-y-0' : 'translate-y-full shadow-[0_-10px_30px_rgba(0,0,0,0.1)]')}>
        <div className="absolute top-0 left-0 w-full h-1 bg-muted/30 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${readingProgress}%` }} />
        </div>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-primary/10 transition-all" onClick={() => prevChapterId && router.push(`/stories/${storyId}/read/${prevChapterId}`)} disabled={!prevChapterId}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            
            <div className="flex flex-col items-center gap-1.5">
                <div className="bg-muted/40 rounded-3xl p-1.5 flex items-center gap-1.5 border border-border/40 shadow-xl backdrop-blur-md">
                    <Button variant="ghost" size="sm" className="rounded-2xl h-11 px-4 gap-2.5 group hover:bg-primary/10 transition-all" onClick={handleVoteClick} disabled={isVoting}>
                        {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className={cn("h-5 w-5 transition-transform group-hover:scale-110", currentChapter?.voterIds?.includes(currentUser?.id || '') && "fill-primary text-primary")} />}
                        <span className="text-xs font-black tracking-tighter">{formatCompactNumber(currentChapter?.votes || 0)}</span>
                    </Button>
                    <Link href={`/stories/${storyId}/read/${chapterId}/comments`} passHref>
                        <Button variant="ghost" size="sm" className="rounded-2xl h-11 px-4 gap-2.5 hover:bg-primary/10 transition-all">
                            <MessageSquare className="h-5 w-5" />
                            <span className="text-xs font-black tracking-tighter">{formatCompactNumber(currentChapter?.commentsCount || 0)}</span>
                        </Button>
                    </Link>
                    <div className="w-px h-6 bg-border/40 mx-1" />
                    <Button variant="ghost" size="icon" className={cn("rounded-2xl h-11 w-11 transition-all", isInLibrary ? "text-primary bg-primary/10" : "hover:bg-primary/10")} onClick={handleLibraryAction}>
                        {isInLibrary ? <BookmarkCheck className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                </div>
                {autoScrollSpeed > 0 && (
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Auto Scroll Active</span>
                )}
            </div>

            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-primary/10 transition-all" onClick={() => nextChapterId && router.push(`/stories/${storyId}/read/${nextChapterId}`)} disabled={!nextChapterId && currentChapter?.status === 'Published'}>
                <ArrowRight className="h-6 w-6" />
            </Button>
        </div>
      </footer>
      <BottomNavigationBar />
      <style dangerouslySetInnerHTML={{ __html: zenFocusStyles }} />
    </div>
    </TooltipProvider>
  );
}
