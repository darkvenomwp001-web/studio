
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/app/actions/feedActions';
import type { User, UserSummary, Story } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

export default function CreatePostForm({ user, onSuccess }: { user: User, onSuccess?: () => void }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedStory, setAttachedStory] = useState<Story | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast({ title: "Image Too Large", description: `Please select an image smaller than ${MAX_IMAGE_SIZE_BYTES / (1024*1024)}MB.`, variant: "destructive" });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearAttachments = () => {
    setContent('');
    setAttachedStory(null);
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  }

  const handleSubmit = async () => {
    if (content.trim().length === 0 && !imageFile) {
      toast({ title: 'Cannot create an empty post', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    let imageUrl: string | undefined = undefined;

    if (imageFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) {
            toast({ title: 'Configuration Error', description: 'Cloudinary environment variables are not set.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', uploadPreset);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) {
                imageUrl = data.secure_url;
            } else {
                throw new Error(data.error?.message || 'Unknown Cloudinary error');
            }
        } catch (error) {
            console.error('Error uploading image to Cloudinary:', error);
            toast({ title: 'Image Upload Failed', description: 'Could not upload your image. Please try again.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
    }


    const authorSummary: UserSummary = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
    };
    const result = await createPost(
      authorSummary, 
      content, 
      attachedStory?.id,
      attachedStory?.title,
      attachedStory?.coverImageUrl,
      imageUrl
    );

    if (result.success) {
      clearAttachments();
      toast({ title: 'Posted!', description: 'Your update is now live in the feed.' });
      onSuccess?.();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  const publishedStories = user.writtenStories?.filter(s => s.status === 'Ongoing' || s.status === 'Completed') || [];

  return (
    <Card className="w-full shadow-md border-border/50">
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarImage src={user.avatarUrl} alt={user.displayName} data-ai-hint="profile person" />
            <AvatarFallback>{user.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's on your mind, ${user.displayName || user.username}?`}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none resize-none p-0"
              rows={2}
              maxLength={1000}
            />
             {imagePreview && (
                <div className="mt-3 relative w-full max-w-sm">
                    <Image src={imagePreview} alt="Image preview" width={400} height={400} className="rounded-lg object-contain" />
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {attachedStory && (
              <div className="mt-2 border rounded-lg flex items-center gap-2 p-2 bg-muted/50 w-fit">
                <Image
                  src={attachedStory.coverImageUrl || 'https://placehold.co/512x800.png'}
                  alt={attachedStory.title}
                  width={30}
                  height={45}
                  className="rounded-sm aspect-[2/3] object-cover bg-muted"
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold leading-tight">{attachedStory.title}</p>
                  <p className="text-xs text-muted-foreground">Story attached</p>
                </div>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setAttachedStory(null)}>
                    <X className="h-4 w-4" />
                 </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center">
            <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
            <Button variant="ghost" size="icon" title="Attach an image" onClick={() => imageInputRef.current?.click()} disabled={!!imageFile}>
                <ImageIcon className="h-5 w-5" />
            </Button>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Attach a story" disabled={publishedStories.length === 0}>
                        <Paperclip className="h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Attach a story</DialogTitle>
                    <DialogDescription>Select one of your published stories to attach to this post.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-96 -mx-6">
                        <div className="px-6 space-y-2">
                        {publishedStories.map(story => (
                            <DialogClose asChild key={story.id}>
                                <div 
                                    className="border rounded-md p-2 flex items-center gap-3 cursor-pointer hover:bg-muted"
                                    onClick={() => setAttachedStory(story)}
                                >
                                <Image
                                    src={story.coverImageUrl || 'https://placehold.co/512x800.png'}
                                    alt={story.title}
                                    width={40}
                                    height={60}
                                    className="rounded aspect-[2/3] object-cover bg-muted"
                                />
                                <p className="font-semibold">{story.title}</p>
                                </div>
                            </DialogClose>
                        ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting || (content.trim().length === 0 && !imageFile)}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Post
        </Button>
      </CardFooter>
    </Card>
  );
}
