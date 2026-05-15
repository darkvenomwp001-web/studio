
'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Song, Story, TextOverlayStyle } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Type, Image as LucideImageIcon, Sparkles, Music, BarChart2, BookOpen, Send, ChevronRight, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react';
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
  
  // 3 New Text Features
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
  const [statusVisibility, setStatusVisibility] = useState<'public' | 'close-friends'>('public');

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

  const handlePublishStatus = async () => {
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
            visibility: statusVisibility,
        };

        if (mediaUrl) {
            statusData.mediaUrl = mediaUrl;
            statusData.mediaType = mediaType;
            if (noteContent.trim()) {
                statusData.note = noteContent.trim();
                statusData.textOverlayStyle = textStyle;
            }
        } else if (activeUploaderTab === 'text') {
            statusData.note = noteContent.trim();
            statusData.backgroundStyle = backgroundStyle;
            statusData.textOverlayStyle = textStyle;
        } else if (activeUploaderTab === 'music' && selectedSong) {
            statusData.spotifyUrl = `https://open.spotify.com/track/${selectedSong.id}`;
            if (noteContent.trim()) {
                statusData.note = noteContent.trim();
                statusData.textOverlayStyle = textStyle;
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
                statusData.note = noteContent.trim();
                statusData.textOverlayStyle = textStyle;
            }
        }

        await addDoc(collection(db, 'statusUpdates'), statusData);
        toast({ title: 'Status Published!' });
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
                  <Button variant="outline" className="h-24 md:h-28 flex-col gap-2 rounded-3xl border-accent/10 hover:border-accent hover:bg-accent/5 transition-all p-2 shadow-sm" onClick={() => mediaInputRef.current?.click()}>
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
          <DialogContent className="p-0 border-none sm:max-w-md flex flex-col rounded-[2.5rem] overflow-hidden shadow-3xl mx-auto w-[95vw] max-h-[95vh] animate-in slide-in-from-bottom-8 duration-700">
              <DialogHeader className="p-6 bg-muted/30 border-b flex-shrink-0">
                  <DialogTitle className="font-headline text-xl font-bold">Status Studio</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Design your temporary update</DialogDescription>
              </DialogHeader>
              <div className={cn(
                  "relative h-[420px] md:h-[500px] flex flex-col justify-center items-center text-white transition-all duration-700 transform-gpu",
                  activeUploaderTab === 'text' ? backgroundStyle : 'bg-black'
              )}>
                  <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                  
                  {activeUploaderTab === 'art' && mediaPreview && (
                      <div className="w-full h-full relative">
                        <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="contain" className="animate-in fade-in duration-1000" />
                        <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-6">
                            <Textarea 
                                value={noteContent}
                                onChange={e => setNoteContent(e.target.value)}
                                placeholder="Add a caption..."
                                className={cn(
                                    "bg-black/40 backdrop-blur-md border-none text-white placeholder:text-white/50 rounded-[1.5rem] resize-none shadow-2xl h-28 text-lg font-medium p-5 transition-all duration-300",
                                    textStyle.font === 'serif' ? 'font-serif' : (textStyle.font === 'mono' ? 'font-mono' : 'font-sans'),
                                    textStyle.alignment === 'center' ? 'text-center' : (textStyle.alignment === 'right' ? 'text-right' : 'text-left')
                                )}
                                style={{
                                    backgroundColor: textStyle.background === 'solid' ? 'rgba(0,0,0,0.8)' : (textStyle.background === 'translucent' ? 'rgba(0,0,0,0.4)' : 'transparent'),
                                }}
                            />
                            {mediaType === 'image' && (
                                <div className="mt-4 space-y-3">
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
                                    <h3 className="font-headline text-2xl font-bold mb-1">Share your manuscript</h3>
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
                                              <p className="text-center py-10 text-white/30 text-xs italic">No public manuscripts found.</p>
                                          )}
                                      </div>
                                  </ScrollArea>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              <div className="flex-1 bg-background overflow-y-auto no-scrollbar">
                  <div className="p-6 space-y-8">
                    {/* Text Styling Bar */}
                    {(activeUploaderTab === 'text' || activeUploaderTab === 'art' || activeUploaderTab === 'music' || activeUploaderTab === 'story') && (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                             <div className="flex items-center justify-between border-b pb-4 border-border/40">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <Palette className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Text Stylist</span>
                                </div>
                                <div className="flex gap-1">
                                    {activeUploaderTab === 'text' && gradientBackgrounds.map(bg => (
                                        <button key={bg} onClick={() => setBackgroundStyle(bg)} className={cn("w-5 h-5 rounded-full border-2 transition-all flex-shrink-0", backgroundStyle === bg ? "border-primary scale-110 shadow-md" : "border-transparent", bg)} />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-60">Typography</Label>
                                    <RadioGroup value={textStyle.font} onValueChange={(v: any) => setTextStyle({...textStyle, font: v})} className="flex gap-2">
                                        <div className="flex-1">
                                            <RadioGroupItem value="sans" id="font-sans" className="sr-only" />
                                            <Label htmlFor="font-sans" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-xs font-bold", textStyle.font === 'sans' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>Abc</Label>
                                        </div>
                                        <div className="flex-1">
                                            <RadioGroupItem value="serif" id="font-serif" className="sr-only" />
                                            <Label htmlFor="font-serif" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer font-serif text-xs font-bold", textStyle.font === 'serif' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>Abc</Label>
                                        </div>
                                        <div className="flex-1">
                                            <RadioGroupItem value="mono" id="font-mono" className="sr-only" />
                                            <Label htmlFor="font-mono" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer font-mono text-xs font-bold", textStyle.font === 'mono' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>Abc</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-60">Alignment</Label>
                                    <RadioGroup value={textStyle.alignment} onValueChange={(v: any) => setTextStyle({...textStyle, alignment: v})} className="flex gap-2">
                                        <div className="flex-1">
                                            <RadioGroupItem value="left" id="align-left" className="sr-only" />
                                            <Label htmlFor="align-left" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer", textStyle.alignment === 'left' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}><AlignLeft className="h-4 w-4" /></Label>
                                        </div>
                                        <div className="flex-1">
                                            <RadioGroupItem value="center" id="align-center" className="sr-only" />
                                            <Label htmlFor="align-center" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer", textStyle.alignment === 'center' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}><AlignCenter className="h-4 w-4" /></Label>
                                        </div>
                                        <div className="flex-1">
                                            <RadioGroupItem value="right" id="align-right" className="sr-only" />
                                            <Label htmlFor="align-right" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer", textStyle.alignment === 'right' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}><AlignRight className="h-4 w-4" /></Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-60">Highlight</Label>
                                    <RadioGroup value={textStyle.background} onValueChange={(v: any) => setTextStyle({...textStyle, background: v})} className="flex gap-2">
                                        <div className="flex-1">
                                            <RadioGroupItem value="none" id="bg-none" className="sr-only" />
                                            <Label htmlFor="bg-none" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-[8px] font-bold uppercase", textStyle.background === 'none' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>None</Label>
                                        </div>
                                        <div className="flex-1">
                                            <RadioGroupItem value="translucent" id="bg-trans" className="sr-only" />
                                            <Label htmlFor="bg-trans" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-[8px] font-bold uppercase", textStyle.background === 'translucent' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>Blur</Label>
                                        </div>
                                        <div className="flex-1">
                                            <RadioGroupItem value="solid" id="bg-solid" className="sr-only" />
                                            <Label htmlFor="bg-solid" className={cn("flex flex-col items-center justify-center h-10 rounded-xl border transition-all cursor-pointer text-[8px] font-bold uppercase", textStyle.background === 'solid' ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent")}>Solid</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between p-5 bg-muted/20 rounded-[1.5rem] border border-border/40">
                             <div className="space-y-1">
                                <Label htmlFor="cf-toggle" className="text-sm font-bold block cursor-pointer">Close Friends Only</Label>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Share with selected circle</p>
                            </div>
                            <Switch id="cf-toggle" checked={statusVisibility === 'close-friends'} onCheckedChange={(c) => setStatusVisibility(c ? 'close-friends' : 'public')} className="data-[state=checked]:bg-green-500" />
                        </div>
                        
                        <Button 
                            onClick={handlePublishStatus} 
                            disabled={isSubmitting || (activeUploaderTab === 'text' && !noteContent.trim()) || (activeUploaderTab === 'poll' && !pollQuestion.trim())} 
                            className="rounded-full w-full h-16 shadow-2xl shadow-primary/30 font-bold uppercase tracking-widest text-sm bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />}
                            Publish Transmission
                        </Button>
                    </div>
                  </div>
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
