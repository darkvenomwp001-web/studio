'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import type { User, StatusUpdate, Song, Story, TextOverlayStyle } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, getDocs, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Type, Image as LucideImageIcon, Sparkles, Music, BarChart2, BookOpen, Send, ChevronRight, AlignLeft, AlignCenter, AlignRight, Palette, CheckCircle, MousePointer2, Users, Star, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import StatusViewer from './StatusViewer';
import { Textarea } from '../ui/textarea';
import SongSearch from './SongSearch';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { getStatusCaptions } from '@/app/actions/aiActions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { toggleCloseFriend } from '@/app/actions/userActions';

// Native APK Bridge Imports
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const gradientBackgrounds = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
  'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600',
  'bg-gradient-to-br from-yellow-200 via-green-200 to-green-500',
  'bg-gradient-to-br from-red-200 via-red-300 to-yellow-200',
  'bg-gradient-to-br from-sky-400 to-sky-200',
];

function CreateStatusBubble({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="relative text-center flex-shrink-0 w-16 md:w-20 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative w-14 h-14 md:w-16 md:h-16 mx-auto group-hover:scale-105 transition-all">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-muted border-2 border-dashed border-primary/40 flex items-center justify-center shadow-sm">
            <Plus className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        </div>
      </div>
      <p className="text-[9px] md:text-[10px] font-bold uppercase mt-1.5 truncate tracking-tighter opacity-60">Add Status</p>
    </div>
  );
}

