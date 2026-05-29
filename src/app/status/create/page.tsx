'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs, limit } from 'firebase/firestore';
import type { Song, Story, User, TextOverlayStyle } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    X, 
    Type, 
    Image as LucideImageIcon, 
    Music, 
    BarChart2, 
    BookOpen, 
    Send, 
    Palette, 
    CheckCircle, 
    Download, 
    Smile, 
    AtSign, 
    Search,
    Loader2,
    Star,
    Camera,
    ChevronLeft,
    Check,
    Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import SongSearch from '@/components/status/SongSearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleCloseFriend } from '@/app/actions/userActions';

const gradientBackgrounds = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
  'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600',
  'bg-gradient-to-br from-yellow-200 via-green-200 to-green-500',
  'bg-gradient-to-br from-red-200 via-red-300 to-yellow-200',
  'bg-gradient-to-br from-sky-400 to-sky-200',
];

export default function CreateStatusPage() {
    const { user, addNotification } = useAuth();
    const { showIsland } = useDynamicIsland();
    const { toast } = useToast();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('text');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const mediaInputRef = useRef<HTMLInputElement>(null);
    
    const [noteContent, setNoteContent] = useState('');
    const [backgroundStyle, setBackgroundStyle] = useState<string>(gradientBackgrounds[0]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [storySearchResults, setStorySearchResults] = useState<Story[]>([]);
    
    // Tool States
    const [isTextToolActive, setIsTextToolActive] = useState(false);
    const [isMusicToolActive, setIsMusicToolActive] = useState(false);
    const [isStickerToolActive, setIsStickerToolActive] = useState(false);
    const [isMentionToolActive, setIsMentionToolActive] = useState(false);
    const [isCloseFriendsPickerOpen, setIsCloseFriendsPickerOpen] = useState(false);

    const [stickers, setStickers] = useState<{ id: string, emoji: string, position: { x: number, y: number } }[]>([]);
    const [mentions, setMentions] = useState<{ id: string, userId: string, username: string, position: { x: number, y: number } }[]>([]);
    const [mentionSearch, setMentionSearch] = useState('');
    const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
    const [followers, setFollowers] = useState<User[]>([]);
    const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
    const [textStyle, setTextStyle] = useState<TextOverlayStyle>({
        font: 'sans',
        alignment: 'center',
        background: 'none',
        color: '#ffffff'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (activeTab === 'story') {
            searchMyStories();
        }
    }, [activeTab]);

    const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMediaFile(file);
            setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
            const reader = new FileReader();
            reader.onload = (event) => setMediaPreview(event.target?.result as string);
            reader.readAsDataURL(file);
            setActiveTab('art');
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

    const handleMentionSearch = async (queryStr: string) => {
        setMentionSearch(queryStr);
        if (queryStr.length < 2) {
            setSearchedUsers([]);
            return;
        }
        const q = query(
            collection(db, 'users'),
            where('username', '>=', queryStr.toLowerCase()),
            where('username', '<=', queryStr.toLowerCase() + '\uf8ff'),
            limit(5)
        );
        const snap = await getDocs(q);
        setSearchedUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    };

    const addMention = (targetUser: User) => {
        const newMention = {
            id: Math.random().toString(36).substring(7),
            userId: targetUser.id,
            username: targetUser.username,
            position: { x: 50, y: 30 }
        };
        setMentions([...mentions, newMention]);
        setIsMentionToolActive(false);
        setMentionSearch('');
        setSearchedUsers([]);
    };

    const addSticker = (emojiData: EmojiClickData) => {
        const newSticker = {
            id: Math.random().toString(36).substring(7),
            emoji: emojiData.emoji,
            position: { x: 50, y: 70 }
        };
        setStickers([...stickers, newSticker]);
        setIsStickerToolActive(false);
    };

    const handleToggleCF = async (friendId: string) => {
        if (!user) return;
        const isAdding = !user.closeFriendIds?.includes(friendId);
        const result = await toggleCloseFriend(user.id, friendId, isAdding);
        if (result.success) {
            toast({ title: isAdding ? "Added to Close Friends" : "Removed from list" });
        }
    };

    const uploadFileToCloudinary = async (file: File): Promise<string> => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset!);
        const resourceType = mediaType === 'video' ? 'video' : 'image';
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        return data.secure_url;
    };

    const handlePublish = async (visibility: 'public' | 'close-friends') => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            let mediaUrl = '';
            if (mediaFile) {
                mediaUrl = await uploadFileToCloudinary(mediaFile);
            }

            const expiryTime = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
            const statusData: any = {
                authorId: user.id,
                authorInfo: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'published',
                expiresAt: expiryTime,
                isHidden: false,
                visibility: visibility,
                mentions: mentions.map(m => ({ userId: m.userId, username: m.username, position: m.position })),
                stickers: stickers.map(s => ({ emoji: s.emoji, position: s.position })),
            };

            if (mediaUrl) {
                statusData.mediaUrl = mediaUrl;
                statusData.mediaType = mediaType;
                if (noteContent.trim()) {
                    statusData.textOverlay = noteContent.trim();
                    statusData.textOverlayStyle = textStyle;
                    statusData.textOverlayPosition = textPosition;
                }
            } else if (activeTab === 'text') {
                statusData.note = noteContent.trim();
                statusData.backgroundStyle = backgroundStyle;
                statusData.textOverlayStyle = textStyle;
                statusData.textOverlayPosition = textPosition;
            } else if (activeTab === 'music' && selectedSong) {
                statusData.spotifyUrl = `https://open.spotify.com/track/${selectedSong.id}`;
                if (noteContent.trim()) {
                    statusData.textOverlay = noteContent.trim();
                    statusData.textOverlayStyle = textStyle;
                    statusData.textOverlayPosition = textPosition;
                }
            } else if (activeTab === 'poll' && pollQuestion.trim()) {
                statusData.poll = {
                    question: pollQuestion.trim(),
                    options: pollOptions.filter(o => o.trim()).map((o, i) => ({ id: `opt${i}`, text: o.trim(), votes: [] })),
                    createdAt: serverTimestamp(),
                    authorId: user.id,
                };
            } else if (activeTab === 'story' && selectedStory) {
                statusData.sharedStoryId = selectedStory.id;
                if (noteContent.trim()) {
                    statusData.textOverlay = noteContent.trim();
                    statusData.textOverlayStyle = textStyle;
                    statusData.textOverlayPosition = textPosition;
                }
            }

            await addDoc(collection(db, 'statusUpdates'), statusData);
            
            mentions.forEach(mention => {
                addNotification({
                    userId: mention.userId,
                    type: 'mention',
                    message: `mentioned you in their status update.`,
                    link: `/?status=${user.id}`,
                    actor: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
                });
            });

            showIsland({ title: "Status posted", type: 'success', image: user.avatarUrl });
            router.push('/');
        } catch (error) {
            toast({ title: 'Publish Failed', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
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

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden animate-in fade-in duration-700">
            {/* Immersive Header Toolbar */}
            <header className="absolute top-0 left-0 right-0 z-[100] p-6 flex items-center justify-between pointer-events-none">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full bg-black/40 backdrop-blur-md text-white pointer-events-auto h-12 w-12"
                    onClick={() => router.back()}
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("rounded-full h-11 w-11 backdrop-blur-md transition-all", isTextToolActive ? "bg-white text-black" : "bg-black/40 text-white")}
                        onClick={() => setIsTextToolActive(true)}
                    >
                        <Type className="h-5 w-5" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-11 w-11 bg-black/40 backdrop-blur-md text-white"
                        onClick={() => setIsMusicToolActive(true)}
                    >
                        <Music className="h-5 w-5" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-11 w-11 bg-black/40 backdrop-blur-md text-white"
                        onClick={() => setIsStickerToolActive(true)}
                    >
                        <Smile className="h-5 w-5" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-11 w-11 bg-black/40 backdrop-blur-md text-white"
                        onClick={() => setIsMentionToolActive(true)}
                    >
                        <AtSign className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Editing Canvas */}
            <div className={cn(
                "relative flex-1 flex flex-col justify-center items-center transition-all duration-700 transform-gpu overflow-hidden",
                activeTab === 'text' ? backgroundStyle : 'bg-black'
            )}
            onMouseMove={(e) => {
                if (!isDragging) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setTextPosition({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={(e) => {
                if (!isDragging) return;
                if (e.cancelable) e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const touch = e.touches[0];
                const x = ((touch.clientX - rect.left) / rect.width) * 100;
                const y = ((touch.clientY - rect.top) / rect.height) * 100;
                setTextPosition({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
            }}
            onTouchEnd={() => setIsDragging(false)}
            >
                {activeTab === 'art' && mediaPreview && (
                    <Image src={mediaPreview} alt="Canvas" layout="fill" objectFit="contain" className="pointer-events-none" />
                )}

                {activeTab === 'text' && !noteContent && (
                    <button 
                        className="text-white/20 text-3xl font-bold hover:text-white/40 transition-colors"
                        onClick={() => setIsTextToolActive(true)}
                    >
                        Tap to add text
                    </button>
                )}

                {/* Movable Layers */}
                {(activeTab === 'art' || activeTab === 'music' || activeTab === 'story' || activeTab === 'text') && (
                    <div className="absolute inset-0 pointer-events-none">
                        {noteContent && (
                            <div 
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 min-w-[200px] cursor-move pointer-events-auto group/text"
                                style={{ left: `${textPosition.x}%`, top: `${textPosition.y}%` }}
                                onMouseDown={() => setIsDragging(true)}
                                onTouchStart={() => setIsDragging(true)}
                            >
                                <div className="relative">
                                    <p 
                                        className={cn(
                                            "text-white text-2xl font-bold p-3 text-center",
                                            textStyle.font === 'serif' ? 'font-serif' : (textStyle.font === 'mono' ? 'font-mono' : 'font-sans')
                                        )} 
                                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                                        onClick={() => setIsTextToolActive(true)}
                                    >
                                        {noteContent}
                                    </p>
                                    <button 
                                        className="absolute -top-2 -right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/text:opacity-100 transition-opacity shadow-lg border border-white/10"
                                        onClick={(e) => { e.stopPropagation(); setNoteContent(''); }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {stickers.map(s => (
                            <div 
                                key={s.id} 
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 text-6xl select-none pointer-events-auto cursor-move"
                                style={{ left: `${s.position.x}%`, top: `${s.position.y}%` }}
                            >
                                {s.emoji}
                            </div>
                        ))}

                        {mentions.map(m => (
                            <div 
                                key={m.id} 
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white font-bold text-base shadow-2xl pointer-events-auto cursor-move"
                                style={{ left: `${m.position.x}%`, top: `${m.position.y}%` }}
                            >
                                @{m.username}
                            </div>
                        ))}
                    </div>
                )}

                {/* Sub-tools Popups */}
                {isTextToolActive && (
                    <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                        <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-white h-12 w-12" onClick={() => setIsTextToolActive(false)}><X className="h-8 w-8"/></Button>
                        <div className="w-full max-w-lg space-y-8 text-center">
                             <div className="flex justify-center gap-3 mb-6">
                                {['sans', 'serif', 'mono'].map(f => (
                                    <Button 
                                        key={f} 
                                        variant="outline" 
                                        size="sm" 
                                        className={cn("rounded-full px-4 h-9 font-bold uppercase text-[10px] tracking-widest", textStyle.font === f ? "bg-white text-black" : "bg-black/40 text-white border-white/20")}
                                        onClick={() => setTextStyle({...textStyle, font: f as any})}
                                    >
                                        {f}
                                    </Button>
                                ))}
                            </div>
                            <Textarea 
                                autoFocus
                                value={noteContent}
                                onChange={e => setNoteContent(e.target.value)}
                                placeholder="Type something..."
                                className={cn(
                                    "bg-transparent border-none text-white text-4xl md:text-5xl font-bold text-center focus-visible:ring-0 min-h-[200px] shadow-none",
                                    textStyle.font === 'serif' ? 'font-serif' : (textStyle.font === 'mono' ? 'font-mono' : 'font-sans')
                                )}
                            />
                            <Button className="rounded-full px-12 h-12 font-bold uppercase text-xs tracking-widest shadow-xl" onClick={() => setIsTextToolActive(false)}>Done</Button>
                        </div>
                    </div>
                )}

                {isMusicToolActive && (
                    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-3xl flex flex-col p-8 animate-in slide-in-from-bottom-full duration-500">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-headline font-bold text-white">Atmospheric Pulse</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Add a high-fidelity soundtrack</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-white h-12 w-12 bg-white/10 rounded-full" onClick={() => setIsMusicToolActive(false)}><X className="h-6 w-6"/></Button>
                        </header>
                        <SongSearch onSongSelect={(song) => { setSelectedSong(song); setIsMusicToolActive(false); setActiveTab('music'); }} />
                    </div>
                )}

                {isStickerToolActive && (
                    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-3xl flex flex-col animate-in slide-in-from-bottom-full duration-500">
                        <header className="flex justify-between items-center p-8 border-b border-white/10">
                            <div>
                                <h3 className="text-2xl font-headline font-bold text-white">Stickers</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Visual Signal Enhancement</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-white h-12 w-12 bg-white/10 rounded-full" onClick={() => setIsStickerToolActive(false)}><X className="h-6 w-6"/></Button>
                        </header>
                        <div className="flex-1 overflow-hidden">
                            <EmojiPicker 
                                onEmojiClick={addSticker} 
                                width="100%" 
                                height="100%" 
                                theme={'dark' as any}
                                searchPlaceHolder="Search stickers..."
                            />
                        </div>
                    </div>
                )}

                {isMentionToolActive && (
                    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-3xl flex flex-col p-8 animate-in slide-in-from-bottom-full duration-500">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-headline font-bold text-white">Signal Author</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Mention a node in your network</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-white h-12 w-12 bg-white/10 rounded-full" onClick={() => setIsMentionToolActive(false)}><X className="h-6 w-6"/></Button>
                        </header>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                            <Input 
                                placeholder="Search handles..." 
                                value={mentionSearch} 
                                onChange={e => handleMentionSearch(e.target.value)}
                                className="pl-12 bg-white/10 border-white/20 text-white h-14 rounded-2xl text-lg focus-visible:ring-primary/40"
                                autoFocus
                            />
                        </div>
                        <ScrollArea className="flex-1 mt-8">
                            <div className="space-y-3">
                                {searchedUsers.map(u => (
                                    <div 
                                        key={u.id} 
                                        className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-white/10 group"
                                        onClick={() => addMention(u)}
                                    >
                                        <Avatar className="h-12 w-12 border border-white/20 group-hover:scale-105 transition-transform">
                                            <AvatarImage src={u.avatarUrl} />
                                            <AvatarFallback>{u.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-bold text-white text-lg">@{u.username}</p>
                                            <p className="text-xs text-white/60">{u.displayName}</p>
                                        </div>
                                        <CheckCircle className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100" />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Immersive Footer Navigation */}
            <footer className="bg-black/60 backdrop-blur-3xl p-6 border-t border-white/10 z-[100]">
                <div className="max-w-xl mx-auto flex flex-col gap-6">
                    <div className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar py-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full bg-white/10 text-white h-11 w-11"
                            onClick={() => mediaInputRef.current?.click()}
                        >
                            <LucideImageIcon className="h-5 w-5" />
                        </Button>
                        <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaSelect} />
                        
                        {gradientBackgrounds.map((bg, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => { setBackgroundStyle(bg); setActiveTab('text'); }}
                                className={cn(
                                    "h-8 w-8 rounded-full border-2 transition-all flex-shrink-0",
                                    backgroundStyle === bg ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                                )}
                                style={{ background: bg.split(' ')[1] }}
                            />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            onClick={() => handlePublish('public')}
                            disabled={isSubmitting || (activeTab === 'text' && !noteContent.trim())}
                            className="flex-1 h-14 rounded-3xl bg-white hover:bg-white/90 text-black font-black uppercase tracking-widest text-[10px] gap-3 shadow-2xl transition-all active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Public Feed
                        </Button>
                        <Button 
                            onClick={openCloseFriendsPicker}
                            disabled={isSubmitting}
                            className="flex-1 h-14 rounded-3xl bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-widest text-[10px] gap-3 shadow-2xl shadow-green-500/30 transition-all active:scale-95"
                        >
                            <Star className="h-4 w-4 fill-current" />
                            Close Friends
                        </Button>
                    </div>
                </div>
            </footer>

            {/* Close Friends Tagger Overlay */}
            {isCloseFriendsPickerOpen && (
                <div className="absolute inset-0 z-[300] bg-black/95 backdrop-blur-3xl p-8 flex flex-col animate-in fade-in zoom-in-95 duration-500">
                    <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                        <div>
                            <h3 className="text-3xl font-headline font-bold text-white flex items-center gap-3">
                                <Star className="h-8 w-8 text-green-500 fill-current" />
                                Inner Circle
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Select archival nodes for private sharing</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white h-12 w-12 bg-white/10 rounded-full" onClick={() => setIsCloseFriendsPickerOpen(false)}><X className="h-6 w-6"/></Button>
                    </header>

                    <ScrollArea className="flex-1">
                        {isLoadingFollowers ? (
                            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-green-500" /></div>
                        ) : followers.length > 0 ? (
                            <div className="space-y-4">
                                {followers.map(f => {
                                    const isSelected = user?.closeFriendIds?.includes(f.id);
                                    return (
                                        <div 
                                            key={f.id} 
                                            className="flex items-center gap-4 p-4 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-green-500/40 transition-all cursor-pointer group"
                                            onClick={() => handleToggleCF(f.id)}
                                        >
                                            <Avatar className="h-14 w-14 border border-white/10 group-hover:scale-105 transition-transform">
                                                <AvatarImage src={f.avatarUrl} />
                                                <AvatarFallback>{f.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-lg">@{f.username}</p>
                                                <p className="text-xs text-white/40 font-medium uppercase tracking-tighter truncate">{f.displayName}</p>
                                            </div>
                                            {isSelected && <Check className="h-6 w-6 text-green-500" />}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-32 text-white/20 italic bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
                                <Users className="h-12 w-12 mx-auto mb-4" />
                                <p className="text-sm px-12 leading-relaxed">Archival network requires mutual signal following to establish private connections.</p>
                            </div>
                        )}
                    </ScrollArea>

                    <div className="pt-8 border-t border-white/10">
                        <Button 
                            onClick={() => {
                                setIsCloseFriendsPickerOpen(false);
                                handlePublish('close-friends');
                            }} 
                            className="w-full rounded-[2.5rem] h-16 bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-3xl shadow-green-500/40"
                        >
                            Confirm & Transmit Signal
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}