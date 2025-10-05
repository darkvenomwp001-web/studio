
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
import { Loader2, Plus, Camera, Send, X, Vote, Trash2, RotateCcw, Archive, Wand2, Music, Pause, Play, Feather, MessageSquare, ArrowRight, Link as LinkIcon, Save, Settings, Text, Image as ImageIcon, BarChart2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { moveStatusToDrafts, permanentlyDeleteStatusUpdate } from '@/app/actions/statusActions';
import { getStatusCaptions } from '@/app/actions/aiActions';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import StatusViewer from './StatusViewer';
import { Textarea } from '../ui/textarea';
import SongSearch from './SongSearch';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';


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
  const { user, loading: authLoading } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusUpdate[]>([]);
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

    const statusesQuery = query(
      collection(db, 'statusUpdates'),
      where('status', '==', 'published'),
      where('expiresAt', '>', Timestamp.now())
    );
    
    const unsubStatuses = onSnapshot(statusesQuery, (snapshot) => {
        const now = Date.now();
        const allFetchedStatuses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate));

        const liveAndRelevant = allFetchedStatuses.filter(s => {
            return s.status === 'published' && s.expiresAt && (s.expiresAt as Timestamp).toMillis() > now;
        });

        const sortedStatuses = liveAndRelevant.sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            const timeB = b.createdAt ? (b.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            return timeB - timeA;
        });
        setAllStatuses(sortedStatuses);
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
    
    if (user && !user.isAnonymous) {
      // Prioritize current user's active statuses in the list
      const currentUserLive = liveStatuses.filter(s => s.authorId === user.id);
      if (currentUserLive.length > 0) {
          groups.set(user.id, { user: user as User, statuses: currentUserLive });
          newStatusOrder.push(user.id);
      }
    }
    
    liveStatuses.forEach(status => {
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
       toast({ title: "No Status", description: `${selectedUser.displayName} hasn't posted a status update yet.` });
    }
  }

  const handleOpenCreator = () => {
    if (!user || user.isAnonymous) {
      router.push('/auth/signin');
      return;
    }
    if (user.role === 'writer') {
      handleOpenUploader('text');
    } else {
      toast({
        title: "Reader Role",
        description: "Only users with a 'Writer' role can post a status update.",
        variant: 'destructive',
      });
    }
  };

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

  const handleTextSubmit = async (status: 'published' | 'draft') => {
    if (!noteContent.trim()) {
        toast({ title: "Text is empty", description: "Please write something.", variant: "destructive" });
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

  const handlePollSubmit = async (status: 'published' | 'draft') => {
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
    
    setIsSubmitting(false);
    await handleSubmit(status, statusData);
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
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleTextSubmit('draft')} disabled={isSubmitting || !noteContent.trim()}>Save as Draft</Button>
              <Button onClick={() => handleTextSubmit('published')} disabled={isSubmitting || !noteContent.trim()}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
              </Button>
            </DialogFooter>
          </>
        );
      case 'media':
        return (
          <>
            <div className="flex-grow flex flex-col p-6 overflow-hidden items-center justify-center">
              <div 
                  className="w-full max-w-[300px] aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted relative overflow-hidden"
                  onClick={() => mediaInputRef.current?.click()}
              >
                  {mediaPreview ? (
                      <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="contain" />
                  ) : (
                      <>
                          <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Select photo or video</p>
                      </>
                  )}
                  <Input type="file" ref={mediaInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />
              </div>
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={() => handleMediaSubmit('draft')} disabled={isSubmitting || !mediaFile}>Save as Draft</Button>
                <Button onClick={() => handleMediaSubmit('published')} disabled={isSubmitting || !mediaFile}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
                </Button>
            </DialogFooter>
          </>
        );
      case 'song':
        return (
          <>
            <div className="py-4 space-y-4 flex-grow">
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
              <Button variant="ghost" onClick={() => handleSongSubmit('draft')} disabled={isSubmitting || !selectedSong}>Save as Draft</Button>
              <Button onClick={() => handleSongSubmit('published')} disabled={isSubmitting || !selectedSong}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
              </Button>
            </DialogFooter>
          </>
        );
        case 'poll':
        return (
          <>
            <div className="py-4 space-y-4 flex-grow">
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
            <DialogFooter>
              <Button variant="ghost" onClick={() => handlePollSubmit('draft')} disabled={isSubmitting || !pollQuestion.trim()}>Save as Draft</Button>
              <Button onClick={() => handlePollSubmit('published')} disabled={isSubmitting || !pollQuestion.trim()}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
              </Button>
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
               <div className="text-center flex-shrink-0 w-20 cursor-pointer group" onClick={handleOpenCreator}>
                <div className="relative w-16 h-16 mx-auto">
                    <Avatar className="w-full h-full border-2 border-border group-hover:border-primary/50 transition-colors">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.username?.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-md">
                        <Plus className="h-4 w-4 text-primary-foreground" />
                    </div>
                </div>
                <p className="text-xs mt-1 truncate">Add Status</p>
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

       <Dialog open={isUploaderOpen} onOpenChange={(open) => { setIsUploaderOpen(open); if(!open) resetUploader(); }}>
          <DialogContent className="p-0 m-0 border-0 w-screen h-[80vh] max-h-[600px] max-w-full sm:max-w-md flex flex-col gap-0 rounded-lg">
            <DialogHeader className="p-4 flex-row items-center justify-between border-b">
                <DialogTitle>Create Status</DialogTitle>
                <DialogClose asChild><Button variant="ghost" size="icon"><X className="h-5 w-5"/></Button></DialogClose>
            </DialogHeader>
            <div className="flex-grow flex flex-col overflow-hidden px-6 pb-6">
              {uploaderContent()}
            </div>
             <div className="grid grid-cols-4 border-t bg-muted/50 p-1">
                <Button variant={activeUploaderTab === 'text' ? 'secondary' : 'ghost'} onClick={() => setActiveUploaderTab('text')} className="flex-col h-16"><Text className="h-6 w-6 mb-1"/>Text</Button>
                <Button variant={activeUploaderTab === 'media' ? 'secondary' : 'ghost'} onClick={() => setActiveUploaderTab('media')} className="flex-col h-16"><ImageIcon className="h-6 w-6 mb-1"/>Media</Button>
                <Button variant={activeUploaderTab === 'song' ? 'secondary' : 'ghost'} onClick={() => setActiveUploaderTab('song')} className="flex-col h-16"><Music className="h-6 w-6 mb-1"/>Song</Button>
                <Button variant={activeUploaderTab === 'poll' ? 'secondary' : 'ghost'} onClick={() => setActiveUploaderTab('poll')} className="flex-col h-16"><BarChart2 className="h-6 w-6 mb-1"/>Poll</Button>
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
        onStatusArchived={onStatusArchived}
      />
    </div>
  );
}
