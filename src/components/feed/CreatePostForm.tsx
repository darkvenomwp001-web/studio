
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/app/actions/feedActions';
import type { User } from '@/types';

export default function CreatePostForm({ user }: { user: User }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async () => {
    if (content.trim().length === 0) {
      toast({ title: 'Cannot post empty update', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await createPost(user, content);

    if (result.success) {
      setContent('');
      toast({ title: 'Posted!', description: 'Your update is now live in your followers\' feeds.' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user.avatarUrl} alt={user.displayName} data-ai-hint="profile person" />
            <AvatarFallback>{user.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${user.displayName || user.username}?`}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none resize-none p-0"
            rows={1}
            maxLength={1000}
          />
        </div>
      </CardHeader>
      <CardFooter className="p-4 pt-0 flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting || content.trim().length === 0}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Post
        </Button>
      </CardFooter>
    </Card>
  );
}
