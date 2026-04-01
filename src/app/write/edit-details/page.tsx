'use client';

import { useState, useEffect, ChangeEvent, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Save, 
  Settings, 
  Trash2, 
  PlusCircle, 
  Edit, 
  BookOpen, 
  Users, 
  Info, 
  Eye, 
  EyeOff, 
  ShieldQuestion, 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  FileText, 
  Star, 
  ListChecks, 
  Sparkles, 
  UserPlus, 
  Lock,
  ArrowLeft,
  LayoutGrid,
  Type,
  Tags,
  Image as LucideImage
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; 
import { doc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Story, Chapter, UserSummary, User as AppUser, AllowedUser } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/placeholder-data'; 
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const AUTOSAVE_DELAY = 2000;
const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const AutoSaveStatusIndicator = ({ status, isUploading }: { status: string, isUploading: boolean }) => {
    if (isUploading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-600 rounded-full border border-yellow-500/20">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Syncing Art</span>
            </div>
        );
    }
    switch (status) {
      case 'Typing':
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 text-muted-foreground rounded-full border border-border/40">
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Syncing Changes...</span>
            </div>
        );
      case 'Saving':
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Saving</span>
            </div>
        );
      case 'Saved':
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full border border-green-500/20">
                <CheckCircle className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Protected</span>
            </div>
        );
      default:
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 text-muted-foreground/60 rounded-full border border-border/20">
                <span className="text-[10px] font-bold uppercase tracking-widest">Up to Date</span>
            </div>
        );
    }
};

