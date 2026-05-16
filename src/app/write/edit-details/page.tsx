'use client';

import { useState, useEffect, Suspense, useCallback, useRef, ChangeEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Trash2, 
  ArrowLeft,
  CheckCircle,
  UploadCloud,
  Lock,
  Globe,
  Plus,
  BookOpen,
  Edit,
  Eye,
  EyeOff,
  Settings,
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Star,
  MessageSquare,
  Calendar,
  MoreVertical,
  Timer,
  Share2,
  Users,
  AtSign
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; 
import { doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import type { Story, UserSummary, Chapter, User as AppUser } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { cn, formatCompactNumber } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/placeholder-data';

const GENRES = [
    'Fantasy', 'Romance', 'Mystery', 'Thriller', 'Horror', 'Sci-Fi', 
    'Adventure', 'Historical', 'Poetry', 'Non-Fiction', 'Fanfiction', 'Action'
];

const LANGUAGES = ['English', 'Filipino', 'Spanish', 'French', 'German', 'Japanese'];

function ChapterSchedulingDialog({ storyId, chapter, onUpdate }: { storyId: string, chapter: Chapter, onUpdate: (updates: Partial<Chapter>) => void }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (chapter.scheduledAt) {
            const d = chapter.scheduledAt instanceof Timestamp ? chapter.scheduledAt.toDate() : new Date(chapter.scheduledAt);
            setDate(d.toISOString().split('T')[0]);
            setTime(d.toTimeString().split(' ')[0].substring(0, 5));
        }
    }, [chapter]);

    const handleSave = async () => {
        if (!date || !time) return;
        setIsSaving(true);
        const scheduledDate = new Date(`${date}T${time}:00`);
        
        onUpdate({ 
            scheduledAt: Timestamp.fromDate(scheduledDate),
            status: 'Draft' 
        });
        toast({ title: "Release Scheduled!" });
        setIsSaving(false);
    };

    const handleClear = () => {
        onUpdate({ scheduledAt: null });
        toast({ title: "Schedule Cleared" });
    };

    return (
        <DialogContent className="rounded-3xl">
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    Schedule Release
                </DialogTitle>
                <DialogDescription>Select the exact date and time this part will be published.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl bg-muted/30 border-none" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time">Time (24h)</Label>
                    <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} className="rounded-xl bg-muted/30 border-none" />
                </div>
                {chapter.scheduledAt && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3">
                        <Timer className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">Live: {formatDate(chapter.scheduledAt)}</span>
                    </div>
                )}
            </div>
            <DialogFooter className="flex-row gap-2 justify-end">
                {chapter.scheduledAt && <Button variant="ghost" className="rounded-full" onClick={handleClear}>Clear Schedule</Button>}
                <DialogClose asChild>
                    <Button onClick={handleSave} disabled={isSaving || !date || !time} className="rounded-full px-8">Save Schedule</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}

