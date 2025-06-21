
'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useRef, useCallback } from 'react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Settings, Trash2, PlusCircle, Edit, BookOpen, Users, Info, Eye, EyeOff, ShieldQuestion, UploadCloud, CheckCircle, AlertCircle, FileText, Star, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { Story, Chapter, UserSummary, User as AppUser } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/placeholder-data'; 

const AUTOSAVE_DELAY = 2000; // 2 seconds
const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function EditStoryDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [isProcessingCollaboration, setIsProcessingCollaboration] = useState(false);

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
      }, (error) => {
        console.error("Error fetching story:", error);
        toast({ title: "Error", description: "Could not load story details.", variant: "destructive" });
        setIsLoading(false);
        router.push('/write');
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
      };
      setDoc(doc(db, 'stories', newStoryId), newStoryData).then(() => {
        router.replace(`/write/edit-details?storyId=${newStoryId}`, { scroll: false });
      }).catch(error => {
        console.error("Error creating new story document:", error);
        toast({ title: "Error", description: "Could not create new story.", variant: "destructive" });
        router.push('/write');
        setIsLoading(false);
      });
    } else if (!user && !authLoading) {
        setIsLoading(false);
    }
    return () => {
      if (unsubscribeStory) unsubscribeStory();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [queryStoryId, user, authLoading, router, toast]);

  // Effect for handling cover image uploads immediately upon selection
  useEffect(() => {
    if (!coverImageFile || !story) {
      return;
    }

    const uploadCoverImage = async () => {
        setIsUploadingCover(true);
        setAutoSaveStatus('Saving');
        toast({ title: "Uploading Cover...", description: "Your new cover image is being uploaded to Cloudinary." });
        
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            toast({
                title: 'Configuration Error',
                description: 'Cloudinary environment variables are not set. Cannot upload cover.',
                variant: 'destructive',
            });
            setIsUploadingCover(false);
            setAutoSaveStatus('Error');
            return;
        }

        const formData = new FormData();
        formData.append('file', coverImageFile);
        formData.append('upload_preset', uploadPreset);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.secure_url) {
                const downloadURL = data.secure_url;
                const storyDocRef = doc(db, 'stories', story.id);
                await updateDoc(storyDocRef, {
                    coverImageUrl: downloadURL,
                    lastUpdated: serverTimestamp(),
                });
                
                setCoverImageFile(null); // Clear the file state after successful upload
                toast({ title: "Cover Image Updated!", description: "Your new cover is saved." });
                setAutoSaveStatus('Saved');
            } else {
                throw new Error(data.error?.message || 'Unknown Cloudinary error');
            }
        } catch (error: any) {
            console.error("Error uploading cover image to Cloudinary:", error);
            toast({ title: "Upload Failed", description: "Could not upload cover image.", variant: "destructive" });
            setAutoSaveStatus('Error');
        } finally {
            setIsUploadingCover(false);
        }
    };

    uploadCoverImage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverImageFile, story?.id, toast]);


  // Callback for auto-saving text and metadata fields
  const handleAutoSaveChanges = useCallback(async () => {
    if (!story || !user || !initialLoadComplete) {
      return;
    }

    const hasChanged = story.title !== storyTitle ||
                       story.summary !== summary ||
                       story.genre.toLowerCase() !== genre ||
                       story.tags.join(', ') !== tags ||
                       story.language !== language ||
                       story.isMature !== isMature ||
                       story.visibility !== visibility;

    if (!hasChanged) {
        setAutoSaveStatus('Saved');
        return;
    }

    setAutoSaveStatus('Saving');

    const storyDataToUpdate = {
      title: storyTitle,
      summary: summary,
      genre: genre,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      language: language,
      isMature: isMature,
      visibility: visibility,
      status: visibility === 'Public' && story.chapters.some(c => c.status === 'Published') ? 'Ongoing' : (story.status === 'Completed' ? 'Completed' : 'Draft'),
      lastUpdated: serverTimestamp(),
    };

    try {
      const storyDocRef = doc(db, 'stories', story.id);
      await updateDoc(storyDocRef, storyDataToUpdate);
      setAutoSaveStatus('Saved');
    } catch (error) {
      console.error("Error auto-saving story details:", error);
      setAutoSaveStatus('Error');
      toast({ title: "Auto-save Failed", description: "Could not save changes.", variant: "destructive" });
    }
  }, [story, user, storyTitle, summary, genre, tags, language, isMature, visibility, toast, initialLoadComplete]);

  // Effect for triggering auto-save on text/metadata fields
  useEffect(() => {
    if (!initialLoadComplete || isLoading || authLoading || !story || isUploadingCover) {
      return;
    }

    const hasChanged = story.title !== storyTitle ||
                       story.summary !== summary ||
                       story.genre.toLowerCase() !== genre ||
                       story.tags.join(', ') !== tags ||
                       story.language !== language ||
                       story.isMature !== isMature ||
                       story.visibility !== visibility;

    if (!hasChanged) {
      if (autoSaveStatus === 'Typing') setAutoSaveStatus('Saved');
      return;
    }
    
    if (autoSaveStatus !== 'Saving' && autoSaveStatus !== 'Error') {
      setAutoSaveStatus('Typing');
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      handleAutoSaveChanges();
    }, AUTOSAVE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [storyTitle, summary, genre, tags, language, isMature, visibility, story, initialLoadComplete, isLoading, authLoading, isUploadingCover, handleAutoSaveChanges, autoSaveStatus]);


  const handleCoverImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) { 
        toast({ 
            title: "Image Too Large", 
            description: `Please select an image smaller than ${MAX_COVER_IMAGE_SIZE_BYTES / (1024*1024)}MB.`, 
            variant: "destructive" 
        });
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setCoverImageFile(file); // This will trigger the upload useEffect
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };
  
  const confirmDeleteChapter = async (chapter: Chapter) => {
    if (!story) return;
    const originalAutoSaveStatus = autoSaveStatus;
    setAutoSaveStatus('Saving');
    const updatedChapters = story.chapters.filter(ch => ch.id !== chapter.id)
                                       .map((ch, index) => ({ ...ch, order: index + 1 }));
    try {
      const storyDocRef = doc(db, 'stories', story.id);
      await updateDoc(storyDocRef, { chapters: updatedChapters, lastUpdated: serverTimestamp() });
      toast({title: "Chapter Deleted", description: `Chapter "${chapter.title}" has been removed.`});
      setAutoSaveStatus('Saved');
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast({title: "Error", description: "Failed to delete chapter.", variant: "destructive"});
      setAutoSaveStatus('Error');
    } finally {
      setChapterToDelete(null);
      if (originalAutoSaveStatus !== 'Saving' && originalAutoSaveStatus !== 'Error') {
          setTimeout(() => setAutoSaveStatus(originalAutoSaveStatus), 500);
      }
    }
  };

  const handleAddCollaborator = async () => {
    if (!story || !collaboratorUsername.trim() || !user) return;
    if (story.author.id !== user.id) {
        toast({ title: "Permission Denied", description: "Only the story author can add collaborators.", variant: "destructive" });
        return;
    }
    setIsProcessingCollaboration(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', collaboratorUsername.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: "User Not Found", description: `User "${collaboratorUsername}" not found.`, variant: "destructive" });
        setIsProcessingCollaboration(false);
        return;
      }
      
      const collaboratorUserDoc = querySnapshot.docs[0];
      const collaboratorUserData = {id: collaboratorUserDoc.id, ...collaboratorUserDoc.data()} as AppUser;

      if (collaboratorUserData.id === user.id) {
        toast({ title: "Cannot Add Self", description: "You are the author.", variant: "destructive" });
        setIsProcessingCollaboration(false);
        return;
      }
      if (story.collaborators?.some(c => c.id === collaboratorUserData.id)) {
        toast({ title: "Already Collaborator", description: `${collaboratorUserData.displayName || collaboratorUserData.username} is already a collaborator.`, variant: "destructive" });
        setIsProcessingCollaboration(false);
        return;
      }

      const newCollaborator: UserSummary = {
        id: collaboratorUserData.id,
        username: collaboratorUserData.username,
        displayName: collaboratorUserData.displayName,
        avatarUrl: collaboratorUserData.avatarUrl,
      };

      const updatedCollaborators = [...(story.collaborators || []), newCollaborator];
      const updatedCollaboratorIds = [...(story.collaboratorIds || []), newCollaborator.id];
      const storyDocRef = doc(db, 'stories', story.id);
      await updateDoc(storyDocRef, { 
          collaborators: updatedCollaborators,
          collaboratorIds: updatedCollaboratorIds,
          lastUpdated: serverTimestamp()
      });
      setCollaboratorUsername('');
      toast({ title: "Collaborator Added", description: `${newCollaborator.displayName || newCollaborator.username} can now contribute.` });
    } catch (error) {
        console.error("Error adding collaborator:", error);
        toast({title: "Error", description: "Could not add collaborator. Please try again.", variant: "destructive"});
    } finally {
        setIsProcessingCollaboration(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!story || !user) return;
     if (story.author.id !== user.id) {
        toast({ title: "Permission Denied", description: "Only the story author can remove collaborators.", variant: "destructive" });
        return;
    }
    setIsProcessingCollaboration(true);
    const updatedCollaborators = story.collaborators?.filter(c => c.id !== collaboratorId);
    const updatedCollaboratorIds = story.collaboratorIds?.filter(id => id !== collaboratorId);
    try {
        const storyDocRef = doc(db, 'stories', story.id);
        await updateDoc(storyDocRef, { 
            collaborators: updatedCollaborators,
            collaboratorIds: updatedCollaboratorIds,
            lastUpdated: serverTimestamp() 
        });
        toast({ title: "Collaborator Removed" });
    } catch (error) {
        console.error("Error removing collaborator:", error);
        toast({title: "Error", description: "Could not remove collaborator. Please try again.", variant: "destructive"});
    } finally {
        setIsProcessingCollaboration(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!story || !user || story.author.id !== user.id) {
      toast({ title: "Unauthorized", description: "Only the story author can delete it.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'stories', story.id));
      toast({ title: "Story Deleted", description: `"${story.title}" has been permanently deleted.` });
      router.push('/write');
    } catch (error) {
      console.error("Error deleting story:", error);
      toast({ title: "Error", description: "Could not delete the story.", variant: "destructive" });
    }
  };


  if (isLoading || authLoading || (queryStoryId && !story && !initialLoadComplete)) { 
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading story details...</p>
      </div>
    );
  }

  if (!user) { 
    return <div className="text-center py-10">Please sign in to edit stories.</div>;
  }
  
  if (!story && queryStoryId) { 
    return (
        <div className="text-center py-10">
            <Info className="mx-auto h-12 w-12 text-destructive mb-4" />
            <p className="text-xl">Story not found or you don't have permission to edit it.</p>
            <Link href="/write">
                <Button variant="link" className="mt-2">Go to Writing Dashboard</Button>
            </Link>
        </div>
    );
  }
  
  if (!story) { 
     return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Initializing new story...</p>
      </div>
    );
  }

  const getChapterStatusColor = (status?: 'Published' | 'Draft') => {
    if (status === 'Published') return 'text-green-600 dark:text-green-400';
    if (status === 'Draft') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const isSaving = isUploadingCover || autoSaveStatus === 'Saving';

  const AutoSaveStatusIndicator = () => {
    if (isUploadingCover) {
        return <div className="text-xs text-yellow-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading Cover...</div>;
    }
    switch (autoSaveStatus) {
      case 'Typing':
        return <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Changes pending...</div>;
      case 'Saving':
        return <div className="text-xs text-yellow-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</div>;
      case 'Saved':
        return <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> All changes saved</div>;
      case 'Error':
        return <div className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Save error</div>;
      case 'Idle':
      default:
        return <div className="text-xs text-muted-foreground">Editing story details...</div>;
    }
  };


  return (
    <AlertDialog>
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">
              {queryStoryId ? "Edit Story Details" : "Create New Story"}
            </h1>
            <p className="text-muted-foreground">Manage your story's cover, title, description, and settings.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
            <AutoSaveStatusIndicator />
            {queryStoryId && story && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/stories/${story.id}`} className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" /> View Story Page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Story
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Story Cover</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div
                className="aspect-[2/3] w-full max-w-[200px] bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity mb-2 shadow-md relative group"
                onClick={() => !isSaving && fileInputRef.current?.click()}
                title="Click to change cover"
              >
                <Image
                  src={coverImagePreview || 'https://placehold.co/512x800.png'}
                  alt={storyTitle || "Story Cover"}
                  width={512}
                  height={800}
                  className="object-cover w-full h-full"
                  data-ai-hint="book cover design"
                  priority 
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isSaving ? <Loader2 className="h-10 w-10 text-white animate-spin" /> : <UploadCloud className="h-10 w-10 text-white" />}
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCoverImageSelect}
                accept="image/png, image/jpeg, image/gif, image/webp"
                className="hidden"
                disabled={isSaving}
              />
              <Button type="button" variant="link" onClick={() => fileInputRef.current?.click()} className="text-sm" disabled={isSaving}>
                {isUploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isUploadingCover ? "Uploading..." : "Change Cover"}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Core Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <Label htmlFor="storyTitle">Story Title</Label>
                    <Input
                        id="storyTitle"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        placeholder="Your captivating story title"
                        className="text-lg"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <Label htmlFor="summary">Story Description (Blurb)</Label>
                    <Textarea
                        id="summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="A short, enticing summary to draw readers in..."
                        rows={6}
                        disabled={isSaving}
                    />
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Story Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={genre} onValueChange={(val) => setGenre(val as string)} disabled={isSaving}>
                    <SelectTrigger id="genre"><SelectValue placeholder="Select Genre" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="historical">Historical Fiction</SelectItem>
                      <SelectItem value="dystopian">Dystopian</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage} disabled={isSaving}>
                    <SelectTrigger id="language"><SelectValue placeholder="Select Language" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Español (Spanish)</SelectItem>
                      <SelectItem value="Tagalog">Tagalog</SelectItem>
                      <SelectItem value="French">Français (French)</SelectItem>
                      <SelectItem value="German">Deutsch (German)</SelectItem>
                      <SelectItem value="Portuguese">Português (Portuguese)</SelectItem>
                      <SelectItem value="Russian">Русский (Russian)</SelectItem>
                      <SelectItem value="Japanese">日本語 (Japanese)</SelectItem>
                      <SelectItem value="Korean">한국어 (Korean)</SelectItem>
                      <SelectItem value="Chinese">中文 (Chinese)</SelectItem>
                      <SelectItem value="Italian">Italiano (Italian)</SelectItem>
                      <SelectItem value="Hindi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="Arabic">العربية (Arabic)</SelectItem>
                      <SelectItem value="Indonesian">Bahasa Indonesia</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., magic, space opera, slow burn" disabled={isSaving} />
                <div className="mt-2 flex flex-wrap gap-1">
                    {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isMature" checked={isMature} onCheckedChange={setIsMature} disabled={isSaving} />
                <Label htmlFor="isMature" className="flex items-center">
                    Mature Content <ShieldQuestion className="ml-1.5 h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" title="Mark if your story contains themes, language, or situations suitable for mature audiences."/>
                </Label>
              </div>
              <div>
                <Label className="mb-2 block">Visibility</Label>
                <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as 'Public' | 'Private' | 'Unlisted')} className="flex flex-col sm:flex-row gap-2 sm:gap-4" disabled={isSaving}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Public" id="visPublic" />
                    <Label htmlFor="visPublic" className="font-normal flex items-center"><Eye className="mr-1.5 h-4 w-4"/>Public</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Unlisted" id="visUnlisted" />
                    <Label htmlFor="visUnlisted" className="font-normal flex items-center"><EyeOff className="mr-1.5 h-4 w-4"/>Unlisted</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Private" id="visPrivate" />
                    <Label htmlFor="visPrivate" className="font-normal flex items-center"><Info className="mr-1.5 h-4 w-4"/>Private (Drafts)</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-1">
                  {visibility === 'Public' && "Visible to everyone and in search results."}
                  {visibility === 'Unlisted' && "Only visible to those with a direct link. Not in search."}
                  {visibility === 'Private' && "Only visible to you and collaborators. Default for drafts."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Table of Contents</CardTitle>
              <Link href={`/write/edit?storyId=${story.id}`} passHref>
                 <Button variant="outline" size="sm" disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add New Chapter</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {story.chapters.length > 0 ? (
                <ScrollArea className="max-h-96 pr-3">
                  <ul className="space-y-2">
                    {story.chapters.sort((a, b) => a.order - b.order).map(chapter => (
                      <li key={chapter.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 gap-2">
                        <div className="flex-1 min-w-0">
                            <Link href={`/write/edit?storyId=${story.id}&chapterId=${chapter.id}`} className="font-medium hover:underline truncate block">
                                {chapter.order}. {chapter.title}
                            </Link>
                            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-xs text-muted-foreground">
                                <span className={cn(getChapterStatusColor(chapter.status))}>
                                    {chapter.status || 'Draft'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" /> {chapter.wordCount || 0} words
                                </span>
                                <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3" /> {chapter.votes || 0} votes
                                </span>
                                {chapter.publishedDate && chapter.status === 'Published' && (
                                    <span className="hidden sm:inline">
                                        Published: {formatDate(chapter.publishedDate)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Link href={`/write/edit?storyId=${story.id}&chapterId=${chapter.id}`} passHref>
                            <Button variant="ghost" size="icon" title="Edit Chapter" disabled={isSaving}><Edit className="h-4 w-4"/></Button>
                          </Link>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete Chapter" onClick={() => setChapterToDelete(chapter)} className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isSaving}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                          </AlertDialogTrigger>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-4">No chapters yet. Click "Add New Chapter" to start!</p>
              )}
            </CardContent>
          </Card>
           
          <Card>
            <CardHeader>
                <CardTitle>Collaboration</CardTitle>
                <CardDescription>Invite other users to contribute. Only the original author can add or remove collaborators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                    type="text"
                    placeholder="Enter collaborator's username"
                    value={collaboratorUsername}
                    onChange={(e) => setCollaboratorUsername(e.target.value)}
                    disabled={isProcessingCollaboration || story.author.id !== user?.id || isSaving}
                    />
                    <Button onClick={handleAddCollaborator} disabled={isProcessingCollaboration || !collaboratorUsername.trim() || story.author.id !== user?.id || isSaving}>
                        {isProcessingCollaboration ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add
                    </Button>
                </div>
                {story.collaborators && story.collaborators.length > 0 && (
                    <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Collaborators:</h3>
                    <ul className="space-y-2">
                        {story.collaborators.map(collab => (
                        <li key={collab.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={collab.avatarUrl} alt={collab.username} data-ai-hint="profile person" />
                                <AvatarFallback>{collab.username.substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>{collab.displayName || collab.username}</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoveCollaborator(collab.id)} 
                                className="text-destructive hover:text-destructive" 
                                disabled={isProcessingCollaboration || story.author.id !== user?.id || isSaving}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                        ))}
                    </ul>
                    </div>
                )}
                {(!story.collaborators || story.collaborators.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-2">No collaborators added yet.</p>
                )}
            </CardContent>
           </Card>

        </div>
      </div>

      {chapterToDelete && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter: "{chapterToDelete.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chapter? This action cannot be undone and will remove the chapter permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChapterToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteChapter(chapterToDelete)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Delete Chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}

      {story && user?.id === story.author.id && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story: "{story.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All chapters, comments, and data associated with this story will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Permanently Delete Story
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </div>
    </AlertDialog>
  );
}
