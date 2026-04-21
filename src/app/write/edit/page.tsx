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

const ToolbarButton = React.memo(({ onClick, isActive, disabled, children, tooltip }: { onClick: () => void, isActive?: boolean, disabled?: boolean, children: React.ReactNode, tooltip: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        className={cn("h-8 w-8 p-0 transition-all", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground")}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent className="text-[10px] font-bold uppercase">{tooltip}</TooltipContent>
  </Tooltip>
));
ToolbarButton.displayName = 'ToolbarButton';

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
    extensions: [StarterKit, TiptapUnderline, TiptapHighlight.configure({ multicolor: true }), CharacterCount],
    content: '',
    editorProps: { attributes: { class: 'prose dark:prose-invert focus:outline-none min-h-[70vh] p-8 md:p-12 text-base' } },
    onUpdate: () => setAutoSaveStatus('Typing'),
  });

  const isAuthorOrCollaborator = currentUser && storyDetails && (storyDetails.author.id === currentUser.id || storyDetails.collaboratorIds?.includes(currentUser.id));

  useEffect(() => {
    if (editor) editor.setEditable(!!isAuthorOrCollaborator && !isFrozen);
  }, [isAuthorOrCollaborator, isFrozen, editor]);

  useEffect(() => {
    if (queryStoryId) {
      const unsub = onSnapshot(doc(db, 'stories', queryStoryId), (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Story;
          setStoryDetails(data);
          const ch = data.chapters.find(c => c.id === queryChapterId);
          if (ch) {
              setCurrentChapter(ch);
              setChapterTitle(ch.title);
              if (editor && editor.getHTML() !== ch.content) editor.commands.setContent(ch.content, false);
          }
        }
        setIsLoading(false);
      });
      return unsub;
    }
  }, [queryStoryId, queryChapterId, editor]);

  if (isLoading || !editor || !storyDetails || !currentChapter) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
          <header className="flex justify-between items-center bg-card p-4 rounded-2xl border shadow-sm">
             <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5"/></Button>
                <div>
                    <h1 className="text-sm font-bold truncate max-w-[200px]">{storyDetails.title}</h1>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{autoSaveStatus}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild><Button variant="ghost" size="icon"><Palette className="h-4 w-4"/></Button></PopoverTrigger>
                    <PopoverContent className="w-80 p-6 rounded-3xl">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-bold">Zen Focus</Label>
                                <Switch checked={isZenFocus} onCheckedChange={setIsZenFocus} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase">Auto-Scroll</Label>
                                <Slider value={[autoScrollSpeed]} onValueChange={([v]) => setAutoScrollSpeed(v)} max={10} />
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
             </div>
          </header>
          <main className={cn("rounded-3xl border bg-card shadow-inner", isZenFocus && "zen-focus-enabled")}>
             <Input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} className="text-3xl font-headline font-bold border-none shadow-none h-auto p-8" placeholder="Title" />
             <EditorContent editor={editor} />
          </main>
      </div>
      <style jsx global>{`
        .zen-focus-enabled .ProseMirror p { opacity: 0.2; transition: opacity 0.4s; }
        .zen-focus-enabled .ProseMirror p:hover { opacity: 1; }
      `}</style>
    </TooltipProvider>
  );
}
