
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createThreadPost } from '@/app/actions/threadActions';
import type { User, UserSummary } from '@/types';
import Image from 'next/image';

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

export default function CreatePostForm({ user, onSuccess }: { user: User, onSuccess?: () => void }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const result = await createThreadPost(
      authorSummary, 
      content, 
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
          </div>
        </div>
      </CardHeader>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center">
            <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
            <Button variant="ghost" size="icon" title="Attach an image" onClick={() => imageInputRef.current?.click()} disabled={!!imageFile}>
                <ImageIcon className="h-5 w-5" />
            </Button>
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting || (content.trim().length === 0 && !imageFile)}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Post
        </Button>
      </CardFooter>
    </Card>
  );
}
