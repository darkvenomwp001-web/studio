'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Song, Story } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Type, Palette, Image as LucideImageIcon, Sparkles, Music, BarChart2, BookOpen, Send, CheckCircle, ChevronRight, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import StatusViewer from './StatusViewer';
import { Textarea } from '../ui/textarea';
import SongSearch from './SongSearch';
import { Input } from '../ui/input';
import { getStatusCaptions } from '@/app/actions/aiActions';

const gradientBackgrounds = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
  'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600',
  'bg-gradient-to-br from-yellow-200 via-green-200 to-green-500',
  'bg-gradient-to-br from-red-200 via-red-300 to-yellow-200',
  'bg-gradient-to-br from-sky-400 to-sky-200',
];

function StatusBubble({ user, onSelect, hasStatus }: { user: User, onSelect: (user: User) => void, hasStatus: boolean }) {
  const { user: authUser } = useAuth();
  const isOwn = authUser?.id === user.id;

  return (
    <div
      className="relative text-center flex-shrink-0 w-20 cursor-pointer group"
      onClick={() => onSelect(user)}
    >
      <div className="relative w-16 h-16 mx-auto group-hover:scale-110 transition-transform duration-200">
         <div className={cn(
            "w-16 h-16 p-0.5 rounded-full",
            hasStatus ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" : "bg-muted"
        )}>
            <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
                <AvatarFallback>{user.username?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
        </div>
        
        {isOwn && !hasStatus && (
           <div className="absolute bottom-0 right-0 z-10 w-6 h-6 bg-primary border-2 border-background rounded-full flex items-center justify-center shadow-md">
              <Plus className="h-3 w-3 text-white" />
           </div>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase mt-1 truncate tracking-tighter">{isOwn ? 'Add Status' : user.displayName || user.username}</p>
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
  
  // Status Content States
  const [noteContent, setNoteContent] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState<string>(gradientBackgrounds[0]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [storySearchResults, setStorySearchResults] = useState<Story[]>([]);
  
  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAi, startAiTransition] = useTransition();

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const [activeUploaderTab, setActiveUploaderTab] = useState('text');
  const [statusVisibility, setStatusVisibility] = useState<'public' | 'close-friends'>('public');

  const { toast } = useToast();
  const router = useRouter();

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
            if (noteContent.trim()) statusData.note = noteContent.trim();
        } else if (activeUploaderTab === 'text') {
            statusData.note = noteContent.trim();
            statusData.backgroundStyle = backgroundStyle;
        } else if (activeUploaderTab === 'music' && selectedSong) {
            statusData.spotifyUrl = `https://open.spotify.com/track/${selectedSong.id}`;
            if (noteContent.trim()) statusData.note = noteContent.trim();
        } else if (activeUploaderTab === 'poll' && pollQuestion.trim()) {
            statusData.poll = {
                question: pollQuestion.trim(),
                options: pollOptions.filter(o => o.trim()).map((o, i) => ({ id: `opt${i}`, text: o.trim(), votes: [] })),
                createdAt: serverTimestamp(),
                authorId: user.id,
            };
        } else if (activeUploaderTab === 'story' && selectedStory) {
            statusData.sharedStoryId = selectedStory.id;
            if (noteContent.trim()) statusData.note = noteContent.trim();
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
    const group = groupedStatuses.get(selectedUser.id);
    if (group && group.statuses.length > 0) {
        setSelectedUserForViewing(selectedUser);
        setIsViewerOpen(true);
    } else {
        setIsCreatorOpen(true);
    }
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
    <div className='py-4 -mx-4 px-4 overflow-hidden border-b border-border/40 bg-card/20'>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start space-x-4 pb-2">
            {isLoading ? (
                [...Array(6)].map((_, i) => <div key={i} className="w-16 h-16 rounded-full bg-muted animate-pulse flex-shrink-0" />)
            ) : (
                statusOrder.map((userId) => {
                    const group = groupedStatuses.get(userId);
                    if (!group) return null;
                    return <StatusBubble key={userId} user={group.user} hasStatus={group.statuses.length > 0} onSelect={handleSelectUser} />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-6">
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-primary/20 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => { setActiveUploaderTab('text'); setIsUploaderOpen(true); setIsCreatorOpen(false); }}>
                      <Type className="h-6 w-6 text-primary"/>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Text</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-accent/20 hover:border-accent hover:bg-accent/5 transition-all" onClick={() => mediaInputRef.current?.click()}>
                      <LucideImageIcon className="h-6 w-6 text-accent"/>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Art</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-green-500/20 hover:border-green-500 hover:bg-green-500/5 transition-all" onClick={() => { setActiveUploaderTab('music'); setIsUploaderOpen(true); setIsCreatorOpen(false); }}>
                      <Music className="h-6 w-6 text-green-500"/>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Music</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-orange-500/20 hover:border-orange-500 hover:bg-orange-500/5 transition-all" onClick={() => { setActiveUploaderTab('poll'); setIsUploaderOpen(true); setIsCreatorOpen(false); }}>
                      <BarChart2 className="h-6 w-6 text-orange-500"/>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Poll</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-purple-500/20 hover:border-purple-500 hover:bg-purple-500/5 transition-all" onClick={() => { setActiveUploaderTab('story'); setIsUploaderOpen(true); setIsCreatorOpen(false); searchMyStories(); }}>
                      <BookOpen className="h-6 w-6 text-purple-500"/>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Story</span>
                  </Button>
                  <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaSelect} />
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isUploaderOpen} onOpenChange={(o) => { setIsUploaderOpen(o); if(!o) resetUploader(); }}>
          <DialogContent className="p-0 border-none sm:max-w-md flex flex-col rounded-3xl overflow-hidden shadow-3xl">
              <DialogHeader className="sr-only">
                  <DialogTitle>Status Content Creator</DialogTitle>
                  <DialogDescription>Compose and style your temporary status update.</DialogDescription>
              </DialogHeader>
              <div className={cn(
                  "relative h-[450px] flex flex-col justify-center items-center text-white transition-all duration-500",
                  activeUploaderTab === 'text' ? backgroundStyle : 'bg-black'
              )}>
                  {activeUploaderTab === 'art' && mediaPreview && (
                      <>
                        <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="contain" />
                        <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-6">
                            <Textarea 
                                value={noteContent}
                                onChange={e => setNoteContent(e.target.value)}
                                placeholder="Add a caption..."
                                className="bg-black/40 backdrop-blur-md border-none text-white placeholder:text-white/50 rounded-xl resize-none shadow-lg h-24"
                            />
                            {mediaType === 'image' && (
                                <div className="mt-4 space-y-2">
                                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 font-bold text-[10px] uppercase tracking-widest gap-2" onClick={handleGenerateAiCaptions} disabled={isGeneratingAi}>
                                        {isGeneratingAi ? <Loader2 className="h-3 w-3 animate-spin"/> : <Sparkles className="h-3 w-3" />}
                                        AI Suggestions
                                    </Button>
                                    <div className="flex flex-wrap gap-1">
                                        {aiSuggestions.map((s, i) => (
                                            <button key={i} onClick={() => setNoteContent(s)} className="text-[9px] bg-white/10 hover:bg-white/30 px-2 py-1 rounded-full text-white truncate max-w-[120px] transition-all">"{s}"</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                      </>
                  )}

                  {activeUploaderTab === 'text' && (
                      <Textarea
                        placeholder="What's your creative state?"
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        className="bg-transparent border-0 focus-visible:ring-0 text-3xl font-bold text-center resize-none shadow-none placeholder:text-white/40 h-full flex items-center justify-center pt-24"
                      />
                  )}

                  {activeUploaderTab === 'music' && (
                      <div className="w-full h-full p-8 flex flex-col justify-center bg-gradient-to-br from-green-900 via-gray-900 to-black">
                        {selectedSong ? (
                            <div className="space-y-6 text-center animate-in zoom-in-95">
                                <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden shadow-2xl">
                                    <Image src={selectedSong.cover} alt="" layout="fill" objectFit="cover" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">{selectedSong.title}</h3>
                                    <p className="text-white/60">{selectedSong.artist}</p>
                                </div>
                                <Button variant="ghost" className="text-white/50 hover:text-white" onClick={() => setSelectedSong(null)}>Change Song</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-center font-headline text-xl mb-6">Soundtrack your status</h3>
                                <SongSearch onSongSelect={setSelectedSong} />
                            </div>
                        )}
                      </div>
                  )}

                  {activeUploaderTab === 'poll' && (
                      <div className="w-full h-full p-8 flex flex-col justify-center bg-gradient-to-br from-orange-400 to-rose-500">
                          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 space-y-4 shadow-xl border border-white/10">
                              <Input 
                                placeholder="Ask a question..." 
                                value={pollQuestion} 
                                onChange={e => setPollQuestion(e.target.value)}
                                className="bg-transparent border-none text-white placeholder:text-white/50 text-xl font-bold p-0 h-auto"
                              />
                              <div className="space-y-2">
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
                                        className="bg-white/20 border-none text-white h-11 rounded-xl"
                                    />
                                ))}
                                {pollOptions.length < 4 && (
                                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white" onClick={() => setPollOptions([...pollOptions, ''])}>+ Add Option</Button>
                                )}
                              </div>
                          </div>
                      </div>
                  )}

                  {activeUploaderTab === 'story' && (
                      <div className="w-full h-full p-8 flex flex-col justify-center bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800">
                          {selectedStory ? (
                              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 flex gap-4 items-center border border-white/20 shadow-2xl animate-in fade-in">
                                  <div className="relative w-20 h-32 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                                      <Image src={selectedStory.coverImageUrl || `https://picsum.photos/seed/${selectedStory.id}/512/800`} alt="" fill objectFit="cover" />
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                      <h4 className="font-bold text-lg truncate">{selectedStory.title}</h4>
                                      <p className="text-xs text-white/60 mb-2 truncate">@{selectedStory.author.username}</p>
                                      <Badge className="bg-white/20 hover:bg-white/20 text-white border-none">{selectedStory.genre}</Badge>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => setSelectedStory(null)}><X className="h-4 w-4"/></Button>
                              </div>
                          ) : (
                              <div className="space-y-4 h-full flex flex-col">
                                  <h3 className="text-center font-headline text-xl mb-4">Share your latest work</h3>
                                  <ScrollArea className="flex-1">
                                      <div className="space-y-2">
                                          {storySearchResults.map(s => (
                                              <div key={s.id} onClick={() => setSelectedStory(s)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl flex gap-3 items-center cursor-pointer transition-all border border-transparent hover:border-white/20">
                                                  <div className="relative w-10 h-14 rounded overflow-hidden">
                                                      <Image src={s.coverImageUrl || `https://picsum.photos/seed/${s.id}/80/120`} alt="" fill objectFit="cover" />
                                                  </div>
                                                  <span className="font-bold text-sm truncate">{s.title}</span>
                                                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                                              </div>
                                          ))}
                                      </div>
                                  </ScrollArea>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              <div className="p-4 bg-background border-t space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        {activeUploaderTab === 'text' && gradientBackgrounds.map(bg => (
                            <button key={bg} onClick={() => setBackgroundStyle(bg)} className={cn("w-6 h-6 rounded-full border-2 transition-all", backgroundStyle === bg ? "border-primary scale-110 shadow-md" : "border-transparent", bg)} />
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Close Friends</span>
                            <Switch checked={statusVisibility === 'close-friends'} onCheckedChange={(c) => setStatusVisibility(c ? 'close-friends' : 'public')} />
                        </div>
                        <Button 
                            onClick={handlePublishStatus} 
                            disabled={isSubmitting || (activeUploaderTab === 'text' && !noteContent.trim()) || (activeUploaderTab === 'poll' && !pollQuestion.trim())} 
                            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 font-bold"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Publish
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
