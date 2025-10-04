

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Save, History, EyeOff, Brain, CheckCircle, AlertTriangle, Maximize, Minimize, Send, FileText, Settings, Loader2, Eye, Undo, Redo, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Highlighter } from 'lucide-react';
import AiAssistantPanel from '@/components/writing/AiAssistantPanel';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { BubbleMenu, Editor, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'

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
            class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[400px] flex-grow p-4 text-base rounded-md shadow-sm resize-none bg-card',
        },
    },
    onUpdate: ({ editor }) => {
        setAutoSaveStatus('Typing');
    },
  });

  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Error' | 'No Changes'>('No Changes');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);


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
            if(editor && !editor.isDestroyed) {
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
          toast({ title: "Error", description: "Story not found. Please select a story from your dashboard.", variant: "destructive" });
          router.push('/write'); 
          setIsLoading(false);
        }
      }, (error) => {
        console.error("Error fetching story for chapter edit:", error);
        toast({ title: "Error", description: "Could not load story details for chapter editing.", variant: "destructive" });
        router.push('/write');
        setIsLoading(false);
      });
    } else {
      toast({ title: "Select Story", description: "Please create or select a story first to edit its chapters.", variant: "destructive" });
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

  const handleSaveDraft = useCallback(async (showToast: boolean = true) => {
    if (!storyDetails || !currentChapter || !user || !editor) {
      if (showToast) toast({ title: "Error", description: "Cannot save draft. Story or chapter context missing.", variant: "destructive" });
      return;
    }
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

    try {
      const storyDocRef = doc(db, 'stories', storyDetails.id);
      await updateDoc(storyDocRef, storyUpdateData);
      
      setCurrentChapter(updatedChapter);

      setAutoSaveStatus('Saved');
      if (showToast) toast({ title: "Draft Saved!", description: "Your chapter changes have been saved." });
    } catch (error) {
      console.error("Error saving draft:", error);
      setAutoSaveStatus('Error');
      if (showToast) toast({ title: "Save Failed", description: "Could not save draft.", variant: "destructive" });
    }
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
    if (!storyDetails || !currentChapter || !user || !editor) {
        toast({title: "Error", description: "Cannot publish. Story or chapter context missing.", variant: "destructive"});
        return;
    }
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

    try {
        const storyDocRef = doc(db, 'stories', storyDetails.id);
        await updateDoc(storyDocRef, storyUpdateData);
        
        setCurrentChapter(updatedChapterData);
        
        setAutoSaveStatus('Saved');
        toast({ title: "Chapter Published!", description: `Chapter "${chapterTitle}" is now live.` });
        
        if (user.id === storyDetails.author.id) {
            addNotification({
            type: 'new_chapter',
            userId: user.id, // In a real app, this would iterate over followers
            message: `${user.displayName || user.username} published a new chapter "${chapterTitle}" for "${storyDetails.title}".`,
            link: `/stories/${storyDetails.id}/read/${updatedChapterData.id}`,
            actor: {id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl }
            });
        }
        router.push(`/write/edit-details?storyId=${storyDetails.id}`);
    } catch (error) {
        console.error("Error publishing chapter:", error);
        setAutoSaveStatus('Error');
        toast({ title: "Publish Failed", description: "Could not publish chapter.", variant: "destructive"});
    }
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
    const fullscreenChangeHandler = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    return () => document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
  }, []);

  const internalChapterId = useMemo(() => {
      return currentChapter?.id || `temp-chapter-id-${Date.now()}`; 
  }, [currentChapter]);

  const versionHistoryLink = useMemo(() => {
    if (!storyDetails?.id || !internalChapterId || internalChapterId.startsWith('temp-chapter-id')) return '';
    return `/write/history/${storyDetails.id}/${internalChapterId}`;
  }, [storyDetails, internalChapterId]);

  if (isLoading || authLoading || (!storyDetails && queryStoryId) || (!currentChapter && queryStoryId) || !editor) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading chapter editor...</p>
        </div>
      );
  }
  
  if (!user && !authLoading) {
     router.push('/auth/signin');
     return null;
  }

  if (!storyDetails || !currentChapter) {
    return <div className="text-center py-10">Error loading story or chapter. Please try again.</div>;
  }

  if (isDistractionFree) {
    return (
      <div className="fixed inset-0 bg-background z-[100] p-4 sm:p-8 flex flex-col items-center">
        <EditorContent editor={editor} className="w-full max-w-3xl h-full"/>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDistractionFree(false)}
          className="mt-4 self-start"
        >
          <EyeOff className="mr-2 h-4 w-4" /> Exit Distraction-Free
        </Button>
         <div className="fixed bottom-4 right-4 text-sm text-muted-foreground bg-card p-2 rounded-md shadow">
            {wordCount} words
        </div>
      </div>
    );
  }

  return (
    <AlertDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
      <div className={`flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-10rem)] ${isFullScreen ? 'fixed inset-0 bg-background z-[99] p-4' : ''}`}>
        <div className="flex-1 flex flex-col">
          <header className="mb-4 p-4 bg-card rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-headline text-muted-foreground truncate">
                    Editing: <span className="text-primary font-semibold">{storyDetails.title}</span>
                </h1>
                <div className="flex items-center gap-2">
                    <div className={cn("flex items-center gap-1 text-xs", autoSaveStatus === 'Saved' ? 'text-green-600' : autoSaveStatus === 'Saving...' || autoSaveStatus === 'Typing' ? 'text-yellow-600' :  autoSaveStatus === 'Error' ? 'text-red-600' : 'text-muted-foreground')}>
                        {autoSaveStatus === 'Saved' && <CheckCircle className="h-3 w-3" />}
                        {(autoSaveStatus === 'Saving...' || autoSaveStatus === 'Typing') && <Loader2 className="h-3 w-3 animate-spin" />}
                        {autoSaveStatus === 'Error' && <AlertTriangle className="h-3 w-3" />}
                        {autoSaveStatus !== 'Saving...' && autoSaveStatus !== 'Saved' && autoSaveStatus !== 'Error' && autoSaveStatus !== 'Typing' && <FileText className="h-3 w-3" />}
                        {autoSaveStatus}
                    </div>
                    <Link href={`/write/edit-details?storyId=${storyDetails.id}`} passHref>
                        <Button variant="ghost" size="icon" title="Manage Story Details">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </div>
            <Input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Chapter Title"
              className="text-2xl font-semibold h-12 focus-visible:ring-primary border-0 shadow-none px-2"
            />
             <div className="p-2 mt-2 bg-muted/50 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></Button>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" title="Format Text"><Bold className="h-4 w-4" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit p-1">
                           <div className="flex items-center gap-1">
                             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></Button>
                           </div>
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                             <Button variant="ghost" size="icon" title="Highlight Text"><Highlighter className="h-4 w-4" /></Button>
                        </PopoverTrigger>
                         <PopoverContent className="w-fit p-1">
                           <div className="flex items-center gap-1">
                             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fde047' }).run()}><Highlighter className="h-4 w-4 text-yellow-400" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHighlight({ color: '#6ee7b7' }).run()}><Highlighter className="h-4 w-4 text-emerald-400" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHighlight({ color: '#f87171' }).run()}><Highlighter className="h-4 w-4 text-red-500" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().unsetHighlight().run()}>x</Button>
                           </div>
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="flex items-center gap-1">
                    {versionHistoryLink ? (
                      <Link href={versionHistoryLink} passHref>
                        <Button variant="ghost" size="icon" title="Version History"><History className="h-4 w-4" /></Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="icon" title="Version History" disabled><History className="h-4 w-4" /></Button>
                    )}
                     <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" title="Preview Chapter"><Eye className="h-4 w-4" /></Button>
                     </AlertDialogTrigger>
                </div>
            </div>
          </header>

          <EditorContent editor={editor} />

          <footer className="mt-4 p-2 bg-card rounded-lg shadow-sm flex justify-between items-center text-sm">
            <div>{wordCount} words</div>
            <div className="flex items-center gap-2">
                 <Button onClick={() => handleSaveDraft(true)} variant="outline" size="sm"><Save className="mr-2 h-4 w-4" /> Save</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 flex-shrink-0"><Send className="mr-2 h-4 w-4" />Publish...</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ready to Publish Chapter?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This will make your chapter "{chapterTitle}" visible to readers.
                        Are you sure you want to publish this chapter? Story details (title, cover, etc.) are managed separately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePublishChapter} className="bg-primary hover:bg-primary/90">Publish Chapter</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </footer>
        </div>

        <aside className="w-full lg:w-80 xl:w-96 space-y-6">
          <div className="p-4 bg-card rounded-lg shadow-sm">
              <h2 className="text-lg font-headline font-semibold mb-3">Editor Tools</h2>
              <div className="space-y-3">
                  <div className="flex items-center justify-between">
                      <Label htmlFor="distraction-free-mode" className="flex items-center gap-2">
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                          Distraction-Free Mode
                      </Label>
                      <Switch
                          id="distraction-free-mode"
                          checked={isDistractionFree}
                          onCheckedChange={setIsDistractionFree}
                      />
                  </div>
                  <div className="flex items-center justify-between">
                      <Label htmlFor="fullscreen-mode" className="flex items-center gap-2">
                          {isFullScreen ? <Minimize className="h-4 w-4 text-muted-foreground" /> : <Maximize className="h-4 w-4 text-muted-foreground" />}
                          Full Screen
                      </Label>
                      <Switch
                          id="fullscreen-mode"
                          checked={isFullScreen}
                          onCheckedChange={handleToggleFullScreen}
                      />
                  </div>
                  <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  >
                      <Brain className="mr-2 h-4 w-4" /> AI Writing Assistant {isAiPanelOpen ? '(Hide)' : '(Show)'}
                  </Button>
              </div>
          </div>

          {isAiPanelOpen && editor && <AiAssistantPanel initialText={editor.getText()} onApplySuggestion={(text) => editor.chain().focus().insertContent(text).run()} />}

        </aside>

        {/* Preview Dialog */}
        <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
                <AlertDialogTitle>{chapterTitle}</AlertDialogTitle>
                <AlertDialogDescription>A preview of how your chapter will look to readers.</AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="max-h-[60vh] my-4">
                <div className="prose dark:prose-invert prose-reading p-2" dangerouslySetInnerHTML={{ __html: editor.getHTML() }}>
                </div>
            </ScrollArea>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsPreviewOpen(false)}>Close Preview</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </div>
    </AlertDialog>
  );
}

    