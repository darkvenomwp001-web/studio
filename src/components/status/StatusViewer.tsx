

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X, Pause, Play, Trash2, Feather } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { permanentlyDeleteStatusUpdate } from '@/app/actions/statusActions';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function StatusViewer({ isOpen, onOpenChange, selectedUser, userStatuses, onNext, onPrev, onStatusArchived, onOpenUploader }: { isOpen: boolean, onOpenChange: (open: boolean) => void, selectedUser: User | null, userStatuses: StatusUpdate[], onNext: () => void, onPrev: () => void, onStatusArchived: (userId: string, statusId: string) => void, onOpenUploader: (defaultTab: string) => void }) {
    const { user: currentUser } = useAuth();
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
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
                 videoElement.onloadedmetadata = () => {
                     setupTimeout(videoElement.duration);
                 };
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
            } else if (isPaused) {
                videoElement.pause();
            }
        }
    }, [currentStatus, isPaused, isOpen]);


    const handleDelete = async () => {
        if (!currentUser || !currentStatus) return;
        const result = await permanentlyDeleteStatusUpdate(currentStatus.id, currentUser.id);
        if (result.success) {
            toast({ title: "Status Deleted" });
            onStatusArchived(currentStatus.authorId, currentStatus.id); 
            onOpenChange(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    const handleOpenDrafts = () => {
        onOpenChange(false);
        onOpenUploader('drafts');
    }

    if (!selectedUser || !currentStatus) {
        return null;
    }
    
    const isOwnStatus = currentUser?.id === selectedUser.id;
    
    const isMediaStatus = !!currentStatus.mediaUrl;
    const isNoteStatus = !!currentStatus.note || !!currentStatus.spotifyUrl;

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
                        {isOwnStatus && (
                            <>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={handleOpenDrafts}>
                                    <Feather className="h-5 w-5" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete this status?</AlertDialogTitle>
                                            <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
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
                    {isMediaStatus ? (
                         currentStatus.mediaType === 'video' ? (
                            <video 
                                key={currentStatus.id}
                                ref={videoRef} 
                                src={currentStatus.mediaUrl} 
                                autoPlay 
                                playsInline
                                muted
                                loop
                                className="w-full h-full object-contain" 
                            />
                        ) : (
                            <Image src={currentStatus.mediaUrl!} alt="Status Update" layout="fill" objectFit="contain" />
                        )
                    ) : isNoteStatus ? (
                         <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-black">
                            {currentStatus.note && (
                                <p className="text-white text-center text-2xl font-semibold whitespace-pre-line">
                                    {currentStatus.note}
                                </p>
                            )}
                         </div>
                    ) : null}
                    
                    {currentStatus.textOverlay && (
                        <div className="absolute bottom-10 left-4 right-4 z-10">
                            <p className="text-white text-center text-lg font-semibold bg-black/50 p-2 rounded-md shadow-lg">
                                {currentStatus.textOverlay}
                            </p>
                        </div>
                    )}

                    {currentStatus.spotifyUrl && !currentStatus.note && (
                        <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-green-900 via-gray-900 to-black">
                            <SpotifyPlayer />
                        </div>
                    )}
                     {currentStatus.spotifyUrl && currentStatus.note && (
                         <div className="absolute bottom-10 left-4 right-4 z-10">
                           <SpotifyPlayer />
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
