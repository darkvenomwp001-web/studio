'use client';

import { useState, useEffect, useCallback, useTransition, Suspense, useRef } from 'react';
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Plus,
  X,
  History,
  Sparkles,
  Send,
  AlertTriangle,
  ChevronRight,
  Check
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ChapterEditor() {
  const { user, addNotification } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const storyId = searchParams.get('storyId');
  const chapterId = searchParams.get('chapterId');

  const [storyDetails, setStoryDetails] = useState<any>(null);
  const [chapterDetails, setChapterDetails] = useState<any>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [warningTags, setWarningTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved Changes'>('Saved');
  const [showPublishPopup, setShowPublishPopup] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();
  const [isPublishing, setIsPublishing] = useState(false);

  const initialContentSet = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    onUpdate: () => {
      setSaveStatus('Unsaved Changes');
    },
  });

  useEffect(() => {
    if (!storyId || !chapterId || !editor) return;

    const storyRef = doc(db, 'stories', storyId);
    const unsubscribe = onSnapshot(storyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.id ? { id: docSnap.id, ...docSnap.data() } : null;
        if (!data) return;
        setStoryDetails(data);
        
        const chapter = data.chapters?.find((c: any) => c.id === chapterId);
        if (chapter) {
          setChapterDetails(chapter);
          setChapterTitle(chapter.title || '');
          setWarningTags(chapter.warningTags || []);
          if (!initialContentSet.current && chapter.content) {
            editor.commands.setContent(chapter.content);
            initialContentSet.current = true;
          }
        }
      }
    });
    return () => unsubscribe();
  }, [storyId, chapterId, editor]);

  const handleSave = async (silent = false) => {
    if (!storyDetails || !chapterId || !editor) return;

    setSaveStatus('Saving...');
    const currentContent = editor.getHTML();
    
    const updatedChapters = storyDetails.chapters.map((ch: any) => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          title: chapterTitle,
          content: currentContent,
          warningTags: warningTags,
          updatedAt: new Date().toISOString()
        };
      }
      return ch;
    });

    try {
      await updateDoc(doc(db, 'stories', storyDetails.id), {
        chapters: updatedChapters,
        lastUpdated: serverTimestamp()
      });
      setSaveStatus('Saved');
      if (!silent) toast({ title: "Draft Archived", className: "bg-primary text-white" });
    } catch (error) {
      setSaveStatus('Unsaved Changes');
      toast({ title: "Sync Failed", variant: "destructive" });
    }
  };

  const handlePublish = async () => {
    if (!storyDetails || !chapterId || !editor) return;
    setIsPublishing(true);

    const currentContent = editor.getHTML();
    const updatedChapters = storyDetails.chapters.map((ch: any) => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          title: chapterTitle,
          content: currentContent,
          warningTags: warningTags,
          status: 'Published',
          updatedAt: new Date().toISOString()
        };
      }
      return ch;
    });

    try {
      await updateDoc(doc(db, 'stories', storyDetails.id), {
        chapters: updatedChapters,
        lastUpdated: serverTimestamp()
      });
      
      // Notify (Wattpad style notification)
      if (user) {
        await addNotification({
            userId: user.id,
            type: 'story_update',
            message: `"${storyDetails.title}": ${chapterTitle} is now live!`,
            link: `/stories/${storyDetails.id}/read/${chapterId}`,
            actor: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
        });
      }

      setSaveStatus('Saved');
      setShowPublishPopup(true);
    } catch (error) {
      toast({ title: "Publishing Failed", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !warningTags.includes(tagInput.trim())) {
      setWarningTags([...warningTags, tagInput.trim()]);
      setTagInput('');
      setSaveStatus('Unsaved Changes');
    }
  };

  const removeTag = (tag: string) => {
    setWarningTags(warningTags.filter(t => t !== tag));
    setSaveStatus('Unsaved Changes');
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
    <div className="min-h-screen bg-background pb-32 flex flex-col relative">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/write/edit-details?storyId=${storyId}`)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest flex items-center gap-2">
                Manuscript Hub
              </p>
              <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{storyDetails.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className={cn(
                "h-6 px-3 rounded-full text-[10px] font-bold uppercase",
                saveStatus === 'Saved' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
             )}>
                {saveStatus}
             </Badge>
          </div>
        </div>
      </header>

      {/* Editor Surface */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-10 pb-32">
        <Input 
          value={chapterTitle} 
          onChange={e => { setChapterTitle(e.target.value); setSaveStatus('Unsaved Changes'); }}
          placeholder="Part Title..." 
          className="border-none bg-transparent text-3xl md:text-5xl font-headline font-bold h-auto p-0 mb-4 focus-visible:ring-0 placeholder:opacity-20 shadow-none"
        />
        
        {/* Warning Tags Section */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2 px-1">
             <AlertTriangle className="h-3 w-3 text-muted-foreground" />
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Advisory Tags</span>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[32px] p-2 rounded-xl bg-muted/20 border border-dashed border-border/40">
             {warningTags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight bg-primary/5 text-primary border-primary/20">
                   {tag}
                   <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                </Badge>
             ))}
             <div className="flex items-center gap-1 flex-1">
                <Input 
                   value={tagInput}
                   onChange={e => setTagInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && addTag()}
                   placeholder="Add tag (e.g. Gore)..."
                   className="h-7 border-none bg-transparent text-[10px] focus-visible:ring-0 shadow-none p-0"
                />
             </div>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none min-h-[500px]">
          <EditorContent editor={editor} className="outline-none" />
        </div>
      </main>

      {/* Floating Bottom Toolbar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-card/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex items-center gap-0.5 px-1">
             <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBold().run()} className={cn("h-10 w-10 rounded-full", editor?.isActive('bold') && "bg-primary/20 text-primary")}><Bold className="h-4 w-4" /></Button>
             <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleItalic().run()} className={cn("h-10 w-10 rounded-full", editor?.isActive('italic') && "bg-primary/20 text-primary")}><Italic className="h-4 w-4" /></Button>
             <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={cn("h-10 w-10 rounded-full", editor?.isActive('underline') && "bg-primary/20 text-primary")}><UnderlineIcon className="h-4 w-4" /></Button>
          </div>

          <Separator orientation="vertical" className="h-6 bg-border/40" />

          <div className="flex items-center gap-0.5 px-1">
             <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={cn("h-10 w-10 rounded-full", editor?.isActive({ textAlign: 'left' }) && "bg-primary/20 text-primary")}><AlignLeft className="h-4 w-4" /></Button>
             <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={cn("h-10 w-10 rounded-full", editor?.isActive({ textAlign: 'center' }) && "bg-primary/20 text-primary")}><AlignCenter className="h-4 w-4" /></Button>
             <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={cn("h-10 w-10 rounded-full", editor?.isActive({ textAlign: 'right' }) && "bg-primary/20 text-primary")}><AlignRight className="h-4 w-4" /></Button>
             <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('justify').run()} className={cn("h-10 w-10 rounded-full", editor?.isActive({ textAlign: 'justify' }) && "bg-primary/20 text-primary")}><AlignJustify className="h-4 w-4" /></Button>
          </div>

          <Separator orientation="vertical" className="h-6 bg-border/40" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary"><Type className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="rounded-2xl p-2 w-40 border-none shadow-3xl">
               <DropdownMenuItem onClick={() => editor?.chain().focus().setFontFamily('Inter').run()} className="rounded-xl font-sans">Sans Serif</DropdownMenuItem>
               <DropdownMenuItem onClick={() => editor?.chain().focus().setFontFamily('serif').run()} className="rounded-xl font-serif">Serif</DropdownMenuItem>
               <DropdownMenuItem onClick={() => editor?.chain().focus().setFontFamily('monospace').run()} className="rounded-xl font-mono">Monospace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 bg-border/40" />

          <div className="flex items-center gap-1.5 pl-1 pr-2">
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleSave()} 
                disabled={saveStatus === 'Saved' || isSaving} 
                className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary transition-all active:scale-90"
             >
                {saveStatus === 'Saving...' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
             </Button>

             <Button 
                onClick={handlePublish} 
                disabled={isPublishing} 
                className="h-10 px-5 rounded-full bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-2 transition-all active:scale-95"
             >
                {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Publish
             </Button>
          </div>
      </div>

      {/* Publish Success Popup */}
      {showPublishPopup && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
           <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative bg-card p-8 rounded-[3rem] shadow-2xl border border-primary/20 transform-gpu animate-in zoom-in-95 duration-700">
                 <CheckCircle className="h-20 w-20 text-primary mx-auto mb-6" />
                 <h2 className="text-3xl md:text-5xl font-headline font-bold mb-2 uppercase tracking-tighter leading-none">
                    {storyDetails.title}:
                 </h2>
                 <p className="text-xl md:text-2xl font-bold text-muted-foreground uppercase tracking-widest mb-8">
                    {chapterTitle} IS NOW PUBLISHED
                 </p>
                 <Button 
                    onClick={() => router.push(`/write/edit-details?storyId=${storyId}`)}
                    className="rounded-full px-12 h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary/30 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                 >
                    <Plus className="h-5 w-5" />
                    Add Another Part
                 </Button>
              </div>
           </div>
           <button 
              onClick={() => setShowPublishPopup(false)}
              className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground transition-colors"
           >
              Dismiss
           </button>
        </div>
      )}
    </div>
  );
}

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