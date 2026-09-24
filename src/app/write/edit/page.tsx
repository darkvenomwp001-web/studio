'use client';

import { useState, useEffect, useCallback, useMemo, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Save, 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Type,
  Sparkles,
  History,
  X,
  Edit
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

/**
 * ChapterEditor component provides a focused writing environment.
 * It handles real-time data synchronization for a specific chapter within a story.
 */
function ChapterEditor() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const storyId = searchParams.get('storyId');
  const chapterId = searchParams.get('chapterId');

  const [storyDetails, setStoryDetails] = useState<any>(null);
  const [chapterDetails, setChapterDetails] = useState<any>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved Changes'>('Saved');
  const [isSaving, startSavingTransition] = useTransition();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setSaveStatus('Unsaved Changes');
    },
  });

  // Data Sync Node: Listens for manuscript updates
  useEffect(() => {
    if (!storyId || !chapterId || !editor) return;

    const storyRef = doc(db, 'stories', storyId);
    const unsubscribe = onSnapshot(storyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoryDetails({ id: docSnap.id, ...data });
        
        const chapter = data.chapters?.find((c: any) => c.id === chapterId);
        if (chapter) {
          setChapterDetails(chapter);
          setChapterTitle(chapter.title || '');
          // Only set content once to avoid focus jumps during editing
          if (editor.isEmpty && chapter.content) {
            editor.commands.setContent(chapter.content);
          }
        }
      } else {
        toast({ title: "Manuscript lost", description: "Could not find the requested story.", variant: "destructive" });
        router.push('/write');
      }
    });
    return () => unsubscribe();
  }, [storyId, chapterId, editor, router, toast]);

  // Archival Sync: Persists changes to Firestore
  const handleSave = useCallback(async () => {
    if (!storyDetails || !chapterId || !editor) return;

    setSaveStatus('Saving...');
    const currentContent = editor.getHTML();
    
    // Immutable Update Pattern
    const updatedChapters = storyDetails.chapters.map((ch: any) => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          title: chapterTitle,
          content: currentContent,
          updatedAt: new Date().toISOString()
        };
      }
      return ch;
    });

    const storyRef = doc(db, 'stories', storyDetails.id);
    
    try {
      await updateDoc(storyRef, {
        chapters: updatedChapters,
        lastUpdated: serverTimestamp()
      });
      setSaveStatus('Saved');
      showIsland({ title: "Draft Archived", type: 'success' });
    } catch (error) {
      setSaveStatus('Unsaved Changes');
      toast({ title: "Sync Failed", description: "Could not sync with the central archive.", variant: "destructive" });
    }
  }, [storyDetails, chapterId, editor, chapterTitle, toast]);

  // Helper for Dynamic Island notifications (bridged via useAuth/context usually)
  const showIsland = (msg: { title: string, type: 'success' | 'error' }) => {
    toast({ title: msg.title, variant: msg.type === 'error' ? 'destructive' : 'default' });
  };

  if (!storyDetails || !chapterDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Accessing Manuscript...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Editor Header: Command Hub */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[10px] font-black opacity-60 uppercase tracking-widest flex items-center gap-2">
                <Edit className="h-3 w-3" />
                Writing Mode
              </h1>
              <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{storyDetails.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all",
              saveStatus === 'Saved' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            )}>
              {saveStatus === 'Saving...' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              {saveStatus}
            </div>
            <Button onClick={handleSave} disabled={saveStatus === 'Saving...'} className="rounded-full shadow-lg shadow-primary/20 gap-2 h-10 px-6 font-bold uppercase text-[10px] tracking-widest">
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Formatting Toolbar: Style Calibration */}
      <div className="sticky top-[73px] z-20 bg-background border-b py-2 overflow-x-auto no-scrollbar shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="h-9 w-9"><Undo className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="h-9 w-9"><Redo className="h-4 w-4" /></Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant={editor?.isActive('bold') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor?.chain().focus().toggleBold().run()} className="h-9 w-9"><Bold className="h-4 w-4" /></Button>
          <Button variant={editor?.isActive('italic') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor?.chain().focus().toggleItalic().run()} className="h-9 w-9"><Italic className="h-4 w-4" /></Button>
          <Button variant={editor?.isActive('underline') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor?.chain().focus().toggleUnderline().run()} className="h-9 w-9"><UnderlineIcon className="h-4 w-4" /></Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="h-9 w-9"><List className="h-4 w-4" /></Button>
          <Button variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="h-9 w-9"><ListOrdered className="h-4 w-4" /></Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant="ghost" size="icon" className="h-9 w-9"><Sparkles className="h-4 w-4 text-primary" /></Button>
          <Button variant="ghost" size="icon" onClick={() => router.push(`/write/history/${storyId}/${chapterId}`)} className="h-9 w-9"><History className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Editor Surface: Creative Input */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-10 pb-32">
        <Input 
          value={chapterTitle} 
          onChange={e => { setChapterTitle(e.target.value); setSaveStatus('Unsaved Changes'); }}
          placeholder="Enter part title..." 
          className="border-none bg-transparent text-3xl md:text-5xl font-headline font-bold h-auto p-0 mb-8 focus-visible:ring-0 placeholder:opacity-20 shadow-none"
        />
        <div className="prose dark:prose-invert max-w-none min-h-[500px]">
          <EditorContent editor={editor} className="outline-none" />
        </div>
      </main>

      {/* Mobile Interaction Guard */}
      <div className="fixed bottom-6 right-6 z-50 sm:hidden">
          <Button onClick={handleSave} size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-primary">
              <Save className="h-6 w-6" />
          </Button>
      </div>
    </div>
  );
}

/**
 * Default export handles the Suspense boundary for search parameters.
 */
export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    }>
      <ChapterEditor />
    </Suspense>
  );
}
