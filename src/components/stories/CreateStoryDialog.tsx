
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createMediaUserStory } from '@/app/actions/storyActions';
import type { UserSummary } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateStoryDialog({ open, onOpenChange }: CreateStoryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        toast({ title: "File too large", description: "Please select a file smaller than 25MB.", variant: "destructive" });
        return;
      }
      setMediaFile(file);
      setMediaType(file.type.startsWith('image') ? 'image' : 'video');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetState = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setIsPosting(false);
  };

  const handlePost = async () => {
    if (!user) {
      toast({ title: 'You must be logged in to post.', variant: 'destructive' });
      return;
    }
    if (!mediaFile || !mediaType) {
      toast({ title: 'No file selected', description: 'Please select a photo or video to post.', variant: 'destructive' });
      return;
    }
    
    setIsPosting(true);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ title: 'Configuration Error', description: 'Cannot upload media.', variant: 'destructive' });
      setIsPosting(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('file', mediaFile);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${mediaType === 'image' ? 'image' : 'video'}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.secure_url) {
        const authorSummary: UserSummary = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        };
        const result = await createMediaUserStory(authorSummary, data.secure_url, mediaType);
        
        if (result.success) {
          toast({ title: 'Story Posted!', description: 'Your story is now live for 24 hours.' });
          resetState();
          onOpenChange(false);
        } else {
          toast({ title: 'Error Posting Story', description: result.error, variant: 'destructive' });
        }

      } else {
        throw new Error(data.error?.message || 'Unknown Cloudinary error');
      }
    } catch (error) {
      console.error("Error posting media story:", error);
      toast({ title: 'Upload Failed', description: 'Could not post your story. Please try again.', variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
    }}>
      <DialogContent className="sm:max-w-[425px] p-0 border-0 bg-background shadow-lg">
          <DialogHeader className="p-6 pb-0 sr-only">
            <DialogTitle>Create a new story</DialogTitle>
            <DialogDescription>Upload a photo or a short video clip to share with your followers.</DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-6">
            <div 
                className={cn(
                    "aspect-square w-full rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground transition-colors",
                    !mediaPreview && "hover:border-primary hover:text-primary cursor-pointer"
                )}
                onClick={() => fileInputRef.current?.click()}
            >
                {mediaPreview ? (
                    <div className="relative w-full h-full">
                        {mediaType === 'image' && <Image src={mediaPreview} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />}
                        {mediaType === 'video' && <video src={mediaPreview} className="w-full h-full object-cover rounded-md" controls />}
                    </div>
                ) : (
                    <div className="text-center">
                        <UploadCloud className="mx-auto h-12 w-12" />
                        <p>Click to upload</p>
                        <p className="text-xs">PNG, JPG, MP4, WEBM (Max 25MB)</p>
                    </div>
                )}
            </div>
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
            />
          </div>
          
          <DialogFooter className="p-6 pt-0">
            <Button onClick={handlePost} disabled={isPosting || !mediaFile} className="w-full">
                {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isPosting ? 'Posting...' : 'Post Story'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
