'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, TextOverlayStyle, Song, Story } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, doc, updateDoc, getDocs, limit, setDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, Music, Pause, Play, Image as LucideImage, BarChart2, BookOpen, Sparkles as SparklesIcon, PenSquare, Type, Palette, AlignLeft, AlignCenter, AlignRight, Volume2, VolumeX, Send, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import StatusViewer from './StatusViewer';
import SongSearch, { LyricCarousel } from './SongSearch';
import VinylPlayer from './VinylPlayer';
import { Textarea } from '../ui/textarea';
import type { CarouselApi } from "@/components/ui/carousel"
import { getStatusCaptions, getConversationStarters } from '@/app/actions/aiActions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const gradientBackgrounds = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
  'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600',
  'bg-gradient-to-br from-yellow-200 via-green-200 to-green-500',
  'bg-gradient-to-br from-red-200 via-red-300 to-yellow-200',
  'bg-gradient-to-br from-sky-400 to-sky-200',
];

const sanitizeData = (data: any) => {
    const sanitized: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
            sanitized[key] = data[key];
        }
    });
    return sanitized;
};

function StatusBubble({ user, onSelect, latestStatus }: { user: User, onSelect: (user: User) => void, latestStatus: StatusUpdate | null }) {
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
            !isNoteWithSong ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" : "bg-muted"
        )}>
            <Avatar className="w-full h-full border-2 border-background">
            <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
            <AvatarFallback>{user.username?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
        </div>
        
        {isOwn && (
           <div className="absolute bottom-0 right-0 z-10 w-6 h-6 bg-primary border-2 border-background rounded-full flex items-center justify-center shadow-md">
              <Plus className="h-3 w-3 text-white" />
           </div>
        )}
      </div>
      <p className="text-xs mt-1 truncate">{isOwn ? 'Your Status' : user.displayName || user.username}</p>
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
  
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [noteContent, setNoteContent] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState<string>('');
  
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songLyricSnippet, setSongLyricSnippet] = useState<string | null>(null);
  const [vibeTags, setVibeTags] = useState('');
  const [dynamicBgColor, setDynamicBgColor] = useState<string | null>(null);
  
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const [isGeneratingCaptions, startCaptionTransition] = useTransition();
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
  const [isGeneratingStarters, startStarterTransition] = useTransition();

  const [selectedFilter, setSelectedFilter] = useState<(typeof photoFilters)[number]['style']>('filter-none');
  const [expiryDuration, setExpiryDuration] = useState<string>('24');
  
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  
  const [activeUploaderTab, setActiveUploaderTab] = useState('text');
  const [editingDraft, setEditingDraft] = useState<StatusUpdate | null>(null);

  const [storySearchTerm, setStorySearchTerm] = useState('');
  const [storySearchResults, setStorySearchResults] = useState<Story[]>([]);
  const [isSearchingStories, setIsSearchingStories] = useState(false);
  const [attachedStory, setAttachedStory] = useState<Story | null>(null);
  
  const [textOverlay, setTextOverlay] = useState('');
  const [textOverlayStyle, setTextOverlayStyle] = useState<TextOverlayStyle>({
    font: 'sans',
    color: 'white',
    alignment: 'center',
    background: 'translucent'
  });
  
  const [postDestination, setPostDestination] = useState<'status' | 'feed'>('status');

  const [textOverlayPosition, setTextOverlayPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const textDraggableRef = useRef<HTMLDivElement>(null);
  const [noteStyle, setNoteStyle] = useState<{font: 'sans' | 'serif' | 'mono', alignment: 'left' | 'center' | 'right'}>({ font: 'sans', alignment: 'center' });

  const { toast } = useToast();
  const router = useRouter();
  
  const [statusVisibility, setStatusVisibility] = useState<'public' | 'close-friends'>('public');

  useEffect(() => {
    if (!user || user.isAnonymous) {
        setIsLoading(false);
        return;
    }

    const now = Timestamp.now();
    const publishedQuery = query(
      collection(db, 'statusUpdates'),
      where('status', '==', 'published'),
      where('isHidden', '==', false),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );
    
    const unsubPublished = onSnapshot(publishedQuery, (snapshot) => {
        const liveStatuses = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate))
            .filter(s => {
                if (s.visibility === 'close-friends' && user && !user.closeFriendIds?.includes(s.authorId) && s.authorId !== user.id) {
                    return false;
                }
                return true;
            });
        
        liveStatuses.sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            const timeB = b.createdAt ? (b.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            return timeB - timeA;
        });
        
        setAllStatuses(liveStatuses);
        setIsLoading(false);
    });

    return () => unsubPublished();
  }, [user]);

  useEffect(() => {
    const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
    const newStatusOrder: string[] = [];

    if (user && !user.isAnonymous) {
      const currentUserLive = allStatuses.filter(s => s.authorId === user.id);
      groups.set(user.id, { user: user as User, statuses: currentUserLive });
      newStatusOrder.push(user.id);
    }
    
    allStatuses.forEach(status => {
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

  const handleNextUser = () => {
    const currentIndex = statusOrder.indexOf(selectedUserForViewing?.id || '');
    if (currentIndex !== -1 && currentIndex < statusOrder.length - 1) {
        const nextId = statusOrder[currentIndex + 1];
        setSelectedUserForViewing(groupedStatuses.get(nextId)!.user);
    } else {
        setIsViewerOpen(false);
    }
  };

  const handlePrevUser = () => {
    const currentIndex = statusOrder.indexOf(selectedUserForViewing?.id || '');
    if (currentIndex > 0) {
        const prevId = statusOrder[currentIndex - 1];
        setSelectedUserForViewing(groupedStatuses.get(prevId)!.user);
    } else {
        setIsViewerOpen(false);
    }
  };

  const handleSelectUser = (selectedUser: User) => {
    if (!user || user.isAnonymous) {
        router.push('/auth/signin');
        return;
    }
    const group = groupedStatuses.get(selectedUser.id);
    if (group && group.statuses.length > 0) {
        setSelectedUserForViewing(selectedUser);
        setIsViewerOpen(true);
    } else {
        setIsCreatorOpen(true);
    }
  }

  const resetUploader = useCallback(() => {
    setMediaFile(null);
    setMediaPreview(null);
    setTextOverlay('');
    setNoteContent('');
    setSelectedSong(null);
    setSongLyricSnippet(null);
    setPollQuestion('');
    setPollOptions(['', '']);
    setSuggestedCaptions([]);
    setSelectedFilter('filter-none');
    setExpiryDuration('24');
    setEditingDraft(null);
    setAttachedStory(null);
    setStorySearchTerm('');
    setStorySearchResults([]);
    setBackgroundStyle('');
    setStatusVisibility('public');
    setPostDestination('status');
    setTextOverlayStyle({ font: 'sans', color: 'white', alignment: 'center', background: 'translucent'});
    setTextOverlayPosition({ x: 50, y: 50 });
    setDynamicBgColor(null);
    setVibeTags('');
    setNoteStyle({ font: 'sans', alignment: 'center' });
  }, []);
  
  const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        toast({ title: "Media File Too Large", variant: "destructive" });
        return;
      }
      setMediaFile(file);
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = (event) => setMediaPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (destination: 'status' | 'feed', status: 'published' | 'draft', data: Record<string, any>) => {
    if (!user) return;
    setIsSubmitting(true);

    if (destination === 'feed') {
        const postData = sanitizeData({
            author: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
            content: data.note || '',
            type: 'original',
            reactionsCount: 0,
            commentsCount: 0,
            repostCount: 0,
            isPinned: false,
            timestamp: serverTimestamp(),
            imageUrl: data.mediaUrl,
            storyId: data.sharedStoryId,
            storyTitle: data.storyTitle,
            storyCoverUrl: data.storyCoverUrl,
            songUrl: data.spotifyUrl,
            songLyricSnippet: data.songLyricSnippet,
        });
        addDoc(collection(db, 'feedPosts'), postData)
            .then(() => {
                toast({ title: 'Posted to Feed!' });
                setIsUploaderOpen(false);
                resetUploader();
            })
            .finally(() => setIsSubmitting(false));
    } else {
        const durationHours = parseInt(expiryDuration, 10);
        const expiryTime = Timestamp.fromMillis(Date.now() + durationHours * 60 * 60 * 1000);

        const statusData = sanitizeData({
            authorId: user.id,
            authorInfo: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
            createdAt: editingDraft?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
            status,
            expiresAt: status === 'published' ? expiryTime : null,
            isHidden: false,
            visibility: statusVisibility,
            ...data
        });
        
        const statusRef = editingDraft ? doc(db, "statusUpdates", editingDraft.id) : doc(collection(db, 'statusUpdates'));
        (editingDraft ? updateDoc(statusRef, statusData) : setDoc(statusRef, statusData))
            .then(() => {
                toast({ title: `Status ${status === 'published' ? 'Published!' : 'Saved!'}` });
                setIsUploaderOpen(false);
                resetUploader();
            })
            .finally(() => setIsSubmitting(false));
    }
  };
  
  const handleTextSubmit = async (status: 'published' | 'draft') => {
    if (!noteContent.trim()) return;
    await handleSubmit(postDestination, status, { note: noteContent.trim(), noteStyle, backgroundStyle });
  };
  
  const handleMediaSubmit = async (status: 'published' | 'draft') => {
    if (!mediaFile && !editingDraft?.mediaUrl) return;
    setIsSubmitting(true);
    let mediaUrl = editingDraft?.mediaUrl || '';

    if (mediaFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('upload_preset', uploadPreset!);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${mediaType === 'video' ? 'video' : 'image'}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        mediaUrl = data.secure_url;
    }
    await handleSubmit(postDestination, status, { mediaUrl, mediaType, textOverlay: textOverlay.trim(), textOverlayStyle, textOverlayPosition });
  };
  
  const handleGenerateStarters = () => {
    startStarterTransition(async () => {
        const result = await getConversationStarters({});
        if (!('error' in result) && result.starters.length > 0) {
            setNoteContent(result.starters[Math.floor(Math.random() * result.starters.length)]);
        }
    });
  };

  const uploaderContent = () => {
    switch (activeUploaderTab) {
      case 'text':
        return (
          <>
            <div className={cn("py-4 space-y-4 flex-grow flex flex-col justify-center items-center text-white min-h-[300px]", backgroundStyle || 'bg-card')}>
              <Textarea
                  placeholder={`What's on your mind, ${user?.displayName || user?.username}?`}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value.substring(0, 200))}
                  className={cn(
                    "flex-grow bg-transparent border-0 focus-visible:ring-0 p-4 resize-none shadow-none text-center flex items-center justify-center",
                    noteStyle.font === 'serif' ? 'font-serif' : (noteStyle.font === 'mono' ? 'font-mono' : 'font-sans'),
                    noteStyle.alignment === 'left' ? 'text-left' : (noteStyle.alignment === 'right' ? 'text-right' : 'text-center'),
                    noteContent.length < 50 ? 'text-3xl' : 'text-xl',
                    !backgroundStyle && "text-foreground"
                  )}
              />
              <div className="flex gap-2 p-2 bg-black/20 rounded-full items-center">
                <Popover>
                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white h-8 w-8"><Type className="h-4 w-4"/></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-1 flex gap-1">
                        <Button variant={noteStyle.font === 'sans' ? 'secondary' : 'ghost'} size="sm" onClick={() => setNoteStyle(s=>({...s, font: 'sans'}))}>Sans</Button>
                        <Button variant={noteStyle.font === 'serif' ? 'secondary' : 'ghost'} size="sm" onClick={() => setNoteStyle(s=>({...s, font: 'serif'}))}>Serif</Button>
                    </PopoverContent>
                </Popover>
                 <Popover>
                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white h-8 w-8"><Palette className="h-4 w-4"/></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-1 flex gap-2">
                        {gradientBackgrounds.map(bg => (
                            <button key={bg} onClick={() => setBackgroundStyle(bg)} className={cn("w-6 h-6 rounded-full", bg)} />
                        ))}
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={handleGenerateStarters} disabled={isGeneratingStarters}>
                    {isGeneratingStarters ? <Loader2 className="h-4 w-4 animate-spin"/> : <SparklesIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter className="flex-row justify-between items-center p-4 border-t bg-card">
              <div className="flex items-center gap-2">
                <Label htmlFor="dest" className="text-xs">{postDestination === 'status' ? 'Status' : 'Feed'}</Label>
                <Switch id="dest" checked={postDestination === 'feed'} onCheckedChange={(v) => setPostDestination(v ? 'feed' : 'status')} />
              </div>
              <Button onClick={() => handleTextSubmit('published')} disabled={isSubmitting || !noteContent.trim()}>Post</Button>
            </DialogFooter>
          </>
        );
      case 'media':
        return (
          <>
            <div className="flex-grow flex flex-col bg-black justify-center items-center relative overflow-hidden">
                {mediaPreview ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {mediaType === 'video' ? <video src={mediaPreview} className="max-h-full max-w-full" autoPlay loop muted /> : <Image src={mediaPreview} alt="" layout="fill" objectFit="contain" />}
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-black/50 text-white rounded-full" onClick={() => setMediaPreview(null)}><X className="h-4 w-4"/></Button>
                    </div>
                ) : (
                    <div className="text-center p-10 cursor-pointer" onClick={() => mediaInputRef.current?.click()}>
                        <LucideImage className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Select Art</p>
                    </div>
                )}
                <input type="file" ref={mediaInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />
            </div>
            <DialogFooter className="p-4 border-t bg-card">
                <Button onClick={() => handleMediaSubmit('published')} disabled={isSubmitting || !mediaPreview} className="w-full">Publish</Button>
            </DialogFooter>
          </>
        )
      default: return null;
    }
  };
  
  return (
    <div className='py-4 -mx-4 px-4 md:mx-0 md:px-0'>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start space-x-4">
            {user && !user.isAnonymous && (
               <StatusBubble user={user as User} latestStatus={null} onSelect={handleSelectUser} />
            )}
            {isLoading ? (
                [...Array(4)].map((_, i) => <div key={i} className="w-16 h-16 rounded-full bg-muted animate-pulse flex-shrink-0" />)
            ) : (
                statusOrder.map((userId) => {
                    const group = groupedStatuses.get(userId);
                    if (!group || (userId === user?.id && group.statuses.length === 0)) return null;
                    return <StatusBubble key={userId} user={group.user} latestStatus={group.statuses[0]} onSelect={handleSelectUser} />
                })
            )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none shadow-2xl">
              <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Create Status</DialogTitle>
                  <DialogDescription>What's your creative vibe today?</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-6">
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/50 transition-all group" onClick={() => handleOpenUploader('text')}>
                      <Type className="h-6 w-6 group-hover:scale-110 transition-transform"/>
                      <span className="text-xs font-bold uppercase tracking-widest">Text</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/50 transition-all group" onClick={() => handleOpenUploader('media')}>
                      <LucideImage className="h-6 w-6 group-hover:scale-110 transition-transform"/>
                      <span className="text-xs font-bold uppercase tracking-widest">Art</span>
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

       <Dialog open={isUploaderOpen} onOpenChange={(open) => { setIsUploaderOpen(open); if(!open) resetUploader(); }}>
          <DialogContent className="p-0 m-0 border-none w-screen h-[90vh] max-h-[700px] sm:max-w-md flex flex-col rounded-3xl overflow-hidden shadow-3xl">
            <DialogHeader className="p-4 flex-row items-center justify-between border-b bg-background">
                <DialogTitle className="font-headline font-bold">New Status</DialogTitle>
                <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full"><X className="h-5 w-5"/></Button></DialogClose>
            </DialogHeader>
            <div className="flex-grow flex flex-col overflow-hidden bg-background">
              {uploaderContent()}
            </div>
             <div className="p-2 border-t bg-muted/30">
                <Tabs value={activeUploaderTab} onValueChange={setActiveUploaderTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-transparent h-12">
                        <TabsTrigger value="text" className="rounded-xl data-[state=active]:bg-background shadow-none"><Type className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="media" className="rounded-xl data-[state=active]:bg-background shadow-none"><LucideImage className="h-5 w-5"/></TabsTrigger>
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
