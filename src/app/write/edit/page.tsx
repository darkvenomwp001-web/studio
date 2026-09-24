'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Save, 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
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
  Send,
  AlertTriangle,
  Edit,
  Sparkles,
  StickyNote,
  Music,
  Users,
  Search
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  addDoc,
  collection
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function ChapterEditor() {
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
  
  // Custom Font/Size State
  const [customFont, setCustomFont] = useState('Inter');
  const [customSize, setCustomSize] = useState('16');

  // Reader Experience State
  const [authorNotes, setAuthorNotes] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [featuredCast, setFeaturedCast] = useState('');

  const [showPublishPopup, setShowPublishPopup] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();
  const [isPublishing, setIsPublishing] = useState(false);

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
  });

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
          setWarningTags(chapter.warningTags || []);
          setAuthorNotes(chapter.authorNotes || '');
          setAtmosphere(chapter.atmosphere || '');
          setFeaturedCast(chapter.featuredCast || '');
          editor.commands.setContent(chapter.content || '');
        }
      }
    });
    return () => unsubscribe();
  }, [storyId, chapterId, editor]);

  const handleSave = async (silent = false) => {
    if (!storyDetails || !chapterId || !editor) return;

    const currentContent = editor.getHTML();
    const updatedChapters = storyDetails.chapters.map((ch: any) => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          title: chapterTitle,
          content: currentContent,
          warningTags: warningTags,
          authorNotes,
          atmosphere,
          featuredCast,
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
      if (!silent) toast({ title: "Draft Saved" });
    } catch (error) {
      toast({ title: "Save Failed", variant: "destructive" });
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
          warningTags,
          authorNotes,
          atmosphere,
          featuredCast,
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
      
      if (user) {
        await addDoc(collection(db, 'notifications'), {
            userId: user.id,
            type: 'story_update',
            message: `${storyDetails.title}: ${chapterTitle} is now published!`,
            link: `/notifications`,
            timestamp: serverTimestamp(),
            isRead: false,
            actor: { id: user.id, username: user.username, avatarUrl: user.avatarUrl }
        });
      }

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
    }
  };

  const applyCustomFont = () => {
    editor?.chain().focus().setFontFamily(customFont).run();
  };

  if (!storyDetails || !chapterDetails) return null;

  return (
    <div className="min-h-screen bg-background pb-32 flex flex-col items-center">
      <header className="w-full max-w-5xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
             <Input 
                value={chapterTitle} 
                onChange={e => setChapterTitle(e.target.value)}
                placeholder="Part Title..." 
                className="text-center border-none bg-transparent text-3xl md:text-5xl font-headline font-bold h-auto p-0 mb-2 focus-visible:ring-0 placeholder:opacity-20 shadow-none"
              />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
           {warningTags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight bg-red-500/10 text-red-500 border-red-500/20">
                 {tag}
                 <button onClick={() => setWarningTags(warningTags.filter(t => t !== tag))}><X className="h-3 w-3" /></button>
              </Badge>
           ))}
           <Input 
             value={tagInput}
             onChange={e => setTagInput(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && addTag()}
             placeholder="+ Add Warning Tag..."
             className="w-40 h-7 border-none bg-muted/50 rounded-full text-[10px] px-3 focus-visible:ring-0 text-center"
           />
        </div>
      </header>

      <main className="w-full max-w-3xl flex-1 px-4">
        <EditorContent editor={editor} className="min-h-[500px] prose dark:prose-invert max-w-none" />
      </main>

      {/* Floating Dynamic-Pill Toolbar */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-2 bg-card/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-10">
        
        {/* Style Tools */}
        <div className="flex items-center gap-0.5 px-1">
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleBold().run()} className={cn("h-10 w-10 rounded-full", editor?.isActive('bold') && "text-primary bg-primary/10")}>
            <Bold className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleItalic().run()} className={cn("h-10 w-10 rounded-full", editor?.isActive('italic') && "text-primary bg-primary/10")}>
            <Italic className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={cn("h-10 w-10 rounded-full", editor?.isActive('underline') && "text-primary bg-primary/10")}>
            <UnderlineIcon className="h-5 w-5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8 bg-white/10" />

        {/* Alignment Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary">
              {editor?.isActive({ textAlign: 'center' }) ? <AlignCenter className="h-5 w-5" /> : 
               editor?.isActive({ textAlign: 'right' }) ? <AlignRight className="h-5 w-5" /> : 
               editor?.isActive({ textAlign: 'justify' }) ? <AlignJustify className="h-5 w-5" /> : 
               <AlignLeft className="h-5 w-5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-12 p-1 flex flex-col gap-1 rounded-2xl border-white/10 bg-background/90" side="top">
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={cn("h-10 w-10 rounded-xl", editor?.isActive({ textAlign: 'left' }) && "text-primary bg-primary/10")}><AlignLeft className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={cn("h-10 w-10 rounded-xl", editor?.isActive({ textAlign: 'center' }) && "text-primary bg-primary/10")}><AlignCenter className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={cn("h-10 w-10 rounded-xl", editor?.isActive({ textAlign: 'right' }) && "text-primary bg-primary/10")}><AlignRight className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('justify').run()} className={cn("h-10 w-10 rounded-xl", editor?.isActive({ textAlign: 'justify' }) && "text-primary bg-primary/10")}><AlignJustify className="h-5 w-5" /></Button>
          </PopoverContent>
        </Popover>

        {/* Custom Font & Size */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary">
              <Type className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4 rounded-2xl border-white/10 bg-background/90 space-y-4" side="top">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Font Name</Label>
              <div className="flex gap-2">
                <Input 
                  value={customFont} 
                  onChange={e => setCustomFont(e.target.value)} 
                  className="h-8 text-xs bg-muted/20 border-none rounded-lg"
                  placeholder="e.g. Arial, Serif..."
                />
                <Button size="sm" variant="secondary" className="h-8 rounded-lg text-[10px]" onClick={applyCustomFont}>Apply</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Text Size (px)</Label>
              <Input 
                type="number"
                value={customSize} 
                onChange={e => setCustomSize(e.target.value)} 
                className="h-8 text-xs bg-muted/20 border-none rounded-lg"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Reader Experience Tools */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary bg-primary/10">
              <Sparkles className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 rounded-3xl border-white/10 bg-background/95 space-y-6 shadow-3xl" side="top">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-primary">
                  <StickyNote className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Author's Notes</span>
               </div>
               <Textarea 
                 value={authorNotes}
                 onChange={e => setAuthorNotes(e.target.value)}
                 className="text-xs bg-muted/20 border-none rounded-xl resize-none h-20"
                 placeholder="A quick note for readers..."
               />
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-blue-500">
                  <Music className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Atmosphere</span>
               </div>
               <Input 
                 value={atmosphere}
                 onChange={e => setAtmosphere(e.target.value)}
                 className="h-8 text-xs bg-muted/20 border-none rounded-lg"
                 placeholder="Soundtrack or mood..."
               />
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-purple-500">
                  <Users className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Featured Cast</span>
               </div>
               <Input 
                 value={featuredCast}
                 onChange={e => setFeaturedCast(e.target.value)}
                 className="h-8 text-xs bg-muted/20 border-none rounded-lg"
                 placeholder="Characters in this part..."
               />
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-8 bg-white/10 mx-1" />

        <div className="flex items-center gap-1 px-1">
          <Button variant="ghost" size="icon" onClick={() => handleSave()} className="h-10 w-10 rounded-full hover:text-primary">
            <Save className="h-5 w-5" />
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} className="rounded-full bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest px-4 shadow-lg shadow-primary/20">
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
          </Button>
        </div>
      </footer>

      {/* Success Celebration Popup */}
      {showPublishPopup && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
           <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative bg-card p-10 rounded-[3rem] shadow-2xl border border-primary/20 transform-gpu animate-in zoom-in-95 duration-700">
                 <CheckCircle className="h-20 w-20 text-primary mx-auto mb-6" />
                 <h2 className="text-2xl md:text-3xl font-headline font-bold mb-1 uppercase tracking-tight">
                    {storyDetails.title}
                 </h2>
                 <p className="text-xl md:text-2xl font-bold text-muted-foreground uppercase tracking-widest mb-10">
                    {chapterTitle} IS NOW PUBLISHED
                 </p>
                 <Button 
                    onClick={() => { setShowPublishPopup(false); router.push(`/write/edit-details?storyId=${storyId}`); }}
                    className="rounded-full px-12 h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary/30 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                 >
                    <Plus className="h-5 w-5" />
                    Add Another Chapter
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}