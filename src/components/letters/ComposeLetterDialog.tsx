'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, PenSquare } from 'lucide-react';
import type { Story, Chapter, ReadingListItem } from '@/types';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ComposeLetterDialog() {
  const { user, addNotification } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  
  const [isSending, setIsSending] = useState(false);
  const [storyDetails, setStoryDetails] = useState<Story | null>(null);

  const readingList: ReadingListItem[] = user?.readingList || [];

  useEffect(() => {
    // Reset when dialog is closed
    if (!isOpen) {
      setSelectedStoryId(null);
      setSelectedChapterId(null);
      setContent('');
      setVisibility('public');
      setStoryDetails(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedStoryId) {
      setStoryDetails(null);
      setSelectedChapterId(null);
      return;
    }

    const fetchStoryDetails = async () => {
      const storyRef = doc(db, 'stories', selectedStoryId);
      const storySnap = await getDoc(storyRef);
      if (storySnap.exists()) {
        setStoryDetails({ id: storySnap.id, ...storySnap.data() } as Story);
      } else {
        toast({ title: "Error", description: "Could not fetch story details.", variant: "destructive" });
        setStoryDetails(null);
      }
    };
    fetchStoryDetails();

  }, [selectedStoryId, toast]);

  const handleSendLetter = async () => {
    if (!user || !storyDetails || !selectedChapterId) {
      toast({ title: "Selection Missing", description: "Please select a story and chapter.", variant: "destructive" });
      return;
    }
    if (content.trim().length < 20) {
      toast({ title: "Letter too short", description: "Please write at least 20 characters.", variant: "destructive" });
      return;
    }

    const chapter = storyDetails.chapters.find(c => c.id === selectedChapterId);
    if (!chapter) {
      toast({ title: "Error", description: "Selected chapter not found.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      await addDoc(collection(db, 'letters'), {
        storyId: storyDetails.id,
        storyTitle: storyDetails.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        authorId: storyDetails.author.id,
        author: storyDetails.author,
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

      if (storyDetails.author.id !== user.id) {
        await addNotification({
            userId: storyDetails.author.id,
            type: 'new_letter',
            message: `${user.displayName || user.username} sent you a letter about "${storyDetails.title}".`,
            link: `/letters`,
            actor: {
                id: user.id,
                username: user.username,
                displayName: user.displayName || user.username,
                avatarUrl: user.avatarUrl
            }
        });
      }

      setIsOpen(false);
      toast({ title: "Letter Sent!", description: "Your message is on its way to the author." });
    } catch (error) {
      console.error("Error sending letter: ", error);
      toast({ title: "Error", description: "Could not send your letter.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const publishedChapters = storyDetails?.chapters.filter(c => c.status === 'Published') || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
            <PenSquare className="mr-2 h-4 w-4" />
            Compose Letter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Compose a Letter to an Author</DialogTitle>
          <DialogDescription>
            Select a story and chapter from your library to send a heartfelt message.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="story-select" className="text-right">
              Story
            </Label>
            <Select onValueChange={setSelectedStoryId} value={selectedStoryId || ''} disabled={isSending}>
                <SelectTrigger id="story-select" className="col-span-3">
                    <SelectValue placeholder="Select a story from your library..." />
                </SelectTrigger>
                <SelectContent>
                    {readingList.length > 0 ? readingList.map(story => (
                        <SelectItem key={story.id} value={story.id}>{story.title}</SelectItem>
                    )) : (
                        <SelectItem value="none" disabled>Your reading list is empty.</SelectItem>
                    )}
                </SelectContent>
            </Select>
          </div>

          {selectedStoryId && (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="chapter-select" className="text-right">
                Chapter
                </Label>
                <Select onValueChange={setSelectedChapterId} value={selectedChapterId || ''} disabled={isSending || !storyDetails}>
                    <SelectTrigger id="chapter-select" className="col-span-3">
                        <SelectValue placeholder={!storyDetails ? "Loading chapters..." : "Select a chapter..."} />
                    </SelectTrigger>
                    <SelectContent>
                       {publishedChapters.length > 0 ? publishedChapters.sort((a,b) => a.order - b.order).map(chapter => (
                           <SelectItem key={chapter.id} value={chapter.id}>Part {chapter.order}: {chapter.title}</SelectItem>
                       )) : (
                           <SelectItem value="none" disabled>No published chapters in this story.</SelectItem>
                       )}
                    </SelectContent>
                </Select>
            </div>
          )}
          
          {selectedChapterId && (
            <>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="letter-content" className="text-right pt-2">
                    Message
                    </Label>
                    <Textarea 
                        id="letter-content"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={`Your letter regarding "${storyDetails?.title}"...`}
                        className="col-span-3"
                        rows={6}
                        disabled={isSending}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Visibility</Label>
                     <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'private')} className="flex gap-4 col-span-3" disabled={isSending}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="public" id="visPublic" />
                            <Label htmlFor="visPublic" className="font-normal">Public</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="private" id="visPrivate" />
                            <Label htmlFor="visPrivate" className="font-normal">Private</Label>
                        </div>
                    </RadioGroup>
                </div>
            </>
          )}

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isSending}>
                Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSendLetter} disabled={isSending || !selectedStoryId || !selectedChapterId || content.trim().length < 20} className="bg-primary hover:bg-primary/90">
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Letter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
