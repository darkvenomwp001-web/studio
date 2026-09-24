'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { 
  Save, 
  Sparkles, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Type, 
  X, 
  Plus, 
  Loader2,
  CheckCircle2,
  MessageSquare,
  Music,
  Users,
  Eraser,
  SeparatorHorizontal,
  Eye,
  Hash,
  ArrowLeft,
  Camera,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

const SUGGESTED_FONTS = [
  { name: 'Inter', value: 'var(--font-inter)' },
  { name: 'Space Grotesk', value: 'var(--font-space-grotesk)' },
  { name: 'System Sans', value: 'sans-serif' },
  { name: 'System Serif', value: 'serif' },
  { name: 'Monospace', value: 'monospace' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Lora', value: 'Lora, serif' },
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
];

export default function ChapterEditorPage({ searchParams }: { searchParams: Promise<{ storyId: string, chapterId: string }> }) {
  const { storyId, chapterId } = React.use(searchParams);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [storyDetails, setStoryDetails] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Typography States
  const [customFont, setCustomFont] = useState('var(--font-inter)');
  const [fontSize, setFontSize] = useState('18');

  // Background Image State
  const [headerImage, setHeaderImage] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-lg max-w-none min-h-[500px] py-10',
      },
    },
  });

  useEffect(() => {
    if (!storyId || !chapterId) return;

    const unsub = onSnapshot(doc(db, 'stories', storyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoryDetails({ id: docSnap.id, ...data });
        const chapter = data.chapters?.find((c: any) => c.id === chapterId);
        if (chapter) {
          setTitle(chapter.title || '');
          setTags(chapter.warningTags || []);
          setHeaderImage(chapter.headerImage || null);
          if (editor && editor.isEmpty) {
            editor.commands.setContent(chapter.content || '');
          }
        }
      }
    });

    return () => unsub();
  }, [storyId, chapterId, editor]);

  const wordCount = editor?.storage.characterCount.words() || 0;

  const handleUpdateField = async (fieldName: string, value: any) => {
    if (!storyId || !chapterId || !storyDetails) return;
    const storyRef = doc(db, 'stories', storyId);
    const updatedChapters = storyDetails.chapters.map((c: any) => {
      if (c.id === chapterId) return { ...c, [fieldName]: value };
      return c;
    });
    await updateDoc(storyRef, { chapters: updatedChapters, lastUpdated: serverTimestamp() });
  };

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    await handleUpdateField('content', editor.getHTML());
    setIsSaving(false);
    toast({ title: 'Draft Saved' });
  };

  const handlePublish = async () => {
    if (!storyId || !chapterId || !storyDetails) return;
    setIsPublishing(true);
    const storyRef = doc(db, 'stories', storyId);
    const updatedChapters = storyDetails.chapters.map((c: any) => {
      if (c.id === chapterId) return { ...c, content: editor?.getHTML(), status: 'Published' };
      return c;
    });
    
    await updateDoc(storyRef, { chapters: updatedChapters, lastUpdated: serverTimestamp() });
    
    await addDoc(collection(db, 'notifications'), {
      userId: storyDetails.author.id,
      actor: { id: user?.id || 'anon', username: user?.username || 'Guest', avatarUrl: user?.avatarUrl || '' },
      type: 'story_update',
      message: `${storyDetails.title}: ${title} is now published!`,
      timestamp: serverTimestamp(),
      isRead: false,
      link: `/stories/${storyId}/read/${chapterId}`
    });

    setIsPublishing(false);
    setShowSuccess(true);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updated = [...tags, newTag.trim()];
      setTags(updated);
      handleUpdateField('warningTags', updated);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    handleUpdateField('warningTags', updated);
  };

  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setHeaderImage(url);
        handleUpdateField('headerImage', url);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFormatting = () => {
    editor?.chain().focus().unsetAllMarks().clearNodes().run();
    toast({ title: 'Formatting Cleared' });
  };

  const addSceneBreak = () => {
    editor?.chain().focus().setHorizontalRule().run();
  };

  const openPreview = () => {
    router.push(`/stories/${storyId}/read/${chapterId}?preview=true`);
  };

  const AlignmentIcon = () => {
    if (editor?.isActive({ textAlign: 'center' })) return <AlignCenter className="h-5 w-5" />;
    if (editor?.isActive({ textAlign: 'right' })) return <AlignRight className="h-5 w-5" />;
    if (editor?.isActive({ textAlign: 'justify' })) return <AlignJustify className="h-5 w-5" />;
    return <AlignLeft className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Functional Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 h-14 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/20">
            <Hash className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{wordCount} Words</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border border-border/20">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10" onClick={clearFormatting} title="Clear Formatting">
            <Eraser className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10" onClick={addSceneBreak} title="Insert Scene Break">
            <SeparatorHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" className="rounded-full gap-2 border-border/60 font-bold text-[10px] uppercase tracking-widest" onClick={openPreview}>
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
      </header>

      {/* Hero Title Section with Background Photo */}
      <section className="relative w-full min-h-[300px] flex flex-col items-center justify-center overflow-hidden border-b border-border/20 mb-8">
        {headerImage ? (
          <Image src={headerImage} alt="Chapter Background" fill className="object-cover opacity-40 blur-[2px]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        )}
        
        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center text-center py-10">
          <label className="mb-6 cursor-pointer group">
            <div className="w-14 h-14 rounded-full bg-background/50 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-all shadow-xl">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleHeaderImageUpload} />
          </label>

          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleUpdateField('title', title)}
            placeholder="Part Title..." 
            className="border-none bg-transparent text-center text-3xl md:text-5xl font-headline font-bold h-auto p-0 mb-4 focus-visible:ring-0 placeholder:opacity-20 shadow-none"
          />

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="pl-3 pr-1 py-1 rounded-full bg-primary/10 text-primary border-primary/20">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-1 p-0.5 hover:bg-destructive/20 rounded-full">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input 
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="+ Add Warning"
              className="h-8 w-28 text-center text-[10px] uppercase font-bold tracking-widest rounded-full bg-muted/50 border-none px-3 focus-visible:ring-primary/20"
            />
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4">
        <div style={{ fontFamily: customFont, fontSize: `${fontSize}px` }}>
          <EditorContent editor={editor} />
        </div>
      </main>

      {/* Dynamic Floating Bottom Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-card/90 backdrop-blur-2xl border border-border/40 rounded-full shadow-2xl transition-all duration-300 transform-gpu">
        
        {/* Formatting Group */}
        <div className="flex items-center gap-0.5 bg-muted/40 rounded-full p-1 border border-border/20">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 rounded-full", editor?.isActive('bold') && "text-primary bg-primary/10")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 rounded-full", editor?.isActive('italic') && "text-primary bg-primary/10")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 rounded-full", editor?.isActive('underline') && "text-primary bg-primary/10")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignment Hub */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary hover:bg-primary/5 border border-primary/20 bg-background/50">
              <AlignmentIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={12} className="w-auto p-1.5 flex gap-1 rounded-full bg-card/95 backdrop-blur-xl border border-border/40 shadow-3xl">
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full", editor?.isActive({ textAlign: 'left' }) && "bg-primary/10 text-primary")} onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full", editor?.isActive({ textAlign: 'center' }) && "bg-primary/10 text-primary")} onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full", editor?.isActive({ textAlign: 'right' }) && "bg-primary/10 text-primary")} onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full", editor?.isActive({ textAlign: 'justify' }) && "bg-primary/10 text-primary")} onClick={() => editor?.chain().focus().setTextAlign('justify').run()}><AlignJustify className="h-4 w-4" /></Button>
          </PopoverContent>
        </Popover>

        {/* Typography Hub */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary hover:bg-primary/5 border border-primary/20 bg-background/50">
              <Type className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={12} className="w-64 p-4 rounded-[2rem] bg-card/95 backdrop-blur-xl border border-border/40 shadow-3xl space-y-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Typeface</Label>
              <ScrollArea className="h-48 rounded-xl border border-border/20 p-2">
                <div className="space-y-1">
                  {SUGGESTED_FONTS.map((f) => (
                    <Button 
                      key={f.name} 
                      variant="ghost" 
                      className={cn("w-full justify-start h-9 text-xs rounded-lg", customFont === f.value && "bg-primary/10 text-primary")}
                      onClick={() => setCustomFont(f.value)}
                    >
                      {f.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
              <Input 
                value={customFont} 
                onChange={(e) => setCustomFont(e.target.value)} 
                placeholder="Custom font name..." 
                className="h-10 rounded-xl bg-muted/20 border-none shadow-inner text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Text Size (px)</Label>
              <Input 
                type="number" 
                value={fontSize} 
                onChange={(e) => setFontSize(e.target.value)} 
                className="h-10 rounded-xl bg-muted/20 border-none shadow-inner text-xs"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Reader Experience Hub */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-accent hover:bg-accent/5 border border-accent/20 bg-background/50">
              <Sparkles className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={12} className="w-72 p-5 rounded-[2rem] bg-card/95 backdrop-blur-xl border border-border/40 shadow-3xl space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="h-4 w-4" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Author's Notes</Label>
              </div>
              <Textarea 
                placeholder="A quick meta-note for your readers..."
                className="rounded-2xl bg-muted/20 border-none shadow-inner text-xs min-h-[80px]"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-500">
                <Music className="h-4 w-4" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Atmosphere</Label>
              </div>
              <Input 
                placeholder="Soundtrack or mood description..."
                className="rounded-xl bg-muted/20 border-none shadow-inner h-9 text-xs"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-purple-500">
                <Users className="h-4 w-4" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Featured Cast</Label>
              </div>
              <Input 
                placeholder="Tag characters in this part..."
                className="rounded-xl bg-muted/20 border-none shadow-inner h-9 text-xs"
              />
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1 opacity-20" />

        {/* Global Action Group */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          </Button>
          <Button className="rounded-full px-6 h-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : "Publish"}
          </Button>
        </div>
      </div>

      {/* Success Celebration Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md animate-in fade-in duration-500">
          <div className="max-w-xl w-full mx-4 p-12 bg-card rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-border/40 text-center flex flex-col items-center transform-gpu">
            <CheckCircle2 className="h-24 w-24 text-primary mb-8" />
            <h2 className="text-4xl font-headline font-bold text-foreground mb-2 leading-tight uppercase">
              {storyDetails?.title}
            </h2>
            <p className="text-xl font-bold text-muted-foreground uppercase mb-10 tracking-[0.2em]">
              {title} IS NOW PUBLISHED
            </p>
            <Button 
              className="rounded-full px-10 h-14 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              onClick={() => {
                setShowSuccess(false);
                router.push(`/write/edit-details?storyId=${storyId}`);
              }}
            >
              Add Another Part
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
