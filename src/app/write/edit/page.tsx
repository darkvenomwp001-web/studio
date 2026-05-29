'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, ChangeEvent } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Loader2, 
  Undo, 
  Redo, 
  Bold, 
  Italic, 
  Underline, 
  Highlighter, 
  Type,
  List,
  Quote,
  X,
  Target,
  RotateCcw,
  Palette,
  ArrowLeft,
  CheckCircle,
  FileText,
  BookOpen,
  Send,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  History,
  BookMarked,
  History as HistoryIcon,
  Camera,
  Timer,
  BarChart3,
  Book,
  TriangleAlert,
  PlusCircle,
  Tag,
  MoreHorizontal,
  Strikethrough,
  Eraser,
  Minus,
  ImagePlus,
  Sparkles
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { useToast } from '@/hooks/use-toast';
import type { Story, Chapter } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const PRO_FONTS = [
  { name: 'Default', value: 'var(--font-inter)' },
  { name: 'Space Grotesk', value: 'var(--font-space-grotesk)' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: 'Open Sans, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Lora', value: 'Lora, serif' },
];

const VersionHistoryManager = {
  getKey: (storyId: string, chapterId: string) => `versionHistory-${storyId}-${chapterId}`,
  getVersions: (storyId: string, chapterId: string): Array<{ timestamp: number; content: string; chapterTitle: string }> => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(VersionHistoryManager.getKey(storyId, chapterId));
    return stored ? JSON.parse(stored) : [];
  },
  addVersion: (storyId: string, chapterId: string, content: string, chapterTitle: string) => {
    if (typeof window === 'undefined') return;
    const versions = VersionHistoryManager.getVersions(storyId, chapterId);
    versions.unshift({ timestamp: Date.now(), content, chapterTitle });
    sessionStorage.setItem(VersionHistoryManager.getKey(storyId, chapterId), JSON.stringify(versions.slice(0, 20)));
  },
};

type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type FontFamily = 'sans' | 'serif';
type LineHeight = 'tight' | 'normal' | 'loose';

function EditorContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser, addNotification, loading: authLoading } = useAuth();
  const { showIsland } = useDynamicIsland();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');
  const queryChapterId = searchParams.get('chapterId'); 

  const [storyDetails, setStoryDetails] = useState<Story | null>(null); 
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'No Changes' | 'Typing'>('No Changes');
  const [wordCount, setWordCount] = useState(0);
  
  const [isZenFocus, setIsZenFocus] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState<'normal' | 'wide'>('normal');
  const [isFrozen, setIsFrozen] = useState(false);

  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');

  const [chapterTags, setChapterTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const artworkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit, 
      TiptapUnderline, 
      TiptapHighlight.configure({ multicolor: true }), 
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontFamilyExt,
      CharacterCount
    ],
    content: '',
    editorProps: { 
      attributes: { 
        class: 'prose dark:prose-invert focus:outline-none min-h-[600px] w-full p-6 md:p-20 text-base leading-relaxed font-body transition-all duration-300 transform-gpu'
      } 
    },
    onUpdate: ({ editor }) => {
        setAutoSaveStatus('Typing');
    }
  });

  useEffect(() => {
    if (!editor || autoSaveStatus !== 'Typing') return;
    const timer = setTimeout(() => {
        const count = editor.storage.characterCount.words();
        setWordCount(count);
    }, 1000);
    return () => clearTimeout(timer);
  }, [editor?.state.doc.content, autoSaveStatus]);

  const isAuthorOrCollaborator = useMemo(() => {
    return !!(currentUser && storyDetails && (storyDetails.author?.id === currentUser.id || storyDetails.collaboratorIds?.includes(currentUser.id)));
  }, [currentUser, storyDetails]);

  useEffect(() => {
    if (editor) {
      const isNowEditable = isAuthorOrCollaborator && !isFrozen;
      editor.setEditable(!!isNowEditable);
    }
  }, [isAuthorOrCollaborator, isFrozen, editor]);

  useEffect(() => {
    if (editor && currentChapter && !editor.isDestroyed) {
      if (editor.getHTML() !== currentChapter.content) {
        editor.commands.setContent(currentChapter.content, false);
      }
    }
  }, [editor, currentChapter?.content]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push('/auth/signin');
      return;
    }

    if (!queryStoryId) {
        router.push('/write');
        return;
    }

    if (!queryChapterId) {
        router.push(`/write/edit-details?storyId=${queryStoryId}`);
        return;
    }

    setIsLoading(true);
    const storyDocRef = doc(db, 'stories', queryStoryId);
    
    const unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
        
        if (storyData.author.id !== currentUser.id && !storyData.collaboratorIds?.includes(currentUser.id)) {
          toast({ title: "Access Denied", description: "No editing permission.", variant: "destructive" });
          router.push(`/stories/${queryStoryId}`);
          return;
        }
        
        setStoryDetails(storyData);

        const chapterToEdit = storyData.chapters.find(c => c.id === queryChapterId);

        if (chapterToEdit) {
          setCurrentChapter(chapterToEdit);
          setChapterTitle(chapterToEdit.title);
          setChapterTags(chapterToEdit.tags || []);
          setIsLoading(false);
        } else {
          toast({ title: "Chapter Not Found", variant: "destructive" });
          router.push(`/write/edit-details?storyId=${queryStoryId}`);
          setIsLoading(false);
        }
      } else {
        toast({ title: "Manuscript Not Found", variant: "destructive" });
        router.push('/write'); 
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Studio data fetch error:", error);
      setIsLoading(false);
    });
    
    return () => {
      if (unsubscribeStory) unsubscribeStory();
    };
  }, [queryStoryId, queryChapterId, currentUser, router, toast, authLoading]);

  const handleSaveDraft = useCallback(async (showNotification: boolean = true) => {
    if (!storyDetails || !currentChapter || !currentUser || !editor) return;
    
    const content = editor.getHTML();
    const titleToSave = chapterTitle.trim();

    setAutoSaveStatus('Saving...');
    VersionHistoryManager.addVersion(storyDetails.id, currentChapter.id, content, titleToSave);

    const updatedChapter: Chapter = {
      ...currentChapter,
      title: titleToSave,
      content: content,
      tags: chapterTags,
      status: currentChapter.status === 'Published' ? 'Published' : 'Draft', 
      wordCount: editor.storage.characterCount.words(),
    };

    const updatedChapters = storyDetails.chapters.map(ch => ch.id === updatedChapter.id ? updatedChapter : ch);

    const storyUpdateData = {
      lastUpdated: serverTimestamp(),
      chapters: updatedChapters.sort((a, b) => a.order - b.order),
    };

    const storyDocRef = doc(db, 'stories', storyDetails.id);
    try {
        await updateDoc(storyDocRef, storyUpdateData);
        setAutoSaveStatus('Saved');
        if (showNotification) {
            showIsland({
              title: "Draft saved",
              description: `"${titleToSave}" is updated.`,
              type: 'success'
            });
        }
    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({
          path: storyDocRef.path,
          operation: 'update',
          requestResourceData: storyUpdateData,
        } as SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setAutoSaveStatus('Error');
    }
  }, [storyDetails, currentChapter, currentUser, chapterTitle, editor, toast, chapterTags, showIsland]);

  useEffect(() => {
    if (autoSaveStatus !== 'Typing' || !editor) return;

    const timer = setTimeout(() => {
        handleSaveDraft(false);
    }, 3000); 

    return () => clearTimeout(timer);
  }, [autoSaveStatus, handleSaveDraft, editor]);

  const handleAddTag = () => {
      const trimmed = tagInput.trim();
      if (trimmed && !chapterTags.includes(trimmed)) {
          setChapterTags(prev => [...prev, trimmed]);
          setTagInput('');
          setAutoSaveStatus('Typing');
      }
  };

  const handleRemoveTag = (tag: string) => {
      setChapterTags(prev => prev.filter(t => t !== tag));
      setAutoSaveStatus('Typing');
  };

  const handleChapterArtworkUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !storyDetails || !currentChapter) return;
    const file = e.target.files[0];
    
    setIsUploadingArtwork(true);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        toast({ title: "Configuration Error", variant: "destructive"});
        setIsUploadingArtwork(false);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.secure_url) {
            const updatedChapters = storyDetails.chapters.map(ch => {
              if (ch.id === currentChapter.id) {
                return { ...ch, artworkUrl: data.secure_url };
              }
              return ch;
            });
            
            const storyRef = doc(db, 'stories', storyDetails.id);
            await updateDoc(storyRef, { 
              chapters: updatedChapters, 
              lastUpdated: serverTimestamp() 
            });
            
            setCurrentChapter(prev => prev ? { ...prev, artworkUrl: data.secure_url } : null);
            showIsland({
              title: "Artwork updated",
              description: "Chapter art is ready.",
              type: 'success'
            });
        }
    } catch (error) {
        toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
        setIsUploadingArtwork(false);
    }
  };

  const handlePublishChapter = async () => {
    if (!storyDetails || !currentChapter || !currentUser || !editor) return;
    const content = editor.getHTML();
    setAutoSaveStatus('Saving...');

    const updatedChapterData: Chapter = {
        ...currentChapter,
        title: chapterTitle,
        content: content,
        tags: chapterTags,
        publishedDate: new Date().toISOString(),
        status: 'Published',
        wordCount: editor.storage.characterCount.words(),
    };

    const updatedChapters = storyDetails.chapters.map(ch => ch.id === updatedChapterData.id ? updatedChapterData : ch);

    const storyUpdateData = {
        status: storyDetails.status === 'Completed' ? 'Completed' : 'Ongoing', 
        lastUpdated: serverTimestamp(),
        chapters: updatedChapters.sort((a,b) => a.order - b.order),
    };

    const storyDocRef = doc(db, 'stories', storyDetails.id);
    updateDoc(storyDocRef, storyUpdateData)
      .then(async () => {
        // Trigger Follower Notifications
        try {
            const followersQuery = query(
                collection(db, 'users'), 
                where('followingIds', 'array-contains', storyDetails.author.id)
            );
            const followersSnapshot = await getDocs(followersQuery);
            
            // Notify up to 100 followers instantly
            const followersToNotify = followersSnapshot.docs.slice(0, 100);
            
            for (const followerDoc of followersToNotify) {
                if (followerDoc.id !== currentUser.id) {
                    addNotification({
                        userId: followerDoc.id,
                        type: 'new_chapter',
                        message: `published a new part "${chapterTitle}" for "${storyDetails.title}".`,
                        link: `/stories/${storyDetails.id}/read/${updatedChapterData.id}`,
                        actor: {
                            id: currentUser.id, 
                            username: currentUser.username, 
                            displayName: currentUser.displayName || currentUser.username, 
                            avatarUrl: currentUser.avatarUrl 
                        }
                    });
                }
            }
        } catch (notifErr) {
            console.warn("Follower notifications failed:", notifErr);
        }

        showIsland({
          title: "Story published",
          description: `"${chapterTitle}" is now live.`,
          type: 'success'
        });
        
        router.push(`/write/edit-details?storyId=${storyDetails.id}`);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: storyDocRef.path,
            operation: 'update',
            requestResourceData: storyUpdateData,
        } as SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setAutoSaveStatus('Error');
      });
    
    setCurrentChapter(updatedChapterData);
    setAutoSaveStatus('Saved');
  };

  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 225));

  const articleClasses = cn(
      "prose dark:prose-invert max-w-none py-8 px-4 sm:px-6 md:px-12 selection:bg-primary/20",
      isZenFocus && "zen-focus-enabled",
  );

  const isInLibrary = currentUser?.readingList?.some(item => item.id === storyDetails.id);

  const zenFocusStyles = `
    .zen-mode .ProseMirror p {
        opacity: 0.2;
        transition: opacity 0.5s ease, filter 0.5s ease;
        filter: blur(2px);
    }
    .zen-mode .ProseMirror p:hover,
    .zen-mode .ProseMirror p:focus,
    .zen-mode .ProseMirror p:active {
        opacity: 1;
        filter: blur(0);
    }
    .ProseMirror {
        padding-bottom: 2rem !important;
        outline: none !important;
    }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  if (isLoading || !storyDetails || !currentChapter || !editor) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
        <AlertDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <div className="flex flex-col min-h-screen bg-background text-foreground animate-in fade-in duration-700">
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 p-4 transform-gpu">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {storyDetails && (
                                <Link href={`/write/edit-details?storyId=${storyDetails.id}`} passHref>
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Button>
                                </Link>
                            )}
                            <div className="hidden sm:block">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">Editing Manuscript</p>
                                <h2 className="text-sm font-bold text-foreground truncate max-w-[200px]">{storyDetails?.title}</h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm transition-all",
                                autoSaveStatus === 'Saved' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                            )}>
                                {autoSaveStatus === 'Saving...' || autoSaveStatus === 'Typing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                {autoSaveStatus}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="rounded-full font-bold text-xs uppercase tracking-widest gap-2 hidden md:flex">
                                        <Eye className="h-4 w-4" /> Preview
                                    </Button>
                                </AlertDialogTrigger>
                                <Button onClick={() => handleSaveDraft(true)} variant="ghost" size="sm" className="rounded-full font-bold text-xs uppercase tracking-widest hidden md:flex">
                                    <Save className="h-4 w-4" /> Save
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest px-6 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                                            Publish
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="font-headline text-3xl font-bold">Ready to Publish?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-base text-muted-foreground leading-relaxed">
                                                This will make your new chapter <strong>"{chapterTitle}"</strong> available to your readers immediately.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-full px-8 font-bold">Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handlePublishChapter} className="bg-primary hover:bg-primary/90 rounded-full px-10 font-bold shadow-lg shadow-primary/30">Confirm & Release</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center py-6 md:py-10 px-0 sm:px-4 md:px-8">
                    <div className={cn(
                        "w-full transition-all duration-700",
                        layoutWidth === 'wide' ? 'max-w-6xl' : 'max-w-4xl'
                    )}>
                        <div className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-none sm:rounded-[40px] overflow-hidden bg-muted/50 border-b sm:border border-border/40 group mb-8 shadow-sm transform-gpu">
                            {currentChapter.artworkUrl ? (
                                <NextImage src={currentChapter.artworkUrl} alt="Chapter Artwork" fill className="object-cover transition-transform duration-1000 group-hover:scale-[1.03]" priority />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 animate-pulse">
                                    <ImagePlus className="h-12 w-12 mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Landscape Chapter Art</p>
                                </div>
                            )}
                            {isAuthorOrCollaborator && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                                    <Button 
                                        variant="outline" 
                                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/20 text-white rounded-full gap-2 font-bold uppercase text-[10px] tracking-widest h-11 px-6 shadow-2xl" 
                                        onClick={() => artworkInputRef.current?.click()}
                                    >
                                        <Camera className="h-4 w-4" />
                                        Set Chapter Art
                                    </Button>
                                </div>
                            )}
                            {isUploadingArtwork && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <input type="file" ref={artworkInputRef} className="hidden" accept="image/*" onChange={handleChapterArtworkUpload} />

                        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12 px-4">
                            <Input
                                type="text"
                                value={chapterTitle}
                                onChange={(e) => setChapterTitle(e.target.value)}
                                placeholder="Part Title..."
                                className="text-4xl md:text-7xl font-headline font-bold h-auto py-6 focus-visible:ring-0 border-0 bg-transparent shadow-none px-0 placeholder:text-muted-foreground/10 text-center tracking-tight leading-tight"
                            />
                            
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className="flex flex-wrap justify-center gap-2 px-4">
                                    {chapterTags.map(tag => (
                                        <Badge key={tag} className="bg-orange-500/10 text-orange-600 border-orange-500/20 gap-1 rounded-full px-3 h-8 font-bold text-[10px] uppercase shadow-sm">
                                            <TriangleAlert className="h-3 w-3" />
                                            {tag}
                                            <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
                                        </Badge>
                                    ))}
                                </div>
                                
                                <div className="flex items-center gap-2 max-w-xs w-full bg-muted/30 p-1 rounded-full border border-border/40 focus-within:border-primary/40 transition-all">
                                    <div className="pl-3"><Tag className="h-3.5 w-3.5 text-muted-foreground" /></div>
                                    <Input 
                                        placeholder="Add chapter warning..." 
                                        value={tagInput} 
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                        className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0 text-[11px] font-medium"
                                    />
                                    <Button size="icon" onClick={handleAddTag} className="rounded-full h-8 w-8 shrink-0 mr-1 shadow-sm">
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-4 md:gap-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 border-y border-border/10 py-4 mt-4">
                                <div className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {wordCount} Words</div>
                                <div className="flex items-center gap-1.5"><Timer className="h-3 w-3" /> {readingTimeMinutes} MIN Read</div>
                                <div className="flex items-center gap-1.5"><History className="h-3 w-3" /> Cloud Sync</div>
                            </div>
                        </div>

                        <div className={cn(
                            "relative bg-card rounded-none sm:rounded-[40px] border-y sm:border border-border/40 shadow-2xl min-h-[700px] flex flex-col transition-all duration-500 transform-gpu",
                            isZenFocus && "zen-mode shadow-none border-transparent bg-transparent"
                        )}>
                            <EditorContent editor={editor} className="flex-1 flex flex-col" />
                            <div className="absolute top-8 right-8 hidden lg:flex flex-col gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsZenFocus(!isZenFocus)}
                                    className={cn("rounded-full h-11 w-11 transition-all", isZenFocus ? "bg-primary text-white shadow-xl scale-110" : "bg-background/80 backdrop-blur-sm border shadow-sm")}
                                >
                                    <Target className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>

                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[98vw] sm:max-w-fit px-2 animate-in slide-in-from-bottom-8 duration-700 transform-gpu">
                    <div className="bg-card/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] rounded-3xl p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
                        
                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-muted/40 rounded-2xl mr-1 border border-border/40">
                            <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold font-mono leading-none">{wordCount} W</span>
                                        <span className="text-[10px] font-bold font-mono leading-none mt-1">{readingTimeMinutes} M</span>
                                    </div>
                                    <BarChart3 className="h-4 w-4 text-primary/40" />
                            </div>
                        </div>

                        <div className="flex items-center gap-1 pr-1">
                            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="h-10 w-10 rounded-2xl hover:bg-primary/10 transition-all"><Undo className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="h-10 w-10 rounded-2xl hover:bg-primary/10 transition-all"><Redo className="h-4 w-4" /></Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-1" />

                        <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-10 w-10 rounded-2xl transition-all", editor.isActive('bold') ? "bg-primary text-white shadow-lg" : "hover:bg-primary/10")}><Bold className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-10 w-10 rounded-2xl transition-all", editor.isActive('italic') ? "bg-primary text-white shadow-lg" : "hover:bg-primary/10")}><Italic className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("h-10 w-10 rounded-2xl transition-all", editor.isActive('underline') ? "bg-primary text-white shadow-lg" : "hover:bg-primary/10")}><Underline className="h-4 w-4" /></Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-1" />

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-10 px-3 rounded-2xl gap-2 hover:bg-primary/10 hover:text-primary transition-all font-bold text-xs uppercase tracking-widest">
                                    <Type className="h-4 w-4" />
                                    <span className="hidden md:inline">Typeface</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-2 rounded-2xl bg-card/95 backdrop-blur-xl border-white/10 shadow-3xl" side="top" align="center">
                                <ScrollArea className="h-72">
                                    <div className="space-y-1">
                                        {PRO_FONTS.map((font) => (
                                            <button
                                                key={font.name}
                                                onClick={() => editor.chain().focus().setFontFamily(font.value).run()}
                                                className={cn(
                                                    "w-full text-left px-4 py-3 rounded-xl text-sm transition-all hover:bg-primary/10 flex items-center justify-between",
                                                    editor.isActive('textStyle', { fontFamily: font.value }) ? "bg-primary text-primary-foreground font-bold shadow-lg" : "text-muted-foreground"
                                                )}
                                                style={{ fontFamily: font.value }}
                                            >
                                                {font.name}
                                                {editor.isActive('textStyle', { fontFamily: font.value }) && <CheckCircle className="h-3 w-3" />}
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>

                        <div className="flex items-center gap-1 pl-1 border-l border-border/40 ml-1">
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-2xl transition-all", editor.isActive('highlight') && "bg-primary text-white shadow-lg")}><Highlighter className="h-4 w-4" /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-fit p-1.5 flex gap-1 bg-card/95 backdrop-blur-xl border-white/10 rounded-full shadow-2xl" side="top">
                                    <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#fde047' }).run()} className="h-8 w-8 rounded-full bg-yellow-300 border border-black/10 hover:scale-110 transition-transform" />
                                    <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#6ee7b7' }).run()} className="h-8 w-8 rounded-full bg-emerald-300 border border-black/10 hover:scale-110 transition-transform" />
                                    <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#f87171' }).run()} className="h-8 w-8 rounded-full bg-rose-400 border border-black/10 hover:scale-110 transition-transform" />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => editor.chain().focus().unsetHighlight().run()}><X className="h-4 w-4"/></Button>
                                </PopoverContent>
                            </Popover>
                            
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                        </div>
                    </div>
                </div>

                <AlertDialogContent className="max-w-6xl rounded-[40px] p-0 overflow-hidden border-none shadow-[0_50px_120px_rgba(0,0,0,0.5)] bg-background transform-gpu">
                    <AlertDialogHeader className="bg-muted/30 p-8 border-b flex flex-row justify-between items-center space-y-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <AlertDialogTitle className="text-3xl font-headline text-3xl font-bold text-foreground leading-none mb-1">{chapterTitle || 'Untitled Part'}</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Immersive Reader Experience & bull; High Fidelity</AlertDialogDescription>
                            </div>
                        </div>
                        <AlertDialogCancel className="rounded-full h-12 w-12 p-0 border-none bg-muted/40 hover:bg-destructive hover:text-white transition-all"><X className="h-5 w-5"/></AlertDialogCancel>
                    </AlertDialogHeader>
                    <div className="bg-card p-6 md:p-12 overflow-y-auto max-h-[75vh] scrollbar-hide">
                        <article className={articleClasses} dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
                    </div>
                    <AlertDialogFooter className="p-6 bg-muted/20 border-t flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">End of manuscript preview</p>
                        <AlertDialogCancel className="rounded-full px-12 h-12 font-bold uppercase text-xs tracking-widest shadow-lg bg-background border-border/40">Return to Studio</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>

            </div>
            <style dangerouslySetInnerHTML={{ __html: zenFocusStyles }} />
        </AlertDialog>
    </TooltipProvider>
  );
}

export default function WriteEditorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <EditorContentInner />
    </Suspense>
  );
}
