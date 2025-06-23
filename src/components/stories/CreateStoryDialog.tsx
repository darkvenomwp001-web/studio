'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUserStory } from '@/app/actions/storyActions';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const backgroundColors = [
  "bg-gradient-to-br from-gray-700 via-gray-900 to-black",
  "bg-gradient-to-br from-blue-500 to-purple-600",
  "bg-gradient-to-br from-green-400 to-blue-500",
  "bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500",
  "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500",
];

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateStoryDialog({ open, onOpenChange }: CreateStoryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(backgroundColors[0]);
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!user) {
      toast({ title: 'You must be logged in to post.', variant: 'destructive' });
      return;
    }
    if (content.trim().length === 0) {
      toast({ title: 'Story content cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsPosting(true);
    const result = await createUserStory(user, content, selectedBg);
    if (result.success) {
      toast({ title: 'Story Posted!', description: 'Your story is now live for 24 hours.' });
      setContent('');
      setSelectedBg(backgroundColors[0]);
      onOpenChange(false);
    } else {
      toast({ title: 'Error Posting Story', description: result.error, variant: 'destructive' });
    }
    setIsPosting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 border-0 bg-transparent shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Create a new story</DialogTitle>
          </DialogHeader>
          <div className={cn("rounded-lg p-6 flex flex-col items-center justify-center aspect-[9/16] min-h-[400px] w-full", selectedBg)}>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={280}
              className="bg-transparent border-none text-white text-2xl font-bold text-center resize-none shadow-none focus-visible:ring-0 placeholder:text-white/70 h-full"
            />
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-transparent px-2">
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white">
                        <Palette />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-black/50 border-none">
                    <div className="flex gap-2">
                        {backgroundColors.map((color) => (
                            <button
                                key={color}
                                className={cn('h-8 w-8 rounded-full border-2', selectedBg === color ? 'border-white' : 'border-transparent', color)}
                                onClick={() => setSelectedBg(color)}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
            <Button onClick={handlePost} disabled={isPosting} size="icon" className="rounded-full bg-white text-black hover:bg-gray-200">
                {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
