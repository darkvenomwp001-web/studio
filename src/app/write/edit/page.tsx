'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  History, 
  EyeOff, 
  BookOpen, 
  CheckCircle, 
  AlertCircle,
  Maximize, 
  Minimize, 
  Send, 
  FileText, 
  Settings, 
  Loader2, 
  Eye, 
  Undo, 
  Redo, 
  Bold, 
  Italic, 
  Underline, 
  Highlighter, 
  Snowflake,
  Type,
  List,
  ListOrdered,
  Quote,
  X,
  Target,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Palette
} from 'lucide-react';
import StoryCompendium from '@/components/writing/StoryCompendium';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useSearchParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Story, Chapter } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from '@/components/ui/scroll-area';
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  tooltip: string;
}

const ToolbarButton = React.memo(({ onClick, isActive, disabled, children, tooltip }: ToolbarButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onClick) onClick();
        }}
        disabled={disabled}
        className={cn(
          "h-8 w-8 p-0 transition-all",
          isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
      {tooltip}
    </TooltipContent>
  </Tooltip>
));

ToolbarButton.displayName = 'ToolbarButton';

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

export default function WriteEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, addNotification, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');
  const queryChapterId = searchParams.get('chapterId'); 

  const [storyDetails, setStoryDetails] = useState<Story | null>(null); 
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TiptapHighlight.configure({ multicolor: true }),
      CharacterCount,
    ],
    content: '',
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert focus:outline-none min-h-[70vh] p-8 md:p-12 text-base leading-relaxed selection:bg-primary/20',
        },
    },
    onUpdate: () => {
        setAutoSaveStatus('Typing');
    },
  });

  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isCompendiumOpen, setIsCompendiumOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Error' | 'No Changes' | 'Typing'>('No Changes');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  
  const [isZenFocus, setIsZenFocus] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);

  const isAuthorOrCollaborator = currentUser && storyDetails && (storyDetails.author.id === currentUser.id || storyDetails.collaboratorIds?.includes(currentUser.id));

  useEffect(() => {
    if (editor) {
      const isNowEditable = isAuthorOrCollaborator && !isFrozen;
      if (editor.isEditable !== isNowEditable) {
        editor.setEditable(isNowEditable || false);
      }
    }
  }, [isAuthorOrCollaborator, isFrozen, editor]);

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

  useEffect(() => {
    if (authLoading) {
        setIsLoading(true);
        return;
    }
    if (!user) {
      router.push('/auth/signin');
      setIsLoading(false);
      return;
    }

    let unsubscribeStory: (() => void) | undefined;

    if (queryStoryId) {
      setIsLoading(true);
      const storyDocRef = doc(db, 'stories', queryStoryId);
      unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
          
          if (storyData.author.id !== user.id && !storyData.collaborators?.some(c => c.id === user.id)) {
            toast({ title: "Access Denied", description: "You don't have permission to edit this story's chapters.", variant: "destructive" });
            router.push(`/stories/${queryStoryId}`);
            return;
          }
          
          setStoryDetails(storyData);

          let chapterToEdit: Chapter | undefined;
          if (queryChapterId) {
            chapterToEdit = storyData.chapters.find(c => c.id === queryChapterId);
          }

          if (chapterToEdit) {
            setCurrentChapter(chapterToEdit);
            setChapterTitle(chapterToEdit.title);
            if(editor && !editor.isDestroyed && editor.getHTML() !== chapterToEdit.content) {
                editor.commands.setContent(chapterToEdit.content, false);
            }
          } else { 
            const newChapterOrder = storyData.chapters.length > 0 ? Math.max(...storyData.chapters.map(c => c.order)) + 1 : 1;
            const newChapterInstance: Chapter = {
              id: `chapter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: `Chapter ${newChapterOrder}`,
              content: '<p>Start writing your amazing chapter here...</p>',
              order: newChapterOrder,
              status: 'Draft',
              accessType: 'public'
            };
            setCurrentChapter(newChapterInstance);
            setChapterTitle(newChapterInstance.title);
             if(editor && !editor.isDestroyed) {
                editor.commands.setContent(newChapterInstance.content, false);
            }
          }
          setIsLoading(false);
        } else {
          toast({ title: "Error", description: "Story not found.", variant: "destructive" });
          router.push('/write'); 
          setIsLoading(false);
        }
      }, (error) => {
        setIsLoading(false);
      });
    } else {
      router.push('/write/edit-details');
      setIsLoading(false);
    }
    
    return () => {
      if (unsubscribeStory) unsubscribeStory();
    };
  }, [queryStoryId, queryChapterId, user, router, toast, authLoading, editor]);

  useEffect(() => {
    if(!editor || !editor.storage.characterCount) return;
    setWordCount(editor.storage.characterCount.words());
  }, [editor?.state, editor?.storage.characterCount]);

  const handleSaveDraft = useCallback((showToast: boolean = true) => {
    if (!storyDetails || !currentChapter || !user || !editor) return;
    const content = editor.getHTML();
    setAutoSaveStatus('Saving...');
    VersionHistoryManager.addVersion(storyDetails.id, currentChapter.id, content, chapterTitle);

    const updatedChapter: Chapter = {
      ...currentChapter,
      title: chapterTitle,
      content: content,
      status: currentChapter.status === 'Published' ? 'Published' : 'Draft', 
      wordCount: editor.storage.characterCount.words(),
    };

    const chapterIndex = storyDetails.chapters.findIndex(ch => ch.id === updatedChapter.id);
    const updatedChapters = [...storyDetails.chapters];
    if (chapterIndex > -1) {
      updatedChapters[chapterIndex] = updatedChapter;
    } else {
      updatedChapters.push(updatedChapter);
    }

    const storyUpdateData = {
      lastUpdated: serverTimestamp(),
      chapters: updatedChapters.sort((a, b) => a.order - b.order),
    };

    const storyDocRef = doc(db, 'stories', storyDetails.id);
    updateDoc(storyDocRef, storyUpdateData)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: storyDocRef.path,
          operation: 'update',
          requestResourceData: storyUpdateData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setAutoSaveStatus('Error');
      });
    
    setCurrentChapter(updatedChapter);
    setAutoSaveStatus('Saved');
    if (showToast) toast({ title: "Draft Saved!" });

  }, [storyDetails, currentChapter, user, chapterTitle, editor, toast]);

  useEffect(() => {
    if (!storyDetails || !currentChapter || isLoading || authLoading || !editor) return;

    const originalChapterInStory = storyDetails.chapters.find(c => c.id === currentChapter.id);
    const contentChanged = editor.getHTML() !== (originalChapterInStory?.content ?? currentChapter.content);
    const titleChanged = chapterTitle !== (originalChapterInStory?.title ?? currentChapter.title);

    if (editor.getHTML().length > 0 && (contentChanged || titleChanged)) {
      if(autoSaveStatus !== 'Typing' && autoSaveStatus !== 'Saving...') setAutoSaveStatus('Typing');
      const timer = setTimeout(() => {
        handleSaveDraft(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      if (autoSaveStatus !== 'No Changes' && autoSaveStatus !== 'Saved') setAutoSaveStatus('Saved');
    }
  }, [editor?.state, chapterTitle, storyDetails, currentChapter, isLoading, handleSaveDraft, authLoading, autoSaveStatus, editor]);

  const handlePublishChapter = async () => {
    if (!storyDetails || !currentChapter || !user || !editor) return;
    const content = editor.getHTML();
    setAutoSaveStatus('Saving...');

    const updatedChapterData: Chapter = {
        ...currentChapter,
        title: chapterTitle,
        content: content,
        publishedDate: new Date().toISOString(),
        status: 'Published',
        wordCount: editor.storage.characterCount.words(),
    };

    let chapterExists = false;
    const updatedChapters = storyDetails.chapters.map(ch => {
        if (ch.id === updatedChapterData.id) {
            chapterExists = true;
            return updatedChapterData;
        }
        return ch;
    });
     if (!chapterExists) {
        updatedChapters.push(updatedChapterData);
    }

    const storyUpdateData = {
        status: storyDetails.status === 'Completed' ? 'Completed' : 'Ongoing', 
        lastUpdated: serverTimestamp(),
        chapters: updatedChapters.sort((a,b) => a.order - b.order),
    };

    const storyDocRef = doc(db, 'stories', storyDetails.id);
    updateDoc(storyDocRef, storyUpdateData)
      .then(() => {
        if (user.id === storyDetails.author.id) {
            addNotification({
                type: 'new_chapter',
                userId: user.id,
                message: `${user.displayName || user.username} published a new chapter "${chapterTitle}" for "${storyDetails.title}".`,
                link: `/stories/${storyDetails.id}/read/${updatedChapterData.id}`,
                actor: {id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl }
            });
        }
        router.push(`/write/edit-details?storyId=${storyDetails.id}`);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: storyDocRef.path,
            operation: 'update',
            requestResourceData: storyUpdateData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setAutoSaveStatus('Error');
      });
    
    setCurrentChapter(updatedChapterData);
    setAutoSaveStatus('Saved');
    toast({ title: "Chapter Published!" });
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  useEffect(() => {
    const fullscreenChangeHandler = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    return () => document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
  }, []);

  if (isLoading || authLoading || !editor) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  if (isDistractionFree) {
    return (
      <div className="fixed inset-0 bg-background z-[100] p-4 sm:p-8 flex flex-col items-center">
        <EditorContent editor={editor} className="w-full max-w-3xl h-full"/>
        <Button variant="ghost" size="sm" onClick={() => setIsDistractionFree(false)} className="mt-4 self-start">
          <EyeOff className="mr-2 h-4 w-4" /> Exit Distraction-Free
        </Button>
         <div className="fixed bottom-4 right-4 text-xs font-bold text-muted-foreground bg-card p-2 rounded-md shadow uppercase tracking-widest">
            {wordCount} words
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <AlertDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
      <div className={cn(
          "flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-10rem)] overflow-x-hidden",
          isFullScreen && 'fixed inset-0 bg-background z-[99] p-4'
      )}>
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <header className="mb-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card/50 backdrop-blur-sm p-3 rounded-xl border border-border/40 shadow-sm gap-4">
                <div className="flex items-center gap-3 overflow-hidden w-full sm:w-auto">
                    <Link href={`/write/edit-details?storyId=${storyDetails.id}`} className="flex-shrink-0">
                        <div className="relative w-8 h-12 rounded overflow-hidden border shadow-sm hover:opacity-80 transition-opacity">
                            <NextImage src={storyDetails.coverImageUrl || `https://picsum.photos/seed/${storyDetails.id}/80/120`} alt="" fill className="object-cover" />
                        </div>
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-foreground truncate">{storyDetails.title}</h1>
                        <div className={cn("flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest", autoSaveStatus === 'Saved' ? 'text-green-600' : 'text-yellow-600')}>
                            {autoSaveStatus === 'Saved' ? <CheckCircle className="h-2.5 w-2.5" /> : <div className="h-2.5 w-2.5 rounded-full bg-current animate-pulse" />}
                            {autoSaveStatus}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Workspace Appearance">
                                <Palette className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-card/95 backdrop-blur-xl">
                            <div className="p-6 space-y-6">
                                <header className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="font-headline font-bold text-foreground tracking-tight">Appearance</h4>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Customize workspace</p>
                                    </div>
                                    <Badge variant="outline" className={cn("gap-1.5 px-2 py-1", isFrozen ? "text-blue-500" : "text-orange-500")}>
                                        <Snowflake className={cn("h-3 w-3", isFrozen && "animate-pulse")} />
                                        {isFrozen ? "Frozen" : "Live Edit"}
                                    </Badge>
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
                                        <div className="p-4 rounded-2xl bg-muted/30 border border-dashed flex items-center justify-between group">
                                            <Label htmlFor="freeze-mode" className="flex items-center gap-3 cursor-pointer">
                                                <Snowflake className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-bold">Freeze Mode</span>
                                            </Label>
                                            <Switch id="freeze-mode" checked={isFrozen} onCheckedChange={setIsFrozen} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <footer className="p-4 bg-muted/30 border-t flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <Target className="h-3 w-3" />
                                    <span>Adaptive Space</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[10px] font-bold uppercase tracking-widest gap-1.5" onClick={() => { setAutoScrollSpeed(0); setIsZenFocus(false); setIsFrozen(false); }}>
                                    <RotateCcw className="h-3 w-3" /> 
                                    Reset
                                </Button>
                            </footer>
                        </PopoverContent>
                    </Popover>
                    <Link href={`/write/edit-details?storyId=${storyDetails.id}`} passHref>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Story Settings">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="space-y-4">
                <Input
                    type="text"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Chapter Title"
                    className="text-3xl font-headline font-bold h-auto py-2 focus-visible:ring-0 border-0 bg-transparent shadow-none px-0 placeholder:text-muted-foreground/30"
                />
                
                <div className="p-1 px-2 bg-background border rounded-xl flex items-center justify-between shadow-sm sticky top-0 z-20 overflow-x-auto no-scrollbar">
                    <div className="flex items-center">
                        <div className="flex items-center mr-2 border-r border-border/60 pr-2 gap-0.5">
                            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip="Undo"><Undo className="h-4 w-4" /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip="Redo"><Redo className="h-4 w-4" /></ToolbarButton>
                        </div>

                        <div className="flex items-center mr-2 border-r border-border/60 pr-2 gap-0.5">
                            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} tooltip="Header"><Type className="h-4 w-4" /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} tooltip="Bullet List"><List className="h-4 w-4" /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} tooltip="Blockquote"><Quote className="h-4 w-4" /></ToolbarButton>
                        </div>

                        <div className="flex items-center gap-0.5">
                            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tooltip="Bold"><Bold className="h-4 w-4" /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tooltip="Italic"><Italic className="h-4 w-4" /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tooltip="Underline"><Underline className="h-4 w-4" /></ToolbarButton>
                            
                            <Popover>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0 rounded-md", editor.isActive('highlight') && "bg-primary/10 text-primary")}><Highlighter className="h-4 w-4" /></Button>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] font-bold uppercase">Highlight</TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-fit p-1 flex gap-1 bg-background border shadow-xl rounded-full">
                                    <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#fde047' }).run()} className="h-6 w-6 rounded-full bg-yellow-300 border border-black/10 hover:scale-110 transition-transform" />
                                    <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#6ee7b7' }).run()} className="h-6 w-6 rounded-full bg-emerald-300 border border-black/10 hover:scale-110 transition-transform" />
                                    <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#f87171' }).run()} className="h-6 w-6 rounded-full bg-rose-400 border border-black/10 hover:scale-110 transition-transform" />
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => editor.chain().focus().unsetHighlight().run()}><X className="h-3 w-3"/></Button>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Link href={`/write/history/${storyDetails.id}/${currentChapter.id}`} passHref>
                            <ToolbarButton onClick={() => {}} tooltip="History"><History className="h-4 w-4" /></ToolbarButton>
                        </Link>
                        <AlertDialogTrigger asChild>
                            <ToolbarButton onClick={() => {}} tooltip="Preview"><Eye className="h-4 w-4" /></ToolbarButton>
                        </AlertDialogTrigger>
                    </div>
                </div>
            </div>
          </header>

          <main className={cn(
              "relative flex-grow flex flex-col group rounded-2xl border bg-card shadow-inner overflow-hidden",
              isZenFocus && "zen-focus-enabled"
          )}>
            <EditorContent editor={editor} className="flex-grow flex flex-col h-full" />
          </main>

          <footer className="mt-6 flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/40">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <div className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {wordCount} Words</div>
                <div className="flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> {Math.max(1, Math.round(wordCount / 200))} Min Read</div>
            </div>
            <div className="flex items-center gap-3">
                 <Button onClick={() => handleSaveDraft(true)} variant="ghost" size="sm" className="font-bold text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    <Save className="mr-2 h-3.5 w-3.5" /> Save Draft
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest px-6 h-9 shadow-lg shadow-primary/20">
                            <Send className="mr-2 h-3.5 w-3.5" /> Publish Part
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-headline text-2xl">Ready to Publish?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This will make "{chapterTitle}" visible to all your readers. You can always edit or unpublish it later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Not Yet</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePublishChapter} className="bg-primary hover:bg-primary/90 rounded-full px-8">Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </footer>
        </div>

        <aside className="hidden lg:block w-full lg:w-80 xl:w-96 space-y-6">
          <div className="p-5 bg-card rounded-2xl border border-border/40 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Workspace Settings</h2>
              <div className="space-y-4">
                  <div className="flex items-center justify-between group">
                      <Label htmlFor="distraction-free-mode" className="flex items-center gap-3 cursor-pointer group-hover:text-primary transition-colors">
                          <EyeOff className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          <span className="text-sm font-medium">Distraction-Free</span>
                      </Label>
                      <Switch id="distraction-free-mode" checked={isDistractionFree} onCheckedChange={setIsDistractionFree} />
                  </div>
                  <div className="flex items-center justify-between group">
                      <Label htmlFor="fullscreen-mode" className="flex items-center gap-3 cursor-pointer group-hover:text-primary transition-colors">
                          {isFullScreen ? <Minimize className="h-4 w-4 text-muted-foreground group-hover:text-primary" /> : <Maximize className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                          <span className="text-sm font-medium">Full Screen</span>
                      </Label>
                      <Switch id="fullscreen-mode" checked={isFullScreen} onCheckedChange={handleToggleFullScreen} />
                  </div>
                  <Separator className="bg-border/40" />
                  <Button
                      variant={isCompendiumOpen ? "secondary" : "outline"}
                      className={cn("w-full h-11 rounded-xl transition-all", isCompendiumOpen && "shadow-inner bg-primary/5 border-primary/20 text-primary")}
                      onClick={() => setIsCompendiumOpen(!isCompendiumOpen)}
                  >
                      <BookOpen className="mr-2 h-4 w-4" /> 
                      {isCompendiumOpen ? 'Close Compendium' : 'Open Compendium'}
                  </Button>
              </div>
          </div>

          {isCompendiumOpen && <StoryCompendium storyId={storyDetails.id} initialNotes={storyDetails.notes} />}
        </aside>

        <AlertDialogContent className="max-w-4xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-muted/30 p-6 border-b flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-headline font-bold text-foreground">{chapterTitle || 'Untitled Chapter'}</h2>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preview Mode</p>
                </div>
                <AlertDialogAction asChild onClick={() => setIsPreviewOpen(false)}>
                    <Button variant="ghost" size="icon" className="rounded-full"><X className="h-5 w-5" /></Button>
                </AlertDialogAction>
            </div>
            <ScrollArea className="max-h-[70vh] bg-background">
                <div className="prose dark:prose-invert prose-reading p-8 mx-auto" dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
            </ScrollArea>
            <div className="p-4 bg-muted/20 border-t flex justify-end">
                <AlertDialogCancel className="rounded-full px-8 bg-background">Exit Preview</AlertDialogCancel>
            </div>
        </AlertDialogContent>
      </div>
    </AlertDialog>
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
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    `}</style>
    </TooltipProvider>
  );
}