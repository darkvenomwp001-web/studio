
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
import { Loader2, Plus, Camera, Send, X, Vote, Trash2, RotateCcw, Archive, Wand2, Music, Pause, Play, Feather, MessageSquare, ArrowRight, Link as LinkIcon, Save, Settings, Text, Image as ImageIcon, BarChart2, Users, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusCaptions } from '@/app/actions/aiActions';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import StatusViewer from './StatusViewer';
import { Textarea } from '../ui/textarea';
import SongSearch from './SongSearch';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';


const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function StatusBubble({ user, statuses, onSelect, latestStatus }: { user: User, statuses: StatusUpdate[], onSelect: (user: User) => void, latestStatus: StatusUpdate | null }) {
  const { user: authUser } = useAuth();
  const isOwn = authUser?.id === user.id;
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
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusUpdate[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<StatusUpdate[]>([]);
  const [groupedStatuses, setGroupedStatuses] = useState<Map<string, {user: User, statuses: StatusUpdate[]}>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textOverlay, setTextOverlay] = useState('');
  
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

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
  
  const [activeUploaderTab, setActiveUploaderTab] = useState('text');
  const [editingDraft, setEditingDraft] = useState<StatusUpdate | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.isAnonymous) {
        setIsLoading(false);
        return;
    }

    const now = Timestamp.now();

    // Query for published, non-hidden, non-expired statuses
    const publishedQuery = query(
      collection(db, 'statusUpdates'),
      where('status', '==', 'published'),
      where('isHidden', '==', false),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc') // Example ordering
    );
    
    // Query for the current user's drafts
    const draftsQuery = query(
        collection(db, 'statusUpdates'),
        where('authorId', '==', user.id),
        where('status', '==', 'draft'),
        orderBy('createdAt', 'desc')
    );

    const unsubPublished = onSnapshot(publishedQuery, (snapshot) => {
        const liveStatuses = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate))
            .filter(s => {
                if (s.visibility === 'close-friends' && user && !user.followingIds?.includes(s.authorId) && s.authorId !== user.id) {
                    // A proper implementation would check a 'closeFriendsOf' array on the current user
                    return false;
                }
                return s.expiresAt && (s.expiresAt as Timestamp).toMillis() > Date.now()
            });
        
        liveStatuses.sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            const timeB = b.createdAt ? (b.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            return timeB - timeA;
        });
        
        setAllStatuses(liveStatuses);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching published statuses: ", error);
        setIsLoading(false);
    });

    const unsubDrafts = onSnapshot(draftsQuery, (snapshot) => {
        setDraftStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
    }, (error) => {
        console.error("Error fetching draft statuses: ", error);
    });

    return () => {
        unsubPublished();
        unsubDrafts();
    };
  }, [user]);

  useEffect(() => {
    const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
    const newStatusOrder: string[] = [];

    // Prioritize current user's status bubble
    if (user && !user.isAnonymous) {
      const currentUserLive = allStatuses.filter(s => s.authorId === user.id);
      if (currentUserLive.length > 0) {
          groups.set(user.id, { user: user as User, statuses: currentUserLive });
          newStatusOrder.push(user.id);
      }
    }
    
    allStatuses.forEach(status => {
        if (status.authorId === user?.id) return; // Already handled
        if (!groups.has(status.authorId)) {
            groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
            newStatusOrder.push(status.authorId);
        }
        groups.get(status.authorId)!.statuses.push(status);
    });

    setGroupedStatuses(groups);
    setStatusOrder(newStatusOrder);
  }, [allStatuses, user]);


  const handleSelectUser = (selectedUser: User) => {
    if (!user || user.isAnonymous) {
        router.push('/auth/signin');
        return;
    }

    const userHasStatuses = groupedStatuses.has(selectedUser.id) && groupedStatuses.get(selectedUser.id)!.statuses.length > 0;
    if (userHasStatuses) {
        setSelectedUserForViewing(selectedUser);
        setIsViewerOpen(true);
    } else {
        setIsCreatorOpen(true);
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
    setMediaFile(null);
    setMediaPreview(null);
    setTextOverlay('');
    setNoteContent('');
    setSelectedSong(null);
    setSongLyricSnippet(null);
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setSuggestedCaptions([]);
    setSelectedFilter('filter-none');
    setExpiryDuration('24');
    setEditingDraft(null);
  }
  
  const handleTabChange = (value: string) => {
    setActiveUploaderTab(value);
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
  
  const createBaseStatus = (status: 'published' | 'draft', visibility: 'public' | 'close-friends') => {
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
        status,
        expiresAt: expiryTime,
        isHidden: false,
        visibility: visibility,
    };
  };

  const handleSubmit = async (status: 'published' | 'draft', visibility: 'public' | 'close-friends', data: Record<string, any>) => {
    const baseStatus = createBaseStatus(status, visibility);
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

  const handleTextSubmit = async (status: 'published' | 'draft', visibility: 'public' | 'close-friends' = 'public') => {
    if (!noteContent.trim()) {
        toast({ title: "Text is empty", description: "Please write something.", variant: "destructive" });
        return;
    }
    const data: Record<string, any> = { note: noteContent.trim() };
    await handleSubmit(status, visibility, data);
  };
  
  const handleSongSubmit = async (status: 'published' | 'draft', visibility: 'public' | 'close-friends' = 'public') => {
      if (!selectedSong) {
        toast({ title: "No song selected", variant: "destructive" });
        return;
      }
      const data: Record<string, any> = {
          spotifyUrl: `https://open.spotify.com/track/${selectedSong.id}`,
          note: noteContent.trim() || '',
          songLyricSnippet: songLyricSnippet || '',
      };
      await handleSubmit(status, visibility, data);
  }

  const handlePollSubmit = async (status: 'published' | 'draft', visibility: 'public' | 'close-friends' = 'public') => {
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
      toast({ title: 'Poll is incomplete', description: 'Please fill out the question and all options.', variant: 'destructive'});
      return;
    }
     const data: Record<string, any> = {
        poll: {
            question: pollQuestion.trim(),
            options: pollOptions.map((opt, index) => ({ id: `opt${index + 1}`, text: opt.trim(), votes: [] }))
        }
    };
    await handleSubmit(status, visibility, data);
  }


  const handleMediaSubmit = async (status: 'published' | 'draft', visibility: 'public' | 'close-friends' = 'public') => {
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
    
    setIsSubmitting(false);
    await handleSubmit(status, visibility, statusData);
  };

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
  
  const handleOpenCreatorMenu = () => {
      if (!user || user.isAnonymous) {
          router.push('/auth/signin');
          return;
      }
      setIsCreatorOpen(true);
  }

  const handleOpenUploader = (defaultTab: string) => {
    setIsCreatorOpen(false); // Close the menu
    setActiveUploaderTab(defaultTab);
    setIsUploaderOpen(true);
  };


  if (authLoading) {
    return <div className="h-[98px] w-full bg-card rounded-lg animate-pulse" />;
  }

  if (!user || user.isAnonymous) {
    return null;
  }
  
  const uploaderContent = () => {
    switch (activeUploaderTab) {
      case 'text':
        return (
          <>
            <div className="py-4 space-y-4 flex-grow flex flex-col">
              <Textarea
                  placeholder={`What's on your mind, ${user?.displayName || user?.username}?`}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="flex-grow text-lg bg-transparent border-0 focus-visible:ring-0 p-1 resize-none shadow-none"
              />
            </div>
            <DialogFooter className="flex-row justify-between items-center">
              <Select value={expiryDuration} onValueChange={setExpiryDuration}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="3">Expires in 3 Hours</SelectItem>
                    <SelectItem value="6">Expires in 6 Hours</SelectItem>
                    <SelectItem value="10">Expires in 10 Hours</SelectItem>
                    <SelectItem value="24">Expires in 24 Hours</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleTextSubmit('draft')} disabled={isSubmitting || !noteContent.trim()}>Save as Draft</Button>
                <Button onClick={() => handleTextSubmit('published')} disabled={isSubmitting || !noteContent.trim()}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
                </Button>
              </div>
            </DialogFooter>
          </>
        );
      case 'media':
        return (
          <>
            <div className="flex-grow flex flex-col overflow-hidden bg-black/80 justify-center">
              {mediaPreview ? (
                <div className="relative w-full h-full flex flex-col">
                  {/* Media Preview */}
                  <div className="flex-grow relative flex items-center justify-center">
                    {mediaType === 'video' ? (
                      <video ref={previewVideoRef} src={mediaPreview} className={cn("max-h-full max-w-full object-contain", selectedFilter)} loop playsInline autoPlay muted />
                    ) : (
                      <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="contain" className={cn(selectedFilter)} />
                    )}
                    {/* Text Overlay Input */}
                    <div className="absolute inset-x-0 bottom-1/2 translate-y-1/2 p-4">
                        <Input 
                            placeholder="Add text..." 
                            value={textOverlay}
                            onChange={(e) => setTextOverlay(e.target.value)}
                            className="bg-black/50 text-white text-center border-none text-lg placeholder:text-white/70 focus-visible:ring-0"
                        />
                    </div>
                     {/* Play/Pause Button for Video */}
                     {mediaType === 'video' && (
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-black/50 hover:bg-black/70" onClick={handlePreviewPlayToggle}>
                            {isPreviewPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
                        </Button>
                    )}
                  </div>
                  {/* Filters */}
                  {mediaType === 'image' && (
                    <div className="w-full flex-shrink-0 bg-background/80 p-2 backdrop-blur-sm">
                      <ScrollArea>
                        <div className="flex space-x-2 pb-2">
                          {photoFilters.map(filter => (
                            <div key={filter.name} className="text-center w-20 flex-shrink-0" onClick={() => setSelectedFilter(filter.style)}>
                              <p className={cn("text-xs mb-1", selectedFilter === filter.style ? 'text-primary font-semibold' : 'text-muted-foreground')}>{filter.name}</p>
                              <div className={cn("w-full aspect-square rounded-md overflow-hidden border-2", selectedFilter === filter.style ? 'border-primary' : 'border-transparent')}>
                                <Image src={mediaPreview} alt={filter.name} width={80} height={80} objectFit="cover" className={filter.style} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 p-4"
                    onClick={() => mediaInputRef.current?.click()}
                >
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Select photo or video</p>
                    <Input type="file" ref={mediaInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />
                </div>
              )}
            </div>
            <DialogFooter className="flex-row justify-between items-center p-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleMediaSubmit('draft', 'close-friends')} disabled={isSubmitting || !mediaPreview}>
                  <Users className="h-4 w-4 mr-2" /> Close Friends
                </Button>
                <Button onClick={() => handleMediaSubmit('published', 'public')} disabled={isSubmitting || !mediaPreview}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Your Story
                </Button>
            </DialogFooter>
          </>
        );
      case 'song':
        return (
          <>
            <div className="py-4 space-y-4 flex-grow px-6">
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
            <DialogFooter className="flex-row justify-between items-center">
                <Select value={expiryDuration} onValueChange={setExpiryDuration}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="3">Expires in 3 Hours</SelectItem>
                      <SelectItem value="6">Expires in 6 Hours</SelectItem>
                      <SelectItem value="10">Expires in 10 Hours</SelectItem>
                      <SelectItem value="24">Expires in 24 Hours</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => handleSongSubmit('draft')} disabled={isSubmitting || !selectedSong}>Save as Draft</Button>
                  <Button onClick={() => handleSongSubmit('published')} disabled={isSubmitting || !selectedSong}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
                  </Button>
                </div>
            </DialogFooter>
          </>
        );
        case 'poll':
        return (
          <>
            <div className="py-4 space-y-4 flex-grow px-6">
               <Textarea
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    className="text-lg font-semibold bg-transparent border-0 focus-visible:ring-0 p-1 resize-none shadow-none"
                />
                <div className="space-y-2">
                    {pollOptions.map((option, index) => (
                         <Input 
                            key={index}
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => {
                                const newOptions = [...pollOptions];
                                newOptions[index] = e.target.value;
                                setPollOptions(newOptions);
                            }}
                         />
                    ))}
                    {pollOptions.length < 4 && <Button variant="link" size="sm" onClick={() => setPollOptions([...pollOptions, ''])}>Add option</Button>}
                </div>
            </div>
            <DialogFooter className="flex-row justify-between items-center">
              <Select value={expiryDuration} onValueChange={setExpiryDuration}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="3">Expires in 3 Hours</SelectItem>
                      <SelectItem value="6">Expires in 6 Hours</SelectItem>
                      <SelectItem value="10">Expires in 10 Hours</SelectItem>
                      <SelectItem value="24">Expires in 24 Hours</SelectItem>
                  </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handlePollSubmit('draft')} disabled={isSubmitting || !pollQuestion.trim()}>Save as Draft</Button>
                <Button onClick={() => handlePollSubmit('published')} disabled={isSubmitting || !pollQuestion.trim()}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
                </Button>
              </div>
            </DialogFooter>
          </>
        );
        case 'settings':
            return (
                <>
                <div className="p-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Who can see my status?</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <RadioGroup defaultValue="followers" className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="followers" id="r1" />
                                    <Label htmlFor="r1">My Followers</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="close_friends" id="r2" />
                                    <Label htmlFor="r2">Close Friends Only</Label>
                                </div>
                             </RadioGroup>
                        </CardContent>
                    </Card>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Done</Button>
                    </DialogClose>
                </DialogFooter>
                </>
            );
        case 'drafts':
            return (
                 <>
                <div className="p-6 space-y-4">
                    {draftStatuses.length > 0 ? draftStatuses.map(draft => (
                        <div key={draft.id} className='p-2 border rounded-md'>Draft: {draft.note || 'Media Status'}</div>
                    )) : <p className='text-muted-foreground text-center'>No drafts saved.</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Close</Button>
                    </DialogClose>
                </DialogFooter>
                </>
            );
      default:
        return null;
    }
  };
  
  return (
    <div className='py-4'>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start space-x-4">
            {user && !user.isAnonymous && (
               <div className="text-center flex-shrink-0 w-20 cursor-pointer group" onClick={handleOpenCreatorMenu}>
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

      <Dialog open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Create a New Status</DialogTitle>
                  <DialogDescription>What would you like to share today?</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('text')}><Text className="h-6 w-6"/>Text</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('media')}><ImageIcon className="h-6 w-6"/>Media</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('song')}><Music className="h-6 w-6"/>Song</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('poll')}><BarChart2 className="h-6 w-6"/>Poll</Button>
                   <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => toast({ title: 'Coming Soon!' })}><BookOpen className="h-6 w-6"/>Share Story</Button>
              </div>
          </DialogContent>
      </Dialog>

       <Dialog open={isUploaderOpen} onOpenChange={(open) => { setIsUploaderOpen(open); if(!open) resetUploader(); }}>
          <DialogContent className="p-0 m-0 border-0 w-screen h-[90vh] max-h-[700px] max-w-full sm:max-w-md flex flex-col gap-0 rounded-lg">
            <DialogHeader className="p-4 flex-row items-center justify-between border-b">
                <DialogTitle>Create Status</DialogTitle>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setActiveUploaderTab('drafts')}><Archive className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveUploaderTab('settings')}><Settings className="h-5 w-5"/></Button>
                    <DialogClose asChild><Button variant="ghost" size="icon"><X className="h-5 w-5"/></Button></DialogClose>
                </div>
            </DialogHeader>
            <div className="flex-grow flex flex-col overflow-hidden">
              {uploaderContent()}
            </div>
             <div className="p-2 border-t bg-background">
                <Tabs value={activeUploaderTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="text"><Text className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="media"><ImageIcon className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="song"><Music className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="poll"><BarChart2 className="h-5 w-5"/></TabsTrigger>
                    </TabsList>
                </Tabs>
             </div>
          </DialogContent>
        </Dialog>

      <StatusViewer
        isOpen={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        selectedUser={selectedUserForViewing}
        userStatuses={selectedUserForViewing ? groupedStatuses.get(selectedUserForViewing.id)?.statuses || [] : []}
        onNext={handleNextUser}
        onPrev={handlePrevUser}
      />
    </div>
  );
}
