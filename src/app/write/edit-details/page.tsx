
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Settings, Trash2, PlusCircle, Edit, BookOpen, Users, Info, Eye, EyeOff, ShieldQuestion, UploadCloud, CheckCircle, AlertCircle, FileText, Star, BarChartBig, ListChecks, Sparkles, UserPlus, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Story, Chapter, UserSummary, User as AppUser, AllowedUser } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/placeholder-data'; 
import { Separator } from '@/components/ui/separator';

const AUTOSAVE_DELAY = 2000; // 2 seconds
const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
        views: 0,
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

  const handleAutoSaveChanges = useCallback(async () => {
    if (!story || !user || !initialLoadComplete || isUploadingCover) {
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
  }, [story, user, storyTitle, summary, genre, tags, language, isMature, visibility, toast, initialLoadComplete, isUploadingCover]);

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
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };
  
  useEffect(() => {
    if (!coverImageFile || !story) {
      return;
    }

    const uploadCoverImage = async () => {
        setIsUploadingCover(true);
        setAutoSaveStatus('Saving');
        toast({ title: "Uploading Cover...", description: "Your new cover image is being uploaded." });
        
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            toast({ title: 'Configuration Error', description: 'Cloudinary environment variables not set.', variant: 'destructive' });
            setIsUploadingCover(false);
            setAutoSaveStatus('Error');
            return;
        }

        const formData = new FormData();
        formData.append('file', coverImageFile);
        formData.append('upload_preset', uploadPreset);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();

            if (data.secure_url) {
                const downloadURL = data.secure_url;
                const storyDocRef = doc(db, 'stories', story.id);
                await updateDoc(storyDocRef, { coverImageUrl: downloadURL, lastUpdated: serverTimestamp() });
                setCoverImageFile(null);
                toast({ title: "Cover Image Updated!" });
                setAutoSaveStatus('Saved');
            } else {
                throw new Error(data.error?.message || 'Unknown Cloudinary error');
            }
        } catch (error: any) {
            console.error("Error uploading cover image:", error);
            toast({ title: "Upload Failed", description: "Could not upload cover image.", variant: "destructive" });
            setAutoSaveStatus('Error');
        } finally {
            setIsUploadingCover(false);
        }
    };

    uploadCoverImage();
  }, [coverImageFile, story, toast]);

  
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
    } finally {
      setStoryToDelete(null);
    }
  };

  const handleGrantPremiumAccess = async () => {
    if (!story || !premiumAccessChapter || !premiumUsername.trim()) return;

    setIsProcessingPremium(true);

    try {
        // Find user by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', premiumUsername.trim()));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            toast({ title: "User Not Found", description: `User @${premiumUsername} does not exist.`, variant: "destructive"});
            setIsProcessingPremium(false);
            return;
        }

        const targetUser = userSnapshot.docs[0];
        const targetUserId = targetUser.id;

        const chapters = story.chapters || [];
        const chapterIndex = chapters.findIndex(c => c.id === premiumAccessChapter.id);

        if (chapterIndex === -1) {
            toast({ title: "Error", description: "Chapter not found in story.", variant: "destructive" });
            setIsProcessingPremium(false);
            return;
        }

        const expiryDate = new Date();
        if (premiumDuration === '24h') expiryDate.setDate(expiryDate.getDate() + 1);
        if (premiumDuration === '2d') expiryDate.setDate(expiryDate.getDate() + 2);
        if (premiumDuration === '1w') expiryDate.setDate(expiryDate.getDate() + 7);
        if (premiumDuration === '1m') expiryDate.setMonth(expiryDate.getMonth() + 1);

        const newAllowedUser: AllowedUser = {
            userId: targetUserId,
            username: targetUser.data().username,
            expiresAt: Timestamp.fromDate(expiryDate),
        };

        const existingAllowedUsers = chapters[chapterIndex].allowedUsers || [];
        const updatedAllowedUsers = [...existingAllowedUsers.filter(u => u.userId !== targetUserId), newAllowedUser];

        chapters[chapterIndex].allowedUsers = updatedAllowedUsers;
        chapters[chapterIndex].accessType = 'premium';

        const storyDocRef = doc(db, 'stories', story.id);
        await updateDoc(storyDocRef, { chapters });

        await addNotification({
            userId: targetUserId,
            type: 'premium_access',
            message: `You've been granted premium access to a chapter in "${story.title}" by ${story.author.displayName || story.author.username}!`,
            link: `/stories/${story.id}/read/${premiumAccessChapter.id}`,
            actor: story.author
        });

        toast({ title: "Access Granted!", description: `@${premiumUsername} can now view "${premiumAccessChapter.title}".`});
        setPremiumUsername('');
    } catch(error) {
        console.error("Error granting premium access:", error);
        toast({title: "Error", description: "Could not grant premium access.", variant: "destructive"});
    } finally {
        setIsProcessingPremium(false);
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

  const getChapterStatusColor = (status?: 'Published' | 'Draft', accessType?: 'public' | 'premium') => {
    if (accessType === 'premium') return 'text-yellow-500 dark:text-yellow-400';
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
        return <div className="text-xs text-muted-foreground">Up to date</div>;
    }
  };

  return (
    <AlertDialog>
      <div className="max-w-5xl mx-auto py-8 space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary truncate" title={storyTitle}>
                {storyTitle}
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <AutoSaveStatusIndicator />
          </div>
        </header>

        <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content"><ListChecks className="mr-2 h-4 w-4" />Content</TabsTrigger>
                <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
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
                                data-ai-hint={story.dataAiHint || "book cover design"}
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
                    </div>

                    <div className="md:col-span-2 space-y-6">
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
                        
                        <Card>
                        <CardHeader>
                            <CardTitle>Table of Contents</CardTitle>
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
                                            <span className={cn('capitalize', getChapterStatusColor(chapter.status, chapter.accessType))}>
                                                {chapter.accessType === 'premium' ? 'Premium' : (chapter.status || 'Draft')}
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
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" title="Manage Premium Access" disabled={isSaving} onClick={() => setPremiumAccessChapter(chapter)}>
                                                <Sparkles className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
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
                        <CardFooter>
                            <Link href={`/write/edit?storyId=${story.id}`} passHref>
                                <Button variant="outline" size="sm" disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add New Chapter</Button>
                            </Link>
                        </CardFooter>
                        </Card>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="settings" className="mt-6 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Story Properties</CardTitle></CardHeader>
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
                            <Label htmlFor="visPrivate" className="font-normal flex items-center"><Lock className="mr-1.5 h-4 w-4"/>Private (Drafts)</Label>
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

                 <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" onClick={() => setStoryToDelete(story)}>Delete this story</Button>
                        </AlertDialogTrigger>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>

      {chapterToDelete && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter: "{chapterToDelete.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chapter? This action cannot be undone and will remove the chapter permanently.
              {chapterToDelete.accessType === 'premium' && <div className="mt-2 font-semibold text-destructive">This is a premium chapter. Deleting it will revoke access for all granted users.</div>}
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

       {premiumAccessChapter && (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Manage Premium Access for "{premiumAccessChapter.title}"</AlertDialogTitle>
                <AlertDialogDescription>
                    Grant temporary access to this chapter for specific users. They will receive a notification.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="premium-username">Username to grant access</Label>
                    <div className="flex gap-2">
                        <Input id="premium-username" value={premiumUsername} onChange={e => setPremiumUsername(e.target.value)} placeholder="@username" />
                        <Select value={premiumDuration} onValueChange={setPremiumDuration}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="24h">24 Hours</SelectItem>
                                <SelectItem value="2d">2 Days</SelectItem>
                                <SelectItem value="1w">1 Week</SelectItem>
                                <SelectItem value="1m">1 Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={handleGrantPremiumAccess} disabled={isProcessingPremium || !premiumUsername.trim()}>
                    {isProcessingPremium ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Grant Access
                </Button>
                <Separator />
                <div>
                    <h4 className="text-sm font-medium mb-2">Users with Access</h4>
                    <ScrollArea className="h-40">
                        <div className="space-y-2 pr-4">
                        {(premiumAccessChapter.allowedUsers && premiumAccessChapter.allowedUsers.length > 0) ? premiumAccessChapter.allowedUsers.map(allowed => (
                            <div key={allowed.userId} className="flex justify-between items-center text-sm p-2 bg-muted rounded-md">
                                <span>@{allowed.username}</span>
                                <span className="text-xs text-muted-foreground">Expires {formatDate(allowed.expiresAt)}</span>
                            </div>
                        )) : <p className="text-xs text-muted-foreground text-center pt-4">No users have premium access to this chapter yet.</p>}
                        </div>
                    </ScrollArea>
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPremiumAccessChapter(null)}>Close</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      )}

      {storyToDelete && user?.id === storyToDelete.author.id && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story: "{storyToDelete.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All chapters, comments, and data associated with this story will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Permanently Delete Story
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
