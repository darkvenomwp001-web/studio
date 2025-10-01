
'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Poll, Story, Song } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Camera, Send, X, Vote, Trash2, RotateCcw, Archive, Wand2, Music, Pause, Play, Feather, MessageSquare, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { restoreStatusUpdate, permanentlyDeleteStatusUpdate, trashStatusUpdate } from '@/app/actions/statusActions';
import { getStatusCaptions } from '@/app/actions/aiActions';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import StatusViewer from './StatusViewer';
import { Textarea } from '../ui/textarea';
import SongSearch from './SongSearch';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';


const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function StatusBubble({ user, statuses, onSelect, latestStatus }: { user: User, statuses: StatusUpdate[], onSelect: (user: User) => void, latestStatus: StatusUpdate | null }) {
  const isOwn = useAuth().user?.id === user.id;
  const isNoteWithSong = latestStatus && (latestStatus.spotifyUrl);

  return (
    <div
      className="relative text-center flex-shrink-0 w-20 cursor-pointer group"
      onClick={() => onSelect(user)}
    >
      <div className="relative w-16 h-16 mx-auto group-hover:scale-110 transition-transform duration-200">
         <div className={cn(
            "w-16 h-16 p-0.5 rounded-full",
            !isNoteWithSong && "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500"
        )}>
            <Avatar className="w-full h-full border-2 border-background">
            <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
            <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
            </Avatar>
        </div>
        
        {isNoteWithSong && (
           <div className="absolute -top-1 -right-1 z-10 w-6 h-6 bg-card border-2 border-background rounded-full flex items-center justify-center shadow-md">
              <Music className="h-3 w-3 text-muted-foreground" />
           </div>
        )}

        {isOwn && (
             <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background-2 shadow-md">
                <Plus className="h-4 w-4 text-primary-foreground" />
            </div>
        )}
      </div>
      <p className="text-xs mt-1 truncate">{isOwn ? 'Your Status' : user.displayName}</p>
    </div>
  );
}


const photoFilters = [
    { name: 'None', style: 'filter-none' },
    { name: 'Noir', style: 'filter-grayscale-100 contrast-125' },
    { name: 'Vintage', style: 'filter-sepia-60' },
    { name: 'Cold', style: 'filter-hue-rotate-180 saturate-150' },
    { name: 'Vibrant', style: 'filter-saturate-200' },
] as const;