export default function EditStoryDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, addNotification } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [storyTitle, setStoryTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [genre, setGenre] = useState('fantasy');
  const [tags, setTags] = useState('');
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null); 
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null); 
  const [language, setLanguage] = useState('English');
  const [isMature, setIsMature] = useState(false);
  const [visibility, setVisibility] = useState<'Public' | 'Private' | 'Unlisted'>('Public');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [isProcessingCollaboration, setIsProcessingCollaboration] = useState(false);

  const [premiumAccessChapter, setPremiumAccessChapter] = useState<Chapter | null>(null);
  const [premiumUsername, setPremiumUsername] = useState('');
  const [premiumDuration, setPremiumDuration] = useState('24h');
  const [isProcessingPremium, setIsProcessingPremium] = useState(false);

  const [autoSaveStatus, setAutoSaveStatus] = useState<'Idle' | 'Typing' | 'Saving' | 'Saved' | 'Error'>('Idle');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (story && !initialLoadComplete) {
      setStoryTitle(story.title);
      setSummary(story.summary);
      setGenre(story.genre.toLowerCase());
      setTags(story.tags.join(', '));
      setCoverImagePreview(story.coverImageUrl || 'https://placehold.co/512x800.png');
      setLanguage(story.language || 'English');
      setIsMature(story.isMature || false);
      setVisibility(story.visibility || 'Public');
      setInitialLoadComplete(true); 
      setAutoSaveStatus('Idle');
    }
  }, [story, initialLoadComplete]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }

    let unsubscribeStory: (() => void) | undefined;

    if (user && queryStoryId) {
      setIsLoading(true);
      setInitialLoadComplete(false); 
      const storyDocRef = doc(db, 'stories', queryStoryId);
      unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
          if (storyData.author.id !== user.id && !storyData.collaborators?.some(c => c.id === user.id)) {
            toast({ title: "Access Denied", description: "You don't have permission to edit this story.", variant: "destructive" });
            router.push('/write');
            return;
          }
          setStory(storyData);
        } else {
          toast({ title: "Error", description: "Story not found.", variant: "destructive" });
          router.push('/write');
        }
        setIsLoading(false);
      }, async (serverError) => {
        setIsLoading(false);
      });
    } else if (user && !queryStoryId) { 
      setIsLoading(true);
      setInitialLoadComplete(false);
      const newStoryId = doc(collection(db, 'stories')).id; 
      const newStoryData: Story = {
        id: newStoryId,
        title: 'New Story Title',
        author: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl },
        genre: 'fantasy',
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
      setDoc(storyRef, newStoryData).then(() => {
        router.replace(`/write/edit-details?storyId=${newStoryId}`, { scroll: false });
      }).catch(async (serverError) => {
        router.push('/write');
        setIsLoading(false);
      });
    } else if (!user && !authLoading) {
        setIsLoading(false);
    }
    return () => {
      if (unsubscribeStory) unsubscribeStory();
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [queryStoryId, user, authLoading, router, toast]);

  const handleAutoSaveChanges = useCallback(async () => {
    if (!story || !user || !initialLoadComplete || isUploadingCover) return;

    setAutoSaveStatus('Saving');

    const storyUpdateData = {
      title: storyTitle,
      summary: summary,
      genre: genre,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      language: language,
      isMature: isMature,
      visibility: visibility,
      lastUpdated: serverTimestamp(),
    };

    const storyDocRef = doc(db, 'stories', story.id);
    updateDoc(storyDocRef, storyUpdateData)
      .then(() => setAutoSaveStatus('Saved'))
      .catch(async (serverError) => {
        setAutoSaveStatus('Error');
      });
  }, [story, user, storyTitle, summary, genre, tags, language, isMature, visibility, initialLoadComplete, isUploadingCover]);

  useEffect(() => {
    if (!initialLoadComplete || isLoading || authLoading || !story || isUploadingCover) return;

    const hasChanged = story.title !== storyTitle ||
                       story.summary !== summary ||
                       story.genre.toLowerCase() !== genre ||
                       story.tags.join(', ') !== tags ||
                       story.language !== language ||
                       story.isMature !== isMature ||
                       story.visibility !== visibility;

    if (!hasChanged) return;
    setAutoSaveStatus('Typing');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => handleAutoSaveChanges(), AUTOSAVE_DELAY);
  }, [storyTitle, summary, genre, tags, language, isMature, visibility, story, initialLoadComplete, isLoading, authLoading, isUploadingCover, handleAutoSaveChanges]);

  const handleCoverImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) { 
        toast({ title: "Image Too Large", variant: "destructive" });
        return;
      }
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };
  
  useEffect(() => {
    if (!coverImageFile || !story) return;

    const uploadCoverImage = async () => {
        setIsUploadingCover(true);
        setAutoSaveStatus('Saving');
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        const formData = new FormData();
        formData.append('file', coverImageFile);
        formData.append('upload_preset', uploadPreset!);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) {
                const storyDocRef = doc(db, 'stories', story.id);
                await updateDoc(storyDocRef, { coverImageUrl: data.secure_url, lastUpdated: serverTimestamp() });
                setCoverImageFile(null);
                toast({ title: "Cover Image Updated!" });
                setAutoSaveStatus('Saved');
            }
        } catch (error) {
            setAutoSaveStatus('Error');
        } finally {
            setIsUploadingCover(false);
        }
    };
    uploadCoverImage();
  }, [coverImageFile, story, toast]);

  const confirmDeleteChapter = async (chapter: Chapter) => {
    if (!story) return;
    setAutoSaveStatus('Saving');
    const updatedChapters = story.chapters.filter(ch => ch.id !== chapter.id)
                                       .map((ch, index) => ({ ...ch, order: index + 1 }));
    
    const storyDocRef = doc(db, 'stories', story.id);
    updateDoc(storyDocRef, { chapters: updatedChapters, lastUpdated: serverTimestamp() })
      .then(() => {
        toast({title: "Chapter Deleted"});
        setAutoSaveStatus('Saved');
      })
      .finally(() => setChapterToDelete(null));
  };

  const handleAddCollaborator = async () => {
    if (!story || !collaboratorUsername.trim() || !user) return;
    setIsProcessingCollaboration(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', collaboratorUsername.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: "User Not Found", variant: "destructive" });
        setIsProcessingCollaboration(false);
        return;
      }
      
      const collabDoc = querySnapshot.docs[0];
      const collabData = collabDoc.data();
      const newCollaborator: UserSummary = { id: collabDoc.id, username: collabData.username, displayName: collabData.displayName, avatarUrl: collabData.avatarUrl };

      const updatedCollaborators = [...(story.collaborators || []), newCollaborator];
      const updatedCollaboratorIds = [...(story.collaboratorIds || []), newCollaborator.id];
      await updateDoc(doc(db, 'stories', story.id), { collaborators: updatedCollaborators, collaboratorIds: updatedCollaboratorIds, lastUpdated: serverTimestamp() });
      setCollaboratorUsername('');
      toast({ title: "Collaborator Added" });
    } finally {
        setIsProcessingCollaboration(false);
    }
  };

  const handleGrantPremiumAccess = async () => {
    if (!story || !premiumAccessChapter || !premiumUsername.trim()) return;
    setIsProcessingPremium(true);
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', premiumUsername.trim()));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            toast({ title: "User Not Found", variant: "destructive"});
            setIsProcessingPremium(false);
            return;
        }

        const targetUser = userSnapshot.docs[0];
        const chapters = [...story.chapters];
        const chapterIndex = chapters.findIndex(c => c.id === premiumAccessChapter.id);

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 1);

        const newAllowedUser: AllowedUser = { userId: targetUser.id, username: targetUser.data().username, expiresAt: Timestamp.fromDate(expiryDate) };
        chapters[chapterIndex].allowedUsers = [...(chapters[chapterIndex].allowedUsers || []), newAllowedUser];
        chapters[chapterIndex].accessType = 'premium';

        await updateDoc(doc(db, 'stories', story.id), { chapters });
        toast({ title: "Access Granted!" });
        setPremiumUsername('');
    } finally {
        setIsProcessingPremium(false);
    }
  };

  const isSaving = isUploadingCover || autoSaveStatus === 'Saving';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-10 pb-24 overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/write')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight line-clamp-1">
              {storyTitle || 'Untitled Manuscript'}
          </h1>
        </div>
        <div className="flex flex-shrink-0">
          <AutoSaveStatusIndicator status={autoSaveStatus} isUploading={isUploadingCover} />
        </div>
      </header>

      <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm mb-10">
              <TabsTrigger value="content" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold">Canvas</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold">Configure</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                  <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                      <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden group/cover">
                          <CardContent className="p-6">
                              <div className="aspect-[2/3] w-full relative rounded-xl overflow-hidden shadow-inner cursor-pointer bg-muted/30 border-2 border-dashed border-border/60" onClick={() => !isSaving && fileInputRef.current?.click()}>
                                  <Image src={coverImagePreview || 'https://placehold.co/512x800.png'} alt={storyTitle} fill className="object-cover" />
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity">
                                      <UploadCloud className="text-white h-8 w-8" />
                                  </div>
                              </div>
                              <input type="file" ref={fileInputRef} onChange={handleCoverImageSelect} accept="image/*" className="hidden" />
                          </CardContent>
                      </Card>
                  </div>

                  <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                      <div className="grid gap-6">
                          <div className="space-y-2">
                              <Label htmlFor="storyTitle" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Manuscript Title</Label>
                              <Input id="storyTitle" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} className="h-14 text-xl font-bold rounded-2xl bg-card/50" disabled={isSaving} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="summary" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">The Blurb</Label>
                              <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={8} className="rounded-2xl bg-card/50" disabled={isSaving} />
                          </div>
                      </div>
                      
                      <div className="space-y-6">
                          <div className="flex items-center justify-between px-1">
                              <h3 className="text-xl font-headline font-bold text-foreground">Table of Contents</h3>
                              <Badge variant="outline">{story.chapters.length} Parts</Badge>
                          </div>

                          <Card className="border-border/40 bg-card/50">
                              <CardContent className="p-0">
                                  {story.chapters.length > 0 ? (
                                      <div className="divide-y divide-border/40">
                                          {story.chapters.sort((a, b) => a.order - b.order).map(chapter => (
                                              <div key={chapter.id} className="flex items-center justify-between p-5 hover:bg-primary/5 transition-all group">
                                                  <div className="flex-1 min-w-0">
                                                      <Link href={`/write/edit?storyId=${story.id}&chapterId=${chapter.id}`} className="font-bold text-base hover:text-primary transition-colors">
                                                          {chapter.order}. {chapter.title}
                                                      </Link>
                                                  </div>
                                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <Button variant="ghost" size="icon" onClick={() => setChapterToDelete(chapter)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <div className="text-center py-20"><p className="text-muted-foreground">Your canvas is blank.</p></div>
                                  )}
                              </CardContent>
                              <CardFooter className="p-4 bg-muted/20 border-t">
                                  <Link href={`/write/edit?storyId=${story.id}`} passHref className="w-full">
                                      <Button variant="outline" className="w-full h-12 rounded-xl" disabled={isSaving}>Initialize New Chapter</Button>
                                  </Link>
                              </CardFooter>
                          </Card>
                      </div>
                  </div>
              </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <Card className="border-border/40 bg-card/50">
                      <CardHeader className="bg-muted/20 border-b"><CardTitle>Categorization</CardTitle></CardHeader>
                      <CardContent className="p-6 space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Genre</Label>
                                  <Select value={genre} onValueChange={setGenre}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fantasy">Fantasy</SelectItem><SelectItem value="romance">Romance</SelectItem></SelectContent></Select>
                              </div>
                              <div className="space-y-2">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Language</Label>
                                  <Select value={language} onValueChange={setLanguage}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="English">English</SelectItem></SelectContent></Select>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Visibility</Label>
                              <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as any)} className="grid gap-2">
                                  <div className="flex items-center space-x-2 border p-3 rounded-xl"><RadioGroupItem value="Public" id="v1" /><Label htmlFor="v1">Public</Label></div>
                                  <div className="flex items-center space-x-2 border p-3 rounded-xl"><RadioGroupItem value="Private" id="v2" /><Label htmlFor="v2">Private</Label></div>
                              </RadioGroup>
                          </div>
                      </CardContent>
                  </Card>
                  
                  <Card className="border-border/40 bg-card/50">
                      <CardHeader className="bg-muted/20 border-b"><CardTitle>Collaboration</CardTitle></CardHeader>
                      <CardContent className="p-6 space-y-4">
                          <div className="flex gap-2">
                              <Input placeholder="User @handle" value={collaboratorUsername} onChange={e => setCollaboratorUsername(e.target.value)} className="bg-background" />
                              <Button onClick={handleAddCollaborator} disabled={isProcessingCollaboration}>Add</Button>
                          </div>
                          <div className="space-y-2">
                              {story.collaborators?.map(c => (
                                  <div key={c.id} className="flex items-center justify-between p-2 border rounded-lg">
                                      <span className="text-sm font-bold">@{c.username}</span>
                                      <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>
      </Tabs>

      <AlertDialog open={!!chapterToDelete} onOpenChange={() => setChapterToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete Part?</AlertDialogTitle><AlertDialogDescription>This segment will be lost forever.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Discard</AlertDialogCancel>
                  <AlertDialogAction onClick={() => chapterToDelete && confirmDeleteChapter(chapterToDelete)} className="bg-destructive">Confirm Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}