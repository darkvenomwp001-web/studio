
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Save, History, Users, EyeOff, Brain, CheckCircle, AlertTriangle, Maximize, Minimize, Send, FileText } from 'lucide-react';
import AiAssistantPanel from '@/components/writing/AiAssistantPanel';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { placeholderStories, upsertStoryAndSave, initializeUserStoryLists } from '@/lib/placeholder-data'; 
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Story, Chapter } from '@/types';

// Helper to manage version history in sessionStorage
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
    versions.unshift({ timestamp: Date.now(), content, chapterTitle }); // Add to the beginning
    sessionStorage.setItem(VersionHistoryManager.getKey(storyId, chapterId), JSON.stringify(versions.slice(0, 20))); // Keep last 20 versions
  },
};


export default function WriteEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, addNotification } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');
  
  const [storyDetails, setStoryDetails] = useState<Story | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // Internal IDs for new stories/chapters before they are "saved"
  const [internalStoryId, setInternalStoryId] = useState('');
  const [internalChapterId, setInternalChapterId] = useState('');
  
  const [storyTitle, setStoryTitle] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [content, setContent] = useState('');
  
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Error' | 'No Changes'>('No Changes');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [genre, setGenre] = useState('fantasy');
  const [tags, setTags] = useState('');

  useEffect(() => {
    // placeholderStories is now loaded from localStorage by placeholder-data.ts itself.
    // Initialize user story lists if they haven't been populated from the potentially updated placeholderStories
    if (typeof window !== 'undefined') {
        initializeUserStoryLists();
    }

    let story: Story | undefined;
    let chapter: Chapter | undefined;

    const newStoryTempId = `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newChapterTempId = `chapter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (queryStoryId) {
      story = placeholderStories.find(s => s.id === queryStoryId);
      if (story) {
        setStoryDetails(story);
        setStoryTitle(story.title);
        setInternalStoryId(story.id);
        setGenre(story.genre.toLowerCase() || 'fantasy');
        setTags(story.tags.join(', '));
        
        chapter = story.chapters[0]; 
        if (chapter) {
          setChapterTitle(chapter.title);
          setContent(chapter.content);
          setInternalChapterId(chapter.id);
          setCurrentChapterIndex(0); 
        } else {
          setChapterTitle('New Chapter 1');
          setContent('Start writing your amazing chapter here...');
          setInternalChapterId(newChapterTempId);
          setCurrentChapterIndex(0);
        }
      } else {
        toast({ title: "Error", description: "Story not found. Starting new story.", variant: "destructive" });
        setStoryTitle('New Story Title');
        setChapterTitle('Chapter 1');
        setContent('Start writing your amazing story here...');
        setInternalStoryId(newStoryTempId);
        setInternalChapterId(newChapterTempId);
      }
    } else {
      setStoryTitle('New Story Title');
      setChapterTitle('Chapter 1');
      setContent('Start writing your amazing story here...');
      setInternalStoryId(newStoryTempId);
      setInternalChapterId(newChapterTempId);
    }
  }, [queryStoryId, toast]);


  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);
  
  useEffect(() => {
    if (content.length > 0 && (storyDetails ? (content !== storyDetails.chapters.find(c => c.id === internalChapterId)?.content || chapterTitle !== storyDetails.chapters.find(c => c.id === internalChapterId)?.title || storyTitle !== storyDetails.title) : true)) {
      setAutoSaveStatus('Saving...');
      const timer = setTimeout(() => {
        // Simulating save, actual save happens on button click
        if (autoSaveStatus === 'Saving...') setAutoSaveStatus('Saved');
      }, 2500);
      return () => clearTimeout(timer);
    } else if (storyDetails && content === storyDetails.chapters.find(c => c.id === internalChapterId)?.content && chapterTitle === storyDetails.chapters.find(c => c.id === internalChapterId)?.title && storyTitle === storyDetails.title) {
        setAutoSaveStatus('No Changes');
    }
  }, [content, storyTitle, chapterTitle, storyDetails, internalChapterId, autoSaveStatus]);

  const handleSaveDraft = () => {
    if (!internalStoryId || !internalChapterId || !user) {
        toast({ title: "Error", description: "Cannot save draft without story/chapter identifiers or user info.", variant: "destructive"});
        return;
    }
    VersionHistoryManager.addVersion(internalStoryId, internalChapterId, content, chapterTitle);
    setAutoSaveStatus('Saving...');
    
    const existingStoryFromGlobal = placeholderStories.find(s => s.id === internalStoryId);
    let storyToSave: Story;

    if (existingStoryFromGlobal) {
        let chapterExists = false;
        const updatedChapters = existingStoryFromGlobal.chapters.map(ch => {
            if (ch.id === internalChapterId) {
                chapterExists = true;
                return { ...ch, title: chapterTitle, content: content, /* publishedDate remains same for draft */ };
            }
            return ch;
        });
        if (!chapterExists) { 
            updatedChapters.push({
                id: internalChapterId,
                title: chapterTitle,
                content: content,
                order: updatedChapters.length + 1,
                // publishedDate is undefined for a new draft chapter
            });
        }
        storyToSave = {
            ...existingStoryFromGlobal,
            title: storyTitle,
            genre: genre,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            lastUpdated: new Date().toISOString(),
            chapters: updatedChapters,
            author: existingStoryFromGlobal.author, 
        };
    } else { 
        storyToSave = {
            id: internalStoryId,
            title: storyTitle,
            author: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl },
            genre: genre,
            coverImageUrl: 'https://placehold.co/512x800.png', 
            summary: 'A new story by ' + (user.displayName || user.username), 
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            chapters: [{
                id: internalChapterId,
                title: chapterTitle,
                content: content,
                order: 1,
            }],
            status: 'Draft', 
            lastUpdated: new Date().toISOString(),
        };
    }
    
    upsertStoryAndSave(storyToSave); 
    setStoryDetails(storyToSave); 

    setTimeout(() => {
      setAutoSaveStatus('Saved');
      toast({ title: "Draft Saved!", description: "Your changes and a new version have been saved to browser storage." });
    }, 500);
  };
  
  const handlePublish = () => {
    if (!user || !internalStoryId || !internalChapterId) {
        toast({title: "Error", description: "You must be logged in and have story details to publish.", variant: "destructive"});
        return;
    }
    
    const existingStoryFromGlobal = placeholderStories.find(s => s.id === internalStoryId);
    let storyToPublish: Story;

    if (existingStoryFromGlobal) {
        let chapterExists = false;
        const updatedChapters = existingStoryFromGlobal.chapters.map(ch => {
            if (ch.id === internalChapterId) {
                chapterExists = true;
                return { ...ch, title: chapterTitle, content: content, publishedDate: new Date().toISOString() };
            }
            return ch;
        });
         if (!chapterExists) { 
            updatedChapters.push({
                id: internalChapterId,
                title: chapterTitle,
                content: content,
                order: updatedChapters.length + 1,
                publishedDate: new Date().toISOString()
            });
        }
        storyToPublish = {
            ...existingStoryFromGlobal,
            title: storyTitle,
            genre: genre,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            status: 'Ongoing', 
            lastUpdated: new Date().toISOString(),
            chapters: updatedChapters,
            author: existingStoryFromGlobal.author, 
        };
    } else { 
         storyToPublish = {
            id: internalStoryId,
            title: storyTitle,
            author: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl },
            genre: genre,
            coverImageUrl: 'https://placehold.co/512x800.png',
            summary: 'A new story by ' + (user.displayName || user.username),
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            chapters: [{
                id: internalChapterId,
                title: chapterTitle,
                content: content,
                order: 1,
                publishedDate: new Date().toISOString()
            }],
            status: 'Ongoing',
            lastUpdated: new Date().toISOString(),
        };
    }

    upsertStoryAndSave(storyToPublish); 
    setStoryDetails(storyToPublish); 

    toast({ title: "Chapter Published!", description: `"${chapterTitle}" from "${storyTitle}" is now live (in this browser session).` });
    addNotification({
      type: 'new_chapter',
      message: `${user.displayName || user.username} published a new chapter "${chapterTitle}" for "${storyTitle}".`,
      link: `/stories/${internalStoryId}`,
      actor: {id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl }
    });
    router.push(`/write`); 
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
    if (!internalStoryId || !internalChapterId) return '';
    return `/write/history/${internalStoryId}/${internalChapterId}`;
  }, [internalStoryId, internalChapterId]);


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
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          <header className="mb-6 p-4 bg-card rounded-lg shadow-sm">
            <Input
              type="text"
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              placeholder="Story Title"
              className="text-2xl font-headline font-bold mb-2 h-12 focus-visible:ring-primary"
            />
            <Input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Chapter Title (Optional)"
              className="text-lg font-semibold h-10 focus-visible:ring-primary"
            />
          </header>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your amazing story here..."
            className="flex-grow min-h-[400px] p-4 text-base rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary resize-none bg-card"
            aria-label="Story content editor"
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

        {/* Sidebar for Tools and Settings */}
        <aside className="w-full lg:w-80 xl:w-96 space-y-6">
          <div className="p-4 bg-card rounded-lg shadow-sm">
            <h2 className="text-lg font-headline font-semibold mb-3">Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleSaveDraft} className="w-full bg-primary hover:bg-primary/90"><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full"><Send className="mr-2 h-4 w-4" />Publish</Button>
              </AlertDialogTrigger>
              {versionHistoryLink ? (
                <Link href={versionHistoryLink} passHref className="w-full col-span-2">
                  <Button variant="outline" className="w-full"><History className="mr-2 h-4 w-4" /> Version History</Button>
                </Link>
              ) : (
                <Button variant="outline" className="w-full col-span-2" disabled><History className="mr-2 h-4 w-4" /> Version History</Button>
              )}
              <Button variant="outline" className="w-full col-span-2" disabled><Users className="mr-2 h-4 w-4" /> Collaborate (Soon)</Button>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-lg shadow-sm">
              <h2 className="text-lg font-headline font-semibold mb-3">Tools</h2>
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

          <div className="p-4 bg-card rounded-lg shadow-sm">
            <h2 className="text-lg font-headline font-semibold mb-3">Story Settings</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="genre">Genre</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger id="genre" className="w-full">
                    <SelectValue placeholder="Select Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                    <SelectItem value="thriller">Thriller</SelectItem>
                    <SelectItem value="historical">Historical Fiction</SelectItem>
                    <SelectItem value="dystopian">Dystopian</SelectItem>
                    <SelectItem value="mystery">Mystery</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" type="text" placeholder="e.g. magic, space, love" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cover-image" className="block text-sm font-medium">Cover Image (URL for Mock)</Label>
                <Input id="cover-image" type="text" placeholder="https://placehold.co/512x800.png" className="text-sm" 
                  value={storyDetails?.coverImageUrl || ''}
                  onChange={(e) => setStoryDetails(prev => prev ? {...prev, coverImageUrl: e.target.value} : null)}
                />
              </div>
            </div>
          </div>
        </aside>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to Publish?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your chapter "{chapterTitle}" from "{storyTitle}" visible to readers (in this browser session).
              Are you sure you want to publish?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} className="bg-primary hover:bg-primary/90">Publish Chapter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </div>
    </AlertDialog>
  );
}
