

'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Poll } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Camera, Send, X, Vote, Trash2, RotateCcw, Archive, Wand2, Music, Pause, Play, Feather } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { restoreStatusUpdate, permanentlyDeleteStatusUpdate } from '@/app/actions/statusActions';
import { getStatusCaptions } from '@/app/actions/aiActions';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import StatusViewer from './StatusViewer';


const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function StatusBubble({ user, statuses, onSelect, latestStatus }: { user: User, statuses: StatusUpdate[], onSelect: (user: User) => void, latestStatus: StatusUpdate | null }) {
  const isNote = latestStatus && (latestStatus.note || latestStatus.spotifyUrl);

  return (
    <div 
      className="relative text-center flex-shrink-0 w-20 cursor-pointer group"
      onClick={() => onSelect(user)}
    >
      {isNote && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-max max-w-[150px] mb-2 z-10">
            <div className="bg-muted px-2.5 py-1.5 rounded-lg shadow-md">
                <p className="text-xs text-foreground truncate">{latestStatus.note}</p>
                 {latestStatus.spotifyUrl && <Music className="h-3 w-3 text-muted-foreground mx-auto mt-0.5" />}
            </div>
             <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[5px] border-t-muted"></div>
        </div>
      )}
      <div className={cn(
          "w-16 h-16 p-0.5 rounded-full mx-auto group-hover:scale-110 transition-all",
          !isNote && "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500"
      )}>
        <Avatar className="w-full h-full border-2 border-background">
          <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
          <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <p className="text-xs mt-1 truncate">{user.displayName || user.username}</p>
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
  const [draftStatuses, setDraftStatuses] = useState<StatusUpdate[]>([]);
  const [trashedStatuses, setTrashedStatuses] = useState<StatusUpdate[]>([]);
  const [groupedStatuses, setGroupedStatuses] = useState<Map<string, {user: User, statuses: StatusUpdate[]}>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
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
  const [spotifyUrl, setSpotifyUrl] = useState('');
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
  const [isGeneratingCaptions, startCaptionTransition] = useTransition();

  const [selectedFilter, setSelectedFilter] = useState<(typeof photoFilters)[number]['style']>('filter-none');
  const [expiryDuration, setExpiryDuration] = useState<string>('24');
  
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  
  const [uploaderDefaultTab, setUploaderDefaultTab] = useState('notes');

  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    const statusesQuery = query(
      collection(db, 'statusUpdates'),
      where('isArchived', '==', false),
      where('isTrashed', '==', false)
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

        setDraftStatuses(sortedStatuses.filter(s => s.status === 'draft'));
        setIsLoading(false);
    });

    const trashQuery = query(collection(db, 'statusUpdates'), where('authorId', '==', user.id), where('isTrashed', '==', true), orderBy('trashedAt', 'desc'));
    const unsubTrash = onSnapshot(trashQuery, (snapshot) => {
        setTrashedStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
    });


    return () => {
        unsubStatuses();
        unsubTrash();
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
    setSelectedUserForViewing(user);
    setIsViewerOpen(true);
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
    setMediaFile(null);
    setMediaPreview(null);
    setTextOverlay('');
    setNoteContent('');
    setSpotifyUrl('');
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOption1('');
    setPollOption2('');
    setSuggestedCaptions([]);
    setSelectedFilter('filter-none');
    setExpiryDuration('24');
  }
  
  const handleTabChange = (value: string) => {
    // Reset forms when switching tabs to avoid state confusion
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
        createdAt: serverTimestamp(),
        isArchived: false,
        isTrashed: false,
        status,
        expiresAt: expiryTime,
    };
  };

  const handleNoteSubmit = async (status: 'published' | 'draft') => {
    const baseStatus = createBaseStatus(status);
    if (!baseStatus) return;
    if (!noteContent.trim() && !spotifyUrl.trim()) {
        toast({ title: "Note is empty", description: "Please write a note or add a song.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    
    const statusData: { [key: string]: any } = { ...baseStatus };
     if (noteContent.trim()) {
        statusData.note = noteContent.trim();
    }
    if (spotifyUrl.trim()) {
        statusData.spotifyUrl = spotifyUrl.trim();
    }

    try {
        await addDoc(collection(db, 'statusUpdates'), statusData);
        toast({ title: `Note ${status === 'published' ? 'Posted!' : 'Saved as Draft!'}` });
        setIsUploaderOpen(false);
        resetUploader();
    } catch (error) {
        console.error("Error saving note status:", error);
        toast({ title: "Failed to save note", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleMediaSubmit = async (status: 'published' | 'draft') => {
    const baseStatus = createBaseStatus(status);
    if (!baseStatus || !mediaFile) return;

    setIsSubmitting(true);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
        toast({ title: 'Configuration Error', description: 'Cloudinary environment variables are not set.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
    let mediaUrl = '';
    try {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('resource_type', 'auto');
        
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
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

    const statusData: { [key: string]: any } = {
        ...baseStatus,
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

    try {
        await addDoc(collection(db, 'statusUpdates'), statusData);
        toast({ title: `Status ${status === 'published' ? 'Published!' : 'Saved as Draft!'}` });
        setIsUploaderOpen(false);
        resetUploader();
    } catch (error) {
        console.error("Error saving status:", error);
        toast({ title: "Failed to save status", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };


  const handlePublishDraft = async (draftId: string) => {
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, "statusUpdates", draftId), {
        status: 'published',
        expiresAt: expiresAt,
        createdAt: serverTimestamp(),
    });
    toast({title: "Draft Published!"});
  }

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDoc(doc(db, "statusUpdates", draftId));
    toast({title: "Draft Deleted"});
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

  const openUploader = (defaultTab: string) => {
    setUploaderDefaultTab(defaultTab);
    setIsUploaderOpen(true);
  };


  if (authLoading) {
    return <div className="h-[98px] w-full bg-card rounded-lg animate-pulse" />;
  }

  if (!user || user.isAnonymous) {
    return null;
  }
  
  return (
    <>
      <div className="bg-card p-3 rounded-lg shadow-sm">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start space-x-4 px-4">
            {draftStatuses.length > 0 && (
                <div className="text-center flex-shrink-0 w-20">
                    <button 
                        onClick={() => openUploader('drafts')} 
                        className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors relative group"
                    >
                        <Feather className="h-6 w-6 text-primary" />
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {draftStatuses.length}
                        </div>
                    </button>
                    <p className="text-xs mt-1 truncate">Drafts</p>
                </div>
            )}

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
      </div>
       <Dialog open={isUploaderOpen} onOpenChange={(open) => { setIsUploaderOpen(open); if(!open) resetUploader(); }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                         <DialogTitle>Manage Status</DialogTitle>
                         <Button variant="ghost" size="icon" onClick={() => openUploader('notes')}>
                            <Plus className="h-4 w-4" />
                         </Button>
                    </div>
                    <DialogDescription>Upload a new status, share a note, or manage your drafts and trash.</DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue={uploaderDefaultTab} value={uploaderDefaultTab} onValueChange={(value) => { setUploaderDefaultTab(value); handleTabChange(value);}} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="notes">Note</TabsTrigger>
                        <TabsTrigger value="upload">Media</TabsTrigger>
                        <TabsTrigger value="drafts">Drafts</TabsTrigger>
                        <TabsTrigger value="trash">Trash</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes">
                        <div className="py-4 space-y-4">
                            <Label htmlFor="note-content">Share a quick note...</Label>
                            <Input id="note-content" placeholder="What's on your mind?" value={noteContent} onChange={e => setNoteContent(e.target.value)} maxLength={140} />
                            <Label htmlFor="spotify-url">...or a song</Label>
                            <div className="flex items-center gap-2">
                                <Music className="h-5 w-5 text-muted-foreground" />
                                <Input id="spotify-url" placeholder="Paste a Spotify track link (optional)" value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} />
                            </div>
                            {spotifyUrl && <SpotifyPlayer />}
                             <div>
                                <Label htmlFor="expiry-select-note">Set Expiry Duration</Label>
                                <Select value={expiryDuration} onValueChange={setExpiryDuration}>
                                    <SelectTrigger id="expiry-select-note" className="w-[180px] mt-1">
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
                         <DialogFooter>
                            <Button onClick={() => handleNoteSubmit('published')} disabled={isSubmitting || (!noteContent.trim() && !spotifyUrl.trim())}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Post Note
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                    <TabsContent value="upload">
                        <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="py-4 space-y-4">
                                {mediaPreview ? (
                                    <div className="relative group">
                                        {mediaType === 'image' ? (
                                            <Image src={mediaPreview} alt="Preview" width={400} height={400} className={cn("w-full h-auto object-contain rounded-lg transition-all", selectedFilter)} />
                                        ) : (
                                            <video ref={previewVideoRef} src={mediaPreview} autoPlay muted loop playsInline className="w-full h-auto object-contain rounded-lg" />
                                        )}
                                        {mediaType === 'video' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="text-white h-16 w-16" onClick={handlePreviewPlayToggle}>
                                                    {isPreviewPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10" />}
                                                </Button>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setShowPollCreator(!showPollCreator)}>
                                                <Vote className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={resetUploader}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        className="w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted"
                                        onClick={() => mediaInputRef.current?.click()}
                                    >
                                        <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground">Click to upload image or video</p>
                                        <Input type="file" ref={mediaInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />
                                    </div>
                                )}
                                
                                {mediaPreview && (
                                    <div className="space-y-4">
                                        {mediaType === 'image' && (
                                          <div>
                                              <Label className="text-xs text-muted-foreground">Filters</Label>
                                              <ScrollArea className="w-full whitespace-nowrap">
                                                  <div className="flex space-x-2 pb-2">
                                                      {photoFilters.map(filter => (
                                                          <div key={filter.name} onClick={() => setSelectedFilter(filter.style)} className="text-center cursor-pointer">
                                                              <Image src={mediaPreview} alt={filter.name} width={60} height={60} className={cn("rounded-md object-cover w-16 h-16 border-2 transition-all", selectedFilter === filter.style ? 'border-primary' : 'border-transparent', filter.style)} />
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

                                        {showPollCreator && (
                                            <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                                                <Label>Create a Poll</Label>
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
                                )}
                            </div>
                        </ScrollArea>
                         <DialogFooter>
                            <Button variant="outline" onClick={() => handleMediaSubmit('draft')} disabled={!mediaFile || isSubmitting}>Save as Draft</Button>
                            <Button onClick={() => handleMediaSubmit('published')} disabled={!mediaFile || isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Publish Status
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                    <TabsContent value="drafts">
                        <ScrollArea className="h-96">
                            <div className="space-y-2 p-1">
                                {draftStatuses.length > 0 ? draftStatuses.map(draft => (
                                    <Card key={draft.id} className="flex items-center p-2">
                                        {draft.mediaUrl ? (
                                             <Image src={draft.mediaUrl} alt="Draft" width={60} height={60} className="rounded-md object-cover mr-3 aspect-square" />
                                        ): (
                                            <div className="w-[60px] h-[60px] flex items-center justify-center bg-muted rounded-md mr-3 text-2xl">📝</div>
                                        )}
                                        <p className="text-sm flex-1 truncate">{draft.textOverlay || draft.note || "No caption"}</p>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={() => handlePublishDraft(draft.id)}>Publish</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteDraft(draft.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </Card>
                                )) : <p className="text-center text-muted-foreground py-10">No drafts saved.</p>}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="trash">
                         <ScrollArea className="h-96">
                            <div className="space-y-2 p-1">
                                {trashedStatuses.length > 0 ? trashedStatuses.map(item => (
                                    <Card key={item.id} className="flex items-center p-2">
                                         {item.mediaUrl ? (
                                             <Image src={item.mediaUrl} alt="Trashed item" width={60} height={60} className="rounded-md object-cover mr-3 aspect-square" />
                                        ): (
                                            <div className="w-[60px] h-[60px] flex items-center justify-center bg-muted rounded-md mr-3 text-2xl">📝</div>
                                        )}
                                        <p className="text-sm flex-1 truncate">{item.textOverlay || item.note || "No caption"}</p>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={() => handleRestoreFromTrash(item.id)}><RotateCcw className="h-4 w-4"/></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete Forever?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteFromTrash(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </Card>
                                )) : <p className="text-center text-muted-foreground py-10">Trash is empty.</p>}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
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
      />
    </>
  );
}

    

    

