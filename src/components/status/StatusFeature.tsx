

'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Poll, Story, Song, TextOverlayStyle, ThreadPost } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Camera, Send, X, Vote, Trash2, RotateCcw, Archive, Wand2, Music, Pause, Play, Feather, MessageSquare, ArrowRight, Link as LinkIcon, Save, Settings, Text, Image as ImageIcon, BarChart2, Users, BookOpen, CheckCircle, HelpCircle, Sparkles as SparklesIcon, PenSquare, Bold, Italic, Type, Palette, AlignLeft, AlignCenter, AlignRight, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusCaptions, getConversationStarters } from '@/app/actions/aiActions';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import StatusViewer from './StatusViewer';
import { Textarea } from '../ui/textarea';
import SongSearch, { LyricCarousel } from './SongSearch';
import Link from 'next/link';
import { Switch } from '../ui/switch';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import VinylPlayer from './VinylPlayer';
import type { CarouselApi } from "@/components/ui/carousel"
import { createThreadPost } from '@/app/actions/threadActions';


const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const gradientBackgrounds = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
  'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600',
  'bg-gradient-to-br from-yellow-200 via-green-200 to-green-500',
  'bg-gradient-to-br from-red-200 via-red-300 to-yellow-200',
  'bg-gradient-to-br from-sky-400 to-sky-200',
];


