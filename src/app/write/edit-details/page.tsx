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

const AUTOSAVE_DELAY = 2000; // 2 seconds
const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const AutoSaveStatusIndicator = ({ status, isUploading }: { status: string, isUploading: boolean }) => {
    if (isUploading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-600 rounded-full border border-yellow-500/20">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Uploading Cover</span>
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
      case 'Error':
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full border border-destructive/20">
                <AlertCircle className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sync Error</span>
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
        const permissionError = new FirestorePermissionError({
            path: storyDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
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
        const permissionError = new FirestorePermissionError({
            path: storyRef.path,
            operation: 'write',
            requestResourceData: newStoryData,
        });
        errorEmitter.emit('permission-error', permissionError);
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

    const storyUpdateData = {
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

    const storyDocRef = doc(db, 'stories', story.id);
    updateDoc(storyDocRef, storyUpdateData)
      .then(() => setAutoSaveStatus('Saved'))
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: storyDocRef.path,
          operation: 'update',
          requestResourceData: storyUpdateData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setAutoSaveStatus('Error');
      });
  }, [story, user, storyTitle, summary, genre, tags, language, isMature, visibility, initialLoadComplete, isUploadingCover]);

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
                updateDoc(storyDocRef, { coverImageUrl: downloadURL, lastUpdated: serverTimestamp() })
                  .catch(async (serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: storyDocRef.path,
                        operation: 'update',
                        requestResourceData: { coverImageUrl: downloadURL },
                    });
                    errorEmitter.emit('permission-error', permissionError);
                  });
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
    
    const storyDocRef = doc(db, 'stories', story.id);
    updateDoc(storyDocRef, { chapters: updatedChapters, lastUpdated: serverTimestamp() })
      .then(() => {
        toast({title: "Chapter Deleted", description: `Chapter "${chapter.title}" has been removed.`});
        setAutoSaveStatus('Saved');
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: storyDocRef.path,
          operation: 'update',
          requestResourceData: { chapters: 'filtered' },
        });
        errorEmitter.emit('permission-error', permissionError);
        setAutoSaveStatus('Error');
      })
      .finally(() => {
        setChapterToDelete(null);
        if (originalAutoSaveStatus !== 'Saving' && originalAutoSaveStatus !== 'Error') {
            setTimeout(() => setAutoSaveStatus(originalAutoSaveStatus), 500);
        }
      });
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
      updateDoc(storyDocRef, { 
          collaborators: updatedCollaborators,
          collaboratorIds: updatedCollaboratorIds,
          lastUpdated: serverTimestamp()
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: storyDocRef.path,
            operation: 'update',
            requestResourceData: { collaboratorIds: updatedCollaboratorIds },
        });
        errorEmitter.emit('permission-error', permissionError);
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
    
    const storyDocRef = doc(db, 'stories', story.id);
    updateDoc(storyDocRef, { 
        collaborators: updatedCollaborators,
        collaboratorIds: updatedCollaboratorIds,
        lastUpdated: serverTimestamp() 
    }).then(() => {
        toast({ title: "Collaborator Removed" });
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: storyDocRef.path,
            operation: 'update',
            requestResourceData: { collaboratorIds: updatedCollaboratorIds },
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsProcessingCollaboration(false);
    });
  };

  const handleDeleteStory = async () => {
    if (!story || !user || story.author.id !== user.id) {
      toast({ title: "Unauthorized", description: "Only the story author can delete it.", variant: "destructive" });
      return;
    }
    const storyDocRef = doc(db, 'stories', story.id);
    deleteDoc(storyDocRef)
      .then(() => {
        toast({ title: "Story Deleted", description: `"${story.title}" has been permanently deleted.` });
        router.push('/write');
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: storyDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setStoryToDelete(null);
      });
  };

  const handleGrantPremiumAccess = async () => {
    if (!story || !premiumAccessChapter || !premiumUsername.trim()) return;

    setIsProcessingPremium(true);

    try {
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

        const chapters = [...(story.chapters || [])];
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
        updateDoc(storyDocRef, { chapters })
          .then(async () => {
            await addNotification({
                userId: targetUserId,
                type: 'premium_access',
                message: `You've been granted premium access to a chapter in "${story.title}" by ${story.author.displayName || story.author.username}!`,
                link: `/stories/${story.id}/read/${premiumAccessChapter.id}`,
                actor: story.author
            });
            toast({ title: "Access Granted!", description: `@${premiumUsername} can now view "${premiumAccessChapter.title}".`});
            setPremiumUsername('');
          })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: storyDocRef.path,
                operation: 'update',
                requestResourceData: { chapters: 'updated with premium' },
            });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => setIsProcessingPremium(false));

    } catch(error) {
        console.error("Error granting premium access:", error);
        toast({title: "Error", description: "Could not grant premium access.", variant: "destructive"});
        setIsProcessingPremium(false);
    }
  };

  if (isLoading || authLoading || (queryStoryId && !story && !initialLoadComplete)) { 
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-12rem)] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Scanning the archives...</p>
      </div>
    );
  }

  if (!user) return null;
  
  if (!story && queryStoryId) { 
    return (
        <div className="text-center py-20 px-4">
            <AlertCircle className="mx-auto h-16 w-16 text-destructive/20 mb-6" />
            <h2 className="text-2xl font-headline font-bold text-foreground">Manuscript Not Found</h2>
            <p className="text-muted-foreground mt-2 max-sm mx-auto">This story may have been relocated or you lack the proper credentials to view it.</p>
            <Link href="/write" className='mt-8 block'>
                <Button variant="outline" className="rounded-full px-8">Return to Dashboard</Button>
            </Link>
        </div>
    );
  }
  
  if (!story) return null;

  const getChapterStatusColor = (status?: 'Published' | 'Draft', accessType?: 'public' | 'premium') => {
    if (accessType === 'premium') return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    if (status === 'Published') return 'bg-green-500/10 text-green-600 border-green-500/20';
    return 'bg-muted text-muted-foreground border-border/40';
  };

  const isSaving = isUploadingCover || autoSaveStatus === 'Saving';

  return (
    <AlertDialog>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-10 pb-24 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => router.push('/write')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
            <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight line-clamp-1" title={storyTitle}>
                {storyTitle || 'Untitled Manuscript'}
            </h1>
          </div>
          <div className="flex flex-shrink-0">
            <AutoSaveStatusIndicator status={autoSaveStatus} isUploading={isUploadingCover} />
          </div>
        </header>

        <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-full sm:max-w-md bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm mb-10">
                <TabsTrigger value="content" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold transition-all">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Canvas
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold transition-all">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Cover Column */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden group/cover">
                            <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <LucideImage className="h-4 w-4" />
                                    Cover Design
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div
                                    className="aspect-[2/3] w-full relative rounded-xl overflow-hidden shadow-inner cursor-pointer bg-muted/30 border-2 border-dashed border-border/60 hover:border-primary/40 transition-all duration-500"
                                    onClick={() => !isSaving && fileInputRef.current?.click()}
                                >
                                    <Image
                                        src={coverImagePreview || 'https://placehold.co/512x800.png'}
                                        alt={storyTitle}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover/cover:scale-105"
                                        data-ai-hint="book cover design"
                                        priority 
                                    />
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300">
                                        {isSaving ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="h-10 w-10 text-white animate-spin" />
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Uploading</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-3 rounded-full bg-white/20 text-white">
                                                    <UploadCloud className="h-8 w-8" />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Update Artwork</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleCoverImageSelect} accept="image/*" className="hidden" disabled={isSaving} />
                                <div className="mt-4 text-center">
                                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full px-6 text-xs h-9" disabled={isSaving}>
                                        {isUploadingCover ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Edit className="mr-2 h-3.5 w-3.5" />}
                                        {isUploadingCover ? "Syncing..." : "Replace Cover"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Content Column */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                        <section className="space-y-6">
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="storyTitle" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                        <Type className="h-3 w-3" /> Manuscript Title
                                    </Label>
                                    <Input
                                        id="storyTitle"
                                        value={storyTitle}
                                        onChange={(e) => setStoryTitle(e.target.value)}
                                        placeholder="Enter a title that echoes..."
                                        className="h-14 text-xl font-bold rounded-2xl bg-card/50 border-border/40 focus-visible:ring-primary/20 shadow-sm"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="summary" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                        <FileText className="h-3 w-3" /> The Blurb
                                    </Label>
                                    <Textarea
                                        id="summary"
                                        value={summary}
                                        onChange={(e) => setSummary(e.target.value)}
                                        placeholder="Summarize the mystery, the magic, or the mayhem..."
                                        rows={8}
                                        className="rounded-2xl bg-card/50 border-border/40 focus-visible:ring-primary/20 shadow-inner resize-none text-base leading-relaxed"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </section>
                        
                        <section className="space-y-6">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xl font-headline font-bold text-foreground flex items-center gap-3">
                                    <BookOpen className="h-6 w-6 text-primary" />
                                    Table of Contents
                                </h3>
                                <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-tighter bg-muted/30">
                                    {story.chapters.length} Parts Total
                                </Badge>
                            </div>

                            <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                                <CardContent className="p-0">
                                    {story.chapters.length > 0 ? (
                                        <div className="divide-y divide-border/40">
                                            {story.chapters.sort((a, b) => a.order - b.order).map(chapter => (
                                                <div key={chapter.id} className="flex items-center justify-between p-5 hover:bg-primary/5 transition-all group gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1.5">
                                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                                                                {chapter.order}
                                                            </div>
                                                            <Link href={`/write/edit?storyId=${story.id}&chapterId=${chapter.id}`} className="font-bold text-base hover:text-primary hover:underline transition-colors truncate block">
                                                                {chapter.title}
                                                            </Link>
                                                        </div>
                                                        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap pl-9">
                                                            <Badge variant="outline" className={cn("text-[9px] uppercase font-black tracking-widest px-2 py-0.5", getChapterStatusColor(chapter.status, chapter.accessType))}>
                                                                {chapter.accessType === 'premium' ? 'Premium' : (chapter.status || 'Draft')}
                                                            </Badge>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tighter">
                                                                <FileText className="h-3 w-3" />
                                                                {chapter.wordCount || 0} words
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tighter">
                                                                <Star className="h-3 w-3" />
                                                                {chapter.votes || 0} votes
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-yellow-500/10 text-yellow-600" title="Grant Premium Access" disabled={isSaving} onClick={() => setPremiumAccessChapter(chapter)}>
                                                                <Sparkles className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <Link href={`/write/edit?storyId=${story.id}&chapterId=${chapter.id}`} passHref>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Edit Chapter" disabled={isSaving}><Edit className="h-4 w-4"/></Button>
                                                        </Link>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="Remove Chapter" onClick={() => setChapterToDelete(chapter)} className="h-9 w-9 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isSaving}>
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 px-6">
                                            <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                            <p className="text-muted-foreground font-medium">Your canvas is blank.</p>
                                            <p className="text-xs text-muted-foreground/60 mt-1">Start your literary journey by adding your first chapter.</p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-4 bg-muted/20 border-t border-border/40">
                                    <Link href={`/write/edit?storyId=${story.id}`} passHref className="w-full">
                                        <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all font-bold" disabled={isSaving}>
                                            <PlusCircle className="mr-2 h-5 w-5" /> 
                                            Initialize New Chapter
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </section>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <section className="space-y-8">
                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                            <CardHeader className="pb-6 border-b border-border/40 bg-muted/20">
                                <CardTitle className="text-lg font-headline font-bold flex items-center gap-3">
                                    <Tags className="h-5 w-5 text-primary" />
                                    Categorization
                                </CardTitle>
                                <CardDescription className="text-xs">How should readers find your story?</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="genre" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Core Genre</Label>
                                        <Select value={genre} onValueChange={(val) => setGenre(val as string)} disabled={isSaving}>
                                            <SelectTrigger id="genre" className="h-11 rounded-xl bg-background border-border/40">
                                                <SelectValue placeholder="Select Genre" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
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
                                    <div className="space-y-2">
                                        <Label htmlFor="language" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Dialect</Label>
                                        <Select value={language} onValueChange={setLanguage} disabled={isSaving}>
                                            <SelectTrigger id="language" className="h-11 rounded-xl bg-background border-border/40">
                                                <SelectValue placeholder="Select Language" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
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
                                <div className="space-y-2">
                                    <Label htmlFor="tags" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Discovery Tags</Label>
                                    <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. detective, riddles, friendship" className="h-11 rounded-xl bg-background border-border/40" disabled={isSaving} />
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                                            <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/10">#{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <Separator className="opacity-40" />
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-dashed border-border/60">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="isMature" className="text-sm font-bold flex items-center cursor-pointer">
                                            Mature Content
                                            <ShieldQuestion className="ml-2 h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" title="Contains themes suitable for adult audiences."/>
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground">Apply 18+ content warning</p>
                                    </div>
                                    <Switch id="isMature" checked={isMature} onCheckedChange={setIsMature} disabled={isSaving} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
                            <CardHeader className="pb-4 bg-destructive/10 border-b border-destructive/20">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-destructive flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Danger Zone
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="space-y-1 text-center sm:text-left">
                                        <p className="text-sm font-bold text-destructive">Erase Manuscript</p>
                                        <p className="text-[10px] text-muted-foreground">Permanently delete this story and all its history.</p>
                                    </div>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" onClick={() => setStoryToDelete(story)} className="rounded-full px-6 text-xs h-9">Destroy Story</Button>
                                    </AlertDialogTrigger>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="space-y-8">
                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                            <CardHeader className="pb-6 border-b border-border/40 bg-muted/20">
                                <CardTitle className="text-lg font-headline font-bold flex items-center gap-3">
                                    <Eye className="h-5 w-5 text-primary" />
                                    Privacy & Visibility
                                </CardTitle>
                                <CardDescription className="text-xs">Control who has access to your work.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as 'Public' | 'Private' | 'Unlisted')} className="grid gap-3" disabled={isSaving}>
                                    <div className={cn("flex items-center space-x-3 p-4 border rounded-2xl transition-all cursor-pointer", visibility === 'Public' ? 'bg-primary/5 border-primary/30 shadow-inner' : 'border-transparent hover:bg-muted/30')}>
                                        <RadioGroupItem value="Public" id="visPublic" className="h-5 w-5" />
                                        <Label htmlFor="visPublic" className="flex-1 cursor-pointer">
                                            <span className="font-bold block text-sm flex items-center gap-2">Public <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest py-0">Global</Badge></span>
                                            <span className="text-[10px] text-muted-foreground">Visible to everyone and searchable in the archives.</span>
                                        </Label>
                                    </div>
                                    <div className={cn("flex items-center space-x-3 p-4 border rounded-2xl transition-all cursor-pointer", visibility === 'Unlisted' ? 'bg-primary/5 border-primary/30 shadow-inner' : 'border-transparent hover:bg-muted/30')}>
                                        <RadioGroupItem value="Unlisted" id="visUnlisted" className="h-5 w-5" />
                                        <Label htmlFor="visUnlisted" className="flex-1 cursor-pointer">
                                            <span className="font-bold block text-sm flex items-center gap-2">Unlisted <EyeOff className="h-3 w-3 opacity-50" /></span>
                                            <span className="text-[10px] text-muted-foreground">Only accessible via direct link. Won't appear in search.</span>
                                        </Label>
                                    </div>
                                    <div className={cn("flex items-center space-x-3 p-4 border rounded-2xl transition-all cursor-pointer", visibility === 'Private' ? 'bg-primary/5 border-primary/30 shadow-inner' : 'border-transparent hover:bg-muted/30')}>
                                        <RadioGroupItem value="Private" id="visPrivate" className="h-5 w-5" />
                                        <Label htmlFor="visPrivate" className="flex-1 cursor-pointer">
                                            <span className="font-bold block text-sm flex items-center gap-2">Private <Lock className="h-3 w-3 opacity-50" /></span>
                                            <span className="text-[10px] text-muted-foreground">Exclusive to you and your collaborators. Default for drafts.</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                            <CardHeader className="pb-6 border-b border-border/40 bg-muted/20">
                                <CardTitle className="text-lg font-headline font-bold flex items-center gap-3">
                                    <Users className="h-5 w-5 text-primary" />
                                    Collaborative writing
                                </CardTitle>
                                <CardDescription className="text-xs">Invite partners to co-author this manuscript.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Creator's @handle"
                                        value={collaboratorUsername}
                                        onChange={(e) => setCollaboratorUsername(e.target.value)}
                                        className="rounded-xl bg-background border-border/40 h-11"
                                        disabled={isProcessingCollaboration || story.author.id !== user?.id || isSaving}
                                    />
                                    <Button onClick={handleAddCollaborator} disabled={isProcessingCollaboration || !collaboratorUsername.trim() || story.author.id !== user?.id || isSaving} className="rounded-xl h-11 px-6 font-bold shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                                        {isProcessingCollaboration ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Add
                                    </Button>
                                </div>
                                
                                {story.collaborators && story.collaborators.length > 0 ? (
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Current Authors</h4>
                                        <div className="grid gap-2">
                                            {story.collaborators.map(collab => (
                                                <div key={collab.id} className="flex items-center justify-between p-3 border rounded-2xl bg-muted/30 border-border/40 group/collab">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Avatar className="h-9 w-9 border border-background shadow-sm">
                                                            <AvatarImage src={collab.avatarUrl} alt={collab.username} />
                                                            <AvatarFallback className="text-xs font-bold">{collab.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold truncate">@{collab.username}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">{collab.displayName}</p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleRemoveCollaborator(collab.id)} 
                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/collab:opacity-100 transition-opacity" 
                                                        disabled={isProcessingCollaboration || story.author.id !== user?.id || isSaving}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 px-4 border-2 border-dashed border-border/20 rounded-2xl bg-muted/10">
                                        <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">No collaborators yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </TabsContent>
        </Tabs>

        {/* Persistence Modals */}
        {chapterToDelete && (
            <AlertDialogContent className="rounded-3xl border-none shadow-2xl overflow-hidden">
            <AlertDialogHeader className="p-6 bg-destructive/5 border-b border-destructive/10">
                <AlertDialogTitle className="font-headline text-2xl flex items-center gap-2 text-destructive">
                    <Trash2 className="h-6 w-6" /> Destructive Action
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to erase <span className="font-bold text-foreground">"{chapterToDelete.title}"</span>? This manuscript segment will be lost forever.
                {chapterToDelete.accessType === 'premium' && <div className="mt-3 p-3 bg-yellow-500/10 text-yellow-700 rounded-xl border border-yellow-500/20 font-medium text-xs">Premium access permissions for this chapter will also be revoked.</div>}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="p-6 bg-muted/30">
                <AlertDialogCancel onClick={() => setChapterToDelete(null)} className="rounded-full px-8">Discard Action</AlertDialogCancel>
                <AlertDialogAction onClick={() => confirmDeleteChapter(chapterToDelete)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full px-8 font-bold">
                Yes, Delete Permanently
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        )}

        {premiumAccessChapter && (
            <AlertDialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                <AlertDialogHeader className="p-8 bg-primary/5 border-b border-primary/10">
                    <AlertDialogTitle className="text-2xl font-headline font-bold flex items-center gap-3">
                        <Sparkles className="h-6 w-6 text-primary" />
                        Premium Access
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                        Grant temporary viewing rights for <span className="font-bold text-foreground">"{premiumAccessChapter.title}"</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="premium-username" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Target Reader</Label>
                            <div className="flex gap-2">
                                <Input id="premium-username" value={premiumUsername} onChange={e => setPremiumUsername(e.target.value)} placeholder="@username" className="rounded-xl h-11" />
                                <Select value={premiumDuration} onValueChange={setPremiumDuration}>
                                    <SelectTrigger className="w-[130px] rounded-xl h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="24h">24 Hours</SelectItem>
                                        <SelectItem value="2d">2 Days</SelectItem>
                                        <SelectItem value="1w">1 Week</SelectItem>
                                        <SelectItem value="1m">1 Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={handleGrantPremiumAccess} disabled={isProcessingPremium || !premiumUsername.trim()} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20">
                            {isProcessingPremium ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            Grant Vault Access
                        </Button>
                    </div>
                    <Separator className="opacity-40" />
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Users with Access</h4>
                        <ScrollArea className="h-40 pr-3">
                            <div className="space-y-2">
                            {(premiumAccessChapter.allowedUsers && premiumAccessChapter.allowedUsers.length > 0) ? premiumAccessChapter.allowedUsers.map(allowed => (
                                <div key={allowed.userId} className="flex justify-between items-center text-xs p-3 bg-muted/30 border border-border/40 rounded-xl">
                                    <span className="font-bold text-foreground">@{allowed.username}</span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Expires {formatDate(allowed.expiresAt)}</span>
                                </div>
                            )) : (
                                <div className="text-center py-10 opacity-40">
                                    <Lock className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No active permissions</p>
                                </div>
                            )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <AlertDialogFooter className="p-4 bg-muted/30 border-t">
                    <AlertDialogCancel onClick={() => setPremiumAccessChapter(null)} className="w-full rounded-xl">Dismiss</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        )}

        {storyToDelete && user?.id === storyToDelete.author.id && (
            <AlertDialogContent className="rounded-3xl border-none shadow-2xl overflow-hidden">
            <AlertDialogHeader className="p-8 bg-destructive/10 border-b border-destructive/20">
                <AlertDialogTitle className="text-2xl font-headline font-bold text-destructive flex items-center gap-3">
                    <AlertCircle className="h-7 w-7" />
                    Destroy Entire Manuscript?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-foreground/80 leading-relaxed pt-2">
                This action is <span className="font-bold text-destructive underline">permanent and irreversible</span>. 
                Erasing <span className="font-bold italic">"{storyToDelete.title}"</span> will incinerate every chapter, every reader comment, and all associated analytics from our servers.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="p-6 bg-muted/30 flex-col sm:flex-row gap-3">
                <AlertDialogCancel onClick={() => setStoryToDelete(null)} className="rounded-full px-10 h-12 font-bold">Abort Erasure</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteStory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full px-10 h-12 font-bold shadow-xl shadow-destructive/20">
                Confirm Total Destruction
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        )}
      </div>
    </AlertDialog>
  );
}
