'use client';

import { useEffect, useState, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  BookOpen
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import type { Story, Chapter } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatCompactNumber } from '@/lib/utils';
import { db, rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatDate } from '@/lib/placeholder-data';

type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type FontFamily = 'sans' | 'serif';
type LineHeight = 'tight' | 'normal' | 'loose';

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
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isWriterPost, setIsWriterPost] = useState(false);
  const [freezeMode, setFreezeMode] = useState(false);
  const [searchable, setSearchable] = useState(false);


  const editor = useEditor({
    editable: false, 
    content: '',
    extensions: [StarterKit, TiptapUnderline, TiptapHighlight.configure({ multicolor: true })],
  });

  useEffect(() => {
    if (editor && currentChapter) {
      editor.commands.setContent(currentChapter.content, false);
    }
  }, [editor, currentChapter?.id, currentChapter?.content]);

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
    const wasVoting = currentChapter.voterIds?.includes(currentUser.id) || false;
    const newVoterIds = wasVoting ? currentChapter.voterIds!.filter(id => id !== currentUser.id) : [...(currentChapter.voterIds || []), currentUser.id];
    const newVoteCount = wasVoting ? Math.max(0, (currentChapter.votes || 0) - 1) : (currentChapter.votes || 0) + 1;
    const updatedChapters = story.chapters.map(ch => ch.id === currentChapter.id ? { ...ch, voterIds: newVoterIds, votes: newVoteCount } : ch);
    updateDoc(doc(db, 'stories', story.id), { chapters: updatedChapters }).finally(() => setIsVoting(false));
  };

  const handleLibraryAction = () => {
    if (!story || !currentUser) { router.push('/auth/signin'); return; }
    const isInLib = currentUser.readingList?.some(item => item.id === story.id);
    if (isInLib) removeFromLibrary(story.id);
    else addToLibrary(story);
  };

  const articleClasses = cn(
      "prose dark:prose-invert max-w-none py-8 px-4 selection:bg-primary/20",
      {
        'prose-sm': fontSize === 'sm', 'prose-base': fontSize === 'base', 'prose-lg': fontSize === 'lg', 'prose-xl': fontSize === 'xl',
        'font-body': fontFamily === 'sans', 'font-serif': fontFamily === 'serif',
        'leading-tight': lineHeight === 'tight', 'leading-normal': lineHeight === 'normal', 'leading-loose': lineHeight === 'loose',
        'max-w-3xl mx-auto': layoutWidth === 'normal', 'max-w-5xl mx-auto': layoutWidth === 'wide',
      }
  );
  
  if (isLoading || !editor) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!story || !currentChapter) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Loading Error</h2>
        <p className="text-muted-foreground">There was an issue loading the story data. Please try again later.</p>
        <Button onClick={() => router.push('/')} className="mt-6">Go Home</Button>
      </div>
    );
  }

  const isInLibrary = currentUser?.readingList?.some(item => item.id === story.id);
  const nextChapterId = story.chapters.sort((a,b)=>a.order-b.order).find(c => c.order > currentChapter.order)?.id;
  const prevChapterId = story.chapters.sort((a,b)=>a.order-b.order).reverse().find(c => c.order < currentChapter.order)?.id;

  return (
    <TooltipProvider delayDuration={300}>
    <div className="relative min-h-screen bg-background text-foreground">
      <AlertDialog open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden max-w-xl w-[95vw] bg-background">
            <div className="p-8 flex flex-col">
                <div className="mb-6 flex items-center gap-2">
                    <div className="h-1 w-8 bg-primary rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Author's Disclaimer</span>
                </div>
                <p className="whitespace-pre-line leading-relaxed text-foreground/80 text-sm font-serif italic mb-6">{story.disclaimer}</p>
                <AlertDialogAction onClick={() => setIsDisclaimerOpen(false)} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xl">
                    <CheckCircle className="mr-2 h-5 w-5" /> Acknowledge & Start
                </AlertDialogAction>
            </div>
        </AlertDialogContent>
      </AlertDialog>

      <header className={cn('fixed top-0 left-0 z-40 bg-card/80 backdrop-blur-md border-b p-3 flex items-center justify-between w-full transition-all duration-300', controlsVisible ? 'translate-y-0' : '-translate-y-full')}>
        <div className="flex items-center">
            <Link href="/" passHref><Button variant="ghost" size="icon"><Home className="h-5 w-5" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={() => setTocVisible(!tocVisible)}><ListOrdered className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSearchable(!searchable)}><Search className="h-5 w-5" /></Button>
        </div>
        <div className="truncate text-center mx-2 flex-1 flex flex-col items-center">
            <h1 className="text-sm font-headline font-semibold text-primary truncate max-w-[200px]">{story.title}</h1>
            <div className="flex items-center gap-1 text-[8px] uppercase font-bold text-primary animate-pulse">
                <Users className="h-2 w-2" /> <span>{activeReaders} Live</span>
            </div>
        </div>
        <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon"><Palette className="h-5 w-5" /></Button></PopoverTrigger>
            <PopoverContent className="w-80 p-6 rounded-3xl">
                <Tabs defaultValue="theme" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="theme" className="rounded-lg">Vibe</TabsTrigger>
                        <TabsTrigger value="text" className="rounded-lg">Type</TabsTrigger>
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
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <Label htmlFor="zen-focus" className="text-xs font-bold">Zen Focus</Label>
                            </div>
                            <Switch id="zen-focus" checked={isZenFocus} onCheckedChange={setIsZenFocus} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-primary" />
                                <Label htmlFor="writer-post" className="text-xs font-bold">Writer's Perspective</Label>
                            </div>
                            <Switch id="writer-post" checked={isWriterPost} onCheckedChange={setIsWriterPost} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Languages className="h-4 w-4 text-primary" />
                                <Label htmlFor="freeze-mode" className="text-xs font-bold">Freeze Mode</Label>
                            </div>
                            <Switch id="freeze-mode" checked={freezeMode} onCheckedChange={setFreezeMode} />
                        </div>
                    </TabsContent>
                    <TabsContent value="text" className="pt-4 space-y-4">
                         <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Font Family</Label>
                                <RadioGroup value={fontFamily} onValueChange={(v: any) => setFontFamily(v)} className="flex gap-2">
                                    <div className="flex-1">
                                        <RadioGroupItem value="sans" id="font-sans" className="sr-only" />
                                        <Label htmlFor="font-sans" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-xs font-bold", fontFamily === 'sans' ? "bg-primary text-white border-primary" : "bg-muted/30 border-transparent")}>Sans</Label>
                                    </div>
                                    <div className="flex-1">
                                        <RadioGroupItem value="serif" id="font-serif" className="sr-only" />
                                        <Label htmlFor="font-serif" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer font-serif text-xs font-bold", fontFamily === 'serif' ? "bg-primary text-white border-primary" : "bg-muted/30 border-transparent")}>Serif</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                         </div>
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
      </header>

      <main className="pt-20 pb-24" onClick={() => setControlsVisible(!controlsVisible)}>
        {isAccessGranted ? (
            <article className={articleClasses}>
                <h2 className="font-headline text-3xl font-bold tracking-tight text-center mb-12">{currentChapter.title}</h2>
                <EditorContent editor={editor} />
            </article>
        ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <Lock className="h-12 w-12 text-yellow-500 mb-4" />
                <h2 className="text-2xl font-headline font-bold">Chapter Restricted</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">{accessReason === 'scheduled' ? `Scheduled for ${formatDate(currentChapter.scheduledAt)}.` : 'Access to this part is restricted.'}</p>
                <Button variant="outline" className="mt-8 rounded-full" onClick={() => router.push(`/stories/${storyId}`)}>Go Back</Button>
            </div>
        )}
      </main>

      <footer className={cn('fixed bottom-0 left-0 z-40 bg-background/80 backdrop-blur-xl border-t w-full transition-all duration-500', controlsVisible ? 'translate-y-0' : '-translate-y-full')}>
        <div className="absolute top-0 left-0 w-full h-1 bg-muted/30">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${readingProgress}%` }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => prevChapterId && router.push(`/stories/${storyId}/read/${prevChapterId}`)} disabled={!prevChapterId}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex flex-col items-center gap-1">
                <div className="bg-muted/40 rounded-full px-2 py-1 flex items-center gap-1 border border-border/40 shadow-sm">
                    <Button variant="ghost" size="sm" className="rounded-full h-9 gap-1.5" onClick={handleVoteClick} disabled={isVoting}>
                        <ThumbsUp className="h-4 w-4" /> <span className="text-[10px] font-black">{formatCompactNumber(currentChapter?.votes || 0)}</span>
                    </Button>
                    <Link href={`/stories/${storyId}/read/${chapterId}/comments`} passHref>
                        <Button variant="ghost" size="sm" className="rounded-full h-9 gap-1.5">
                            <MessageSquare className="h-4 w-4" /> <span className="text-[10px] font-black">{formatCompactNumber(currentChapter?.commentsCount || 0)}</span>
                        </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className={cn("rounded-full h-9 w-9", isInLibrary && "text-primary")} onClick={handleLibraryAction}>
                        {isInLibrary ? <BookmarkCheck className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </Button>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => nextChapterId && router.push(`/stories/${storyId}/read/${nextChapterId}`)} disabled={!nextChapterId}><ArrowRight className="h-5 w-5" /></Button>
        </div>
      </footer>
      <BottomNavigationBar />
    </div>
    </TooltipProvider>
  );
}