export default function StatusFeature() {
  const { user, loading: authLoading } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusUpdate[]>([]);
  const [managedStatuses, setManagedStatuses] = useState<StatusUpdate[]>([]);
  const [groupedStatuses, setGroupedStatuses] = useState<Map<string, {user: User, statuses: StatusUpdate[]}>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [uploaderScreen, setUploaderScreen] = useState<'picker' | 'editor'>('picker');
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textOverlay, setTextOverlay] = useState('');
  
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');

  const [noteContent, setNoteContent] = useState('');
  
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songLyricSnippet, setSongLyricSnippet] = useState<string | null>(null);
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
  const [isGeneratingCaptions, startCaptionTransition] = useTransition();

  const [selectedFilter, setSelectedFilter] = useState<(typeof photoFilters)[number]['style']>('filter-none');
  const [expiryDuration, setExpiryDuration] = useState<string>('24');
  
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  
  const [uploaderDefaultTab, setUploaderDefaultTab] = useState('media');
  const [editingDraft, setEditingDraft] = useState<StatusUpdate | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    const statusesQuery = query(
      collection(db, 'statusUpdates'),
      where('isArchived', '==', false),
    );
    
    const unsubStatuses = onSnapshot(statusesQuery, (snapshot) => {
        const now = Date.now();
        const allFetchedStatuses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate));

        const liveAndRelevant = allFetchedStatuses.filter(s => {
            const isPublishedAndLive = s.status === 'published' && s.expiresAt && (s.expiresAt as Timestamp).toMillis() > now;
            const isOwnDraft = s.status === 'draft' && s.authorId === user.id;
            return isPublishedAndLive || isOwnDraft;
        });

        const sortedStatuses = liveAndRelevant.sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            const timeB = b.createdAt ? (b.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            return timeB - timeA;
        });
        setAllStatuses(sortedStatuses);

        const manageable = allFetchedStatuses.filter(s => s.authorId === user.id && (s.status === 'draft' || s.isTrashed));
        setManagedStatuses(manageable.sort((a,b) => ((b.trashedAt || b.createdAt) as Timestamp)?.toMillis() - ((a.trashedAt || a.createdAt) as Timestamp)?.toMillis()));
        setIsLoading(false);
    });

    return () => {
        unsubStatuses();
    };
  }, [user]);

  useEffect(() => {
    const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
    const newStatusOrder: string[] = [];

    const liveStatuses = allStatuses.filter(s => s.status === 'published');
    
    if (user) {
        const currentUserLive = liveStatuses.filter(s => s.authorId === user.id);
        if (currentUserLive.length > 0) {
            groups.set(user.id, { user: user as User, statuses: currentUserLive });
            newStatusOrder.push(user.id);
        }
    }
    
    liveStatuses.forEach(status => {
        if (status.authorId === user?.id) return;
        if (!groups.has(status.authorId)) {
            groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
            newStatusOrder.push(status.authorId);
        }
        groups.get(status.authorId)!.statuses.push(status);
    });

    setGroupedStatuses(groups);
    setStatusOrder(newStatusOrder);
  }, [allStatuses, user]);


  const handleSelectUser = (user: User) => {
    const userHasStatuses = groupedStatuses.has(user.id) && groupedStatuses.get(user.id)!.statuses.length > 0;
    if (userHasStatuses) {
      setSelectedUserForViewing(user);
      setIsViewerOpen(true);
    } else {
      // User is the current user with no statuses, so open uploader.
      handleOpenUploader('media');
    }
  }

  const handleNextUser = () => {
    const currentIndex = statusOrder.findIndex(id => id === selectedUserForViewing?.id);
    if (currentIndex > -1 && currentIndex < statusOrder.length - 1) {
        const nextUserId = statusOrder[currentIndex + 1];
        setSelectedUserForViewing(groupedStatuses.get(nextUserId)!.user);
    } else {
        setIsViewerOpen(false);
    }
  };
  const handlePrevUser = () => {
    const currentIndex = statusOrder.findIndex(id => id === selectedUserForViewing?.id);
    if (currentIndex > 0) {
        const prevUserId = statusOrder[currentIndex - 1];
        setSelectedUserForViewing(groupedStatuses.get(prevUserId)!.user);
    } else {
         setIsViewerOpen(false);
    }
  }

  const resetUploader = () => {
    setUploaderScreen('picker');
    setMediaFile(null);
    setMediaPreview(null);
    setTextOverlay('');
    setNoteContent('');
    setSelectedSong(null);
    setSongLyricSnippet(null);
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOption1('');
    setPollOption2('');
    setSuggestedCaptions([]);
    setSelectedFilter('filter-none');
    setExpiryDuration('24');
    setEditingDraft(null);
  }
  
  const handleTabChange = (value: string) => {
    resetUploader();
  };

  const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        toast({ title: "Media File Too Large", description: `Please select a file smaller than ${MAX_MEDIA_SIZE_BYTES / (1024*1024)}MB.`, variant: "destructive" });
        return;
      }
      setMediaFile(file);
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'video' : 'image');
      setIsPreviewPlaying(isVideo);

      const reader = new FileReader();
      reader.onload = (event) => {
        setMediaPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handlePreviewPlayToggle = () => {
    if (previewVideoRef.current) {
        if (previewVideoRef.current.paused) {
            previewVideoRef.current.play();
            setIsPreviewPlaying(true);
        } else {
            previewVideoRef.current.pause();
            setIsPreviewPlaying(false);
        }
    }
  };
  
  const createBaseStatus = (status: 'published' | 'draft') => {
    if (!user) return null;
    const authorInfo = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
    
    let expiryTime = null;
    if (status === 'published') {
        const durationHours = parseInt(expiryDuration, 10);
        expiryTime = Timestamp.fromMillis(Date.now() + durationHours * 60 * 60 * 1000);
    }

    return {
        authorId: user.id,
        authorInfo: authorInfo,
        createdAt: editingDraft?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        isArchived: false,
        isTrashed: false,
        status,
        expiresAt: expiryTime,
    };
  };

  const handleSubmit = async (status: 'published' | 'draft', data: Record<string, any>) => {
    const baseStatus = createBaseStatus(status);
    if (!baseStatus) return;

    setIsSubmitting(true);
    const statusData = { ...baseStatus, ...data };
    
    try {
        if(editingDraft) {
            await updateDoc(doc(db, "statusUpdates", editingDraft.id), statusData);
            toast({ title: `Draft updated and ${status}!` });
        } else {
            await addDoc(collection(db, 'statusUpdates'), statusData);
            toast({ title: `Status ${status === 'published' ? 'Published!' : 'Saved as Draft!'}` });
        }
        setIsUploaderOpen(false);
        resetUploader();
    } catch (error) {
        console.error("Error saving status:", error);
        toast({ title: "Failed to save status", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleNoteSubmit = async (status: 'published' | 'draft') => {
    if (!noteContent.trim()) {
        toast({ title: "Note is empty", description: "Please write a note.", variant: "destructive" });
        return;
    }
    const data: Record<string, any> = { note: noteContent.trim() };
    await handleSubmit(status, data);
  };
  
  const handleSongSubmit = async (status: 'published' | 'draft') => {
      if (!selectedSong) {
        toast({ title: "No song selected", variant: "destructive" });
        return;
      }
      const data: Record<string, any> = {
          spotifyUrl: `https://open.spotify.com/track/${selectedSong.id}`,
          note: noteContent.trim() || '',
          songLyricSnippet: songLyricSnippet || '',
      };
      await handleSubmit(status, data);
  }

  const handleMediaSubmit = async (status: 'published' | 'draft') => {
    if (!mediaFile && !editingDraft?.mediaUrl) {
      toast({title: "No Media", description: "Please select a file to submit.", variant: "destructive"});
      return;
    }

    setIsSubmitting(true);
    let mediaUrl = editingDraft?.mediaUrl || '';

    if (mediaFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) {
            toast({ title: 'Configuration Error', description: 'Cloudinary environment variables are not set.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('file', mediaFile);
            formData.append('upload_preset', uploadPreset);
            formData.append('resource_type', 'auto');
            
            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${mediaType === 'video' ? 'video' : 'image'}/upload`;
            const response = await fetch(uploadUrl, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) {
                mediaUrl = data.secure_url;
            } else {
                throw new Error(data.error?.message || 'Unknown Cloudinary error');
            }
        } catch (error) {
            console.error("Error uploading to Cloudinary: ", error);
            toast({ title: 'Media Upload Failed', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
    }

    const statusData: { [key: string]: any } = {
        mediaUrl: mediaUrl,
        mediaType: mediaType,
    };
    
    if (textOverlay.trim()) {
        statusData.textOverlay = textOverlay.trim();
    }

    if (showPollCreator && pollQuestion.trim() && pollOption1.trim() && pollOption2.trim()) {
        statusData.poll = {
            question: pollQuestion.trim(),
            options: [
                { id: 'opt1', text: pollOption1.trim(), votes: [] },
                { id: 'opt2', text: pollOption2.trim(), votes: [] }
            ]
        };
    }
    setIsSubmitting(false);
    await handleSubmit(status, statusData);
  };


  const handlePublishDraft = async (draft: StatusUpdate) => {
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, "statusUpdates", draft.id), {
        status: 'published',
        expiresAt: expiresAt,
        updatedAt: serverTimestamp(),
    });
    toast({title: "Draft Published!"});
  }

  const handleDeleteDraft = async (draftId: string) => {
    if (!user) return;
    const result = await trashStatusUpdate(draftId, user.id);
    if(result.success) toast({title: "Draft moved to trash."});
    else toast({title: "Error", description: result.error, variant: 'destructive'});
  }

  const handleEditDraft = (draft: StatusUpdate) => {
    setEditingDraft(draft);
    if(draft.mediaUrl) {
        setUploaderDefaultTab('media');
        setMediaPreview(draft.mediaUrl);
        setMediaType(draft.mediaType || 'image');
        setTextOverlay(draft.textOverlay || '');
        setUploaderScreen('editor');
    } else if (draft.spotifyUrl) {
        setUploaderDefaultTab('song');
        // This is tricky, would need to fetch song details. For now, just set note.
        setNoteContent(draft.note || '');
    } else {
        setUploaderDefaultTab('note');
        setNoteContent(draft.note || '');
    }
  }
  
  const handleRestoreFromTrash = async (statusId: string) => {
    if (!user) return;
    const result = await restoreStatusUpdate(statusId, user.id);
    if(result.success) toast({title: "Status Restored"});
    else toast({title: "Error", description: result.error, variant: 'destructive'});
  }

  const handleDeleteFromTrash = async (statusId: string) => {
     if (!user) return;
     const result = await permanentlyDeleteStatusUpdate(statusId, user.id);
     if(result.success) toast({title: "Status Permanently Deleted"});
     else toast({title: "Error", description: result.error, variant: 'destructive'});
  }
  
  const handleGenerateCaptions = () => {
    if (!mediaPreview) return;
    startCaptionTransition(async () => {
        setSuggestedCaptions([]);
        const result = await getStatusCaptions({ photoDataUri: mediaPreview });
        if ('error' in result) {
            toast({ title: "AI Error", description: result.error, variant: "destructive" });
        } else {
            setSuggestedCaptions(result.captions);
        }
    });
  }

  const onStatusArchived = (archivedUserId: string, statusId: string) => {
        setAllStatuses(prev => prev.filter(s => s.id !== statusId));
        const userGroups = new Map(groupedStatuses);
        const userGroup = userGroups.get(archivedUserId);
        if (userGroup) {
            userGroup.statuses = userGroup.statuses.filter(s => s.id !== statusId);
            if (userGroup.statuses.length === 0) {
                userGroups.delete(archivedUserId);
                setStatusOrder(prev => prev.filter(id => id !== archivedUserId));
            }
        }
        setGroupedStatuses(userGroups);
  };
  
  const handleOpenUploader = (defaultTab: string) => {
    setUploaderDefaultTab(defaultTab);
    setIsUploaderOpen(true);
  };


  if (authLoading) {
    return <div className="h-[98px] w-full bg-card rounded-lg animate-pulse" />;
  }

  if (!user || user.isAnonymous) {
    return null;
  }
  
  const renderPickerScreen = () => (
    <>
      <DialogHeader className="sr-only">
        <DialogTitle>Create Status</DialogTitle>
        <DialogDescription>Create a new status by sharing a note, media, or song.</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue={uploaderDefaultTab} onValueChange={handleTabChange} className="w-full flex-grow flex flex-col pt-6">
        <TabsList className="grid w-full grid-cols-4 mx-auto sticky top-0 bg-transparent p-0">
          <TabsTrigger value="note" className="rounded-none shadow-none data-[state=active]:shadow-bottom">Note</TabsTrigger>
          <TabsTrigger value="media" className="rounded-none shadow-none data-[state=active]:shadow-bottom">Media</TabsTrigger>
          <TabsTrigger value="song" className="rounded-none shadow-none data-[state=active]:shadow-bottom">Song</TabsTrigger>
          <TabsTrigger value="manage" className="rounded-none shadow-none data-[state=active]:shadow-bottom">Manage</TabsTrigger>
        </TabsList>
        <TabsContent value="note" className="flex-grow flex flex-col px-6 pb-6">
            <div className="py-4 space-y-4 flex-grow">
                <Textarea
                    placeholder={`What's on your mind, ${user?.displayName || user?.username}?`}
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    className="min-h-[120px] h-full text-lg bg-transparent border-0 focus-visible:ring-0 p-1 resize-none shadow-none"
                />
            </div>
             <DialogFooter className="mt-auto">
                <Button variant="ghost" onClick={() => handleNoteSubmit('draft')} disabled={isSubmitting || !noteContent.trim()}>
                    Save as Draft
                </Button>
                <Button onClick={() => handleNoteSubmit('published')} disabled={isSubmitting || !noteContent.trim()}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Post Note
                </Button>
            </DialogFooter>
        </TabsContent>
        <TabsContent value="media" className="flex-grow flex flex-col p-0">
             <div className="flex-grow flex flex-col p-6 overflow-hidden">
                <div 
                    className="w-full aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted relative overflow-hidden"
                    onClick={() => mediaInputRef.current?.click()}
                >
                    {mediaPreview ? (
                        <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="contain" />
                    ) : (
                        <>
                            <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">Select from gallery</p>
                        </>
                    )}
                    <Input type="file" ref={mediaInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium">Gallery</p>
                    <div className="mt-2 text-center text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg">
                        Direct gallery access is not available in web apps.
                        <br />
                        Click above to select a file from your device.
                    </div>
                </div>
            </div>
            <DialogFooter className="p-6 pt-0 mt-auto">
                <Button onClick={() => setUploaderScreen('editor')} disabled={!mediaFile}>
                    Next <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </DialogFooter>
        </TabsContent>
        <TabsContent value="song" className="px-6 pb-6">
            <div className="py-4 space-y-4">
                <SongSearch
                    onSongSelect={(song) => setSelectedSong(song)}
                    onLyricSelect={setSongLyricSnippet}
                />
                {selectedSong && songLyricSnippet && (
                    <div className="p-3 bg-muted rounded-md text-center">
                        <p className="text-sm font-semibold italic text-foreground/80">"{songLyricSnippet}"</p>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => handleSongSubmit('draft')} disabled={isSubmitting || !selectedSong}>
                    Save as Draft
                </Button>
                <Button onClick={() => handleSongSubmit('published')} disabled={isSubmitting || !selectedSong}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Post Song
                </Button>
            </DialogFooter>
        </TabsContent>
        <TabsContent value="manage" className="px-6 pb-6">
             <ScrollArea className="h-96">
                <div className="space-y-4 p-1">
                    {managedStatuses.length > 0 ? managedStatuses.map(item => (
                        <Card key={item.id} className={cn("flex items-center p-3", item.isTrashed && "opacity-60")}>
                            {item.mediaUrl ? (
                                 <Image src={item.mediaUrl} alt="Status item" width={60} height={60} className="rounded-md object-cover mr-3 aspect-square" />
                            ): (
                                <div className="w-[60px] h-[60px] flex items-center justify-center bg-muted rounded-md mr-3 text-2xl">
                                    {item.spotifyUrl ? <Music className="h-6 w-6"/> : <Feather className="h-6 w-6"/>}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="text-sm truncate">{item.textOverlay || item.note || item.songLyricSnippet || "No caption"}</p>
                                <p className="text-xs font-semibold text-destructive">{item.isTrashed ? "In Trash" : "Draft"}</p>
                            </div>
                            <div className="flex gap-1">
                                {item.isTrashed ? (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => handleRestoreFromTrash(item.id)}><RotateCcw className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitleComponent>Delete Forever?</AlertDialogTitleComponent><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteFromTrash(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                ) : (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => handlePublishDraft(item)}>Publish</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteDraft(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </>
                                )}
                            </div>
                        </Card>
                    )) : (
                    <div className="py-10 text-center text-muted-foreground space-y-3">
                      <p>No drafts or trashed items.</p>
                    </div>
                    )}
                </div>
            </ScrollArea>
        </TabsContent>
      </Tabs>
    </>
  );

  const renderEditorScreen = () => (
    <div className="h-full flex flex-col">
        <DialogHeader className="p-4 border-b">
            <div className="flex justify-between items-center">
                <Button variant="ghost" size="icon" onClick={() => setUploaderScreen('picker')}><X className="h-5 w-5" /></Button>
                <DialogTitle className="sr-only">Edit Status</DialogTitle>
                <Button onClick={() => handleMediaSubmit('published')} disabled={!mediaFile && !editingDraft || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Post
                </Button>
            </div>
        </DialogHeader>
        <ScrollArea className="flex-grow">
            <div className="p-4 space-y-4">
                <div className="relative group">
                    {mediaType === 'image' ? (
                        <Image src={mediaPreview!} alt="Preview" width={400} height={400} className={cn("w-full h-auto object-contain rounded-lg transition-all", selectedFilter)} />
                    ) : (
                        <video ref={previewVideoRef} src={mediaPreview!} autoPlay muted loop playsInline className="w-full h-auto object-contain rounded-lg" />
                    )}
                </div>
                
                <div className="space-y-4">
                    {mediaType === 'image' && (
                        <div>
                            <Label className="text-xs text-muted-foreground">Filters</Label>
                            <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex space-x-2 pb-2">
                                    {photoFilters.map(filter => (
                                        <div key={filter.name} onClick={() => setSelectedFilter(filter.style)} className="text-center cursor-pointer">
                                            <Image src={mediaPreview!} alt={filter.name} width={60} height={60} className={cn("rounded-md object-cover w-16 h-16 border-2 transition-all", selectedFilter === filter.style ? 'border-primary' : 'border-transparent', filter.style)} />
                                            <p className="text-xs mt-1">{filter.name}</p>
                                        </div>
                                    ))}
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                    )}

                    <Input type="text" placeholder="Add a caption..." value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} maxLength={100} />
                    
                    {mediaType === 'image' && (
                    <Button variant="outline" size="sm" onClick={handleGenerateCaptions} disabled={isGeneratingCaptions}>
                        {isGeneratingCaptions ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Wand2 className="h-4 w-4 mr-2" />}
                        Generate AI Captions
                    </Button>
                    )}
                    
                    {suggestedCaptions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {suggestedCaptions.map((caption, i) => (
                                <Button key={i} size="sm" variant="secondary" onClick={() => setTextOverlay(caption)}>{caption}</Button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between p-2 border rounded-md">
                        <Label htmlFor="poll-switch">Add a Poll</Label>
                        <Switch id="poll-switch" checked={showPollCreator} onCheckedChange={setShowPollCreator} />
                    </div>

                    {showPollCreator && (
                        <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                            <Input placeholder="Poll Question" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
                            <div className="flex gap-2">
                                <Input placeholder="Option 1" value={pollOption1} onChange={e => setPollOption1(e.target.value)} />
                                <Input placeholder="Option 2" value={pollOption2} onChange={e => setPollOption2(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div>
                        <Label htmlFor="expiry-select">Set Expiry Duration</Label>
                        <Select value={expiryDuration} onValueChange={setExpiryDuration}>
                            <SelectTrigger id="expiry-select" className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="3">3 Hours</SelectItem>
                                <SelectItem value="6">6 Hours</SelectItem>
                                <SelectItem value="12">12 Hours</SelectItem>
                                <SelectItem value="24">24 Hours</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </ScrollArea>
         <DialogFooter className="p-4 border-t">
            <Button variant="ghost" onClick={() => handleMediaSubmit('draft')} disabled={!mediaFile && !editingDraft || isSubmitting}>Save as Draft</Button>
        </DialogFooter>
    </div>
  );
  
  return (
    <div className='py-4'>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start space-x-4">
           <div className="text-center flex-shrink-0 w-20 cursor-pointer group" onClick={() => handleOpenUploader('media')}>
             <div className="relative w-16 h-16 mx-auto">
                <Avatar className="w-full h-full border-2 border-border group-hover:border-primary/50 transition-colors">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.username?.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-md">
                    <Plus className="h-4 w-4 text-primary-foreground" />
                </div>
             </div>
             <p className="text-xs mt-1 truncate">Your Status</p>
           </div>

            {isLoading ? (
                [...Array(4)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted animate-pulse mx-auto"></div>
                        <div className="h-2 w-12 bg-muted rounded mt-2 mx-auto animate-pulse"></div>
                    </div>
                ))
            ) : (
                statusOrder.map((userId) => {
                    const group = groupedStatuses.get(userId);
                    if (!group) return null;
                    const latestStatus = group.statuses.sort((a, b) => {
                        const timeA = a.createdAt ? (a.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
                        const timeB = b.createdAt ? (b.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
                        return timeB - timeA;
                    })[0];
                    return <StatusBubble key={userId} user={group.user} statuses={group.statuses} onSelect={handleSelectUser} latestStatus={latestStatus} />
                })
            )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

       <Dialog open={isUploaderOpen} onOpenChange={(open) => { setIsUploaderOpen(open); if(!open) resetUploader(); }}>
            <DialogContent className="p-0 m-0 border-0 w-screen h-screen max-w-full sm:max-w-md sm:h-[90vh] sm:max-h-[90vh] flex flex-col gap-0 rounded-lg">
                {uploaderScreen === 'picker' ? renderPickerScreen() : renderEditorScreen()}
            </DialogContent>
        </Dialog>

      <StatusViewer
        isOpen={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        selectedUser={selectedUserForViewing}
        userStatuses={selectedUserForViewing ? groupedStatuses.get(selectedUserForViewing.id)?.statuses || [] : []}
        onNext={handleNextUser}
        onPrev={handlePrevUser}
        onStatusArchived={onStatusArchived}
        onOpenUploader={handleOpenUploader}
      />
    </div>
  );
}
