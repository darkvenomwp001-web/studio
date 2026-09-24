'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, ChangeEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Save, 
  Loader2, 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Settings, 
  Users, 
  CheckCircle, 
  BookOpen, 
  Eye, 
  ChevronUp, 
  ChevronDown,
  EllipsisVertical,
  Calendar,
  Lock,
  PlusCircle,
  TriangleAlert,
  Tag,
  AtSign,
  UploadCloud,
  Camera,
  ImagePlus
} from 'lucide-react';
import NextImage from 'next/image';

interface Story {
  id: string;
  author: { id: string; username: string; displayName?: string; avatarUrl?: string };
  title: string;
  summary: string;
  genre: string;
  chapters: Chapter[];
  status: 'Ongoing' | 'Completed' | 'Draft';
  visibility: 'Public' | 'Private' | 'Unlisted';
  lastUpdated: any;
  coverImageUrl?: string;
  tags: string[];
  views?: number;
  collaboratorIds?: string[];
  collaborators?: { id: string; username: string; avatarUrl?: string; displayName?: string }[];
  notes?: string;
  disclaimer?: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: 'Published' | 'Draft';
  wordCount?: number;
  votes?: number;
  voterIds?: string[];
  accessType: 'public' | 'premium' | 'exclusive';
  invitedUserIds?: string[];
  scheduledAt?: any;
  artworkUrl?: string;
  views?: number;
  commentsCount?: number;
}

const GENRES = [
  'Fantasy', 'Romance', 'Mystery', 'Thriller', 'Horror', 'Sci-Fi', 
  'Adventure', 'Historical', 'Poetry', 'Non-Fiction', 'Fanfiction', 'Action'
];

const LANGUAGES = ['English', 'Filipino', 'Spanish', 'French', 'German', 'Japanese'];

function StoryDetailsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, addNotification, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryStoryId = searchParams.get('storyId');

  const [storyDetails, setStoryDetails] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
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
        visibility: 'Private',
        collaborators: [],
        collaboratorIds: [],
        views: 0,
      };
      const storyRef = doc(db, 'stories', newStoryId);
      setDoc(storyRef, newStoryData)
        .then(() => {
          router.replace(`/write/edit?storyId=${newStoryId}`, { scroll: false });
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
          setStoryDetails(data);
          setTitle(data.title || '');
          setSummary(data.summary || '');
          setGenre(data.genre || 'Fantasy');
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
    if (!storyDetails) return;
    setSaveStatus('Saving...');
    
    const storyRef = doc(db, 'stories', storyDetails.id);
    updateDoc(storyRef, {
        [fieldName]: value,
        lastUpdated: serverTimestamp()
    }).then(() => {
        setSaveStatus('Saved');
    }).catch(() => {
        setSaveStatus('No Changes');
        toast({ title: "Update Failed", description: "Could not save your changes.", variant: "destructive" });
    });
  }, [storyDetails, toast]);

  const handleUpdateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
      if (!storyDetails) return;
      const updatedChapters = storyDetails.chapters.map(ch => {
          if (ch.id === chapterId) return { ...ch, ...updates };
          return ch;
      });
      handleUpdateField('chapters', updatedChapters);
  };

  const handleReorderChapter = async (chapterId: string, direction: 'up' | 'down') => {
      if (!storyDetails) return;
      const sorted = [...storyDetails.chapters].sort((a,b) => a.order - b.order);
      const index = sorted.findIndex(c => c.id === chapterId);
      if (direction === 'up' && index > 0) {
          [sorted[index], sorted[index-1]] = [sorted[index-1], sorted[index]];
      } else if (direction === 'down' && index < sorted.length - 1) {
          [sorted[index], sorted[index+1]] = [sorted[index+1], sorted[index]];
      } else {
          return;
      }
      const updated = sorted.map((ch, i) => ({ ...ch, order: i + 1 }));
      handleUpdateField('chapters', updated);
  };

  const handleDeleteChapter = async (chapterId: string) => {
      if (!storyDetails) return;
      const updatedChapters = storyDetails.chapters.filter(ch => ch.id !== chapterId);
      await updateDoc(doc(db, 'stories', storyDetails.id), { chapters: updatedChapters, lastUpdated: serverTimestamp() });
      toast({ title: "Part deleted" });
  };

  const handleDeleteStory = async () => {
      if (!storyDetails) return;
      await deleteDoc(doc(db, 'stories', storyDetails.id));
      toast({ title: "Manuscript Erased" });
      router.push('/write');
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
      if (!storyDetails) return;
      
      const newChapterId = doc(collection(db, 'placeholder')).id;
      const newChapter: Chapter = {
        id: newChapterId,
        title: 'Untitled Part',
        content: '<p>Start writing your story here...</p>',
        order: storyDetails.chapters.length + 1,
        status: 'Draft',
        accessType: 'public',
        wordCount: 0,
        votes: 0,
        voterIds: [],
        tags: [],
        views: 0,
        commentsCount: 0
      };

      await updateDoc(doc(db, 'stories', storyDetails.id), {
          chapters: arrayUnion(newChapter),
          lastUpdated: serverTimestamp()
      });
      router.push(`/write/edit?storyId=${storyDetails.id}&chapterId=${newChapterId}`);
  };

  const handleAddCollaborator = async () => {
      if (!storyDetails || !collaboratorUsername.trim()) return;
      setIsProcessingCollaboration(true);
      const q = query(collection(db, 'users'), where('username', '==', collaboratorUsername.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
          const collabUser = snap.docs[0].data() as any;
          const collabSummary = { id: snap.docs[0].id, username: collabUser.username, avatarUrl: collabUser.avatarUrl, displayName: collabUser.displayName };
          
          if (storyDetails.collaboratorIds?.includes(snap.docs[0].id)) {
              toast({ title: "User already a teammate" });
          } else {
              await updateDoc(doc(db, 'stories', storyDetails.id), {
                  collaborators: arrayUnion(collabSummary),
                  collaboratorIds: arrayUnion(snap.docs[0].id)
              });
              setCollaboratorUsername('');
              toast({ title: "Teammate added!" });
          }
      } else {
          toast({ title: "User not found", variant: "destructive" });
      }
      setIsProcessingCollaboration(false);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!storyDetails) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-10 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
              <Button variant="ghost" size="sm" onClick={() => router.push('/write')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
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
          <TabsList className="bg-muted/50 p-1 rounded-full mb-10 shadow-inner flex overflow-x-auto no-scrollbar">
              <TabsTrigger value="canvas" className="rounded-full font-bold flex-1 px-4">Manuscript</TabsTrigger>
              <TabsTrigger value="chapters" className="rounded-full font-bold flex-1 px-4">Parts</TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-full font-bold flex-1 px-4">Settings</TabsTrigger>
              <TabsTrigger value="team" className="rounded-full font-bold flex-1 px-4">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col md:flex-row gap-10">
                  <div className="w-full md:w-64 space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Cover Art</Label>
                      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border-2 border-dashed border-border/60 group cursor-pointer bg-muted/30">
                          {storyDetails.coverImageUrl ? (
                              <NextImage src={storyDetails.coverImageUrl} alt="Cover" fill className="object-cover" />
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center text-muted-foreground/40">
                                  <UploadCloud className="h-10 w-10" />
                                  <p className="text-xs font-medium">Upload Cover</p>
                              </div>
                          )}
                      </div>
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

                      <div className="space-y-2">
                          <Label htmlFor="summary" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Summary</Label>
                          <Textarea 
                            id="summary"
                            value={summary} 
                            onChange={e => setSummary(e.target.value)}
                            onBlur={() => handleUpdateField('summary', summary)}
                            placeholder="Brief overview of the story..."
                            rows={8} 
                            className="rounded-2xl bg-card border-none shadow-inner resize-none text-base p-4 focus-visible:ring-primary/30" 
                          />
                      </div>

                      <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Thematic Tags ({tags.length}/10)</Label>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                              {tags.map(tag => (
                                  <Badge key={tag} className="bg-primary/10 text-primary border-primary/20 gap-1 rounded-full px-3 h-8 font-bold text-[10px] uppercase">
                                      {tag}
                                      <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
                                  </Badge>
                              ))}
                          </div>
                          <div className="flex gap-2">
                              <Input 
                                placeholder="Add thematic tags..." 
                                value={tagInput} 
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                className="h-12 rounded-xl bg-card border-none shadow-inner text-sm"
                              />
                              <Button variant="secondary" onClick={handleAddTag} className="rounded-xl h-12 px-6">Add</Button>
                          </div>
                      </div>
                  </div>
              </div>
          </TabsContent>

          <TabsContent value="chapters" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline text-xl font-bold">Manuscript Parts</h3>
                  <Button onClick={handleAddChapter} className="rounded-full shadow-lg shadow-primary/20 gap-2">
                      <Plus className="h-4 w-4" />
                      Add Part
                  </Button>
              </div>

              {storyDetails.chapters.length > 0 ? (
                  <div className="divide-y divide-border/40">
                      {[...storyDetails.chapters].sort((a,b) => a.order - b.order).map((ch, index) => (
                          <div key={ch.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                              <div className="flex items-center gap-4 flex-1">
                                  <div className="flex flex-col gap-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorderChapter(ch.id, 'up')} disabled={index === 0}><ChevronUp className="h-3 w-3" /></Button>
                                      <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center font-bold text-sm">{index + 1}</div>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorderChapter(ch.id, 'down')} disabled={index === storyDetails.chapters.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-sm">{ch.title}</h4>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{ch.status} &bull; {ch.wordCount || 0} Words</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => router.push(`/write/edit?storyId=${storyDetails.id}&chapterId=${ch.id}`)} className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary"><Edit className="h-4 w-4" /></Button>
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-3xl">
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Delete this part?</AlertDialogTitle>
                                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteChapter(ch.id)} className="bg-destructive hover:bg-destructive/90 rounded-full">Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">No parts added yet.</div>
              )}
          </TabsContent>

          <TabsContent value="advanced" className="animate-in fade-in duration-500 space-y-8">
              <Card className="rounded-3xl border-none shadow-xl">
                  <CardHeader>
                      <CardTitle>Maturity & Visibility</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                          <div className="space-y-0.5">
                              <Label className="text-sm font-bold block">Mature Content (18+)</Label>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Requires age verification</p>
                          </div>
                          <Switch checked={isMature} onCheckedChange={(v) => { setIsMature(v); handleUpdateField('isMature', v); }} />
                      </div>
                      
                      <div className="space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Archive Visibility</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {['Public', 'Unlisted', 'Private'].map(v => (
                                  <Button key={v} variant={visibility === v ? 'default' : 'outline'} className="rounded-2xl h-14 font-bold uppercase tracking-widest" onClick={() => { setVisibility(v as any); handleUpdateField('visibility', v); }}>{v}</Button>
                              ))}
                          </div>
                      </div>
                  </CardContent>
                  <CardFooter className="p-6 border-t">
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" className="rounded-2xl h-14 w-full font-bold uppercase tracking-widest gap-2"><Trash2 className="h-5 w-5" /> Erase Manuscript</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Erase everything?</AlertDialogTitle>
                                  <AlertDialogDescription>This will delete every part and comment. Permanent action.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteStory} className="bg-destructive hover:bg-destructive/90 rounded-full">Erase Permanently</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </CardFooter>
              </Card>
          </TabsContent>

          <TabsContent value="team" className="animate-in fade-in duration-500">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="rounded-3xl border-none shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Teammates</CardTitle>
                        <CardDescription>Collaborate with fellow writers on this manuscript.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex gap-2">
                            <Input placeholder="Teammate handle..." value={collaboratorUsername} onChange={e => setCollaboratorUsername(e.target.value)} className="h-12 rounded-xl bg-muted/20 border-none" />
                            <Button onClick={handleAddCollaborator} disabled={isProcessingCollaboration || !collaboratorUsername.trim()} className="rounded-xl h-12 px-6">{isProcessingCollaboration ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}</Button>
                        </div>
                        <div className="grid gap-2">
                            {storyDetails.collaborators?.map(collab => (
                                <div key={collab.id} className="flex items-center justify-between p-3 bg-muted/10 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8"><AvatarImage src={collab.avatarUrl} /></Avatar>
                                        <span className="font-bold text-sm">@{collab.username}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleUpdateField('collaboratorIds', storyDetails.collaboratorIds?.filter(id => id !== collab.id))}><X className="h-4 w-4" /></Button>
                                </div>
                            ))}
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
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <StoryDetailsInner />
    </Suspense>
  );
}
