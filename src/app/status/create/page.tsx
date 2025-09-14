
'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Loader2, ArrowLeft, Send, X, Wand2, Music, Users, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Song, StatusUpdate } from '@/types';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getStatusCaptions } from '@/app/actions/aiActions';
import SongSearch from '@/components/status/SongSearch';

const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const photoFilters = [
    { name: 'None', style: 'filter-none' },
    { name: 'Noir', style: 'filter-grayscale-100 contrast-125' },
    { name: 'Vintage', style: 'filter-sepia-60' },
    { name: 'Cold', style: 'filter-hue-rotate-180 saturate-150' },
    { name: 'Vibrant', style: 'filter-saturate-200' },
] as const;


export default function CreateStatusPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { toast } = useToast();

    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [textOverlay, setTextOverlay] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<(typeof photoFilters)[number]['style']>('filter-none');
    
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOption1, setPollOption1] = useState('');
    const [pollOption2, setPollOption2] = useState('');

    const [showMusicSearch, setShowMusicSearch] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
    const [isGeneratingCaptions, startCaptionTransition] = useTransition();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push('/auth/signin');
            return;
        }
        const storedMedia = sessionStorage.getItem('statusMediaPreview');
        const storedMediaFileString = sessionStorage.getItem('statusMediaFile');
        if (storedMedia && storedMediaFileString) {
            setMediaPreview(storedMedia);
            const file = JSON.parse(storedMediaFileString) as {type: string};
            setMediaType(file.type.startsWith('video') ? 'video' : 'image');
            
            // Reconstruct the file object
            fetch(storedMedia).then(res => res.blob()).then(blob => {
                 const reconstructedFile = new File([blob], "status-media", { type: blob.type });
                 setMediaFile(reconstructedFile);
            });

        } else {
            toast({ title: 'No media selected', description: 'Please select a photo or video first.', variant: 'destructive' });
            router.push('/');
        }
        
        // Clean up sessionStorage after use
        return () => {
             sessionStorage.removeItem('statusMediaPreview');
             sessionStorage.removeItem('statusMediaFile');
        }

    }, [user, loading, router, toast]);

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
    };

    const handleSubmit = async (closeFriends: boolean = false) => {
        if (!mediaFile || !user) return;
        
        setIsSubmitting(true);
        toast({ title: "Posting...", description: "Your status is being uploaded." });

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) {
            toast({ title: 'Configuration Error', description: 'Cloudinary environment variables are not set.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        let mediaUrl = '';
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
        
        const authorInfo = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
        const expiryTime = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

        const statusData: Omit<StatusUpdate, 'id'> = {
            authorId: user.id,
            authorInfo,
            mediaUrl,
            mediaType,
            textOverlay: textOverlay.trim() || undefined,
            poll: showPollCreator && pollQuestion.trim() && pollOption1.trim() && pollOption2.trim()
                ? {
                    question: pollQuestion.trim(),
                    options: [
                        { id: 'opt1', text: pollOption1.trim(), votes: [] },
                        { id: 'opt2', text: pollOption2.trim(), votes: [] }
                    ]
                }
                : undefined,
            spotifyUrl: selectedSong ? `https://open.spotify.com/track/${selectedSong.id}` : undefined,
            createdAt: serverTimestamp(),
            expiresAt: expiryTime,
            status: 'published',
            isArchived: false,
            isTrashed: false,
        };
        
        try {
            await addDoc(collection(db, 'statusUpdates'), statusData);
            toast({ title: "Status Published!", description: "Your status is now live." });
            router.push('/');
        } catch (error) {
            console.error("Error saving status to Firestore:", error);
            toast({ title: "Failed to post status", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading || !mediaPreview) {
        return (
            <div className="flex justify-center items-center h-screen bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="bg-background fixed inset-0 flex flex-col">
            <header className="p-4 flex justify-between items-center z-10">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowMusicSearch(!showMusicSearch)}>
                         <Music className="mr-2 h-4 w-4" /> Music
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
                {mediaPreview && (
                    <Image
                        src={mediaPreview}
                        alt="Status preview"
                        layout="fill"
                        objectFit="contain"
                        className={cn("transition-all", selectedFilter)}
                    />
                )}
                <div className="absolute z-10 bottom-24 w-full px-4">
                    <Input
                        type="text"
                        placeholder="Add a caption..."
                        value={textOverlay}
                        onChange={(e) => setTextOverlay(e.target.value)}
                        className="w-full max-w-md mx-auto bg-black/50 text-white text-center border-0 focus-visible:ring-0 placeholder:text-gray-300"
                    />
                </div>
            </main>
            
            {mediaType === 'image' && (
                <div className="p-4 z-10 bg-background/80 backdrop-blur-sm">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex space-x-2 pb-2">
                            {photoFilters.map(filter => (
                                <div key={filter.name} onClick={() => setSelectedFilter(filter.style)} className="text-center cursor-pointer">
                                    <Image src={mediaPreview!} alt={filter.name} width={70} height={70} className={cn("rounded-md object-cover w-16 h-16 sm:w-20 sm:h-20 border-2 transition-all", selectedFilter === filter.style ? 'border-primary' : 'border-transparent', filter.style)} />
                                    <p className="text-xs mt-1">{filter.name}</p>
                                </div>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}
            
            {showMusicSearch && (
                 <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-md p-4 flex flex-col">
                     <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="icon" onClick={() => setShowMusicSearch(false)}><X className="h-5 w-5" /></Button>
                     </div>
                     <SongSearch onSongSelect={setSelectedSong} onLyricSelect={() => {}} />
                </div>
            )}


            <footer className="p-4 z-10">
                <div className="flex justify-between items-center gap-4">
                    <Button variant="secondary" className="flex-1 h-12 text-base" onClick={() => toast({ title: "Coming soon!" })}>
                        <Users className="mr-2 h-5 w-5" />
                        Close Friends
                    </Button>
                    <Button className="flex-1 h-12 text-base bg-primary hover:bg-primary/90" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                        Your Story
                    </Button>
                </div>
            </footer>
        </div>
    );
}
