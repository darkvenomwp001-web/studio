'use client';

import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
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
  Palette,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TiptapHighlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';

export default function WriteEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');
  const queryChapterId = searchParams.get('chapterId'); 

  const [storyDetails, setStoryDetails] = useState<Story | null>(null); 
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Error' | 'No Changes' | 'Typing'>('No Changes');
  
  const [isFrozen, setIsFrozen] = useState(false);
  const [isZenFocus, setIsZenFocus] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit, 
      TiptapUnderline, 
      TiptapHighlight.configure({ multicolor: true }), 
      CharacterCount
    ],
    content: '',
    editorProps: { 
      attributes: { 
        class: 'prose dark:prose-invert focus:outline-none min-h-[70vh] p-8 md:p-12 text-base' 
      } 
    },
    onUpdate: () => setAutoSaveStatus('Typing'),
  });

  const isAuthorOrCollaborator = currentUser && storyDetails && (
    storyDetails.author.id === currentUser.id || 
    storyDetails.collaboratorIds?.includes(currentUser.id)
  );

  useEffect(() => {
    if (editor) {
      editor.setEditable(!!isAuthorOrCollaborator && !isFrozen);
    }
  }, [isAuthorOrCollaborator, isFrozen, editor]);

  useEffect(() => {
    if (queryStoryId && queryChapterId) {
      const unsub = onSnapshot(doc(db, 'stories', queryStoryId), (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Story;
          setStoryDetails(data);
          const ch = data.chapters.find(c => c.id === queryChapterId);
          if (ch) {
              setCurrentChapter(ch);
              setChapterTitle(ch.title);
              if (editor && editor.getHTML() !== ch.content) {
                editor.commands.setContent(ch.content, false);
              }
          }
        }
        setIsLoading(false);
      });
      return unsub;
    }
  }, [queryStoryId, queryChapterId, editor]);

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

  if (isLoading || !editor || !storyDetails || !currentChapter) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const handleManualSave = async () => {
    if (!storyDetails || !currentChapter || !editor) return;
    setAutoSaveStatus('Saving...');
    
    const updatedContent = editor.getHTML();
    const updatedChapters = storyDetails.chapters.map(ch => {
      if (ch.id === currentChapter.id) {
        return { ...ch, content: updatedContent, title: chapterTitle };
      }
      return ch;
    });

    try {
      await updateDoc(doc(db, 'stories', storyDetails.id), {
        chapters: updatedChapters,
        lastUpdated: serverTimestamp()
      });
      setAutoSaveStatus('Saved');
      toast({ title: "Progress Saved" });
    } catch (error) {
      console.error(error);
      setAutoSaveStatus('Error');
      toast({ title: "Save Failed", variant: "destructive" });
    }
  };

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto p-4 space-y-6 pb-24">
          <header className="flex flex-col gap-4 bg-card p-4 rounded-2xl border shadow-sm sticky top-4 z-50 backdrop-blur-md">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5"/></Button>
                    <div>
                        <h1 className="text-sm font-bold truncate max-w-[150px] sm:max-w-[300px]">{storyDetails.title}</h1>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">{autoSaveStatus}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <Button variant="outline" size="sm" onClick={handleManualSave} className="h-9 rounded-xl hidden sm:flex">
                        <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" title="Workspace Appearance">
                            <Palette className="h-5 w-5"/>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-6 rounded-3xl" align="end">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <Label className="font-bold">Zen Focus</Label>
                                        <p className="text-[10px] text-muted-foreground">Dim non-active text</p>
                                    </div>
                                    <Switch checked={isZenFocus} onCheckedChange={setIsZenFocus} />
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Auto-Scroll Speed</Label>
                                    <Slider 
                                        value={[autoScrollSpeed]} 
                                        onValueChange={([v]) => setAutoScrollSpeed(v)} 
                                        max={10} 
                                        step={1}
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-primary">
                                        <span>Off</span>
                                        <span>{autoScrollSpeed}x</span>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {isAuthorOrCollaborator && (
                        <Badge variant="outline" className={cn("gap-1.5 h-9 rounded-xl px-3", isFrozen ? "text-blue-500" : "text-orange-500")}>
                            <Snowflake className={cn("h-3.5 w-3.5", !isFrozen && "animate-pulse")} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{isFrozen ? "Frozen" : "Live"}</span>
                        </Badge>
                    )}
                </div>
             </div>

             <div className="flex flex-wrap items-center gap-1 bg-muted/30 p-1 rounded-xl">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4"/></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4"/></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button 
                    variant={editor.isActive('bold') ? 'secondary' : 'ghost'} 
                    size="icon" className="h-8 w-8" 
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <Bold className="h-4 w-4"/>
                </Button>
                <Button 
                    variant={editor.isActive('italic') ? 'secondary' : 'ghost'} 
                    size="icon" className="h-8 w-8" 
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <Italic className="h-4 w-4"/>
                </Button>
                <Button 
                    variant={editor.isActive('underline') ? 'secondary' : 'ghost'} 
                    size="icon" className="h-8 w-8" 
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <Underline className="h-4 w-4"/>
                </Button>
                <Button 
                    variant={editor.isActive('highlight') ? 'secondary' : 'ghost'} 
                    size="icon" className="h-8 w-8" 
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                >
                    <Highlighter className="h-4 w-4"/>
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button 
                    variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} 
                    size="icon" className="h-8 w-8" 
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List className="h-4 w-4"/>
                </Button>
                <Button 
                    variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} 
                    size="icon" className="h-8 w-8" 
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <Quote className="h-4 w-4"/>
                </Button>
             </div>
          </header>

          <main className={cn("rounded-3xl border bg-card shadow-inner transition-all duration-500 overflow-hidden", isZenFocus && "zen-focus-enabled")}>
             <div className="p-8 sm:p-12 pb-0">
                <Input 
                    value={chapterTitle} 
                    onChange={e => setChapterTitle(e.target.value)} 
                    className="text-3xl sm:text-4xl font-headline font-bold border-none shadow-none h-auto p-0 focus-visible:ring-0 bg-transparent" 
                    placeholder="Chapter Title..." 
                />
                <div className="flex items-center gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <span className="flex items-center gap-1.5"><Type className="h-3 w-3" /> {editor.storage.characterCount.words()} words</span>
                    <span className="flex items-center gap-1.5"><Play className="h-3 w-3" /> {Math.ceil(editor.storage.characterCount.words() / 200)} min read</span>
                </div>
                <Separator className="my-8 opacity-40" />
             </div>
             <EditorContent editor={editor} className="min-h-[70vh]" />
          </main>
      </div>
      <style jsx global>{`
        .zen-focus-enabled .ProseMirror p { 
            opacity: 0.2; 
            transition: opacity 0.4s ease, filter 0.4s ease; 
            filter: blur(1px); 
        }
        .zen-focus-enabled .ProseMirror p:hover,
        .zen-focus-enabled .ProseMirror p:focus { 
            opacity: 1; 
            filter: blur(0); 
        }
        .ProseMirror {
            padding-bottom: 20rem;
        }
      `}</style>
    </TooltipProvider>
  );
}
