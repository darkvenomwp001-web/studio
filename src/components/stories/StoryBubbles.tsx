
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { StoryMedia, UserSummary } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, X, ChevronLeft, ChevronRight, UploadCloud, Video, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createStoryMedia } from '@/app/actions/storyActions';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type StoriesGroupedByUser = { [key: string]: { author: UserSummary, stories: StoryMedia[] } };

function StoryViewer({
  groupedStories,
  initialUser,
  onClose,
}: {
  groupedStories: StoriesGroupedByUser;
  initialUser: UserSummary;
  onClose: () => void;
}) {
  const userOrder = Object.keys(groupedStories);
  const [currentUserIndex, setCurrentUserIndex] = useState(userOrder.findIndex(id => id === initialUser.id));
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timer>();

  const currentUserStories = groupedStories[userOrder[currentUserIndex]]?.stories || [];
  const currentStory = currentUserStories[currentStoryIndex];

  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < currentUserStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentUserIndex < userOrder.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, currentUserIndex, currentUserStories.length, userOrder.length, onClose]);

  const goToPrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentUserIndex > 0) {
      const prevUserIndex = currentUserIndex - 1;
      const prevUserStories = groupedStories[userOrder[prevUserIndex]].stories;
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(prevUserStories.length - 1);
    }
  };

  useEffect(() => {
    setProgress(0);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (currentStory?.mediaType === 'image') {
      const DURATION = 5000; // 5 seconds for images
      timeoutRef.current = setTimeout(goToNextStory, DURATION);
      
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          setProgress(Math.min(100, (elapsedTime / DURATION) * 100));
      }, 100);
    }

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(progressIntervalRef.current);
    };
  }, [currentStory, goToNextStory]);
  
  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="relative w-full h-full max-w-sm max-h-[90vh] bg-black rounded-lg shadow-2xl flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        
        {/* Media Display */}
        {currentStory.mediaType === 'image' ? (
          <Image src={currentStory.mediaUrl} alt="Story" layout="fill" objectFit="contain" className="rounded-lg" />
        ) : (
          <video
            src={currentStory.mediaUrl}
            autoPlay
            onEnded={goToNextStory}
            onTimeUpdate={handleVideoProgress}
            className="w-full h-full rounded-lg"
          />
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between gap-2">
            <div className='flex items-center gap-2'>
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarImage src={currentStory.author.avatarUrl} data-ai-hint="profile person" />
                <AvatarFallback>{currentStory.author.username.substring(0,1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-semibold">{currentStory.author.displayName || currentStory.author.username}</span>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <div className="flex gap-1 mt-2">
            {currentUserStories.map((story, index) => (
              <div key={story.id} className="flex-1 h-1 bg-white/40 rounded-full">
                <div
                  className="h-1 bg-white rounded-full"
                  style={{ width: `${index < currentStoryIndex ? 100 : (index === currentStoryIndex ? progress : 0)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Navigation */}
        <Button variant="ghost" size="icon" onClick={goToPrevStory} className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-white/20 h-10 w-10">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" onClick={goToNextStory} className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-white/20 h-10 w-10">
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}


function AddStoryDialog({ user, onUploadComplete }: { user: UserSummary, onUploadComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      // 50MB limit
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select a file smaller than 50MB.", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      toast({ title: "Configuration Error", description: "Cannot upload story.", variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${file.type.startsWith('video') ? 'video' : 'image'}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.secure_url) {
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        const result = await createStoryMedia(user, data.secure_url, mediaType);
        if (result.success) {
          toast({ title: "Story Uploaded!", description: "Your story is now live for 24 hours." });
          onUploadComplete();
        } else {
          throw new Error(result.error || "Failed to save story to database.");
        }
      } else {
        throw new Error(data.error?.message || 'Unknown Cloudinary error');
      }
    } catch (error) {
      console.error("Error uploading story:", error);
      toast({ title: 'Upload Failed', description: 'Could not upload your story.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add to your story</DialogTitle>
        <DialogDescription>Upload an image or video. It will be visible to your followers for 24 hours.</DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        {preview && (
            <div className='flex justify-center items-center bg-black rounded-lg h-80'>
                {file?.type.startsWith('video') ? (
                    <video src={preview} controls className="max-h-full max-w-full" />
                ) : (
                    <Image src={preview} alt="Preview" width={200} height={300} objectFit="contain" />
                )}
            </div>
        )}
        <div className='space-y-2'>
            <label htmlFor="story-file" className={cn("flex justify-center w-full h-32 px-4 transition bg-background border-2 border-border border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none", { 'pointer-events-none opacity-50': isUploading })}>
                <span className="flex items-center space-x-2">
                    {file ? <ImageIcon className="w-6 h-6 text-muted-foreground" /> : <UploadCloud className="w-6 h-6 text-muted-foreground" />}
                    <span className="font-medium text-muted-foreground">
                        {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Drop files to Attach, or browse'}
                    </span>
                </span>
                <input id="story-file" type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
            </label>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={isUploading}>Cancel</Button>
        </DialogClose>
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Post to Story
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function StoryBubbles() {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stories, setStories] = useState<StoriesGroupedByUser>({});
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    // Firestore 'in' query is limited to 30 items
    const authorIdsToFetch = [...(user.followingIds || []), user.id].slice(0, 30);
    
    if (authorIdsToFetch.length === 0) {
        setIsLoading(false);
        return;
    }

    const q = query(
      collection(db, 'storyMedia'),
      where('userId', 'in', authorIdsToFetch),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storiesByUser: StoriesGroupedByUser = {};
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as StoryMedia;
        if (!storiesByUser[data.userId]) {
          storiesByUser[data.userId] = { author: data.author, stories: [] };
        }
        storiesByUser[data.userId].stories.push(data);
      });
      
      // Sort stories within each user group by creation time
      for (const userId in storiesByUser) {
        storiesByUser[userId].stories.sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      }
      
      setStories(storiesByUser);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching stories:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenViewer = (userSummary: UserSummary) => {
    setSelectedUser(userSummary);
    setIsViewerOpen(true);
  };
  
  if (authLoading) return <div className="h-[96px] w-full bg-card rounded-lg animate-pulse" />;
  if (!user) return null; // Don't show anything if not logged in

  const followedUsersWithStories = Object.values(stories).filter(group => group.author.id !== user.id);
  const currentUserStories = stories[user.id];

  return (
    <div className="bg-card p-3 rounded-lg shadow-sm">
      <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
        {/* Add Story Bubble */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <div className="text-center flex-shrink-0 w-16">
            <button onClick={() => setIsAddOpen(true)} className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </button>
            <p className="text-xs mt-1 truncate">Your Story</p>
          </div>
          {isAddOpen && <AddStoryDialog user={user} onUploadComplete={() => setIsAddOpen(false)} />}
        </Dialog>
        
        {/* Current User's Bubble */}
        {currentUserStories && (
            <div key={user.id} onClick={() => handleOpenViewer(user)} className="text-center flex-shrink-0 w-16 cursor-pointer">
                <div className="w-16 h-16 p-0.5 rounded-full bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500">
                <Avatar className="w-full h-full border-2 border-background">
                    <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
                    <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                </div>
                <p className="text-xs mt-1 truncate">{user.displayName || user.username}</p>
            </div>
        )}

        {/* Followed Users' Bubbles */}
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-16 w-16 bg-muted rounded-full animate-pulse flex-shrink-0" />)
        ) : (
          followedUsersWithStories.map(({ author }) => (
            <div key={author.id} onClick={() => handleOpenViewer(author)} className="text-center flex-shrink-0 w-16 cursor-pointer">
              <div className="w-16 h-16 p-0.5 rounded-full bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500">
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={author.avatarUrl} data-ai-hint="profile person" />
                  <AvatarFallback>{author.username.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <p className="text-xs mt-1 truncate">{author.displayName || author.username}</p>
            </div>
          ))
        )}
      </div>
      {isViewerOpen && selectedUser && <StoryViewer groupedStories={stories} initialUser={selectedUser} onClose={() => setIsViewerOpen(false)} />}
    </div>
  );
}
