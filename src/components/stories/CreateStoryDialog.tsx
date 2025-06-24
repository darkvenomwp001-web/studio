'use client';

import { useState, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createStorylyStory } from '@/app/actions/storylyActions';
import { Loader2, PlusCircle, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import type { User } from '@/types';

interface CreateStoryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onStoryPosted: () => void;
  user: User | null;
}

export default function CreateStoryDialog({ isOpen, setIsOpen, onStoryPosted, user }: CreateStoryDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

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
    }
  };

  const handlePost = async () => {
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
      const result = await createStorylyStory(base64, user.id);

      if (result.success) {
        toast({ title: 'Story Posted!', description: 'Your story will appear shortly.' });
        onStoryPosted(); // This can be used to refresh the Storyly component if needed
        handleClose();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
      setIsPosting(false);
    };
    reader.onerror = () => {
      toast({ title: 'File Read Error', description: 'Could not process the selected file.', variant: 'destructive' });
      setIsPosting(false);
    };
  };
  
  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent onEscapeKeyDown={handleClose} onInteractOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>Create a Story</DialogTitle>
          <DialogDescription>
            Share a quick photo or video update with your followers. It will disappear in 24 hours.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {preview ? (
            <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted">
              <Image src={preview} alt="Selected media preview" layout="fill" objectFit="contain" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg">
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Select a photo or video</p>
            </div>
          )}
          <div className="mt-4">
            <Input id="story-media" type="file" accept="image/*,video/*" onChange={handleFileChange} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handlePost} disabled={!file || isPosting || !user}>
            {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Post Story
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
