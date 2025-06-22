
'use client';

import { useState, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createUserStory } from '@/app/actions/storyActions';
import type { UserSummary } from '@/types';

interface CreateStoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const backgroundColors = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-slate-900 to-slate-700',
  'bg-gradient-to-br from-red-500 to-orange-500',
  'bg-gradient-to-br from-blue-700 to-indigo-900',
  'bg-gradient-to-br from-purple-600 to-indigo-600',
  'bg-gradient-to-br from-green-500 to-teal-600',
  'bg-gradient-to-br from-pink-500 to-rose-500',
];

export default function CreateStoryDialog({ isOpen, onOpenChange }: CreateStoryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, startTransition] = useTransition();

  const [content, setContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(backgroundColors[0]);

  const handleSubmit = () => {
    if (!user) {
      toast({ title: 'You must be logged in to post a story.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const userSummary: UserSummary = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      };

      const result = await createUserStory(userSummary, content, selectedBg);

      if (result.success) {
        toast({ title: 'Story Posted!' });
        onOpenChange(false);
        setContent('');
        setSelectedBg(backgroundColors[0]);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-0" onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
      }}>
        <div className={cn("relative flex flex-col items-center justify-center p-8 h-96 w-full rounded-t-lg transition-colors", selectedBg)}>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing..."
              maxLength={280}
              className="bg-transparent border-0 text-white placeholder:text-white/70 text-center text-xl font-medium focus-visible:ring-0 resize-none h-full shadow-none"
            />
            <span className="absolute bottom-2 right-4 text-xs text-white/60">{content.length}/280</span>
        </div>
        <div className="p-4 bg-background rounded-b-lg">
            <DialogDescription className="mb-2 text-xs">Choose a background:</DialogDescription>
            <div className="flex gap-2 mb-4">
                {backgroundColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedBg(color)}
                      className={cn("h-8 w-8 rounded-full cursor-pointer transition-transform hover:scale-110", color, selectedBg === color && 'ring-2 ring-ring ring-offset-2 ring-offset-background')}
                      aria-label={`Select ${color} background`}
                    />
                ))}
            </div>
            <DialogFooter>
                <Button onClick={handleSubmit} disabled={isSubmitting || content.trim().length === 0} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Post Story
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
