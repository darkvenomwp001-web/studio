'use client';

import { useState, useTransition, useEffect, ChangeEvent, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, UploadCloud, Film, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createMediaUserStory } from '@/app/actions/storyActions';
import type { UserSummary } from '@/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function PostGalleryStoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup the object URL to avoid memory leaks
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) { // 25MB limit for stories
        toast({ title: "File too large", description: "Please select a file smaller than 25MB.", variant: "destructive" });
        return;
      }
      setMediaFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'You must be logged in to post.', variant: 'destructive' });
      return;
    }
    if (!mediaFile || !mediaType) {
        toast({ title: 'No media selected.', variant: 'destructive' });
        return;
    }

    startTransition(async () => {
      // 1. Upload to Cloudinary
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      
      if (!cloudName || !uploadPreset) {
        toast({ title: 'Configuration Error', description: 'Cannot upload media.', variant: 'destructive'});
        return;
      }

      const formData = new FormData();
      formData.append('file', mediaFile);
      formData.append('upload_preset', uploadPreset);

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!data.secure_url) {
          throw new Error(data.error?.message || 'Cloudinary upload failed.');
        }

        const mediaUrl = data.secure_url;
        
        // 2. Create UserStory in Firestore
        const userSummary: UserSummary = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        };

        const result = await createMediaUserStory(userSummary, mediaUrl, mediaType);

        if (result.success) {
          toast({ title: 'Story Posted!' });
          router.push('/');
        } else {
          toast({ title: 'Error Posting Story', description: result.error, variant: 'destructive' });
        }
      } catch (error) {
        console.error("Error during story post:", error);
        toast({ title: 'Upload Failed', description: 'Could not upload your media. Please try again.', variant: 'destructive'});
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
       <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
        <Link href="/instapost" passHref>
          <button className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors">
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Back</span>
          </button>
        </Link>
        <div></div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900">
        {!previewUrl ? (
             <Card className="w-full max-w-sm text-center bg-gray-800 border-dashed border-gray-600 text-white p-8 flex flex-col items-center">
                <UploadCloud className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold font-headline mb-2">Upload your story</h2>
                <p className="text-sm text-muted-foreground mb-6">Select a photo or video to share.</p>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="bg-gray-700 border-gray-600 hover:bg-gray-600">
                    Choose from Gallery
                </Button>
            </Card>
        ) : (
            <div className="relative w-full max-w-sm aspect-[9/16] rounded-lg overflow-hidden bg-black flex items-center justify-center">
                {mediaType === 'image' && <img src={previewUrl} alt="Preview" className="object-contain w-full h-full" />}
                {mediaType === 'video' && <video src={previewUrl} className="object-contain w-full h-full" controls autoPlay loop muted />}
                {isSubmitting && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-white animate-spin" />
                    </div>
                )}
            </div>
        )}
      </main>

      {previewUrl && (
        <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-white text-black hover:bg-gray-200 text-lg py-6 rounded-full"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            Post to Your Story
          </Button>
        </footer>
      )}
    </div>
  );
}
