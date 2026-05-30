'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, UserSummary } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Pause, Play, VolumeX, Volume2, Trash2, Heart, Repeat, MessageCircle, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';
import { Timestamp, doc, deleteDoc, updateDoc, runTransaction, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

const OWNER_HANDLES = ['arnv'];

export default function StatusViewer({ isOpen, onOpenChange, selectedUser, userStatuses, onNext, onPrev }: { isOpen: boolean, onOpenChange: (open: boolean) => void, selectedUser: User | null, userStatuses: StatusUpdate[], onNext: () => void, onPrev: () => void }) {
    const { user } = useAuth();
    const router = useRouter();
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    // Interaction states
    const [replyMessage, setReplyMessage] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [isReposting, setIsReposting] = useState(false);
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const currentStatus = userStatuses && userStatuses[currentStatusIndex];

    useEffect(() => {
        setCurrentStatusIndex(0);
        setAnimationKey(prev => prev + 1);
        setIsPaused(false);
        setReplyMessage('');
    }, [selectedUser]);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (!isOpen || !userStatuses || userStatuses.length === 0 || isPaused || !currentStatus) return;
        
        const isVideo = currentStatus.mediaType === 'video';
        let duration = 5000;

        const setupTimeout = (videoDuration: number | null) => {
            if (isVideo && videoDuration) {
                duration = videoDuration * 1000;
            }
            timeoutRef.current = setTimeout(() => {
               handleNext();
            }, duration);
        };
        
        if(isVideo) {
            const videoElement = videoRef.current;
            if (videoElement && videoElement.readyState > 0) {
                setupTimeout(videoElement.duration);
            } else if (videoElement) {
                 const onLoadedMetadata = () => setupTimeout(videoElement.duration);
                 videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
                 return () => videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
            } else {
                 setupTimeout(15);
            }
        } else {
            setupTimeout(null);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isOpen, currentStatusIndex, selectedUser, userStatuses, isPaused, currentStatus]);

    const handleNext = () => {
        setAnimationKey(prev => prev + 1);
        setReplyMessage('');
        if (currentStatusIndex < userStatuses.length - 1) {
            setCurrentStatusIndex(prev => prev + 1);
        } else {
            onNext();
        }
    }
    const handlePrev = () => {
        setAnimationKey(prev => prev + 1);
        setReplyMessage('');
        if (currentStatusIndex > 0) {
            setCurrentStatusIndex(prev => prev - 1);
        } else {
            onPrev();
        }
    }

    const togglePause = () => {
        setIsPaused(prev => !prev);
    };

    const handleLike = async () => {
        if (!user || !currentStatus) return;
        setIsLiking(true);
        const statusRef = doc(db, 'statusUpdates', currentStatus.id);
        const reactionRef = doc(db, 'statusUpdates', currentStatus.id, 'reactions', user.id);

        runTransaction(db, async (transaction) => {
            const reactionDoc = await transaction.get(reactionRef);
            const statusDoc = await transaction.get(statusRef);
            if (!statusDoc.exists()) return;

            if (reactionDoc.exists()) {
                transaction.delete(reactionRef);
                transaction.update(statusRef, { 
                    reactionsCount: (statusDoc.data().reactionsCount || 1) - 1,
                    'reactionCounts.love': (statusDoc.data().reactionCounts?.love || 1) - 1
                });
            } else {
                transaction.set(reactionRef, { 
                    type: 'love', 
                    userId: user.id, 
                    timestamp: serverTimestamp(),
                    user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
                });
                transaction.update(statusRef, { 
                    reactionsCount: (statusDoc.data().reactionsCount || 0) + 1,
                    'reactionCounts.love': (statusDoc.data().reactionCounts?.love || 0) + 1
                });
            }
        })
        .then(() => toast({ title: "Signal updated" }))
        .finally(() => setIsLiking(false));
    };

    const handleRepost = async () => {
        if (!user || !currentStatus) return;
        setIsReposting(true);
        try {
            const repostData: any = {
                authorId: user.id,
                authorInfo: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
                status: 'published',
                isHidden: false,
                visibility: 'public',
                repostedFrom: { id: currentStatus.id, authorId: currentStatus.authorId },
                collageLayout: currentStatus.collageLayout || 'single',
            };

            if (currentStatus.images) repostData.images = currentStatus.images;
            if (currentStatus.mediaUrl) {
                repostData.mediaUrl = currentStatus.mediaUrl;
                repostData.mediaType = currentStatus.mediaType;
                repostData.mediaTransform = currentStatus.mediaTransform;
            }
            if (currentStatus.note) repostData.note = currentStatus.note;
            if (currentStatus.backgroundStyle) repostData.backgroundStyle = currentStatus.backgroundStyle;
            if (currentStatus.spotifyUrl) repostData.spotifyUrl = currentStatus.spotifyUrl;
            if (currentStatus.textOverlay) {
                repostData.textOverlay = currentStatus.textOverlay;
                repostData.textOverlayStyle = currentStatus.textOverlayStyle;
                repostData.textOverlayPosition = currentStatus.textOverlayPosition;
            }

            await addDoc(collection(db, 'statusUpdates'), repostData);
            
            // Increment repost count on original
            await updateDoc(doc(db, 'statusUpdates', currentStatus.id), {
                repostsCount: (currentStatus.repostsCount || 0) + 1
            });

            toast({ title: "Reposted to your signal" });
            onOpenChange(false);
        } catch (e) {
            toast({ title: "Repost failed", variant: "destructive" });
        } finally {
            setIsReposting(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !currentStatus || !replyMessage.trim()) return;
        setIsSendingMessage(true);

        try {
            const participants = [user.id, currentStatus.authorId].sort();
            const convsQuery = query(collection(db, 'conversations'), where('participantIds', '==', participants));
            const convsSnap = await getDocs(convsQuery);
            
            let conversationId = '';
            if (convsSnap.empty) {
                const currentUserSummary: UserSummary = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
                const authorSummary: UserSummary = { id: selectedUser!.id, username: selectedUser!.username, displayName: selectedUser!.displayName, avatarUrl: selectedUser!.avatarUrl };
                
                const newConv = await addDoc(collection(db, 'conversations'), {
                    participantIds: participants,
                    participantInfo: { [user.id]: currentUserSummary, [selectedUser!.id]: authorSummary },
                    updatedAt: serverTimestamp(),
                    isGroup: false,
                    lastMessage: { id: '', content: replyMessage.trim(), senderId: user.id, timestamp: serverTimestamp() }
                });
                conversationId = newConv.id;
            } else {
                conversationId = convsSnap.docs[0].id;
            }

            await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
                senderId: user.id,
                content: replyMessage.trim(),
                timestamp: serverTimestamp(),
                type: 'text',
                statusContext: { id: currentStatus.id, thumbnail: currentStatus.mediaUrl || '' }
            });

            await updateDoc(doc(db, 'conversations', conversationId), {
                updatedAt: serverTimestamp(),
                'lastMessage.content': replyMessage.trim(),
                'lastMessage.senderId': user.id,
                'lastMessage.timestamp': serverTimestamp()
            });

            toast({ title: "Message sent!" });
            router.push('/notifications?tab=messages');
            onOpenChange(false);
        } catch (e) {
            toast({ title: "Failed to send message", variant: "destructive" });
        } finally {
            setIsSendingMessage(false);
        }
    };
    
    const handleDeleteStatus = async () => {
        if (!currentStatus || !user) return;
        
        const statusRef = doc(db, 'statusUpdates', currentStatus.id);
        deleteDoc(statusRef)
            .then(() => {
                toast({ title: "Status deleted" });
                if (userStatuses.length === 1) {
                    onOpenChange(false);
                } else {
                    handleNext();
                }
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: statusRef.path,
                    operation: 'delete',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });
    }

    useEffect(() => {
        const videoElement = videoRef.current;
        if (videoElement) {
            if (!isPaused && isOpen) {
                videoElement.play().catch(() => {});
            } else {
                videoElement.pause();
            }
        }
    }, [currentStatus, isPaused, isOpen]);


    if (!selectedUser || !currentStatus) {
        return null;
    }
    
    const isNoteStatus = !!currentStatus.note || !!currentStatus.spotifyUrl;
    const isOwner = user && (OWNER_HANDLES.includes(user.username) || user.id === selectedUser.id);
    const isVideo = currentStatus.mediaType === 'video';

    const textStyle = {
      fontFamily: currentStatus.textOverlayStyle?.font === 'serif' ? 'Georgia, serif' : (currentStatus.textOverlayStyle?.font === 'mono' ? 'monospace' : 'inherit'),
      color: currentStatus.textOverlayStyle?.color || 'white',
      textAlign: currentStatus.textOverlayStyle?.alignment || 'center',
      textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
      backgroundColor: currentStatus.textOverlayStyle?.background === 'solid' ? 'rgba(0,0,0,0.7)' : (currentStatus.textOverlayStyle?.background === 'translucent' ? 'rgba(0,0,0,0.4)' : 'transparent'),
      padding: currentStatus.textOverlayStyle?.background !== 'none' ? '0.25rem 0.5rem' : '0',
      borderRadius: currentStatus.textOverlayStyle?.background !== 'none' ? '0.375rem' : '0'
    };

    const renderCollage = () => {
        if (!currentStatus.images || currentStatus.images.length === 0) return null;
        
        const gridStyles: Record<string, string> = {
            'single': 'grid-cols-1 h-full',
            '2-v': 'grid-cols-2 h-full',
            '2-h': 'grid-rows-2 h-full',
            '3-t': 'grid-cols-2 grid-rows-2 h-full',
            '4-g': 'grid-cols-2 grid-rows-2 h-full'
        };

        const layout = currentStatus.collageLayout || 'single';

        return (
            <div className={cn("grid w-full h-full gap-0.5 bg-black", gridStyles[layout])}>
                {currentStatus.images.map((img, i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "relative overflow-hidden bg-zinc-900",
                            layout === '3-t' && i === 0 && 'col-span-2 row-span-1',
                            layout === 'single' && 'h-full'
                        )}
                        style={layout === 'single' && currentStatus.mediaTransform ? {
                            transform: `translate(${currentStatus.mediaTransform.x}px, ${currentStatus.mediaTransform.y}px) scale(${currentStatus.mediaTransform.scale}) rotate(${currentStatus.mediaTransform.rotation}deg)`
                        } : {}}
                    >
                        <NextImage src={img.url} alt="" fill className="object-cover" />
                    </div>
                ))}
            </div>
        );
    };
    

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 m-0 bg-black border-0 max-w-md h-screen sm:h-[90vh] sm:max-h-[90vh] flex flex-col gap-0 rounded-lg overflow-hidden backdrop-blur-none">
                <DialogHeader className="sr-only">
                    <DialogTitle>Status update from {selectedUser.displayName || selectedUser.username}</DialogTitle>
                    <DialogDescription>A temporary status update from {selectedUser.username}.</DialogDescription>
                </DialogHeader>
                
                {/* Header Controls */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <Avatar className="h-8 w-8 border border-white/20">
                            <AvatarImage src={selectedUser.avatarUrl} />
                            <AvatarFallback>{selectedUser.username?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm font-bold shadow-sm">{selectedUser.displayName || selectedUser.username}</span>
                        <span className="text-white/60 text-[10px] font-bold uppercase tracking-tight">{currentStatus.createdAt ? (currentStatus.createdAt as Timestamp).toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                     <div className="flex items-center gap-1 pointer-events-auto">
                        {isOwner && (
                            <Button variant="ghost" size="icon" className="text-white hover:bg-red-500/20 rounded-full" onClick={(e) => { e.stopPropagation(); handleDeleteStatus(); }}>
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
                        {isVideo && (
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}>
                                {isMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => onOpenChange(false)}>
                              <X className="h-5 w-5"/>
                        </Button>
                     </div>
                </div>

                {/* Progress bars */}
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-30">
                    {userStatuses.map((status, index) => (
                        <div key={index} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                             <div 
                                key={`${animationKey}-${index}`}
                                className={cn(
                                    "h-full bg-white",
                                    index < currentStatusIndex ? 'w-full' : 'w-0',
                                    index === currentStatusIndex && 'animate-width-grow'
                                )}
                                style={{
                                    animationPlayState: isPaused ? 'paused' : 'running',
                                    animationDuration: status.mediaType === 'video' ? '15s' : '5s', 
                                }}
                            ></div>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="relative flex-1 flex items-center justify-center overflow-hidden transform-gpu" onClick={togglePause}>
                    {currentStatus.images && currentStatus.images.length > 0 ? (
                        renderCollage()
                    ) : currentStatus.mediaUrl ? (
                         currentStatus.mediaType === 'video' ? (
                            <video 
                                key={currentStatus.id}
                                ref={videoRef} 
                                src={currentStatus.mediaUrl} 
                                autoPlay 
                                playsInline
                                muted={isMuted}
                                loop
                                className="w-full h-full object-contain" 
                            />
                        ) : (
                            <div 
                                className="relative w-full h-full"
                                style={currentStatus.mediaTransform ? {
                                    transform: `translate(${currentStatus.mediaTransform.x}px, ${currentStatus.mediaTransform.y}px) scale(${currentStatus.mediaTransform.scale}) rotate(${currentStatus.mediaTransform.rotation}deg)`
                                } : {}}
                            >
                                <NextImage src={currentStatus.mediaUrl!} alt="Status Update" fill className="object-contain" priority />
                            </div>
                        )
                    ) : isNoteStatus ? (
                         <div className={cn("absolute inset-0 flex items-center justify-center p-8", currentStatus.backgroundStyle || "bg-zinc-900")}>
                            {currentStatus.note && (
                                <p style={textStyle} className={cn("text-white text-center font-bold whitespace-pre-line shadow-2xl", currentStatus.note.length < 50 ? 'text-3xl' : 'text-xl')}>
                                    {currentStatus.note}
                                </p>
                            )}
                         </div>
                    ) : null}
                    
                    {currentStatus.textOverlay && (
                         <div
                            className="absolute p-4 pointer-events-none"
                            style={{
                                left: `${currentStatus.textOverlayPosition?.x ?? 50}%`,
                                top: `${currentStatus.textOverlayPosition?.y ?? 50}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <p style={textStyle} className="whitespace-pre-line text-lg font-bold shadow-2xl">
                                {currentStatus.textOverlay}
                            </p>
                        </div>
                    )}

                    {currentStatus.spotifyUrl && (
                         <div className={cn(
                             "absolute z-10 w-full px-6 transition-all duration-500",
                             currentStatus.note ? "bottom-24" : "bottom-1/2 translate-y-1/2"
                         )}>
                           <SpotifyPlayer trackUrl={currentStatus.spotifyUrl} />
                        </div>
                    )}
                </div>
                
                {/* Navigation Hotspots */}
                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="absolute left-0 top-1/4 bottom-1/4 w-1/4 z-10 cursor-pointer outline-none"></button>
                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="absolute right-0 top-1/4 bottom-1/4 w-1/4 z-10 cursor-pointer outline-none"></button>

                {/* Interaction Footer */}
                <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pt-10 flex flex-col gap-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-none">
                    <div className="flex items-center gap-3">
                        <form onSubmit={handleSendMessage} className="flex-1 relative group">
                            <Input 
                                value={replyMessage}
                                onChange={e => setReplyMessage(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                                placeholder="Send message..."
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 rounded-full pl-5 pr-10 focus-visible:ring-primary/40 focus:bg-white/20 transition-all border-none shadow-inner"
                            />
                            <button type="submit" disabled={isSendingMessage || !replyMessage.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-primary transition-colors">
                                {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </button>
                        </form>
                        
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="rounded-full h-11 w-11 text-white hover:bg-white/10 active:scale-90 transition-all"
                                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                                disabled={isLiking}
                            >
                                <Heart className={cn("h-6 w-6 transition-all", isLiking && "scale-110", currentStatus.reactionCounts?.love ? "fill-rose-500 text-rose-500" : "")} />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="rounded-full h-11 w-11 text-white hover:bg-white/10 active:scale-90 transition-all"
                                onClick={(e) => { e.stopPropagation(); handleRepost(); }}
                                disabled={isReposting}
                            >
                                {isReposting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Repeat className="h-6 w-6" />}
                            </Button>
                        </div>
                    </div>
                    {/* Safe area padding for mobile */}
                    <div className="h-2" />
                </div>
            </DialogContent>
        </Dialog>
    )
}
