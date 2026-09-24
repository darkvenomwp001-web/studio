'use client';

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Save, 
  Sparkles, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Type, 
  X, 
  Plus, 
  Loader2,
  MessageSquare,
  Music,
  Users,
  CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, addDoc, collection } from "firebase/firestore";

const SUGGESTED_FONTS = [
  "Inter", "Serif", "Monospace", "Merriweather", "Playfair Display", "Roboto", "Lora", "Montserrat"
];

export default function ChapterEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get("storyId");
  const chapterId = searchParams.get("chapterId");

  const [storyDetails, setStoryDetails] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [warningTags, setWarningTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Advanced Typography States
  const [customFont, setCustomFont] = useState("Inter");
  const [fontSize, setFontSize] = useState("18");
  const [alignment, setAlignment] = useState("left");

  // Reader Experience States (Non-AI)
  const [authorNote, setAuthorNote] = useState("");
  const [atmosphereUrl, setAtmosphereUrl] = useState("");
  const [featuredCast, setFeaturedCast] = useState("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-lg max-w-none min-h-[500px]',
      },
    },
  });

  useEffect(() => {
    if (!storyId || !chapterId) return;

    const unsub = onSnapshot(doc(db, "stories", storyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoryDetails({ id: docSnap.id, ...data });
        const chapter = data.chapters?.find((c: any) => c.id === chapterId);
        if (chapter) {
          setTitle(chapter.title || "");
          setWarningTags(chapter.warningTags || []);
          setAuthorNote(chapter.authorNote || "");
          setAtmosphereUrl(chapter.atmosphereUrl || "");
          setFeaturedCast(chapter.featuredCast || "");
          if (editor && editor.getHTML() !== chapter.content) {
            editor.commands.setContent(chapter.content || "");
          }
        }
      }
    });

    return () => unsub();
  }, [storyId, chapterId, editor]);

  const handleSave = async () => {
    if (!storyId || !chapterId || !editor) return;
    setIsSaving(true);
    const storyRef = doc(db, "stories", storyId);
    const updatedChapters = storyDetails.chapters.map((c: any) => {
      if (c.id === chapterId) {
        return {
          ...c,
          title,
          content: editor.getHTML(),
          warningTags,
          authorNote,
          atmosphereUrl,
          featuredCast,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    await updateDoc(storyRef, { chapters: updatedChapters });
    setIsSaving(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await handleSave();
    
    // Logic to notify inbox (simplified for example)
    await addDoc(collection(db, "notifications"), {
      userId: "arnv", // Notify owner
      actor: {
        id: storyDetails.author.id,
        username: storyDetails.author.username,
        avatarUrl: storyDetails.author.avatarUrl
      },
      type: "story_update",
      message: `${storyDetails.title}: ${title} is now published!`,
      timestamp: serverTimestamp(),
      isRead: false
    });

    setIsPublishing(false);
    setShowSuccess(true);
  };

  const addTag = () => {
    if (newTag.trim() && !warningTags.includes(newTag.trim())) {
      setWarningTags([...warningTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setWarningTags(warningTags.filter(t => t !== tag));
  };

  return (
    <div className="min-h-screen bg-background pb-24 transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-4 pt-12 text-center">
        {/* Centered Title */}
        <Input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chapter Title..." 
          className="border-none bg-transparent text-3xl md:text-5xl font-headline font-bold h-auto p-0 mb-4 focus-visible:ring-0 placeholder:opacity-20 shadow-none text-center"
        />

        {/* Centered Warning Tags */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-8 min-h-[40px]">
          {warningTags.map(tag => (
            <Badge key={tag} variant="secondary" className="pl-3 pr-1 py-1 rounded-full bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-colors">
              {tag}
              <button onClick={() => removeTag(tag)} className="ml-1 p-0.5 hover:bg-destructive/20 rounded-full">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="relative">
            <Input 
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="+ Add Warning"
              className="h-8 w-32 text-center text-xs rounded-full bg-muted/50 border-none px-4 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Editor Content Area */}
        <div 
          className="mt-8 px-6 py-10 bg-card/30 rounded-[2rem] border border-border/40 shadow-inner min-h-[600px] text-left"
          style={{ 
            fontFamily: customFont, 
            fontSize: `${fontSize}px`,
            textAlign: alignment as any 
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* DYNAMIC-PILLIED BOTTOM TOOLBAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 bg-card/90 backdrop-blur-xl border border-border/40 rounded-full shadow-2xl transition-all duration-300">
        
        {/* Text Formatting */}
        <div className="flex items-center gap-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 rounded-full", editor?.isActive('bold') && "bg-primary/20 text-primary")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 rounded-full", editor?.isActive('italic') && "bg-primary/20 text-primary")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 rounded-full", editor?.isActive('underline') && "bg-primary/20 text-primary")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1 opacity-20" />

        {/* Alignment Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              {alignment === 'left' && <AlignLeft className="h-4 w-4" />}
              {alignment === 'center' && <AlignCenter className="h-4 w-4" />}
              {alignment === 'right' && <AlignRight className="h-4 w-4" />}
              {alignment === 'justify' && <AlignJustify className="h-4 w-4" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-1 flex items-center gap-1 rounded-full bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setAlignment('left')}><AlignLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setAlignment('center')}><AlignCenter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setAlignment('right')}><AlignRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setAlignment('justify')}><AlignJustify className="h-4 w-4" /></Button>
          </PopoverContent>
        </Popover>

        {/* Font & Size Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary">
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-64 p-4 rounded-3xl bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl space-y-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Select Font</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {SUGGESTED_FONTS.map(f => (
                  <Button 
                    key={f} 
                    variant="outline" 
                    size="sm" 
                    className={cn("h-7 text-[10px] rounded-lg", customFont === f && "bg-primary text-white border-primary")}
                    onClick={() => setCustomFont(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <Separator className="my-2" />
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manual Input</Label>
              <Input 
                value={customFont} 
                onChange={(e) => setCustomFont(e.target.value)} 
                placeholder="Font Name..." 
                className="h-8 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Text Size (px)</Label>
              <Input 
                type="number" 
                value={fontSize} 
                onChange={(e) => setFontSize(e.target.value)} 
                className="h-8 text-xs rounded-xl"
              />
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1 opacity-20" />

        {/* Reader Experience Tools */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-accent">
              <Sparkles className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-72 p-5 rounded-[2.5rem] bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="h-4 w-4" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Author's Note</Label>
              </div>
              <Textarea 
                value={authorNote}
                onChange={(e) => setAuthorNote(e.target.value)}
                placeholder="A quick note for your readers..."
                className="rounded-2xl bg-muted/20 border-none shadow-inner text-xs min-h-[80px]"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-500">
                <Music className="h-4 w-4" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Atmosphere</Label>
              </div>
              <Input 
                value={atmosphereUrl}
                onChange={(e) => setAtmosphereUrl(e.target.value)}
                placeholder="Spotify/YouTube URL"
                className="rounded-xl bg-muted/20 border-none shadow-inner h-8 text-xs"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-purple-500">
                <Users className="h-4 w-4" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Featured Cast</Label>
              </div>
              <Input 
                value={featuredCast}
                onChange={(e) => setFeaturedCast(e.target.value)}
                placeholder="Tag characters in this part"
                className="rounded-xl bg-muted/20 border-none shadow-inner h-8 text-xs"
              />
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1 opacity-20" />

        {/* Save and Publish Actions */}
        <div className="flex items-center gap-1.5 pl-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button 
            className="rounded-full px-6 h-9 font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : "Publish"}
          </Button>
        </div>
      </div>

      {/* SUCCESS MODAL */}
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
              Add Another Chapter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
