'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, PenSquare, Sparkles, BookOpen } from 'lucide-react';
import type { Story, Chapter, ReadingListItem } from '@/types';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { getMagicLetterDraft } from '@/app/actions/aiActions';

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
  
  const [isDrafting, startDraftTransition] = useTransition();

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

  const handleMagicDraft = () => {
    if (!storyDetails || !selectedChapterId) {
        toast({ title: "Select a chapter first", variant: "destructive"});
        return;
    }
    const chapter = storyDetails.chapters.find(c => c.id === selectedChapterId);
    
    startDraftTransition(async () => {
        const result = await getMagicLetterDraft({
            context: `Reader writing to an author about the chapter "${chapter?.title}" in the story "${storyDetails.title}". Story summary: ${storyDetails.summary}`,
            sender_type: 'reader',
            recipient_name: storyDetails.author.displayName || storyDetails.author.username,
            tone: 'encouraging and appreciative'
        });
        if ('error' in result) {
            toast({ title: 'AI Error', description: result.error, variant: 'destructive'});
        } else {
            setContent(result.draft);
        }
    });
  }

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
    const letterData = {
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
    };

    const lettersColRef = collection(db, 'letters');
    addDoc(lettersColRef, letterData)
        .then(() => {
            if (storyDetails.author.id !== user.id) {
                addNotification({
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
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: 'letters',
                operation: 'create',
                requestResourceData: letterData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsSending(false));
  };

  const publishedChapters = storyDetails?.chapters.filter(c => c.status === 'Published') || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 rounded-full px-6 shadow-lg shadow-primary/20 h-11">
            <PenSquare className="mr-2 h-4 w-4" />
            Compose Letter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-muted/30 border-b">
          <DialogTitle className="text-2xl font-headline font-bold">Compose a Letter</DialogTitle>
          <DialogDescription className="text-sm">
            Connect directly with an author to share your thoughts on their latest work.
          </DialogDescription>
        </DialogHeader>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="story-select" className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Story
            </Label>
            <Select onValueChange={setSelectedStoryId} value={selectedStoryId || ''} disabled={isSending}>
                <SelectTrigger id="story-select" className="col-span-3 rounded-xl bg-muted/20 border-none shadow-inner h-11">
                    <SelectValue placeholder="Select from library..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                    {readingList.length > 0 ? readingList.map(story => (
                        <SelectItem key={story.id} value={story.id}>{story.title}</SelectItem>
                    )) : (
                        <SelectItem value="none" disabled>Your library is empty.</SelectItem>
                    )}
                </SelectContent>
            </Select>
          </div>

          {selectedStoryId && (
             <div className="grid grid-cols-4 items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="chapter-select" className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Chapter
                </Label>
                <Select onValueChange={setSelectedChapterId} value={selectedChapterId || ''} disabled={isSending || !storyDetails}>
                    <SelectTrigger id="chapter-select" className="col-span-3 rounded-xl bg-muted/20 border-none shadow-inner h-11">
                        <SelectValue placeholder={!storyDetails ? "Loading chapters..." : "Select a part..."} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                       {publishedChapters.length > 0 ? publishedChapters.sort((a,b) => a.order - b.order).map(chapter => (
                           <SelectItem key={chapter.id} value={chapter.id}>Part {chapter.order}: {chapter.title}</SelectItem>
                       )) : (
                           <SelectItem value="none" disabled>No published chapters found.</SelectItem>
                       )}
                    </SelectContent>
                </Select>
            </div>
          )}
          
          {selectedChapterId && (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex justify-between items-end mb-1">
                    <Label htmlFor="letter-content" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Your Message
                    </Label>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary hover:bg-primary/10 font-bold text-[10px] uppercase tracking-widest gap-2"
                        onClick={handleMagicDraft}
                        disabled={isDrafting}
                    >
                        {isDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        AI Magic Draft
                    </Button>
                </div>
                <Textarea 
                    id="letter-content"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={`Write your letter regarding "${storyDetails?.title}"...`}
                    className="rounded-2xl bg-muted/10 border-none shadow-inner text-base font-serif"
                    rows={8}
                    disabled={isSending || isDrafting}
                />
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visibility:</Label>
                        <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'private')} className="flex gap-4" disabled={isSending}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="public" id="visPublic" />
                                <Label htmlFor="visPublic" className="text-xs cursor-pointer">Public</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="private" id="visPrivate" />
                                <Label htmlFor="visPrivate" className="text-xs cursor-pointer">Private</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                        <BookOpen className="h-3 w-3" />
                        <span>Max 2000 chars</span>
                    </div>
                </div>
            </div>
          )}

        </div>
        <DialogFooter className="p-6 bg-muted/30 border-t gap-3 flex-col sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isSending || isDrafting} className="rounded-full px-8 font-bold">
                Discard
            </Button>
          </DialogClose>
          <Button onClick={handleSendLetter} disabled={isSending || isDrafting || !selectedStoryId || !selectedChapterId || content.trim().length < 20} className="rounded-full px-10 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-lg font-bold">
            {isSending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            Send Letter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
