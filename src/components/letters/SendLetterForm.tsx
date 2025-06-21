
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import type { Story, Chapter } from '@/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SendLetterFormProps {
  story: Story;
  chapter: Chapter;
}

export default function SendLetterForm({ story, chapter }: SendLetterFormProps) {
  const { user, addNotification } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isSending, setIsSending] = useState(false);

  const handleSendLetter = async () => {
    if (!user) {
      toast({ title: "Not logged in", description: "You must be signed in to send a letter.", variant: "destructive" });
      return;
    }
    if (content.trim().length < 20) {
      toast({ title: "Letter too short", description: "Please write a bit more in your letter (at least 20 characters).", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await addDoc(collection(db, 'letters'), {
        storyId: story.id,
        storyTitle: story.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        authorId: story.author.id,
        author: story.author,
        reader: {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl,
        },
        content: content.trim(),
        visibility,
        timestamp: serverTimestamp(),
        isPinned: false,
        isReadByAuthor: false,
      });

      if (story.author.id !== user.id) {
        await addNotification({
            userId: story.author.id,
            type: 'new_letter',
            message: `${user.displayName || user.username} sent you a letter about "${story.title}".`,
            link: `/letters`,
            actor: {
                id: user.id,
                username: user.username,
                displayName: user.displayName || user.username,
                avatarUrl: user.avatarUrl
            }
        });
      }

      setContent('');
      toast({ title: "Letter Sent!", description: "The author will be notified of your heartfelt message." });
    } catch (error) {
      console.error("Error sending letter: ", error);
      toast({ title: "Error", description: "Could not send your letter. Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Letter to the Author</CardTitle>
        <CardDescription>Share your thoughts, feelings, or appreciation directly with the author.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dear Author..."
          rows={5}
          className="bg-background"
          disabled={isSending}
        />
        <div>
          <Label className="mb-2 block">Letter Visibility</Label>
          <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'private')} className="flex gap-4" disabled={isSending}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="visPublic" />
              <Label htmlFor="visPublic">Public (Other readers can see)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="visPrivate" />
              <Label htmlFor="visPrivate">Private (Only for the author)</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSendLetter} disabled={isSending || content.trim().length < 20}>
          {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send Letter
        </Button>
      </CardFooter>
    </Card>
  );
}
