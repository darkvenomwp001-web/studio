'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs, limit } from 'firebase/firestore';
import type { Song, User, TextOverlayStyle } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
    X, 
    Type, 
    Image as LucideImageIcon, 
    Music, 
    Smile, 
    AtSign, 
    Search,
    Loader2,
    Star,
    ChevronLeft,
    Check,
    Plus,
    Camera,
    Palette,
    SendHorizonal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import SongSearch from '@/components/status/SongSearch';
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

    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const mediaInputRef = useRef<HTMLInputElement>(null);
    
    const [noteContent, setNoteContent] = useState('');
    const [backgroundStyle, setBackgroundStyle] = useState<string>(gradientBackgrounds[0]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    
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

    const [isDragging, setIsDragging] = useState<{ type: 'text' | 'sticker' | 'mention', id?: string } | null>(null);
    const [textPosition, setTextPosition] = useState({ x: 50, y: 40 });
    const [textStyle, setTextStyle] = useState<TextOverlayStyle>({
        font: 'sans',
        alignment: 'center',
        background: 'none',
        color: '#ffffff'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMediaFile(file);
            setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
            const reader = new FileReader();
            reader.onload = (event) => setMediaPreview(event.target?.result as string);
            reader.readAsDataURL(file);
        }
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
            } else {
                statusData.note = noteContent.trim() || 'Visual status';
                statusData.backgroundStyle = backgroundStyle;
                statusData.textOverlayStyle = textStyle;
                statusData.textOverlayPosition = textPosition;
            }

            if (selectedSong) {
                statusData.spotifyUrl = `https://open.spotify.com/track/${selectedSong.id}`;
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

    const handleCanvasDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        let clientX, clientY;
        
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        const boundedX = Math.max(10, Math.min(90, x));
        const boundedY = Math.max(10, Math.min(90, y));

        if (isDragging.type === 'text') {
            setTextPosition({ x: boundedX, y: boundedY });
        } else if (isDragging.type === 'sticker') {
            setStickers(prev => prev.map(s => s.id === isDragging.id ? { ...s, position: { x: boundedX, y: boundedY } } : s));
        } else if (isDragging.type === 'mention') {
            setMentions(prev => prev.map(m => m.id === isDragging.id ? { ...m, position: { x: boundedX, y: boundedY } } : m));
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col overflow-hidden animate-in fade-in duration-700 font-sans">
            {/* Immersive Background / Canvas */}
            <div 
                className={cn(
                    "absolute inset-0 transition-all duration-700 transform-gpu overflow-hidden flex items-center justify-center",
                    mediaPreview ? 'bg-black' : backgroundStyle
                )}
                onMouseMove={handleCanvasDrag}
                onMouseUp={() => setIsDragging(null)}
                onTouchMove={(e) => {
                    if (isDragging && e.cancelable) e.preventDefault();
                    handleCanvasDrag(e);
                }}
                onTouchEnd={() => setIsDragging(null)}
            >
                <div className="relative aspect-[9/16] h-full max-h-screen max-w-full overflow-hidden shadow-2xl">
                    {mediaPreview && (
                        <Image 
                            src={mediaPreview} 
                            alt="Canvas" 
                            layout="fill" 
                            objectFit="cover" 
                            className="pointer-events-none select-none" 
                        />
                    )}

                    {/* Movable Layers */}
                    <div className="absolute inset-0 pointer-events-none">
                        {noteContent && (
                            <div 
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 min-w-[150px] cursor-grab active:cursor-grabbing pointer-events-auto group/text"
                                style={{ left: `${textPosition.x}%`, top: `${textPosition.y}%` }}
                                onMouseDown={() => setIsDragging({ type: 'text' })}
                                onTouchStart={() => setIsDragging({ type: 'text' })}
                            >
                                <div className="relative">
                                    <p 
                                        className={cn(
                                            "text-white text-2xl font-bold p-3 text-center leading-tight",
                                            textStyle.font === 'serif' ? 'font-serif' : (textStyle.font === 'mono' ? 'font-mono' : 'font-sans'),
                                            textStyle.background === 'solid' ? 'bg-black px-4 py-2 rounded-xl' : (textStyle.background === 'translucent' ? 'bg-black/60 px-4 py-2 rounded-xl' : '')
                                        )} 
                                        style={{ 
                                            textShadow: textStyle.background === 'none' ? '0 2px 10px rgba(0,0,0,0.8)' : 'none',
                                            color: textStyle.color 
                                        }}
                                        onClick={() => setIsTextToolActive(true)}
                                    >
                                        {noteContent}
                                    </p>
                                    <button 
                                        className="absolute -top-2 -right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/text:opacity-100 transition-opacity shadow-lg border border-white/10"
                                        onClick={(e) => { e.stopPropagation(); setNoteContent(''); }}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {stickers.map(s => (
                            <div 
                                key={s.id} 
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 text-5xl select-none pointer-events-auto cursor-grab active:cursor-grabbing group/sticker"
                                style={{ left: `${s.position.x}%`, top: `${s.position.y}%` }}
                                onMouseDown={() => setIsDragging({ type: 'sticker', id: s.id })}
                                onTouchStart={() => setIsDragging({ type: 'sticker', id: s.id })}
                            >
                                <div className="relative">
                                    {s.emoji}
                                    <button 
                                        className="absolute -top-1.5 -right-1.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover/sticker:opacity-100 transition-opacity shadow-lg border border-white/10"
                                        onClick={(e) => { e.stopPropagation(); setStickers(prev => prev.filter(st => st.id !== s.id)); }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {mentions.map(m => (
                            <div 
                                key={m.id} 
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/20 px-3 py-1.5 rounded-full border border-white/30 text-white font-black text-sm shadow-xl pointer-events-auto cursor-grab active:cursor-grabbing group/mention"
                                style={{ left: `${m.position.x}%`, top: `${m.position.y}%` }}
                                onMouseDown={() => setIsDragging({ type: 'mention', id: m.id })}
                                onTouchStart={() => setIsDragging({ type: 'mention', id: m.id })}
                            >
                                <div className="relative">
                                    @{m.username}
                                    <button 
                                        className="absolute -top-2 -right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover/mention:opacity-100 transition-opacity shadow-lg border border-white/10"
                                        onClick={(e) => { e.stopPropagation(); setMentions(prev => prev.filter(mt => mt.id !== m.id)); }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Toolbar Navigation */}
            <header className="absolute top-0 left-0 right-0 z-[100] p-4 flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto">
                    <Button variant="ghost" size="icon" className="text-white h-10 w-10 bg-black/20 rounded-full" onClick={() => router.back()}><ChevronLeft className="h-6 w-6"/></Button>
                </div>

                {/* Vertical Toolbar */}
                <div className="flex flex-col gap-2 pointer-events-auto bg-black/20 p-1.5 rounded-[1.5rem] border border-white/10 shadow-2xl mt-16">
                    <button 
                        className={cn(
                            "flex flex-col items-center justify-center gap-0.5 w-12 h-14 rounded-2xl transition-all active:scale-95 group",
                            isTextToolActive ? "bg-white text-black" : "text-white hover:bg-white/10"
                        )}
                        onClick={() => setIsTextToolActive(true)}
                    >
                        <Type className="h-5 w-5" />
                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Text</span>
                    </button>
                    <button 
                        className="flex flex-col items-center justify-center gap-0.5 w-12 h-14 text-white rounded-2xl transition-all active:scale-95 hover:bg-white/10 group"
                        onClick={() => setIsStickerToolActive(true)}
                    >
                        <Smile className="h-5 w-5" />
                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Emojis</span>
                    </button>
                    <button 
                        className="flex flex-col items-center justify-center gap-0.5 w-12 h-14 text-white rounded-2xl transition-all active:scale-95 hover:bg-white/10 group"
                        onClick={() => setIsMusicToolActive(true)}
                    >
                        <Music className="h-5 w-5" />
                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Music</span>
                    </button>
                    <button 
                        className="flex flex-col items-center justify-center gap-0.5 w-12 h-14 text-white rounded-2xl transition-all active:scale-95 hover:bg-white/10 group"
                        onClick={() => setIsMentionToolActive(true)}
                    >
                        <AtSign className="h-5 w-5" />
                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Link</span>
                    </button>
                    {!mediaPreview && (
                        <div className="flex flex-col gap-1.5 p-1 border-t border-white/10 pt-2 mt-1">
                            {gradientBackgrounds.slice(0, 3).map((bg, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setBackgroundStyle(bg)}
                                    className={cn("w-8 h-8 rounded-full border-2 transition-all", backgroundStyle === bg ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60')}
                                    style={{ background: bg.split(' ')[1] }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Bottom Actions Hub */}
            <footer className="absolute bottom-0 left-0 right-0 p-6 z-[100] flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button 
                        className="w-11 h-11 rounded-full bg-black/20 border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                        onClick={() => mediaInputRef.current?.click()}
                    >
                        <LucideImageIcon className="h-5 w-5" />
                    </button>
                    <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaSelect} />
                    
                    <button 
                        className="w-11 h-11 rounded-full bg-black/20 border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                        onClick={() => toast({ title: "Camera protocol engaged" })}
                    >
                        <Camera className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                     <Button 
                        onClick={openCloseFriendsPicker}
                        className="h-11 rounded-full px-4 bg-black/20 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest gap-2 shadow-2xl"
                    >
                        <Star className="h-3.5 w-3.5 text-green-500 fill-current" />
                        Circles
                    </Button>

                    <Button 
                        onClick={() => handlePublish('public')}
                        disabled={isSubmitting}
                        className="h-11 min-w-[100px] rounded-full bg-zinc-100 hover:bg-zinc-200 text-black font-black uppercase tracking-[0.1em] text-[10px] gap-2 shadow-xl transition-all active:scale-95 border-none"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <>
                                Share
                                <SendHorizonal className="h-3.5 w-3.5" />
                            </>
                        )}
                    </Button>
                </div>
            </footer>

            {/* SUB-TOOL OVERLAYS */}
            
            {/* Text Editor Overlay */}
            {isTextToolActive && (
                <div className="absolute inset-0 z-[200] bg-black/80 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                    <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white h-10 w-10 bg-white/10 rounded-full" onClick={() => setIsTextToolActive(false)}><X className="h-6 w-6"/></Button>
                    <div className="w-full max-w-xl space-y-8 text-center">
                        <div className="flex justify-center items-center gap-2">
                            {['sans', 'serif', 'mono'].map(f => (
                                <button 
                                    key={f} 
                                    className={cn(
                                        "px-4 py-1.5 rounded-full font-black uppercase text-[8px] tracking-widest transition-all",
                                        textStyle.font === f ? "bg-white text-black" : "bg-white/10 text-white border border-white/10"
                                    )}
                                    onClick={() => setTextStyle({...textStyle, font: f as any})}
                                >
                                    {f}
                                </button>
                            ))}
                            <Separator orientation="vertical" className="h-4 bg-white/20 mx-1" />
                            <button 
                                className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                                    textStyle.background !== 'none' ? "bg-white text-black" : "bg-transparent border-white/20 text-white"
                                )}
                                onClick={() => setTextStyle({...textStyle, background: textStyle.background === 'none' ? 'translucent' : (textStyle.background === 'translucent' ? 'solid' : 'none')})}
                            >
                                <Palette className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        
                        <Textarea 
                            autoFocus
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            placeholder="Write your signal..."
                            className={cn(
                                "bg-transparent border-none text-white text-3xl md:text-5xl font-black text-center focus-visible:ring-0 min-h-[200px] shadow-none resize-none p-0",
                                textStyle.font === 'serif' ? 'font-serif' : (textStyle.font === 'mono' ? 'font-mono' : 'font-sans'),
                                textStyle.background === 'solid' ? 'bg-black px-6 py-4 rounded-3xl' : (textStyle.background === 'translucent' ? 'bg-black/60 px-6 py-4 rounded-3xl' : '')
                            )}
                            style={{ color: textStyle.color }}
                        />
                        
                        <div className="flex justify-center gap-2">
                            {['#ffffff', '#000000', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map(c => (
                                <button 
                                    key={c} 
                                    className={cn("w-8 h-8 rounded-full border-2 transition-transform hover:scale-110", textStyle.color === c ? 'border-white scale-110' : 'border-transparent')}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setTextStyle({...textStyle, color: c})}
                                />
                            ))}
                        </div>

                        <Button className="rounded-full px-12 h-12 font-black uppercase text-xs tracking-widest shadow-xl bg-white text-black hover:bg-white/90" onClick={() => setIsTextToolActive(false)}>Done</Button>
                    </div>
                </div>
            )}

            {/* Music Picker Overlay */}
            {isMusicToolActive && (
                <div className="absolute inset-0 z-[200] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom-full duration-500">
                    <header className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-2xl font-headline font-bold text-white">Archives Audio</h3>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Premium Soundtrack Node</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white h-10 w-10 bg-white/10 rounded-full" onClick={() => setIsMusicToolActive(false)}><X className="h-5 w-5"/></Button>
                    </header>
                    <SongSearch onSongSelect={(song) => { setSelectedSong(song); setIsMusicToolActive(false); }} />
                    {selectedSong && (
                        <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3 animate-in zoom-in-95">
                            <Avatar className="h-12 w-12 rounded-xl">
                                <AvatarImage src={selectedSong.cover} />
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-bold text-white text-sm">{selectedSong.title}</p>
                                <p className="text-[10px] text-white/50">{selectedSong.artist}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-white/40 h-8 w-8" onClick={() => setSelectedSong(null)}><X className="h-4 w-4"/></Button>
                        </div>
                    )}
                </div>
            )}

            {/* Sticker Picker Overlay */}
            {isStickerToolActive && (
                <div className="absolute inset-0 z-[200] bg-black/95 flex flex-col animate-in slide-in-from-bottom-full duration-500">
                    <header className="flex justify-between items-center p-6 border-b border-white/10">
                        <h3 className="text-2xl font-headline font-bold text-white">Visual Codes</h3>
                        <Button variant="ghost" size="icon" className="text-white h-10 w-10 bg-white/10 rounded-full" onClick={() => setIsStickerToolActive(false)}><X className="h-5 w-5"/></Button>
                    </header>
                    <div className="flex-1 overflow-hidden">
                        <EmojiPicker 
                            onEmojiClick={addSticker} 
                            width="100%" 
                            height="100%" 
                            theme={'dark' as any}
                            searchPlaceHolder="Search visual archives..."
                        />
                    </div>
                </div>
            )}

            {/* Mention Hub Overlay */}
            {isMentionToolActive && (
                <div className="absolute inset-0 z-[200] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom-full duration-500">
                    <header className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-headline font-bold text-white">Mention Node</h3>
                        <Button variant="ghost" size="icon" className="text-white h-10 w-10 bg-white/10 rounded-full" onClick={() => setIsMentionToolActive(false)}><X className="h-5 w-5"/></Button>
                    </header>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input 
                            placeholder="Find author node..." 
                            value={mentionSearch} 
                            onChange={e => handleMentionSearch(e.target.value)}
                            className="pl-10 h-14 rounded-2xl bg-white/10 border-white/20 text-white font-bold focus-visible:ring-primary/40 shadow-inner"
                            autoFocus
                        />
                    </div>
                    <ScrollArea className="flex-1 mt-6">
                        <div className="space-y-2">
                            {searchedUsers.map(u => (
                                <div 
                                    key={u.id} 
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all group"
                                    onClick={() => addMention(u)}
                                >
                                    <Avatar className="h-10 w-10 border border-white/10">
                                        <AvatarImage src={u.avatarUrl} />
                                        <AvatarFallback>{u.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white text-sm truncate">@{u.username}</p>
                                        <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest truncate">{u.displayName}</p>
                                    </div>
                                    <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Close Friends Tagger Overlay */}
            {isCloseFriendsPickerOpen && (
                <div className="absolute inset-0 z-[300] bg-black/95 p-6 flex flex-col animate-in fade-in zoom-in-95 duration-500">
                    <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-3xl font-headline font-bold text-white flex items-center gap-2">
                                <Star className="h-8 w-8 text-green-500 fill-current" />
                                Circle
                            </h3>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Private Archival Access</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white h-10 w-10 bg-white/10 rounded-full" onClick={() => setIsCloseFriendsPickerOpen(false)}><X className="h-5 w-5"/></Button>
                    </header>

                    <ScrollArea className="flex-1">
                        {isLoadingFollowers ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>
                        ) : followers.length > 0 ? (
                            <div className="space-y-2">
                                {followers.map(f => {
                                    const isSelected = user?.closeFriendIds?.includes(f.id);
                                    return (
                                        <div 
                                            key={f.id} 
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/40 transition-all cursor-pointer group"
                                            onClick={() => handleToggleCF(f.id)}
                                        >
                                            <Avatar className="h-10 w-10 border border-white/10">
                                                <AvatarImage src={f.avatarUrl} />
                                                <AvatarFallback>{f.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-sm truncate">@{f.username}</p>
                                                <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest truncate">{f.displayName}</p>
                                            </div>
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-green-500 border-green-500 text-white" : "border-white/20 text-transparent"
                                            )}>
                                                <Check className="h-3 w-3" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-white/20 italic bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                                <p className="text-sm px-10">Network protocol requires mutual signal following to establish a private circle.</p>
                            </div>
                        )}
                    </ScrollArea>

                    <div className="pt-6 border-t border-white/10">
                        <Button 
                            onClick={() => {
                                setIsCloseFriendsPickerOpen(false);
                                handlePublish('close-friends');
                            }} 
                            className="w-full rounded-2xl h-14 bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95"
                        >
                            Sync Circle Signal
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
