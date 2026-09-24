'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  addDoc, 
  collection, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Edit, 
  X, 
  Save, 
  Send, 
  Bold, 
  Italic, 
  Underline, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  AlignJustify, 
  Type, 
  Sparkles, 
  MessageSquare, 
  Music, 
  Users,
  ChevronDown,
  CheckCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';

export default function ChapterEditorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId');
  const chapterId = searchParams.get('chapterId');

  const [storyDetails, setStoryDetails] = useState<any>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [warningTags, setWarningTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [authorNotes, setAuthorNotes] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [featuredCast, setFeaturedCast] = useState('');
  const [customFont, setCustomFont] = useState('Inter');
  const [fontSize, setFontSize] = useState('16');
  
  const [isSaving, startSaveTransition] = useTransition();
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[60vh] pb-32',
      },
    },
  });

  useEffect(() => {
    if (!storyId || !chapterId || !editor) return;

    const docRef = doc(db, 'stories', storyId);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoryDetails({ id: docSnap.id, ...data });
        const chapter = data.chapters?.find((c: any) => c.id === chapterId);
        if (chapter) {
          setChapterTitle(chapter.title || '');
          setWarningTags(chapter.warningTags || []);
          setAuthorNotes(chapter.authorNotes || '');
          setAtmosphere(chapter.atmosphere || '');
          setFeaturedCast(chapter.featuredCast || '');
          if (editor.getHTML() !== chapter.content) {
            editor.commands.setContent(chapter.content || '');
          }
        }
      }
    });
    return () => unsub();
  }, [storyId, chapterId, editor]);

  const handleSave = () => {
    if (!storyId || !chapterId) return;
    startSaveTransition(async () => {
      const storyRef = doc(db, 'stories', storyId);
      const updatedChapters = storyDetails.chapters.map((c: any) => {
        if (c.id === chapterId) {
          return {
            ...c,
            title: chapterTitle,
            content: editor?.getHTML() || '',
            warningTags,
            authorNotes,
            atmosphere,
            featuredCast,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      await updateDoc(storyRef, {
        chapters: updatedChapters,
        lastUpdated: serverTimestamp(),
      });
      toast({ title: "Draft saved successfully" });
    });
  };

  const handlePublish = async () => {
    if (!storyId || !chapterId) return;
    setIsPublishing(true);
    try {
      const storyRef = doc(db, 'stories', storyId);
      const updatedChapters = storyDetails.chapters.map((c: any) => {
        if (c.id === chapterId) {
          return {
            ...c,
            title: chapterTitle,
            content: editor?.getHTML() || '',
            warningTags,
            authorNotes,
            atmosphere,
            featuredCast,
            status: 'Published',
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      await updateDoc(storyRef, {
        chapters: updatedChapters,
        lastUpdated: serverTimestamp(),
      });

      // Simple notification trigger simulation
      await addDoc(collection(db, 'notifications'), {
        userId: storyDetails.author.id,
        actor: { id: user?.id, username: user?.username, avatarUrl: user?.avatarUrl },
        type: 'story_update',
        message: `${chapterTitle} is now published in ${storyDetails.title}`,
        timestamp: serverTimestamp(),
        isRead: false,
      });

      setShowPublishSuccess(true);
    } catch (error) {
      toast({ title: "Publishing failed", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const addWarningTag = () => {
    if (tagInput.trim() && !warningTags.includes(tagInput.trim())) {
      setWarningTags([...warningTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeWarningTag = (tag: string) => {
    setWarningTags(warningTags.filter(t => t !== tag));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Centered Header Section */}
      <div className="max-w-4xl mx-auto pt-12 px-4 flex flex-col items-center text-center">
        <Input 
          value={chapterTitle} 
          onChange={(e) => setChapterTitle(e.target.value)}
          placeholder="Chapter Title..." 
          className="text-center border-none bg-transparent text-3xl md:text-5xl font-headline font-bold h-auto p-0 mb-4 focus-visible:ring-0 placeholder:opacity-20 shadow-none"
        />

        {/* Warning Tags Section */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-8 w-full">
          {warningTags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-600 border-red-500/20">
              {tag}
              <button onClick={() => removeWarningTag(tag)} className="ml-1 hover:text-red-800">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="relative">
            <Input 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWarningTag()}
              placeholder="+ Add Warning..."
              className="w-32 h-8 text-[10px] rounded-full bg-muted/50 border-none px-3 focus-visible:ring-primary/30 text-center"
            />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4">
        <EditorContent editor={editor} style={{ fontFamily: customFont, fontSize: `${fontSize}px` }} />
      </main>

      {/* Dynamic-Pillied Bottom Toolbar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-card/80 backdrop-blur-xl border border-border/40 shadow-2xl rounded-full p-2 flex items-center gap-1">
          
          {/* Formatting */}
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            <Underline className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Combined Alignment */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <AlignLeft className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-1 flex flex-col gap-1 rounded-2xl">
              <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().setTextAlign('justify').run()}><AlignJustify className="h-4 w-4" /></Button>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Advanced Font/Size Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-primary">
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-56 p-4 rounded-3xl space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Font Family</Label>
                <Input 
                  value={customFont} 
                  onChange={(e) => setCustomFont(e.target.value)} 
                  placeholder="Type font name..." 
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Font Size (px)</Label>
                <Input 
                  type="number" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(e.target.value)} 
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Reader Experience Module */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Sparkles className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 p-4 rounded-3xl space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <MessageSquare className="h-4 w-4" />
                  <Label className="text-[10px] font-black uppercase tracking-widest">Author's Note</Label>
                </div>
                <Textarea 
                  value={authorNotes} 
                  onChange={(e) => setAuthorNotes(e.target.value)} 
                  placeholder="Quick note for readers..." 
                  className="text-xs resize-none h-20 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-500">
                  <Music className="h-4 w-4" />
                  <Label className="text-[10px] font-black uppercase tracking-widest">Atmosphere</Label>
                </div>
                <Input 
                  value={atmosphere} 
                  onChange={(e) => setAtmosphere(e.target.value)} 
                  placeholder="Soundtrack URL/Mood..." 
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-purple-500">
                  <Users className="h-4 w-4" />
                  <Label className="text-[10px] font-black uppercase tracking-widest">Featured Cast</Label>
                </div>
                <Input 
                  value={featuredCast} 
                  onChange={(e) => setFeaturedCast(e.target.value)} 
                  placeholder="Tag characters..." 
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Save/Publish */}
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button className="rounded-full px-6 h-9 font-bold text-xs" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
          </Button>
        </div>
      </div>

      {/* Publish Success Popup */}
      {showPublishSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in duration-500">
          <div className="max-w-xl w-full mx-4 p-12 bg-card rounded-[3rem] shadow-2xl border border-border/40 text-center flex flex-col items-center">
            <CheckCircle className="h-20 w-20 text-green-500 mb-6" />
            <h2 className="text-3xl md:text-4xl font-headline font-bold mb-2 uppercase">
              {storyDetails?.title}: {chapterTitle}
            </h2>
            <p className="text-xl md:text-2xl font-bold text-muted-foreground uppercase mb-10 tracking-widest">
              IS NOW PUBLISHED
            </p>
            <Button 
              className="rounded-full px-10 h-14 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20"
              onClick={() => {
                setShowPublishSuccess(false);
                router.push(`/write/edit-details?storyId=${storyId}`);
              }}
            >
              Add Another Chapter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}