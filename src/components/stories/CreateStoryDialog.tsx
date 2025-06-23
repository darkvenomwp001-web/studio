
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Users, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createUserNote } from '@/app/actions/storyActions';
import type { UserSummary } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateNoteDialog({ open, onOpenChange }: CreateNoteDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const characterLimit = 60;

  useEffect(() => {
    if (!open) {
        setContent('');
        setVisibility('public');
        setIsPosting(false);
    }
  }, [open]);

  const handlePost = async () => {
    if (!user) {
      toast({ title: 'You must be logged in to post.', variant: 'destructive' });
      return;
    }
    if (content.trim().length === 0) {
      toast({ title: 'Note cannot be empty', variant: 'destructive' });
      return;
    }
    
    setIsPosting(true);
    const authorSummary: UserSummary = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
    };
    const result = await createUserNote(authorSummary, content, visibility);
    
    if (result.success) {
        toast({ title: 'Note Posted!', description: 'Your note is now live for 24 hours.' });
        onOpenChange(false);
    } else {
        toast({ title: 'Error Posting Note', description: result.error, variant: 'destructive' });
    }
    setIsPosting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background shadow-lg rounded-lg">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg">Share a Note</DialogTitle>
            <DialogDescription>
                Your note will be visible for 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatarUrl} alt={user?.username} data-ai-hint="profile person" />
                <AvatarFallback>{user?.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="w-full relative">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={characterLimit}
                    placeholder="What's on your mind?"
                    className="w-full h-24 p-3 text-center text-sm bg-muted rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {content.length}/{characterLimit}
                </p>
              </div>
          </div>
          
          <DialogFooter className="flex-col gap-2">
            <div>
                 <p className="text-sm font-medium mb-2 text-center">Who can see this note?</p>
                 <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'followers')} className="flex gap-4 justify-center" disabled={isPosting}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="visPublic" />
                        <Label htmlFor="visPublic" className="font-normal flex items-center gap-1"><Globe className="h-4 w-4"/>Public</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="followers" id="visFollowers" />
                        <Label htmlFor="visFollowers" className="font-normal flex items-center gap-1"><Users className="h-4 w-4"/>Followers</Label>
                    </div>
                </RadioGroup>
            </div>
            <Button onClick={handlePost} disabled={isPosting || content.trim().length === 0} className="w-full">
                {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isPosting ? 'Posting...' : 'Post Note'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
