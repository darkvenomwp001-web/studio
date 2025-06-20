
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Save, History, EyeOff, Brain, CheckCircle, AlertTriangle, Maximize, Minimize, Send, FileText, Settings, Loader2 } from 'lucide-react';
import AiAssistantPanel from '@/components/writing/AiAssistantPanel';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { placeholderStories, upsertStoryAndSave, initializeUserStoryLists } from '@/lib/placeholder-data';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Story, Chapter } from '@/types';

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
  const { user, addNotification } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');
  const queryChapterId = searchParams.get('chapterId'); // For editing existing chapter

  const [storyDetails, setStoryDetails] = useState<Story | null>(null); // Store the whole story for context
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);

  const [storyTitleForDisplay, setStoryTitleForDisplay] = useState(''); // Only for display in header
  const [chapterTitle, setChapterTitle] = useState('');
  const [content, setContent] = useState('');

  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Error' | 'No Changes'>('No Changes');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Internal ID for the current chapter being edited
  const internalChapterId = useMemo(() => {
      return currentChapter?.id || `chapter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }, [currentChapter]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        initializeUserStoryLists();
    }

    let story: Story | undefined;
    let chapterToEdit: Chapter | undefined;

    if (queryStoryId) {
      story = placeholderStories.find(s => s.id === queryStoryId);
      if (story) {
        setStoryDetails(story);
        setStoryTitleForDisplay(story.title);

        if (queryChapterId) {
          chapterToEdit = story.chapters.find(c => c.id === queryChapterId);
        } else if (story.chapters.length > 0 && !queryChapterId) {
          // If no chapterId specified but story has chapters, load the first one
          // Or, better: prompt to select a chapter or create new one. For now, default to new.
           chapterToEdit = undefined; // Force new chapter creation if no chapterId
        }

        if (chapterToEdit) {
          setCurrentChapter(chapterToEdit);
          setChapterTitle(chapterToEdit.title);
          setContent(chapterToEdit.content);
        } else { // New chapter for existing story, or no chapter ID provided
          const newChapterOrder = story.chapters.length + 1;
          const newChapter: Chapter = {
            id: `chapter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: `Chapter ${newChapterOrder}`,
            content: 'Start writing your amazing chapter here...',
            order: newChapterOrder,
            status: 'Draft',
          };
          setCurrentChapter(newChapter);
          setChapterTitle(newChapter.title);
          setContent(newChapter.content);
        }
      } else {
        // Story ID provided but not found (e.g. user typed invalid URL)
        toast({ title: "Error", description: "Story not found. Please select a story from your dashboard.", variant: "destructive" });
        router.push('/write'); // Redirect to dashboard
        return;
      }
    } else {
      // No storyId provided - this page is for editing content of existing stories.
      // Redirect to create story details first, or dashboard.
      toast({ title: "Select Story", description: "Please create or select a story first to edit its chapters.", variant: "destructive" });
      router.push('/write/edit-details'); // Or '/write' dashboard
      return;
    }
  }, [queryStoryId, queryChapterId, toast, router]);


  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  useEffect(() => {
    if (!storyDetails || !currentChapter) return;

    const originalChapter = storyDetails.chapters.find(c => c.id === currentChapter.id);
    const contentChanged = content !== (originalChapter?.content || '');
    const titleChanged = chapterTitle !== (originalChapter?.title || currentChapter.title);

    if (content.length > 0 && (contentChanged || titleChanged)) {
      setAutoSaveStatus('Saving...');
      const timer = setTimeout(() => {
        if (autoSaveStatus === 'Saving...') setAutoSaveStatus('Saved');
      }, 2500);
      return () => clearTimeout(timer);
    } else if (originalChapter && !contentChanged && !titleChanged) {
        setAutoSaveStatus('No Changes');
    }
  }, [content, chapterTitle, storyDetails, currentChapter, autoSaveStatus]);

  const handleSaveDraft = () => {
    if (!storyDetails || !currentChapter || !user) {
        toast({ title: "Error", description: "Cannot save draft. Story or chapter context missing.", variant: "destructive"});
        return;
    }
    VersionHistoryManager.addVersion(storyDetails.id, currentChapter.id, content, chapterTitle);
    setAutoSaveStatus('Saving...');

    const updatedChapter: Chapter = {
        ...currentChapter,
        title: chapterTitle,
        content: content,
        status: 'Draft', // Saving a draft always sets/keeps it as draft
        wordCount: content.trim().split(/\s+/).filter(Boolean).length,
    };

    let chapterExists = false;
    const updatedChapters = storyDetails.chapters.map(ch => {
        if (ch.id === updatedChapter.id) {
            chapterExists = true;
            return updatedChapter;
        }
        return ch;
    });
    if (!chapterExists) {
        updatedChapters.push(updatedChapter);
    }

    const storyToSave: Story = {
        ...storyDetails,
        lastUpdated: new Date().toISOString(),
        chapters: updatedChapters.sort((a,b) => a.order - b.order),
    };

    upsertStoryAndSave(storyToSave);
    setStoryDetails(storyToSave); // Update local storyDetails
    setCurrentChapter(updatedChapter); // Update local currentChapter

    setTimeout(() => {
      setAutoSaveStatus('Saved');
      toast({ title: "Draft Saved!", description: "Your chapter changes have been saved." });
    }, 500);
  };

  const handlePublishChapter = () => {
    if (!storyDetails || !currentChapter || !user) {
        toast({title: "Error", description: "Cannot publish. Story or chapter context missing.", variant: "destructive"});
        return;
    }

    const updatedChapterData: Chapter = {
        ...currentChapter,
        title: chapterTitle,
        content: content,
        publishedDate: new Date().toISOString(),
        status: 'Published',
        wordCount: content.trim().split(/\s+/).filter(Boolean).length,
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

    const storyToPublish: Story = {
        ...storyDetails,
        status: storyDetails.chapters.some(ch => ch.status === 'Published' || ch.id === updatedChapterData.id) ? 'Ongoing' : 'Draft', // If any chapter is published, story is ongoing
        lastUpdated: new Date().toISOString(),
        chapters: updatedChapters.sort((a,b) => a.order - b.order),
    };

    upsertStoryAndSave(storyToPublish);
    setStoryDetails(storyToPublish);
    setCurrentChapter(updatedChapterData);

    toast({ title: "Chapter Published!", description: `Chapter "${chapterTitle}" is now live.` });
    addNotification({
      type: 'new_chapter',
      userId: user.id, // Add userId for the notification recipient if applicable
      message: `${user.displayName || user.username} published a new chapter "${chapterTitle}" for "${storyDetails.title}".`,
      link: `/stories/${storyDetails.id}/read/${updatedChapterData.id}`,
      actor: {id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl }
    });
    // Optionally, redirect to story details or chapter list after publish
    router.push(`/write/edit-details?storyId=${storyDetails.id}`);
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

  const versionHistoryLink = useMemo(() => {
    if (!storyDetails?.id || !internalChapterId) return '';
    return `/write/history/${storyDetails.id}/${internalChapterId}`;
  }, [storyDetails, internalChapterId]);

  if (!storyDetails || !currentChapter) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading chapter editor...</p>
        </div>
      );
  }


  if (isDistractionFree) {
    return (
      <div className="fixed inset-0 bg-background z-[100] p-4 sm:p-8 flex flex-col items-center">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full max-w-3xl h-full text-lg p-6 border-none focus-visible:ring-0 shadow-none resize-none bg-background"
          placeholder="Let your story flow..."
        />
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
    <AlertDialog>
      <div className={`flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-10rem)] ${isFullScreen ? 'fixed inset-0 bg-background z-[99] p-4' : ''}`}>
        <div className="flex-1 flex flex-col">
          <header className="mb-6 p-4 bg-card rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-xl font-headline text-muted-foreground truncate">
                    Editing chapter for: <span className="text-primary font-semibold">{storyTitleForDisplay}</span>
                </h1>
                <Link href={`/write/edit-details?storyId=${storyDetails.id}`} passHref>
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" /> Manage Story Details
                    </Button>
                </Link>
            </div>
            <Input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Chapter Title"
              className="text-2xl font-semibold h-12 focus-visible:ring-primary"
            />
          </header>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your amazing chapter here..."
            className="flex-grow min-h-[400px] p-4 text-base rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary resize-none bg-card"
            aria-label="Chapter content editor"
          />

          <footer className="mt-4 p-2 bg-card rounded-lg shadow-sm flex justify-between items-center text-sm">
            <div>{wordCount} words</div>
            <div className={`flex items-center gap-1 ${autoSaveStatus === 'Saved' ? 'text-green-600' : autoSaveStatus === 'Saving...' ? 'text-yellow-600' :  autoSaveStatus === 'Error' ? 'text-red-600' : 'text-muted-foreground'}`}>
              {autoSaveStatus === 'Saved' && <CheckCircle className="h-4 w-4" />}
              {autoSaveStatus === 'Error' && <AlertTriangle className="h-4 w-4" />}
              {autoSaveStatus === 'No Changes' && <FileText className="h-4 w-4" />}
              {autoSaveStatus}
            </div>
          </footer>
        </div>

        <aside className="w-full lg:w-80 xl:w-96 space-y-6">
          <div className="p-4 bg-card rounded-lg shadow-sm">
            <h2 className="text-lg font-headline font-semibold mb-3">Chapter Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleSaveDraft} className="w-full bg-primary hover:bg-primary/90"><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full"><Send className="mr-2 h-4 w-4" />Publish Chapter</Button>
              </AlertDialogTrigger>
              {versionHistoryLink ? (
                <Link href={versionHistoryLink} passHref className="w-full col-span-2">
                  <Button variant="outline" className="w-full"><History className="mr-2 h-4 w-4" /> Version History</Button>
                </Link>
              ) : (
                <Button variant="outline" className="w-full col-span-2" disabled><History className="mr-2 h-4 w-4" /> Version History</Button>
              )}
            </div>
          </div>

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

          {isAiPanelOpen && <AiAssistantPanel initialText={content} onApplySuggestion={setContent} />}

        </aside>

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
      </div>
    </AlertDialog>
  );
}