function ChapterAccessDialog({ storyId, chapter, onUpdate }: { storyId: string, chapter: Chapter, onUpdate: (updates: Partial<Chapter>) => void }) {
    const [inviteUsername, setInviteUsername] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    const handleInviteUser = async () => {
        if (!inviteUsername.trim()) return;
        setIsSearching(true);
        const q = query(collection(db, 'users'), where('username', '==', inviteUsername.trim().toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const targetId = snap.docs[0].id;
            if (chapter.invitedUserIds?.includes(targetId)) {
                toast({ title: "Already invited" });
            } else {
                onUpdate({ invitedUserIds: arrayUnion(targetId) as any });
                setInviteUsername('');
                toast({ title: "User Invited!" });
            }
        } else {
            toast({ title: "User not found", variant: "destructive" });
        }
        setIsSearching(false);
    };

    return (
        <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                    <Lock className="h-6 w-6 text-yellow-500" />
                    Special Access
                </DialogTitle>
                <DialogDescription>Chapters marked as exclusive are only readable by you and specific invited users.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold block">Exclusive Mode</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Manual invitations only</p>
                    </div>
                    <Switch 
                        checked={chapter.accessType === 'exclusive'} 
                        onCheckedChange={(c) => onUpdate({ accessType: c ? 'exclusive' : 'public' })} 
                    />
                </div>

                {chapter.accessType === 'exclusive' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Invite User</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input 
                                        placeholder="Handle..." 
                                        value={inviteUsername} 
                                        onChange={e => setInviteUsername(e.target.value)} 
                                        className="pl-9 bg-muted/30 border-none rounded-xl h-11"
                                    />
                                </div>
                                <Button onClick={handleInviteUser} disabled={isSearching || !inviteUsername.trim()} className="rounded-xl px-6">
                                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                             <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Invited Access ({chapter.invitedUserIds?.length || 0})</Label>
                             <ScrollArea className="h-32 border rounded-2xl p-2 bg-muted/10">
                                {chapter.invitedUserIds && chapter.invitedUserIds.length > 0 ? (
                                    <div className="space-y-1">
                                        {chapter.invitedUserIds.map(uid => (
                                            <div key={uid} className="flex items-center justify-between p-2 bg-background rounded-lg shadow-sm">
                                                <span className="text-xs font-bold font-mono">#{uid.substring(0,8)}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-destructive"
                                                    onClick={() => onUpdate({ invitedUserIds: arrayRemove(uid) as any })}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-center text-muted-foreground py-10 italic">No invitations sent yet.</p>
                                )}
                             </ScrollArea>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline" className="rounded-full px-8">Done</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}

function StoryDetailsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryStoryId = searchParams.get('storyId');

  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'No Changes'>('No Changes');
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [isMature, setIsMature] = useState(false);
  const [visibility, setVisibility] = useState<'Public' | 'Private' | 'Unlisted'>('Private');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [isProcessingCollaboration, setIsProcessingCollaboration] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!queryStoryId && user) {
      setIsLoading(true);
      const newStoryId = doc(collection(db, 'stories')).id;
      const newStoryData: Story = {
        id: newStoryId,
        title: 'Untitled Manuscript',
        author: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl },
        genre: 'Fantasy',
        summary: '',
        tags: [],
        chapters: [],
        status: 'Draft',
        lastUpdated: serverTimestamp(),
        coverImageUrl: '',
        language: 'English',
        isMature: false,
        visibility: 'Private',
        collaborators: [],
        collaboratorIds: [],
        views: 0,
      };
      const storyRef = doc(db, 'stories', newStoryId);
      setDoc(storyRef, newStoryData)
        .then(() => {
          router.replace(`/write/edit-details?storyId=${newStoryId}`, { scroll: false });
        })
        .catch(() => {
          router.push('/write');
          setIsLoading(false);
        });
      return;
    } 

    if (queryStoryId) {
      const unsubscribe = onSnapshot(doc(db, 'stories', queryStoryId), (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Story;
          setStory(data);
          setTitle(data.title || '');
          setSummary(data.summary || '');
          setGenre(data.genre || 'Fantasy');
          setLanguage(data.language || 'English');
          setIsMature(data.isMature || false);
          setVisibility(data.visibility || 'Private');
          setTags(data.tags || []);
          setDisclaimer(data.disclaimer || '');
        }
        setIsLoading(false);
      }, (error) => {
        setIsLoading(false);
      });
      return () => unsubscribe();
    }

  }, [queryStoryId, user, router]);

  const handleUpdateField = useCallback(async (fieldName: string, value: any) => {
    if (!story) return;
    setSaveStatus('Saving...');
    
    const storyRef = doc(db, 'stories', story.id);
    updateDoc(storyRef, {
        [fieldName]: value,
        lastUpdated: serverTimestamp()
    }).then(() => {
        setSaveStatus('Saved');
    }).catch(() => {
        setSaveStatus('No Changes');
        toast({ title: "Update Failed", description: "Could not save your changes.", variant: "destructive" });
    });
  }, [story, toast]);

  const handleUpdateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
      if (!story) return;
      const updatedChapters = story.chapters.map(ch => {
          if (ch.id === chapterId) return { ...ch, ...updates };
          return ch;
      });
      handleUpdateField('chapters', updatedChapters);
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !story) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        toast({ title: "Configuration Error", variant: "destructive"});
        setIsUploading(false);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.secure_url) {
            await handleUpdateField('coverImageUrl', data.secure_url);
            toast({ title: "Cover Updated!" });
        }
    } catch (error) {
        toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
        const newTags = [...tags, trimmedTag];
        setTags(newTags);
        handleUpdateField('tags', newTags);
        setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    handleUpdateField('tags', newTags);
  };

  const handleAddChapter = async () => {
      if (!story) return;
      
      const newChapterId = `chapter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newChapter: Chapter = {
        id: newChapterId,
        title: 'Untitled Part',
        content: '<p>Start writing your masterpiece here...</p>',
        order: story.chapters.length + 1,
        status: 'Draft',
        accessType: 'public',
        wordCount: 0,
        votes: 0,
        voterIds: [],
        tags: [],
        views: 0,
        commentsCount: 0
      };

      const storyRef = doc(db, 'stories', story.id);
      
      try {
        await updateDoc(storyRef, {
            chapters: arrayUnion(newChapter),
            lastUpdated: serverTimestamp()
        });
        router.push(`/write/edit?storyId=${story.id}&chapterId=${newChapterId}`);
      } catch (error) {
        toast({ title: "Error creating part", variant: "destructive" });
      }
  };

  const handleDeleteChapter = async (chapterId: string) => {
      if (!story) return;
      const updatedChapters = story.chapters.filter(ch => ch.id !== chapterId);
      await updateDoc(doc(db, 'stories', story.id), { chapters: updatedChapters, lastUpdated: serverTimestamp() });
      toast({ title: "Chapter deleted" });
  };

  const handleAddCollaborator = async () => {
      if (!story || !collaboratorUsername.trim()) return;
      setIsProcessingCollaboration(true);
      const q = query(collection(db, 'users'), where('username', '==', collaboratorUsername.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
          const collabUser = snap.docs[0].data() as AppUser;
          const collabSummary: UserSummary = { id: collabUser.id, username: collabUser.username, avatarUrl: collabUser.avatarUrl, displayName: collabUser.displayName };
          
          if (story.collaboratorIds?.includes(collabUser.id)) {
              toast({ title: "User already a collaborator" });
          } else {
              await updateDoc(doc(db, 'stories', story.id), {
                  collaborators: arrayUnion(collabSummary),
                  collaboratorIds: arrayUnion(collabUser.id)
              });
              setCollaboratorUsername('');
              toast({ title: "Collaborator added!" });
          }
      } else {
          toast({ title: "User not found", variant: "destructive" });
      }
      setIsProcessingCollaboration(false);
  };

  if (isLoading || authLoading || !story) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isOwner = user?.id === story.author.id;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-10 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
              <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
              <h1 className="text-3xl md:text-5xl font-headline font-bold">{title || 'Untitled Manuscript'}</h1>
          </div>
          <div className={cn(
              "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border shadow-sm",
              saveStatus === 'Saved' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
          )}>
              {saveStatus === 'Saving...' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              {saveStatus}
          </div>
      </header>

      <Tabs defaultValue="canvas" className="w-full">
          <TabsList className="grid grid-cols-4 max-w-2xl bg-muted/50 p-1 rounded-full mb-10 shadow-inner">
              <TabsTrigger value="canvas" className="rounded-full font-bold">Manuscript</TabsTrigger>
              <TabsTrigger value="chapters" className="rounded-full font-bold">Parts</TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-full font-bold">Settings</TabsTrigger>
              <TabsTrigger value="team" className="rounded-full font-bold">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col md:flex-row gap-10">
                  <div className="w-full md:w-64 space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Cover Art</Label>
                      <div 
                        className="relative aspect-[2/3] rounded-2xl overflow-hidden border-2 border-dashed border-border/60 group cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                          {story.coverImageUrl ? (
                              <>
                                <NextImage src={story.coverImageUrl} alt="Cover" fill className="object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <UploadCloud className="text-white h-10 w-10" />
                                </div>
                              </>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
                                  <UploadCloud className="h-10 w-10 text-muted-foreground/40" />
                                  <p className="text-xs font-medium text-muted-foreground/60">Upload Cover</p>
                              </div>
                          )}
                          {isUploading && (
                              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                          )}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                      <Button variant="outline" className="w-full rounded-xl" onClick={() => fileInputRef.current?.click()}>
                          {story.coverImageUrl ? 'Change Cover' : 'Upload Cover'}
                      </Button>
                  </div>

                  <div className="flex-1 space-y-8">
                      <div className="space-y-2">
                          <Label htmlFor="storyTitle" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Story Title</Label>
                          <Input 
                            id="storyTitle"
                            value={title} 
                            onChange={e => setTitle(e.target.value)}
                            onBlur={() => handleUpdateField('title', title)}
                            placeholder="Enter title..."
                            className="h-14 text-xl md:text-2xl font-bold rounded-2xl bg-card border-none shadow-inner focus-visible:ring-primary/30" 
                          />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Genre</Label>
                                <Select value={genre} onValueChange={(v) => { setGenre(v); handleUpdateField('genre', v); }}>
                                    <SelectTrigger className="h-12 rounded-xl bg-card border-none shadow-inner">
                                        <SelectValue placeholder="Select genre..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                           </div>
                           <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Language</Label>
                                <Select value={language} onValueChange={(v) => { setLanguage(v); handleUpdateField('language', v); }}>
                                    <SelectTrigger className="h-12 rounded-xl bg-card border-none shadow-inner">
                                        <SelectValue placeholder="Language..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                           </div>
                      </div>

                      <div className="space-y-2">
                          <Label htmlFor="summary" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Summary</Label>
                          <Textarea 
                            id="summary"
                            value={summary} 
                            onChange={e => setSummary(e.target.value)}
                            onBlur={() => handleUpdateField('summary', summary)}
                            placeholder="Manuscript summary..."
                            rows={8} 
                            className="rounded-2xl bg-card border-none shadow-inner resize-none text-base p-4 focus-visible:ring-primary/30" 
                          />
                      </div>
                  </div>
              </div>
          </TabsContent>

          <TabsContent value="chapters" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="rounded-3xl border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                      <div>
                          <CardTitle className="font-headline text-xl">Manuscript Map</CardTitle>
                          <CardDescription>{story.chapters.length} Parts total &bull; Exclusive and Scheduled Access</CardDescription>
                      </div>
                      <Button onClick={handleAddChapter} className="rounded-full shadow-lg shadow-primary/20 gap-2">
                          <Plus className="h-4 w-4" />
                          New Part
                      </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                      {story.chapters.length > 0 ? (
                        <div className="divide-y divide-border/40">
                            {story.chapters.sort((a,b) => a.order - b.order).map((ch, index) => (
                                <div key={ch.id} className="p-5 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                                            {index + 1}
                                        </div>
                                        <div className="truncate">
                                            <h4 className="font-bold text-sm truncate flex items-center gap-2">
                                                {ch.title}
                                                {ch.accessType === 'exclusive' && <Lock className="h-3 w-3 text-yellow-500" />}
                                                {ch.scheduledAt && <Calendar className="h-3 w-3 text-primary" />}
                                            </h4>
                                            
                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground mt-1">
                                                <span className={cn(
                                                    ch.status === 'Published' ? "text-green-600" : "text-yellow-600"
                                                )}>{ch.status}</span>
                                                {ch.scheduledAt && (
                                                    <div className="flex items-center gap-1 text-primary">
                                                        <Timer className="h-2.5 w-2.5" />
                                                        <span>Live: {formatDate(ch.scheduledAt)}</span>
                                                    </div>
                                                )}
                                                {ch.accessType === 'exclusive' && (
                                                    <div className="flex items-center gap-1 text-yellow-600">
                                                        <Users className="h-2.5 w-2.5" />
                                                        <span>{ch.invitedUserIds?.length || 0} Invited</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link href={`/write/edit?storyId=${story.id}&chapterId=${ch.id}`} passHref>
                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary" title="Edit Content"><Edit className="h-4 w-4" /></Button>
                                        </Link>
                                        
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary" title="Schedule Release"><Calendar className="h-4 w-4" /></Button>
                                            </DialogTrigger>
                                            <ChapterSchedulingDialog storyId={story.id} chapter={ch} onUpdate={(u) => handleUpdateChapter(ch.id, u)} />
                                        </Dialog>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-yellow-500/10 hover:text-yellow-600" title="Exclusive Access"><Lock className="h-4 w-4" /></Button>
                                            </DialogTrigger>
                                            <ChapterAccessDialog storyId={story.id} chapter={ch} onUpdate={(u) => handleUpdateChapter(ch.id, u)} />
                                        </Dialog>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10 hover:text-destructive" title="Delete Part"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-3xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this chapter?</AlertDialogTitle>
                                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteChapter(ch.id)} className="bg-destructive hover:bg-destructive/90 rounded-full px-6">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                      ) : (
                          <div className="py-20 text-center space-y-4">
                              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-muted-foreground font-medium">Your manuscript is empty.</p>
                              <Button onClick={handleAddChapter} variant="outline" className="rounded-full px-8">Add First Chapter</Button>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="advanced" className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                  <Card className="rounded-3xl border-none shadow-xl">
                      <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <RadioGroup value={visibility} onValueChange={(v) => { setVisibility(v as any); handleUpdateField('visibility', v); }} className="space-y-3">
                              <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value="Public" id="pub" />
                                  <Label htmlFor="pub" className="flex-1 cursor-pointer">
                                      <span className="font-bold block">Public</span>
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Everyone can read</span>
                                  </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 cursor-pointer">
                                  <RadioGroupItem value="Private" id="pri" />
                                  <Label htmlFor="pri" className="flex-1 cursor-pointer">
                                      <span className="font-bold block">Private</span>
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Author only</span>
                                  </Label>
                              </div>
                          </RadioGroup>
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>

          <TabsContent value="team" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Story Collaboration</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {isOwner && (
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Enter username..." 
                                    value={collaboratorUsername} 
                                    onChange={e => setCollaboratorUsername(e.target.value)} 
                                    className="h-12 rounded-xl bg-muted/20 border-none"
                                />
                                <Button onClick={handleAddCollaborator} disabled={isProcessingCollaboration || !collaboratorUsername.trim()} className="rounded-xl h-12 px-6">
                                    {isProcessingCollaboration ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
                                </Button>
                            </div>
                        )}
                        <div className="space-y-3">
                             <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Current Collaborators</Label>
                             <div className="grid gap-2">
                                {story.collaborators && story.collaborators.length > 0 ? story.collaborators.map(collab => (
                                    <div key={collab.id} className="flex items-center justify-between p-3 bg-muted/10 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={collab.avatarUrl} />
                                                <AvatarFallback>{collab.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-sm">@{collab.username}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{collab.displayName}</p>
                                            </div>
                                        </div>
                                        {isOwner && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    updateDoc(doc(db, 'stories', story.id), {
                                                        collaborators: arrayRemove(collab),
                                                        collaboratorIds: arrayRemove(collab.id)
                                                    });
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-xs text-muted-foreground italic py-4">No collaborators yet.</p>
                                )}
                             </div>
                        </div>
                    </CardContent>
                </Card>
              </div>
          </TabsContent>
      </Tabs>
    </div>
  );
}

export default function WriteDetailsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <StoryDetailsInner />
    </Suspense>
  );
}
