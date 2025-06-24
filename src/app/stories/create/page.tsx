'use client';

import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UploadCloud, Image as ImageIcon, Video } from 'lucide-react';
import Image from 'next/image';
import { createUserStory } from '@/app/actions/userStoryActions';

export default function CreateUserStoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.replace('/auth/signin');
    return null;
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 10MB.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setMediaType(selectedFile.type.startsWith('video') ? 'video' : 'image');
    }
  };

  const handlePostStory = async () => {
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select an image or video to post.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to post a story.', variant: 'destructive' });
      return;
    }
    setIsPosting(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      const result = await createUserStory(base64, {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });

      if (result.success) {
        toast({ title: 'Story Posted!', description: 'Your story will be visible to your followers for 24 hours.' });
        router.push('/');
      } else {
        toast({ title: 'Error Posting Story', description: result.error, variant: 'destructive' });
      }
      setIsPosting(false);
    };
    reader.onerror = () => {
      toast({ title: 'File Read Error', description: 'Could not process the selected file.', variant: 'destructive' });
      setIsPosting(false);
    };
  };

  return (
    <div className="container mx-auto max-w-lg py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
        <Card>
            <CardHeader>
                <CardTitle>Create a Story</CardTitle>
                <CardDescription>
                    Share a quick photo or video update with your followers. It will disappear in 24 hours.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div 
                    className="relative flex flex-col items-center justify-center w-full h-96 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => document.getElementById('story-upload-input')?.click()}
                >
                    {preview ? (
                        mediaType === 'image' ? (
                            <Image src={preview} alt="Story preview" layout="fill" objectFit="contain" className="rounded-md" />
                        ) : (
                            <video src={preview} controls autoPlay muted loop className="w-full h-full object-contain rounded-md" />
                        )
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <UploadCloud className="mx-auto h-12 w-12 mb-2" />
                            <p>Click to upload an image or video</p>
                            <p className="text-xs">Max file size: 10MB</p>
                        </div>
                    )}
                    <Input id="story-upload-input" type="file" accept="image/*,video/mp4,video/quicktime" onChange={handleFileChange} className="hidden" />
                </div>
                
                <Button 
                    onClick={handlePostStory} 
                    disabled={!file || isPosting}
                    className="w-full"
                    size="lg"
                >
                    {isPosting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (mediaType === 'image' ? <ImageIcon className="mr-2 h-5 w-5" /> : <Video className="mr-2 h-5 w-5" />) }
                    {isPosting ? 'Posting...' : 'Post Your Story'}
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
