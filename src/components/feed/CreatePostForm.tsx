
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Paperclip, X } from 'lucide-react';
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
} from "@/components/ui/dialog"
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';

export default function CreatePostForm({ user, onSuccess }: { user: User, onSuccess?: () => void }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedStory, setAttachedStory] = useState<Story | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async () => {
    if (content.trim().length === 0) {
      toast({ title: 'Cannot post empty update', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
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
      attachedStory?.coverImageUrl
    );

    if (result.success) {
      setContent('');
      setAttachedStory(null);
      toast({ title: 'Posted!', description: 'Your update is now live in your followers\' feeds.' });
      onSuccess?.();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  const publishedStories = user.writtenStories?.filter(s => s.status === 'Ongoing' || s.status === 'Completed') || [];

  return (
    <Card className="w-full shadow-none border-0">
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
                    <DialogTrigger asChild key={story.id}>
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
                    </DialogTrigger>
                ))}
                </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Button onClick={handleSubmit} disabled={isSubmitting || content.trim().length === 0}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Post
        </Button>
      </CardFooter>
    </Card>
  );
}