function StatusBubble({ user, onSelect, hasStatus, label }: { user: User, onSelect: (user: User) => void, hasStatus: boolean, label?: string }) {
  return (
    <div
      className="relative text-center flex-shrink-0 w-16 md:w-20 cursor-pointer group"
      onClick={() => onSelect(user)}
    >
      <div className="relative w-14 h-14 md:w-16 md:h-16 mx-auto group-hover:scale-110 transition-transform duration-200">
         <div className={cn(
            "w-14 h-14 md:w-16 md:h-16 p-0.5 rounded-full",
            hasStatus ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" : "bg-muted"
        )}>
            <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
                <AvatarFallback className="text-[10px] md:text-xs font-bold">{user.username?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
        </div>
      </div>
      <p className="text-[9px] md:text-[10px] font-bold uppercase mt-1.5 truncate tracking-tighter">{label || user.displayName || user.username}</p>
    </div>
  );
}

export default function StatusFeature() {
  const { user, loading: authLoading } = useAuth();
  const { showIsland } = useDynamicIsland();
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
  
  const [noteContent, setNoteContent] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState<string>(gradientBackgrounds[0]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storySearchResults, setStorySearchResults] = useState<Story[]>([]);
  
  // Close Friends Picker States
  const [isCloseFriendsPickerOpen, setIsCloseFriendsPickerOpen] = useState(false);
  const [followers, setFollowers] = useState<User[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);

  // High-Fidelity Text Layer States
  const [isDragging, setIsDragging] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [textStyle, setTextStyle] = useState<TextOverlayStyle>({
    font: 'sans',
    alignment: 'center',
    background: 'none',
    color: '#ffffff'
  });

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAi, startAiTransition] = useTransition();

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const [activeUploaderTab, setActiveUploaderTab] = useState('text');

  const { toast } = useToast();

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
        
        setAllStatuses(liveStatuses);
        setIsLoading(false);
    });

    return () => unsubPublished();
  }, [user]);

  useEffect(() => {
    const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
    const newStatusOrder: string[] = [];

    allStatuses.forEach(status => {
        if (!groups.has(status.authorId)) {
            groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
            if (status.authorId === user?.id) {
                newStatusOrder.unshift(status.authorId);
            } else {
                newStatusOrder.push(status.authorId);
            }
        }
        groups.get(status.authorId)!.statuses.push(status);
    });

    setGroupedStatuses(groups);
    setStatusOrder(newStatusOrder);
  }, [allStatuses, user?.id]);

  const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = (event) => setMediaPreview(event.target?.result as string);
      reader.readAsDataURL(file);
      setActiveUploaderTab('art');
      setIsUploaderOpen(true);
      setIsCreatorOpen(false);
    }
  };

  const uploadFileToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Cloudinary not configured");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const resourceType = mediaType === 'video' ? 'video' : 'image';
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message || "Upload failed");
  };

  const handleGenerateAiCaptions = () => {
    if (!mediaPreview) return;
    startAiTransition(async () => {
        const result = await getStatusCaptions({ photoDataUri: mediaPreview });
        if ('error' in result) {
            toast({ title: 'AI Error', description: result.error, variant: 'destructive'});
        } else {
            setAiSuggestions(result.captions);
        }
    });
  };

  const handlePublishStatus = async (visibility: 'public' | 'close-friends') => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
        let mediaUrl = '';
        if (mediaFile) {
            mediaUrl = await uploadFileToCloudinary(mediaFile);
        }

        const durationHours = 24;
        const expiryTime = Timestamp.fromMillis(Date.now() + durationHours * 60 * 60 * 1000);

        const statusData: any = {
            authorId: user.id,
            authorInfo: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'published',
            expiresAt: expiryTime,
            isHidden: false,
            visibility: visibility,
        };

        if (mediaUrl) {
            statusData.mediaUrl = mediaUrl;
            statusData.mediaType = mediaType;
            if (noteContent.trim()) {
                statusData.textOverlay = noteContent.trim();
                statusData.textOverlayStyle = textStyle;
                statusData.textOverlayPosition = textPosition;
            }
        } else if (activeUploaderTab === 'text') {
            statusData.note = noteContent.trim();
            statusData.backgroundStyle = backgroundStyle;
            statusData.textOverlayStyle = textStyle;
            statusData.textOverlayPosition = textPosition;
        } else if (activeUploaderTab === 'music' && selectedSong) {
            statusData.spotifyUrl = `https://open.spotify.com/track/${selectedSong.id}`;
            if (noteContent.trim()) {
                statusData.textOverlay = noteContent.trim();
                statusData.textOverlayStyle = textStyle;
                statusData.textOverlayPosition = textPosition;
            }
        } else if (activeUploaderTab === 'poll' && pollQuestion.trim()) {
            statusData.poll = {
                question: pollQuestion.trim(),
                options: pollOptions.filter(o => o.trim()).map((o, i) => ({ id: `opt${i}`, text: o.trim(), votes: [] })),
                createdAt: serverTimestamp(),
                authorId: user.id,
            };
        } else if (activeUploaderTab === 'story' && selectedStory) {
            statusData.sharedStoryId = selectedStory.id;
            if (noteContent.trim()) {
                statusData.textOverlay = noteContent.trim();
                statusData.textOverlayStyle = textStyle;
                statusData.textOverlayPosition = textPosition;
            }
        }

        await addDoc(collection(db, 'statusUpdates'), statusData);
        
        showIsland({
          title: "Status posted",
          description: "Your update is visible in the ring.",
          type: 'success',
          image: user.avatarUrl
        });

        resetUploader();
        setIsUploaderOpen(false);
    } catch (error) {
        console.error(error);
        toast({ title: 'Publish Failed', description: 'Could not upload your status.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetUploader = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setNoteContent('');
    setSelectedSong(null);
    setPollQuestion('');
    setPollOptions(['', '']);
    setSelectedStory(null);
    setAiSuggestions([]);
    setTextPosition({ x: 50, y: 50 });
    setTextStyle({
      font: 'sans',
      alignment: 'center',
      background: 'none',
      color: '#ffffff'
    });
  };

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
    setSelectedUserForViewing(selectedUser);
    setIsViewerOpen(true);
  };

  const searchMyStories = async () => {
    if (!user) return;
    const q = query(
        collection(db, 'stories'), 
        where('author.id', '==', user.id),
        where('visibility', '==', 'Public'),
        limit(10)
    );
    const snap = await getDocs(q);
    setStorySearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story)));
  };

  const handleArtButtonClick = async () => {
    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    
    if (isNative) {
        try {
            await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
            
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.Uri,
                source: CameraSource.Photos
            });

            if (image.webPath) {
                const response = await fetch(image.webPath);
                const blob = await response.blob();
                const file = new File([blob], `status-media.${image.format}`, { type: blob.type });
                
                setMediaFile(file);
                setMediaPreview(image.webPath);
                setMediaType('image');
                setActiveUploaderTab('art');
                setIsUploaderOpen(true);
                setIsCreatorOpen(false);
            }
        } catch (e) {
            console.warn("APK Native Picker protocol encountered an interruption.", e);
            mediaInputRef.current?.click();
        }
    } else {
        mediaInputRef.current?.click();
    }
  };

  const openCloseFriendsPicker = async () => {
    if (!user) return;
    setIsLoadingFollowers(true);
    setIsCloseFriendsPickerOpen(true);
    try {
        const followersQuery = query(collection(db, 'users'), where('followingIds', 'array-contains', user.id));
        const snap = await getDocs(followersQuery);
        setFollowers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingFollowers(false);
    }
  };

  const handleToggleCF = async (friendId: string) => {
    if (!user) return;
    const isAdding = !user.closeFriendIds?.includes(friendId);
    await toggleCloseFriend(user.id, friendId, isAdding);
  };

  return (
    <div className='py-4 -mx-4 px-4 overflow-hidden border-b border-border/40 bg-card/20 w-full max-w-full'>
      <ScrollArea className="w-full whitespace-nowrap scrollbar-none">
        <div className="flex items-start space-x-3 md:space-x-4 pb-2 px-1">
            {isLoading ? (
                [...Array(6)].map((_, i) => <div key={i} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-muted animate-pulse flex-shrink-0" />)
            ) : (
                <>
                    {user && !user.isAnonymous && (
                        <CreateStatusBubble onClick={() => setIsCreatorOpen(true)} />
                    )}

                    {statusOrder.map((userId) => {
                        const group = groupedStatuses.get(userId);
                        if (!group || group.statuses.length === 0) return null;
                        return (
                            <StatusBubble 
                                key={userId} 
                                user={group.user} 
                                hasStatus={true} 
                                onSelect={handleSelectUser}
                                label={userId === user?.id ? 'My Status' : undefined}
                            />
                        );
                    })}
                </>
            )}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      <Dialog open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-3xl mx-auto w-[90vw] animate-in fade-in zoom-in-95 duration-500">
              <DialogHeader className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div>
                        <DialogTitle className="font-headline text-2xl font-bold">Create Status</DialogTitle>
                        <DialogDescription className="text-sm">What's your creative vibe today?</DialogDescription>
                    </div>
                  </div>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 md:gap-4 py-4">
                  <Button variant="outline" className="h-24 md:h-28 flex-col gap-2 rounded-3xl border-primary/10 hover:border-primary hover:bg-primary/5 transition-all p-2 shadow-sm" onClick={() => { setActiveUploaderTab('text'); setIsUploaderOpen(true); setIsCreatorOpen(false); }}>
                      <div className="p-3 rounded-2xl bg-primary/10">
                        <Type className="h-5 w-5 md:h-6 md:w-6 text-primary"/>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Text</span>
                  </Button>
                  <Button variant="outline" className="h-24 md:h-28 flex-col gap-2 rounded-3xl border-accent/10 hover:border-accent hover:bg-accent/5 transition-all p-2 shadow-sm" onClick={handleArtButtonClick}>
                      <div className="p-3 rounded-2xl bg-accent/10">
                        <LucideImageIcon className="h-5 w-5 md:h-6 md:w-6 text-accent"/>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Art</span>
                  </Button>
                  <Button variant="outline" className="h-24 md:h-28 flex-col gap-2 rounded-3xl border-green-500/10 hover:border-green-500 hover:bg-green-500/5 transition-all p-2 shadow-sm" onClick={() => { setActiveUploaderTab('music'); setIsUploaderOpen(true); setIsCreatorOpen(false); }}>
                      <div className="p-3 rounded-2xl bg-green-500/10">
                        <Music className="h-5 w-5 md:h-6 md:w-6 text-green-500"/>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Music</span>
                  </Button>
                  <Button variant="outline" className="h-24 md:h-28 flex-col gap-2 rounded-3xl border-orange-500/10 hover:border-orange-500 hover:bg-orange-500/5 transition-all p-2 shadow-sm" onClick={() => { setActiveUploaderTab('poll'); setIsUploaderOpen(true); setIsCreatorOpen(false); }}>
                      <div className="p-3 rounded-2xl bg-orange-500/10">
                        <BarChart2 className="h-5 w-5 md:h-6 md:w-6 text-orange-500"/>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Poll</span>
                  </Button>
                  <Button variant="outline" className="h-24 md:h-28 flex-col gap-2 rounded-3xl border-purple-500/10 hover:border-purple-500 hover:bg-purple-500/5 transition-all p-2 shadow-sm" onClick={() => { setActiveUploaderTab('story'); setIsUploaderOpen(true); setIsCreatorOpen(false); searchMyStories(); }}>
                      <div className="p-3 rounded-2xl bg-purple-500/10">
                        <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-purple-500"/>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Story</span>
                  </Button>
                  <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaSelect} />
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isUploaderOpen} onOpenChange={(o) => { setIsUploaderOpen(o); if(!o) resetUploader(); }}>
          <DialogContent className="p-0 border-none sm:max-w-md flex flex-col rounded-[2.5rem] overflow-hidden shadow-3xl mx-auto w-[95vw] h-[90vh] md:h-[800px] animate-in slide-in-from-bottom-8 duration-700">
              <DialogHeader className="p-6 bg-muted/30 border-b flex-shrink-0">
                  <DialogTitle className="font-headline text-xl font-bold">Status Studio</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Design your temporary update</DialogDescription>
              </DialogHeader>
              
              <div className={cn(
                  "relative flex-1 flex flex-col justify-center items-center text-white transition-all duration-700 transform-gpu overflow-hidden group/canvas",
                  activeUploaderTab === 'text' ? backgroundStyle : 'bg-black'
              )}>
                  <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                  
                  {activeUploaderTab === 'art' && mediaPreview && (
                      <div className="w-full h-full relative">
                        <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="contain" className="animate-in fade-in duration-1000" />
                        
                        {/* High-Fidelity Movable Text Interface */}
                        <div 
                            className="absolute inset-0 z-20 cursor-crosshair"
                            onMouseMove={(e) => {
                                if (!isDragging) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                setTextPosition({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
                            }}
                            onTouchMove={(e) => {
                                if (!isDragging) return;
                                const touch = e.touches[0];
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = ((touch.clientX - rect.left) / rect.width) * 100;
                                const y = ((touch.clientY - rect.top) / rect.height) * 100;
                                setTextPosition({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
                            }}
                        >
                            <div 
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 min-w-[200px] transition-transform duration-75"
                                style={{ left: `${textPosition.x}%`, top: `${textPosition.y}%` }}
                                onMouseDown={() => setIsDragging(true)}
                                onMouseUp={() => setIsDragging(false)}
                                onTouchStart={() => setIsDragging(true)}
                                onTouchEnd={() => setIsDragging(false)}
                            >
                                <Textarea 
                                    value={noteContent}
                                    onChange={e => setNoteContent(e.target.value)}
                                    placeholder="Tap to add text..."
                                    className={cn(
                                        "bg-transparent border-none text-white placeholder:text-white/30 resize-none shadow-none text-2xl font-bold p-2 transition-all duration-300 focus-visible:ring-0 w-full",
                                        textStyle.font === 'serif' ? 'font-serif' : (textStyle.font === 'mono' ? 'font-mono' : 'font-sans'),
                                        textStyle.alignment === 'center' ? 'text-center' : (textStyle.alignment === 'right' ? 'text-right' : 'text-left')
                                    )}
                                    style={{
                                        textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)',
                                        color: textStyle.color,
                                        backgroundColor: textStyle.background === 'solid' ? 'rgba(0,0,0,0.8)' : (textStyle.background === 'translucent' ? 'rgba(0,0,0,0.4)' : 'transparent'),
                                        borderRadius: textStyle.background !== 'none' ? '1rem' : '0',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-12 z-30 pointer-events-none">
                            {mediaType === 'image' && (
                                <div className="space-y-3 pointer-events-auto">
                                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 font-bold text-[10px] uppercase tracking-widest gap-2 bg-white/5 rounded-full px-4" onClick={handleGenerateAiCaptions} disabled={isGeneratingAi}>
                                        {isGeneratingAi ? <Loader2 className="h-3 w-3 animate-spin"/> : <Sparkles className="h-3 w-3" />}
                                        AI Suggested Captions
                                    </Button>
                                    <ScrollArea className="w-full whitespace-nowrap">
                                        <div className="flex gap-2 pb-2">
                                            {aiSuggestions.map((s, i) => (
                                                <button key={i} onClick={() => setNoteContent(s)} className="text-[10px] bg-white/10 hover:bg-white/30 px-4 py-2 rounded-full text-white truncate max-w-[150px] transition-all border border-white/5 font-bold uppercase tracking-tight backdrop-blur-sm">"{s}"</button>
                                            ))}
                                        </div>
                                        <ScrollBar orientation="horizontal" className="hidden" />
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                      </div>
                  )}

                  {activeUploaderTab === 'text' && (
                      <div className="w-full h-full flex items-center justify-center p-6 relative">
                        <Textarea
                            placeholder="Share your creative state..."
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            className={cn(
                                "bg-transparent border-0 focus-visible:ring-0 text-3xl md:text-4xl font-bold text-center resize-none shadow-none placeholder:text-white/30 h-auto w-full transition-all duration-300 transform-gpu",
                                textStyle.font === 'serif' ? 'font-serif' : (textStyle.font === 'mono' ? 'font-mono' : 'font-sans'),
                                textStyle.alignment === 'center' ? 'text-center' : (textStyle.alignment === 'right' ? 'text-right' : 'text-left')
                            )}
                            style={{
                                backgroundColor: textStyle.background === 'solid' ? 'rgba(0,0,0,0.8)' : (textStyle.background === 'translucent' ? 'rgba(0,0,0,0.4)' : 'transparent'),
                                padding: textStyle.background !== 'none' ? '2rem' : '0',
                                borderRadius: textStyle.background !== 'none' ? '2rem' : '0'
                            }}
                        />
                      </div>
                  )}

                  {activeUploaderTab === 'music' && (
                      <div className="w-full h-full p-6 flex flex-col justify-center bg-gradient-to-br from-green-900 via-gray-900 to-black animate-in fade-in duration-500">
                        {selectedSong ? (
                            <div className="space-y-8 text-center animate-in zoom-in-95 duration-500">
                                <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/10">
                                    <Image src={selectedSong.cover} alt="" layout="fill" objectFit="cover" className="animate-pulse duration-[4s]" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl md:text-3xl font-bold truncate px-4 drop-shadow-lg">{selectedSong.title}</h3>
                                    <p className="text-white/60 text-lg uppercase tracking-widest font-bold">{selectedSong.artist}</p>
                                </div>
                                <div className="max-w-xs mx-auto">
                                    <Textarea 
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        placeholder="Add a vibe note..."
                                        className="bg-white/10 border-none text-white rounded-2xl resize-none text-center h-16"
                                    />
                                </div>
                                <Button variant="ghost" className="text-white/30 hover:text-white text-[10px] uppercase tracking-widest font-bold bg-white/5 rounded-full px-6" onClick={() => setSelectedSong(null)}>Change Soundtrack</Button>
                            </div>
                        ) : (
                            <div className="space-y-6 h-full flex flex-col justify-center max-w-sm mx-auto w-full">
                                <div className="text-center space-y-1">
                                    <h3 className="font-headline text-2xl font-bold">Pick a soundtrack</h3>
                                    <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Thousands of real-time tracks</p>
                                </div>
                                <SongSearch onSongSelect={setSelectedSong} />
                            </div>
                        )}
                      </div>
                  )}

                  {activeUploaderTab === 'poll' && (
                      <div className="w-full h-full p-6 flex flex-col justify-center bg-gradient-to-br from-orange-400 to-rose-500 animate-in fade-in duration-500">
                          <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 space-y-6 shadow-3xl border border-white/20 w-full animate-in zoom-in-95 duration-500">
                              <Input 
                                placeholder="Ask your community..." 
                                value={pollQuestion} 
                                onChange={e => setPollQuestion(e.target.value)}
                                className="bg-transparent border-none text-white placeholder:text-white/50 text-2xl md:text-3xl font-bold p-0 h-auto focus-visible:ring-0 text-center"
                              />
                              <div className="space-y-3">
                                {pollOptions.map((opt, i) => (
                                    <Input 
                                        key={i} 
                                        placeholder={`Option ${i+1}`} 
                                        value={opt} 
                                        onChange={e => {
                                            const newOpts = [...pollOptions];
                                            newOpts[i] = e.target.value;
                                            setPollOptions(newOpts);
                                        }}
                                        className="bg-white/10 border-none text-white h-12 rounded-2xl text-base font-bold placeholder:text-white/20 text-center focus:bg-white/20 transition-all shadow-inner"
                                    />
                                ))}
                                {pollOptions.length < 4 && (
                                    <Button variant="ghost" size="sm" className="w-full text-white/50 hover:text-white text-[10px] font-bold uppercase tracking-widest h-10 border border-white/10 rounded-xl" onClick={() => setPollOptions([...pollOptions, ''])}>+ Add Option</Button>
                                )}
                              </div>
                          </div>
                      </div>
                  )}

                  {activeUploaderTab === 'story' && (
                      <div className="w-full h-full p-6 flex flex-col justify-center bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 animate-in fade-in duration-500">
                          {selectedStory ? (
                              <div className="bg-white/10 backdrop-blur-3xl rounded-[2.5rem] p-6 flex flex-col items-center gap-6 border border-white/20 shadow-3xl animate-in zoom-in-95 duration-500 w-full">
                                  <div className="relative w-32 h-48 md:w-40 md:h-60 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                      <Image src={selectedStory.coverImageUrl || `https://picsum.photos/seed/${selectedStory.id}/512/800`} alt="" fill objectFit="cover" className="animate-in fade-in duration-1000" />
                                  </div>
                                  <div className="text-center space-y-2 overflow-hidden w-full">
                                      <h4 className="font-bold text-xl md:text-2xl truncate px-2">{selectedStory.title}</h4>
                                      <p className="text-xs text-white/60 uppercase font-bold tracking-widest">by @{selectedStory.author.username}</p>
                                      <Badge className="bg-white/20 text-white border-none text-[10px] uppercase h-7 px-4 rounded-full mt-2">{selectedStory.genre}</Badge>
                                  </div>
                                  <div className="w-full">
                                      <Textarea 
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        placeholder="Add a promo note..."
                                        className="bg-white/5 border-none text-white text-center rounded-2xl"
                                        rows={2}
                                      />
                                  </div>
                                  <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white/50 rounded-full h-10 w-10 bg-white/5" onClick={() => setSelectedStory(null)}><X className="h-5 w-5"/></Button>
                              </div>
                          ) : (
                              <div className="space-y-6 h-full flex flex-col max-w-sm mx-auto w-full">
                                  <div className="text-center">
                                    <h3 className="font-headline text-2xl font-bold mb-1">Share your story</h3>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Only public works visible</p>
                                  </div>
                                  <ScrollArea className="flex-1 bg-white/5 rounded-[2rem] p-4 border border-white/10">
                                      <div className="space-y-2">
                                          {storySearchResults.map(s => (
                                              <div key={s.id} onClick={() => setSelectedStory(s)} className="p-4 bg-white/5 hover:bg-white/15 rounded-2xl flex gap-4 items-center cursor-pointer transition-all border border-transparent hover:border-white/10 group">
                                                  <div className="relative w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                                      <Image src={s.coverImageUrl || `https://picsum.photos/seed/${s.id}/100/150`} alt="" fill objectFit="cover" />
                                                  </div>
                                                  <div className="flex-1 overflow-hidden">
                                                    <span className="font-bold text-sm block truncate">{s.title}</span>
                                                    <span className="text-[9px] font-bold uppercase tracking-tighter text-white/40">{s.genre}</span>
                                                  </div>
                                                  <ChevronRight className="h-5 w-5 ml-auto opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                              </div>
                                          ))}
                                          {storySearchResults.length === 0 && (
                                              <p className="text-center py-10 text-white/30 text-xs italic">No public stories found.</p>
                                          )}
                                      </div>
                                  </ScrollArea>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              {/* Uploader Footer: Dual Option Posting */}
              <div className="bg-muted/10 p-4 border-t border-border/40 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                      <Button 
                          onClick={() => handlePublishStatus('public')}
                          disabled={isSubmitting || (activeUploaderTab === 'text' && !noteContent.trim())}
                          className="flex-1 rounded-2xl h-14 bg-background hover:bg-muted/50 border border-border/40 text-foreground font-bold uppercase tracking-widest text-xs gap-3 shadow-sm transition-all active:scale-95"
                      >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user?.avatarUrl} />
                          </Avatar>
                          Your Status
                      </Button>
                      <Button 
                          onClick={openCloseFriendsPicker}
                          disabled={isSubmitting}
                          className="flex-1 rounded-2xl h-14 bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest text-xs gap-3 shadow-lg shadow-green-500/20 transition-all active:scale-95"
                      >
                          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                            <Star className="h-3.5 w-3.5 fill-current" />
                          </div>
                          Close Friends
                      </Button>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      {/* Close Friends Multi-Selection Box */}
      <Dialog open={isCloseFriendsPickerOpen} onOpenChange={setIsCloseFriendsPickerOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl mx-auto w-[92vw]">
          <DialogHeader className="p-6 bg-green-500/5 border-b border-green-500/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 text-white rounded-2xl shadow-lg">
                <Star className="h-5 w-5 fill-current" />
              </div>
              <div>
                <DialogTitle className="font-headline text-xl font-bold">Close Friends</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Manage your inner circle</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <ScrollArea className="h-64 pr-4 -mr-4">
              {isLoadingFollowers ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>
              ) : followers.length > 0 ? (
                <div className="space-y-2">
                  {followers.map(f => {
                    const isSelected = user?.closeFriendIds?.includes(f.id);
                    return (
                      <div 
                        key={f.id} 
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/30 transition-all cursor-pointer group"
                        onClick={() => handleToggleCF(f.id)}
                      >
                        <Checkbox 
                          checked={isSelected} 
                          onCheckedChange={() => handleToggleCF(f.id)}
                          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <Avatar className="h-10 w-10 border shadow-sm">
                          <AvatarImage src={f.avatarUrl} />
                          <AvatarFallback>{f.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">@{f.username}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter truncate">{f.displayName}</p>
                        </div>
                        {isSelected && <Star className="h-3 w-3 text-green-500 fill-current animate-in zoom-in-50" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground italic text-xs">
                  Follow people who follow you back to add them.
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t">
            <Button 
                onClick={() => {
                    setIsCloseFriendsPickerOpen(false);
                    handlePublishStatus('close-friends');
                }} 
                className="w-full rounded-2xl h-14 bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest text-sm shadow-xl shadow-green-500/20"
            >
                Post to Close Friends
            </Button>
          </DialogFooter>
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