function StatusBubble({ user, statuses, onSelect, latestStatus }: { user: User, statuses: StatusUpdate[], onSelect: (user: User) => void, latestStatus: StatusUpdate | null }) {
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
            !isNoteWithSong && "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500"
        )}>
            <Avatar className="w-full h-full border-2 border-background">
            <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
            <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
            </Avatar>
        </div>
        
        {isNoteWithSong && (
           <div className="absolute -top-1 -right-1 z-10 w-6 h-6 bg-card border-2 border-background rounded-full flex items-center justify-center shadow-md">
              <Music className="h-3 w-3 text-muted-foreground" />
           </div>
        )}
      </div>
      <p className="text-xs mt-1 truncate">{isOwn ? 'Your Status' : user.displayName}</p>
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
  const [draftStatuses, setDraftStatuses] = useState<StatusUpdate[]>([]);
  const [groupedStatuses, setGroupedStatuses] = useState<Map<string, {user: User, statuses: StatusUpdate[]}>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showPollCreator, setShowPollCreator] = useState(false);
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

  const [textOverlayPosition, setTextOverlayPosition] = useState({ x: 50, y: 50 }); // Center in percentage
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

    // Query for published, non-hidden, non-expired statuses
    const publishedQuery = query(
      collection(db, 'statusUpdates'),
      where('status', '==', 'published'),
      where('isHidden', '==', false),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc') // Example ordering
    );
    
    // Query for the current user's drafts
    const draftsQuery = query(
        collection(db, 'statusUpdates'),
        where('authorId', '==', user.id),
        where('status', '==', 'draft'),
        orderBy('createdAt', 'desc')
    );

    const unsubPublished = onSnapshot(publishedQuery, (snapshot) => {
        const liveStatuses = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate))
            .filter(s => {
                if (s.visibility === 'close-friends' && user && !user.closeFriendIds?.includes(s.authorId) && s.authorId !== user.id) {
                    return false;
                }
                return s.expiresAt && (s.expiresAt as Timestamp).toMillis() > Date.now()
            });
        
        liveStatuses.sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            const timeB = b.createdAt ? (b.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
            return timeB - timeA;
        });
        
        setAllStatuses(liveStatuses);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching published statuses: ", error);
        setIsLoading(false);
    });

    const unsubDrafts = onSnapshot(draftsQuery, (snapshot) => {
        setDraftStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
    }, (error) => {
        console.error("Error fetching draft statuses: ", error);
    });

    return () => {
        unsubPublished();
        unsubDrafts();
    };
  }, [user]);

  useEffect(() => {
    const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
    const newStatusOrder: string[] = [];

    // Prioritize current user's status bubble
    if (user && !user.isAnonymous) {
      const currentUserLive = allStatuses.filter(s => s.authorId === user.id);
      if (currentUserLive.length > 0) {
          groups.set(user.id, { user: user as User, statuses: currentUserLive });
          newStatusOrder.push(user.id);
      }
    }
    
    allStatuses.forEach(status => {
        if (status.authorId === user?.id) return; // Already handled
        if (!groups.has(status.authorId)) {
            groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
            newStatusOrder.push(status.authorId);
        }
        groups.get(status.authorId)!.statuses.push(status);
    });

    setGroupedStatuses(groups);
    setStatusOrder(newStatusOrder);
  }, [allStatuses, user]);


  const handleSelectUser = (selectedUser: User) => {
    if (!user || user.isAnonymous) {
        router.push('/auth/signin');
        return;
    }

    const userHasStatuses = groupedStatuses.has(selectedUser.id) && groupedStatuses.get(selectedUser.id)!.statuses.length > 0;
    if (userHasStatuses) {
        setSelectedUserForViewing(selectedUser);
        setIsViewerOpen(true);
    } else {
        setIsCreatorOpen(true);
    }
  }

  const handleNextUser = () => {
    const currentIndex = statusOrder.findIndex(id => id === selectedUserForViewing?.id);
    if (currentIndex > -1 && currentIndex < statusOrder.length - 1) {
        const nextUserId = statusOrder[currentIndex + 1];
        setSelectedUserForViewing(groupedStatuses.get(nextUserId)!.user);
    } else {
        setIsViewerOpen(false);
    }
  };
  const handlePrevUser = () => {
    const currentIndex = statusOrder.findIndex(id => id === selectedUserForViewing?.id);
    if (currentIndex > 0) {
        const prevUserId = statusOrder[currentIndex - 1];
        setSelectedUserForViewing(groupedStatuses.get(prevUserId)!.user);
    } else {
         setIsViewerOpen(false);
    }
  }

  const resetUploader = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setTextOverlay('');
    setNoteContent('');
    setSelectedSong(null);
    setSongLyricSnippet(null);
    setShowPollCreator(false);
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
  }
  
  const handleTabChange = (value: string) => {
    setActiveUploaderTab(value);
  };

  const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        toast({ title: "Media File Too Large", description: `Please select a file smaller than ${MAX_MEDIA_SIZE_BYTES / (1024*1024)}MB.`, variant: "destructive" });
        return;
      }
      setMediaFile(file);
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'video' : 'image');
      setIsPreviewPlaying(isVideo);

      const reader = new FileReader();
      reader.onload = (event) => {
        setMediaPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handlePreviewPlayToggle = () => {
    if (previewVideoRef.current) {
        if (previewVideoRef.current.paused) {
            previewVideoRef.current.play();
            setIsPreviewPlaying(true);
        } else {
            previewVideoRef.current.pause();
            setIsPreviewPlaying(false);
        }
    }
  };
  
  const createBaseStatus = (status: 'published' | 'draft') => {
    if (!user) return null;
    const authorInfo = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
    
    let expiryTime = null;
    if (status === 'published') {
        const durationHours = parseInt(expiryDuration, 10);
        expiryTime = Timestamp.fromMillis(Date.now() + durationHours * 60 * 60 * 1000);
    }

    return {
        authorId: user.id,
        authorInfo: authorInfo,
        createdAt: editingDraft?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        status,
        expiresAt: expiryTime,
        isHidden: false,
        visibility: statusVisibility,
    };
  };

  const handleSubmit = async (destination: 'status' | 'feed', status: 'published' | 'draft', data: Record<string, any>) => {
    if (!user) return;
    setIsSubmitting(true);

    if (destination === 'feed') {
        if (status === 'draft') {
            toast({ title: "Not Supported", description: "Saving feed posts as drafts is not yet supported.", variant: "default" });
            setIsSubmitting(false);
            return;
        }

        const postData = {
            author: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
            content: data.note || '',
            type: 'original' as const,
            imageUrl: data.mediaUrl || undefined,
            storyId: data.sharedStoryId || undefined,
            storyTitle: data.storyTitle || undefined,
            storyCoverUrl: data.storyCoverUrl || undefined,
            songUrl: data.spotifyUrl || undefined,
            songLyricSnippet: data.songLyricSnippet || undefined,
        };

        const result = await createThreadPost(postData as Omit<ThreadPost, 'id' | 'timestamp' | 'commentsCount'>);

        if (result.success) {
            toast({ title: 'Posted to Feed!' });
            setIsUploaderOpen(false);
            resetUploader();
        } else {
            toast({ title: "Failed to post to feed", description: result.error, variant: "destructive" });
        }
    } else { // destination === 'status'
        const baseStatus = createBaseStatus(status);
        if (!baseStatus) {
             setIsSubmitting(false);
             return;
        }
        const statusData = { ...baseStatus, ...data };
        
        try {
            if(editingDraft) {
                await updateDoc(doc(db, "statusUpdates", editingDraft.id), statusData);
                toast({ title: `Draft updated and ${status}!` });
            } else {
                await addDoc(collection(db, 'statusUpdates'), statusData);
                toast({ title: `Status ${status === 'published' ? 'Published!' : 'Saved as Draft!'}` });
            }
            setIsUploaderOpen(false);
            resetUploader();
        } catch (error) {
            console.error("Error saving status:", error);
            toast({ title: "Failed to save status", variant: "destructive"});
        }
    }
    setIsSubmitting(false);
  };
  
  const handleTextSubmit = async (status: 'published' | 'draft') => {
    if (!noteContent.trim()) {
        toast({ title: "Text is empty", description: "Please write something.", variant: "destructive" });
        return;
    }
    const data: Record<string, any> = {
      note: noteContent.trim(),
      noteStyle,
      backgroundStyle,
    };
    await handleSubmit(postDestination, status, data);
  };
  
  const handleSongSubmit = async (status: 'published' | 'draft') => {
      if (!selectedSong) {
        toast({ title: "No song selected", variant: "destructive" });
        return;
      }
      const data: Record<string, any> = {
          spotifyUrl: `https://open.spotify.com/track/${selectedSong.id}`,
          note: noteContent.trim() || '',
          songLyricSnippet: songLyricSnippet || '',
          vibeTags: vibeTags.split(',').map(t => t.trim()).filter(Boolean),
          dynamicBgColor,
      };
      await handleSubmit(postDestination, status, data);
  }

  const handlePollSubmit = async (status: 'published' | 'draft') => {
    if (postDestination === 'feed') {
        toast({ title: "Not Supported", description: "Polls can only be posted as a Status.", variant: "default" });
        return;
    }
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
      toast({ title: 'Poll is incomplete', description: 'Please fill out the question and all options.', variant: 'destructive'});
      return;
    }
     const data: Record<string, any> = {
        poll: {
            question: pollQuestion.trim(),
            options: pollOptions.map((opt, index) => ({ id: `opt${index + 1}`, text: opt.trim(), votes: [] }))
        }
    };
    await handleSubmit('status', status, data);
  }


  const handleMediaSubmit = async (status: 'published' | 'draft') => {
    if (!mediaFile && !editingDraft?.mediaUrl) {
      toast({title: "No Media", description: "Please select a file to submit.", variant: "destructive"});
      return;
    }

    setIsSubmitting(true);
    let mediaUrl = editingDraft?.mediaUrl || '';

    if (mediaFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) {
            toast({ title: 'Configuration Error', description: 'Cloudinary environment variables are not set.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        
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
    }

    const data: { [key: string]: any } = {
        mediaUrl: mediaUrl,
        mediaType: mediaType,
    };
    
    if (textOverlay.trim()) {
        data.textOverlay = textOverlay.trim();
        data.textOverlayStyle = textOverlayStyle;
        data.textOverlayPosition = textOverlayPosition;
    }
    
    setIsSubmitting(false);
    await handleSubmit(postDestination, status, data);
  };
  
  const handleShareStorySubmit = async (status: 'published' | 'draft') => {
    if (!attachedStory) {
      toast({ title: 'No Story Attached', description: 'Please select a story to share.', variant: 'destructive' });
      return;
    }
    const data: Record<string, any> = {
      sharedStoryId: attachedStory.id,
      note: noteContent.trim() || '', // Optional note
      storyTitle: attachedStory.title,
      storyCoverUrl: attachedStory.coverImageUrl,
    };
    await handleSubmit(postDestination, status, data);
  };
  
  const handleTeaserSubmit = async (status: 'published' | 'draft') => {
    if (postDestination === 'feed') {
        toast({ title: "Not Supported", description: "Teasers can only be posted as a Status.", variant: "default" });
        return;
    }
    if (!attachedStory) {
      toast({ title: 'No Story Attached', description: 'Please select a story to tease.', variant: 'destructive' });
      return;
    }
    if (!noteContent.trim()) {
        toast({ title: "Teaser is empty", description: "Please write a teaser message.", variant: "destructive" });
        return;
    }
    const data: Record<string, any> = {
      sharedStoryId: attachedStory.id,
      note: noteContent.trim(),
    };
    await handleSubmit('status', status, data);
  };

  const handleGenerateCaptions = () => {
    if (!mediaPreview) return;
    startCaptionTransition(async () => {
        const result = await getStatusCaptions({ photoDataUri: mediaPreview });
        if ('error' in result) {
            toast({ title: "AI Error", description: result.error, variant: "destructive" });
        } else {
            setSuggestedCaptions(result.captions);
        }
    });
  }

  const handleGenerateStarters = () => {
    startStarterTransition(async () => {
        const result = await getConversationStarters({});
        if ('error' in result) {
            toast({ title: "AI Error", description: result.error, variant: "destructive" });
        } else if (result.starters.length > 0) {
            setNoteContent(result.starters[Math.floor(Math.random() * result.starters.length)]);
        }
    });
  };
  
  const handleOpenCreatorMenu = () => {
      if (!user || user.isAnonymous) {
          router.push('/auth/signin');
          return;
      }
      setIsCreatorOpen(true);
  }

  const handleOpenUploader = (defaultTab: string) => {
    setIsCreatorOpen(false); // Close the menu
    setActiveUploaderTab(defaultTab);
    setIsUploaderOpen(true);
  };
  
    const handleSearchStories = async () => {
    if (!storySearchTerm.trim() || !user) return;
    setIsSearchingStories(true);
    try {
      const storiesRef = collection(db, 'stories');
      const q = query(
        storiesRef,
        where('author.id', '==', user.id),
        where('title', '>=', storySearchTerm),
        where('title', '<=', storySearchTerm + '\uf8ff'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      setStorySearchResults(results);
    } catch (error) {
      console.error("Error searching stories:", error);
      toast({ title: "Search failed.", variant: "destructive" });
    } finally {
      setIsSearchingStories(false);
    }
  };

  const handleTextDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !mediaContainerRef.current) return;

    const containerRect = mediaContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let x = ((clientX - containerRect.left) / containerRect.width) * 100;
    let y = ((clientY - containerRect.top) / containerRect.height) * 100;

    // Clamp values to be within the container
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setTextOverlayPosition({ x, y });
  };
  
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const UploaderFooter = ({ onSaveDraft, onPublish, draftDisabled, publishDisabled, showDraft = true }: { onSaveDraft: () => void, onPublish: () => void, draftDisabled?: boolean, publishDisabled?: boolean, showDraft?: boolean }) => (
    <DialogFooter className="flex-row justify-between items-center p-4 border-t">
      <div className="flex items-center gap-2">
        <Label htmlFor="destination-switch" className={cn("text-sm transition-colors", postDestination === 'status' ? 'text-foreground font-semibold' : 'text-muted-foreground')}>Status</Label>
        <Switch
          id="destination-switch"
          checked={postDestination === 'feed'}
          onCheckedChange={(checked) => setPostDestination(checked ? 'feed' : 'status')}
          disabled={isSubmitting}
        />
        <Label htmlFor="destination-switch" className={cn("text-sm transition-colors", postDestination === 'feed' ? 'text-foreground font-semibold' : 'text-muted-foreground')}>Feed</Label>
      </div>
      <div className="flex items-center gap-2">
          {showDraft && <Button variant="ghost" onClick={onSaveDraft} disabled={isSubmitting || draftDisabled}>Save Draft</Button>}
          <Button onClick={onPublish} disabled={isSubmitting || publishDisabled}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
          </Button>
      </div>
    </DialogFooter>
  );


  const uploaderContent = () => {
    switch (activeUploaderTab) {
      case 'text':
        return (
          <>
            <div className={cn("py-4 space-y-4 flex-grow flex flex-col justify-center items-center text-white", backgroundStyle)}>
              <Textarea
                  placeholder={`What's on your mind, ${user?.displayName || user?.username}?`}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className={cn(
                    "flex-grow bg-transparent border-0 focus-visible:ring-0 p-4 resize-none shadow-none text-center flex items-center justify-center",
                    noteStyle.font === 'serif' ? 'font-serif' : (noteStyle.font === 'mono' ? 'font-mono' : 'font-sans'),
                    noteStyle.alignment === 'left' ? 'text-left' : (noteStyle.alignment === 'right' ? 'text-right' : 'text-center'),
                    noteContent.length < 50 ? 'text-3xl' : 'text-xl',
                  )}
              />
              <div className="flex gap-2 p-2 bg-black/20 rounded-full items-center">
                <Popover>
                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white"><Type/></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                        <div className='flex gap-1'>
                            <Button variant={noteStyle.font === 'sans' ? 'secondary' : 'ghost'} size="sm" onClick={() => setNoteStyle(s=>({...s, font: 'sans'}))}>Sans</Button>
                            <Button variant={noteStyle.font === 'serif' ? 'secondary' : 'ghost'} size="sm" onClick={() => setNoteStyle(s=>({...s, font: 'serif'}))}>Serif</Button>
                            <Button variant={noteStyle.font === 'mono' ? 'secondary' : 'ghost'} size="sm" onClick={() => setNoteStyle(s=>({...s, font: 'mono'}))}>Mono</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                 <Popover>
                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white"><AlignCenter/></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                        <div className='flex gap-1'>
                            <Button variant={noteStyle.alignment === 'left' ? 'secondary' : 'ghost'} size="icon" onClick={() => setNoteStyle(s=>({...s, alignment: 'left'}))}><AlignLeft/></Button>
                            <Button variant={noteStyle.alignment === 'center' ? 'secondary' : 'ghost'} size="icon" onClick={() => setNoteStyle(s=>({...s, alignment: 'center'}))}><AlignCenter/></Button>
                            <Button variant={noteStyle.alignment === 'right' ? 'secondary' : 'ghost'} size="icon" onClick={() => setNoteStyle(s=>({...s, alignment: 'right'}))}><AlignRight/></Button>
                        </div>
                    </PopoverContent>
                </Popover>
                 <Popover>
                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white"><Palette/></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                        <div className="flex gap-2 p-1 bg-black/20 rounded-full">
                            <button
                            onClick={() => setBackgroundStyle('')}
                            className={cn("w-6 h-6 rounded-full bg-background border-2", backgroundStyle === '' ? 'border-primary' : 'border-transparent')}
                            />
                            {gradientBackgrounds.map(bg => (
                            <button
                                key={bg}
                                onClick={() => setBackgroundStyle(bg)}
                                className={cn("w-6 h-6 rounded-full border-2", bg, backgroundStyle === bg ? 'border-primary' : 'border-transparent')}
                            />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="text-white" onClick={handleGenerateStarters} disabled={isGeneratingStarters}>
                    {isGeneratingStarters ? <Loader2 className="h-4 w-4 animate-spin"/> : <SparklesIcon className="h-4 w-4" />}
                </Button>
                 <Button variant="ghost" size="icon" className="text-white" onClick={() => alert('Quote mode coming soon!')}><MessageSquare className="h-4 w-4"/></Button>
              </div>
            </div>
            <UploaderFooter
              onSaveDraft={() => handleTextSubmit('draft')}
              onPublish={() => handleTextSubmit('published')}
              draftDisabled={!noteContent.trim()}
              publishDisabled={!noteContent.trim()}
              showDraft={postDestination === 'status'}
            />
          </>
        );
      case 'media':
        const textStyle = {
            fontFamily: textOverlayStyle.font === 'serif' ? 'Georgia, serif' : (textOverlayStyle.font === 'mono' ? 'monospace' : 'inherit'),
            color: textOverlayStyle.color,
            textAlign: textOverlayStyle.alignment,
            textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
            backgroundColor: textOverlayStyle.background === 'solid' ? 'rgba(0,0,0,0.7)' : (textOverlayStyle.background === 'translucent' ? 'rgba(0,0,0,0.4)' : 'transparent'),
            padding: textOverlayStyle.background !== 'none' ? '0.25rem 0.5rem' : '0',
            borderRadius: textOverlayStyle.background !== 'none' ? '0.375rem' : '0'
        };

        return (
          <>
             <div className="flex-grow flex flex-col bg-black justify-center items-center">
              {mediaPreview ? (
                <div 
                    ref={mediaContainerRef}
                    className="relative w-full h-full flex flex-col"
                    onMouseMove={handleTextDrag}
                    onTouchMove={handleTextDrag}
                    onMouseUp={handleDragEnd}
                    onTouchEnd={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                >
                  {/* Media Preview */}
                  <div className="flex-grow relative flex items-center justify-center" onClick={() => mediaInputRef.current?.click()}>
                    {mediaType === 'video' ? (
                      <video ref={previewVideoRef} src={mediaPreview} className={cn("max-h-full max-w-full object-contain", selectedFilter)} loop playsInline autoPlay muted={isMuted} />
                    ) : (
                      <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="contain" className={cn(selectedFilter)} />
                    )}
                    {/* Draggable Text Overlay */}
                    <div
                      ref={textDraggableRef}
                      className="absolute cursor-move p-2"
                      style={{
                          left: `${textOverlayPosition.x}%`,
                          top: `${textOverlayPosition.y}%`,
                          transform: `translate(-50%, -50%)`,
                          minWidth: '50px',
                      }}
                      onMouseDown={handleDragStart}
                      onTouchStart={handleDragStart}
                    >
                        <Textarea
                            placeholder="Add text..." 
                            value={textOverlay}
                            onChange={(e) => setTextOverlay(e.target.value)}
                            className="bg-transparent border-none focus-visible:ring-0 p-0 shadow-none resize-none min-h-0 h-auto"
                            style={textStyle}
                        />
                    </div>
                  </div>

                  {/* Top Toolbar */}
                   <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white bg-black/50 hover:bg-black/70 hover:text-white"><Type className="h-5 w-5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 space-y-4">
                            <div className='space-y-2'>
                                <Label>Font</Label>
                                <RadioGroup value={textOverlayStyle.font} onValueChange={(v) => setTextOverlayStyle(s => ({...s, font: v as any}))} className='grid grid-cols-3 gap-1'>
                                    <Label className='border p-2 rounded-md text-center font-sans cursor-pointer data-[state=checked]:border-primary' htmlFor='font-sans-2'>Sans</Label><RadioGroupItem value='sans' id='font-sans-2' className='sr-only'/>
                                    <Label className='border p-2 rounded-md text-center font-serif cursor-pointer data-[state=checked]:border-primary' htmlFor='font-serif-2'>Serif</Label><RadioGroupItem value='serif' id='font-serif-2' className='sr-only'/>
                                    <Label className='border p-2 rounded-md text-center font-mono cursor-pointer data-[state=checked]:border-primary' htmlFor='font-mono-2'>Mono</Label><RadioGroupItem value='mono' id='font-mono-2' className='sr-only'/>
                                </RadioGroup>
                            </div>
                            <div className='space-y-2'>
                                <Label>Alignment</Label>
                                <RadioGroup value={textOverlayStyle.alignment} onValueChange={(v) => setTextOverlayStyle(s => ({...s, alignment: v as any}))} className='grid grid-cols-3 gap-1'>
                                    <Label className='border p-2 rounded-md flex justify-center cursor-pointer data-[state=checked]:border-primary' htmlFor='align-left-2'><AlignLeft/></Label><RadioGroupItem value='left' id='align-left-2' className='sr-only'/>
                                    <Label className='border p-2 rounded-md flex justify-center cursor-pointer data-[state=checked]:border-primary' htmlFor='align-center-2'><AlignCenter/></Label><RadioGroupItem value='center' id='align-center-2' className='sr-only'/>
                                    <Label className='border p-2 rounded-md flex justify-center cursor-pointer data-[state=checked]:border-primary' htmlFor='align-right-2'><AlignRight/></Label><RadioGroupItem value='right' id='align-right-2' className='sr-only'/>
                                </RadioGroup>
                            </div>
                             <div className='space-y-2'>
                                <Label>Background</Label>
                                <RadioGroup value={textOverlayStyle.background} onValueChange={(v) => setTextOverlayStyle(s => ({...s, background: v as any}))} className='grid grid-cols-3 gap-1'>
                                    <Label className='border p-2 rounded-md text-center cursor-pointer data-[state=checked]:border-primary' htmlFor='bg-none'>None</Label><RadioGroupItem value='none' id='bg-none' className='sr-only'/>
                                    <Label className='border p-2 rounded-md text-center cursor-pointer data-[state=checked]:border-primary bg-black/40 text-white' htmlFor='bg-trans'>Shadow</Label><RadioGroupItem value='translucent' id='bg-trans' className='sr-only'/>
                                    <Label className='border p-2 rounded-md text-center cursor-pointer data-[state=checked]:border-primary bg-black text-white' htmlFor='bg-solid'>Solid</Label><RadioGroupItem value='solid' id='bg-solid' className='sr-only'/>
                                </RadioGroup>
                            </div>
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-white bg-black/50 hover:bg-black/70 hover:text-white"><Palette className="h-5 w-5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1">
                          <div className="flex gap-1">
                             {photoFilters.map(filter => (
                                <button key={filter.name} onClick={() => setSelectedFilter(filter.style)} className={cn("w-10 h-10 rounded-md overflow-hidden border-2", selectedFilter === filter.style ? "border-primary" : "border-transparent")}>
                                    <Image src={mediaPreview || ''} alt={filter.name} width={40} height={40} className={cn("object-cover", filter.style)} />
                                </button>
                             ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" className="text-white bg-black/50 hover:bg-black/70 hover:text-white" onClick={handleGenerateCaptions} disabled={isGeneratingCaptions}>
                        {isGeneratingCaptions ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                      </Button>
                      {mediaType === 'video' && (
                        <>
                          <Button variant="ghost" size="icon" className="text-white bg-black/50 hover:bg-black/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}>
                            {isMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
                          </Button>
                          <Button variant="ghost" size="icon" className="bg-black/50 hover:bg-black/70" onClick={handlePreviewPlayToggle}>
                            {isPreviewPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
                          </Button>
                        </>
                      )}
                  </div>


                  {/* Caption Suggestions */}
                  {suggestedCaptions.length > 0 && (
                       <div className="absolute bottom-16 left-0 right-0 w-full flex-shrink-0 p-2 z-20">
                        <ScrollArea>
                            <div className="flex justify-center space-x-2 pb-2">
                                {suggestedCaptions.map((caption, i) => (
                                    <Button key={i} size="sm" variant="secondary" className="h-auto bg-black/50 text-white hover:bg-black/70" onClick={() => setTextOverlay(caption)}>
                                        <p className="whitespace-normal text-xs">{caption}</p>
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                       </div>
                  )}

                </div>
              ) : (
                <div 
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 p-4"
                    onClick={() => mediaInputRef.current?.click()}
                >
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Select photo or video</p>
                    <Input type="file" ref={mediaInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />
                </div>
              )}
            </div>
            <UploaderFooter
              onSaveDraft={() => handleMediaSubmit('draft')}
              onPublish={() => handleMediaSubmit('published')}
              draftDisabled={!mediaFile}
              publishDisabled={!mediaFile}
              showDraft={postDestination === 'status'}
            />
          </>
        );
        case 'song':
          return (
            <>
            <ScrollArea className="flex-grow">
                <div
                    className="flex-grow flex flex-col min-h-full"
                    style={{ backgroundColor: dynamicBgColor || '#121212' }}
                >
                <div className="p-4">
                    <SongSearch onSongSelect={(song) => {
                        setSelectedSong(song);
                        if (song) {
                            const colors = ['#4c1d95', '#be185d', '#047857', '#b45309'];
                            setDynamicBgColor(colors[Math.floor(Math.random() * colors.length)]);
                        } else {
                            setDynamicBgColor(null);
                        }
                    }} />
                </div>

                <div className="flex-grow flex flex-col items-center justify-center p-4 space-y-4">
                    {selectedSong ? (
                        <>
                        <VinylPlayer albumArtUrl={selectedSong.cover} />
                        <div className="w-full max-w-sm pt-4">
                            <LyricCarousel lyrics={selectedSong.lyrics} onSelectLyric={setSongLyricSnippet} selectedLyric={songLyricSnippet} api={carouselApi} setApi={setCarouselApi} />
                        </div>
                         <div className='pt-4 w-full'>
                           <SpotifyPlayer trackUrl={`https://open.spotify.com/track/${selectedSong.id}`} />
                         </div>
                        </>
                    ) : (
                        <div className="text-center text-white/50">
                            <Music className="h-16 w-16 mx-auto" />
                            <p>Search for a song to begin.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 space-y-2 border-t border-white/10 mt-auto flex-shrink-0">
                    <Input 
                        placeholder="Add a personal note... (optional)"
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <Input 
                        placeholder="#vibetags, #writingfuel (optional)"
                        value={vibeTags}
                        onChange={e => setVibeTags(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                </div>
                </div>
            </ScrollArea>
             <UploaderFooter
              onSaveDraft={() => handleSongSubmit('draft')}
              onPublish={() => handleSongSubmit('published')}
              draftDisabled={!selectedSong}
              publishDisabled={!selectedSong}
              showDraft={postDestination === 'status'}
            />
            </>
        );
        case 'poll':
        return (
          <>
            <div className="py-4 px-6 space-y-4 flex-grow flex flex-col bg-gradient-to-br from-primary/10 to-accent/10">
               <Textarea
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    className="text-lg font-semibold bg-transparent border-0 focus-visible:ring-0 p-1 resize-none shadow-none text-center h-28"
                />
                <div className="space-y-3">
                    {pollOptions.map((option, index) => (
                        <div key={index} className="relative">
                            <Input 
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChange={(e) => {
                                    const newOptions = [...pollOptions];
                                    newOptions[index] = e.target.value;
                                    setPollOptions(newOptions);
                                }}
                                className="h-12 text-center"
                             />
                             {pollOptions.length > 2 && (
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}>
                                    <X className="h-4 w-4" />
                                </Button>
                             )}
                        </div>
                    ))}
                    {pollOptions.length < 4 && <Button variant="outline" className="w-full h-12 border-dashed" onClick={() => setPollOptions([...pollOptions, ''])}>Add option</Button>}
                </div>
            </div>
            <UploaderFooter
              onSaveDraft={() => handlePollSubmit('draft')}
              onPublish={() => handlePollSubmit('published')}
              draftDisabled={!pollQuestion.trim()}
              publishDisabled={!pollQuestion.trim() || pollOptions.some(o => !o.trim())}
              showDraft={postDestination === 'status'}
            />
          </>
        );
        case 'share-story':
            return (
                <>
                <div className="p-4 flex-grow flex flex-col gap-4">
                    <h3 className="font-semibold text-center">Share Your Story</h3>
                     <div className="flex gap-2">
                        <Input 
                            placeholder="Search your stories..." 
                            value={storySearchTerm}
                            onChange={(e) => setStorySearchTerm(e.target.value)}
                        />
                        <Button onClick={handleSearchStories} disabled={isSearchingStories}>
                            {isSearchingStories ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                        </Button>
                    </div>
                    <ScrollArea className="flex-grow border rounded-md">
                        <div className="p-2 space-y-1">
                            {(storySearchResults.length > 0 ? storySearchResults : user?.writtenStories || []).map(story => (
                                <div key={story.id} className={cn("p-2 rounded-md flex items-center gap-3 cursor-pointer", attachedStory?.id === story.id ? 'bg-primary/20' : 'hover:bg-muted')} onClick={() => setAttachedStory(story)}>
                                    <Image src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/80/120`} alt={story.title} width={40} height={60} className="rounded-sm object-cover aspect-[2/3]" />
                                    <p className="font-medium text-sm flex-1">{story.title}</p>
                                    {attachedStory?.id === story.id && <CheckCircle className="h-5 w-5 text-primary" />}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <UploaderFooter
                  onSaveDraft={() => handleShareStorySubmit('draft')}
                  onPublish={() => handleShareStorySubmit('published')}
                  draftDisabled={!attachedStory}
                  publishDisabled={!attachedStory}
                  showDraft={postDestination === 'status'}
                />
                </>
            );
        case 'teaser':
            return (
                <>
                <div className="p-4 flex-grow flex flex-col gap-4">
                    <h3 className="font-semibold text-center">Create a Chapter Teaser</h3>
                     <div className="flex gap-2">
                        <Input 
                            placeholder="Search your stories..." 
                            value={storySearchTerm}
                            onChange={(e) => setStorySearchTerm(e.target.value)}
                        />
                        <Button onClick={handleSearchStories} disabled={isSearchingStories}>
                            {isSearchingStories ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                        </Button>
                    </div>
                    <ScrollArea className="h-40 border rounded-md">
                        <div className="p-2 space-y-1">
                            {(storySearchResults.length > 0 ? storySearchResults : user?.writtenStories || []).map(story => (
                                <div key={story.id} className={cn("p-2 rounded-md flex items-center gap-3 cursor-pointer", attachedStory?.id === story.id ? 'bg-primary/20' : 'hover:bg-muted')} onClick={() => setAttachedStory(story)}>
                                    <Image src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/80/120`} alt={story.title} width={40} height={60} className="rounded-sm object-cover aspect-[2/3]" />
                                    <p className="font-medium text-sm flex-1">{story.title}</p>
                                    {attachedStory?.id === story.id && <CheckCircle className="h-5 w-5 text-primary" />}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <Textarea
                        placeholder={attachedStory ? `Write a teaser for "${attachedStory.title}"...` : "Select a story first..."}
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        className="text-base bg-background focus-visible:ring-primary"
                        rows={4}
                        disabled={!attachedStory}
                    />
                </div>
                <UploaderFooter
                  onSaveDraft={() => handleTeaserSubmit('draft')}
                  onPublish={() => handleTeaserSubmit('published')}
                  draftDisabled={!attachedStory || !noteContent.trim()}
                  publishDisabled={!attachedStory || !noteContent.trim()}
                   showDraft={postDestination === 'status'}
                />
                </>
            );
      default:
        return null;
    }
  };
  
  return (
    <div className='py-4'>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start space-x-4">
            {user && !user.isAnonymous && (
               <div className="text-center flex-shrink-0 w-20 cursor-pointer group" onClick={handleOpenCreatorMenu}>
                <div className="relative w-16 h-16 mx-auto">
                    <Avatar className="w-full h-full border-2 border-border group-hover:border-primary/50 transition-colors">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.username?.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-md">
                        <Plus className="h-4 w-4 text-primary-foreground" />
                    </div>
                </div>
                <p className="text-xs mt-1 truncate">Your Status</p>
                </div>
            )}
            
            {isLoading ? (
                [...Array(4)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted animate-pulse mx-auto"></div>
                        <div className="h-2 w-12 bg-muted rounded mt-2 mx-auto animate-pulse"></div>
                    </div>
                ))
            ) : (
                statusOrder.map((userId) => {
                    const group = groupedStatuses.get(userId);
                    if (!group) return null;
                    const latestStatus = group.statuses.sort((a, b) => {
                        const timeA = a.createdAt ? (a.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
                        const timeB = b.createdAt ? (b.createdAt as Timestamp)?.toMillis() ?? 0 : 0;
                        return timeB - timeA;
                    })[0];
                    return <StatusBubble key={userId} user={group.user} statuses={group.statuses} onSelect={handleSelectUser} latestStatus={latestStatus} />
                })
            )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Create a New Status</DialogTitle>
                  <DialogDescription>What would you like to share today?</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('text')}><Text className="h-6 w-6"/>Text</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('media')}><ImageIcon className="h-6 w-6"/>Media</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('teaser')}><PenSquare className="h-6 w-6"/>Teaser</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('song')}><Music className="h-6 w-6"/>Song</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('poll')}><BarChart2 className="h-6 w-6"/>Poll</Button>
                  <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => handleOpenUploader('share-story')}><BookOpen className="h-6 w-6"/>Share Story</Button>
              </div>
          </DialogContent>
      </Dialog>

       <Dialog open={isUploaderOpen} onOpenChange={(open) => { setIsUploaderOpen(open); if(!open) resetUploader(); }}>
          <DialogContent className="p-0 m-0 border-0 w-screen h-[90vh] max-h-[700px] max-w-full sm:max-w-md flex flex-col gap-0 rounded-lg">
            <DialogHeader className="p-4 flex-row items-center justify-between border-b">
                <DialogTitle>Create Post</DialogTitle>
                <div className="flex items-center gap-1">
                    <DialogClose asChild><Button variant="ghost" size="icon"><X className="h-5 w-5"/></Button></DialogClose>
                </div>
            </DialogHeader>
            <div className="flex-grow flex flex-col overflow-hidden">
              {uploaderContent()}
            </div>
             <div className="p-2 border-t bg-background">
                <Tabs value={activeUploaderTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="text"><Text className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="media"><ImageIcon className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="teaser"><PenSquare className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="song"><Music className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="poll"><BarChart2 className="h-5 w-5"/></TabsTrigger>
                        <TabsTrigger value="share-story"><BookOpen className="h-5 w-5"/></TabsTrigger>
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
