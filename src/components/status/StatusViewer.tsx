
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, TextOverlayStyle } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X, Pause, Play, VolumeX, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { hideStatusUpdate } from '@/app/actions/statusActions';


export default function StatusViewer({ isOpen, onOpenChange, selectedUser, userStatuses, onNext, onPrev }: { isOpen: boolean, onOpenChange: (open: boolean) => void, selectedUser: User | null, userStatuses: StatusUpdate[], onNext: () => void, onPrev: () => void }) {
    const { user } = useAuth();
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    const currentStatus = userStatuses && userStatuses[currentStatusIndex];

    useEffect(() => {
        setCurrentStatusIndex(0);
        setAnimationKey(prev => prev + 1); // Reset animation
        setIsPaused(false);
    }, [selectedUser]);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (!isOpen || !userStatuses || userStatuses.length === 0 || isPaused || !currentStatus) return;
        
        const isVideo = currentStatus.mediaType === 'video';
        let duration = 5000; // Default for images and notes

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
            if (videoElement && videoElement.readyState > 0) { // If metadata is loaded
                setupTimeout(videoElement.duration);
            } else if (videoElement) {
                 const onLoadedMetadata = () => setupTimeout(videoElement.duration);
                 videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
                 return () => videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
            } else {
                 setupTimeout(15); // Fallback if ref is not ready
            }
        } else {
            setupTimeout(null); // Not a video
        }


        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isOpen, currentStatusIndex, selectedUser, userStatuses, isPaused, currentStatus]);

    const handleNext = () => {
        setAnimationKey(prev => prev + 1);
        if (currentStatusIndex < userStatuses.length - 1) {
            setCurrentStatusIndex(prev => prev + 1);
        } else {
            onNext(); // Move to next user
        }
    }
    const handlePrev = () => {
        setAnimationKey(prev => prev + 1);
        if (currentStatusIndex > 0) {
            setCurrentStatusIndex(prev => prev - 1);
        } else {
            onPrev(); // Move to prev user
        }
    }

    const togglePause = () => {
        setIsPaused(prev => !prev);
    };
    
    useEffect(() => {
        const videoElement = videoRef.current;
        if (videoElement) {
            if (!isPaused && isOpen) {
                videoElement.play().catch(e => console.warn("Video play was interrupted. This is often safe to ignore."));
            } else {
                videoElement.pause();
            }
        }
    }, [currentStatus, isPaused, isOpen]);


    if (!selectedUser || !currentStatus) {
        return null;
    }
    
    const isNoteStatus = !!currentStatus.note || !!currentStatus.spotifyUrl;
    const isOwner = user?.id === selectedUser.id;
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
    

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 m-0 bg-black border-0 max-w-md h-screen sm:h-[90vh] sm:max-h-[90vh] flex flex-col gap-0 rounded-lg">
                <DialogHeader className="sr-only">
                    <DialogTitle>Status update from {selectedUser.displayName}</DialogTitle>
                    <DialogDescription>A temporary status update that disappears after 24 hours. This is status {currentStatusIndex + 1} of {userStatuses.length}.</DialogDescription>
                </DialogHeader>
                <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedUser.avatarUrl} />
                            <AvatarFallback>{selectedUser.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm font-semibold">{selectedUser.displayName}</span>
                        <span className="text-gray-300 text-xs">{currentStatus.createdAt ? (currentStatus.createdAt as Timestamp).toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                     <div className="flex items-center gap-1">
                        {isVideo && (
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}>
                                {isMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={() => onOpenChange(false)}>
                              <X className="h-5 w-5"/>
                        </Button>
                     </div>
                </div>
                {/* Progress bars */}
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
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

                <div className="relative flex-1 flex items-center justify-center overflow-hidden" onClick={togglePause}>
                    {currentStatus.mediaUrl ? (
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
                            <Image src={currentStatus.mediaUrl!} alt="Status Update" layout="fill" objectFit="contain" />
                        )
                    ) : isNoteStatus ? (
                         <div className={cn("absolute inset-0 flex items-center justify-center p-8", currentStatus.backgroundStyle)}>
                            {currentStatus.note && (
                                <p className={cn("text-white text-center font-semibold whitespace-pre-line", currentStatus.note.length < 50 ? 'text-3xl' : 'text-xl')}>
                                    {currentStatus.note}
                                </p>
                            )}
                         </div>
                    ) : null}
                    
                    {currentStatus.textOverlay && (
                         <div
                            className="absolute p-4"
                            style={{
                                left: `${currentStatus.textOverlayPosition?.x ?? 50}%`,
                                top: `${currentStatus.textOverlayPosition?.y ?? 50}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <p style={textStyle} className="whitespace-pre-line text-lg font-semibold shadow-lg">
                                {currentStatus.textOverlay}
                            </p>
                        </div>
                    )}

                    {currentStatus.spotifyUrl && !currentStatus.note && (
                        <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-green-900 via-gray-900 to-black">
                            <SpotifyPlayer trackUrl={currentStatus.spotifyUrl} />
                        </div>
                    )}
                     {currentStatus.spotifyUrl && currentStatus.note && (
                         <div className="absolute bottom-20 left-4 right-4 z-10">
                           <SpotifyPlayer trackUrl={currentStatus.spotifyUrl} />
                        </div>
                    )}
                </div>
                
                 {/* Navigation buttons */}
                <button onClick={handlePrev} className="absolute left-0 top-1/3 bottom-1/3 w-1/2 text-white flex items-center justify-start"></button>
                <button onClick={handleNext} className="absolute right-0 top-1/3 bottom-1/3 w-1/2 text-white flex items-center justify-end"></button>
            </DialogContent>
        </Dialog>
    )
}
