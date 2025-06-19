'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Save, History, Users, EyeOff, Brain, CheckCircle, AlertTriangle, Maximize, Minimize } from 'lucide-react';
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
import { placeholderStories } from '@/lib/placeholder-data'; // For fetching story title if editing
import { useSearchParams } from 'next/navigation';


export default function WriteEditorPage() {
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId');
  
  const [storyTitle, setStoryTitle] = useState(storyId ? placeholderStories.find(s => s.id === storyId)?.title || 'New Story Title' : 'New Story Title');
  const [chapterTitle, setChapterTitle] = useState('Chapter Title');
  const [content, setContent] = useState(storyId ? placeholderStories.find(s => s.id === storyId)?.chapters[0]?.content || 'Start writing your amazing story here...' : 'Start writing your amazing story here...');
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Error'>('Saved');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);
  
  useEffect(() => {
    // Mock auto-save
    if (content.length > 0) {
      setAutoSaveStatus('Saving...');
      const timer = setTimeout(() => {
        setAutoSaveStatus('Saved');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [content, storyTitle, chapterTitle]);

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
          <div className={`flex items-center gap-1 ${autoSaveStatus === 'Saved' ? 'text-green-600' : autoSaveStatus === 'Saving...' ? 'text-yellow-600' : 'text-red-600'}`}>
            {autoSaveStatus === 'Saved' && <CheckCircle className="h-4 w-4" />}
            {autoSaveStatus === 'Error' && <AlertTriangle className="h-4 w-4" />}
            {autoSaveStatus}
          </div>
        </footer>
      </div>

      {/* Sidebar for Tools and Settings */}
      <aside className="w-full lg:w-80 xl:w-96 space-y-6">
        <div className="p-4 bg-card rounded-lg shadow-sm">
          <h2 className="text-lg font-headline font-semibold mb-3">Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full bg-primary hover:bg-primary/90"><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
            <Button variant="outline" className="w-full">Publish</Button>
            <Button variant="outline" className="w-full"><History className="mr-2 h-4 w-4" /> Version History</Button>
            <Button variant="outline" className="w-full"><Users className="mr-2 h-4 w-4" /> Collaborate</Button>
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
          <h2 className="text-lg font-headline font-semibold mb-3">Settings</h2>
          {/* Placeholder for settings like genre, tags, cover image upload */}
          <Select defaultValue="fantasy">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fantasy">Fantasy</SelectItem>
              <SelectItem value="sci-fi">Sci-Fi</SelectItem>
              <SelectItem value="romance">Romance</SelectItem>
              <SelectItem value="thriller">Thriller</SelectItem>
              <SelectItem value="historical">Historical Fiction</SelectItem>
            </SelectContent>
          </Select>
          <Input type="text" placeholder="Tags (comma-separated)" className="mt-2" />
          <Label htmlFor="cover-image" className="block mt-3 mb-1 text-sm font-medium">Cover Image</Label>
          <Input id="cover-image" type="file" className="text-sm" />
        </div>
      </aside>
    </div>
  );
}
