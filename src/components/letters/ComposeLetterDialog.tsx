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
import { Loader2, Send, PenSquare, Sparkles, BookOpen, X } from 'lucide-react';
import type { Story, Chapter, ReadingListItem } from '@/types';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { getMagicLetterDraft } from '@/app/actions/aiActions';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] rounded-[32px] p-0 overflow-hidden border-none shadow-3xl flex flex-col">
        <DialogHeader className="p-6 bg-muted/30 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-headline font-bold">New Correspondence</DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            Connecting Readers & Authors
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="story-select" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Manuscript
                </Label>
                <Select onValueChange={setSelectedStoryId} value={selectedStoryId || ''} disabled={isSending}>
                    <SelectTrigger id="story-select" className="rounded-2xl bg-muted/20 border-none shadow-inner h-12">
                        <SelectValue placeholder="Pick a story..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {readingList.length > 0 ? readingList.map(story => (
                            <SelectItem key={story.id} value={story.id} className="rounded-xl">{story.title}</SelectItem>
                        )) : (
                            <SelectItem value="none" disabled>Your library is empty.</SelectItem>
                        )}
                    </SelectContent>
                </Select>
              </div>

              {selectedStoryId && (
                <div className="space-y-1.5 animate-in slide-in-from-left-2 duration-300">
                    <Label htmlFor="chapter-select" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Chapter/Part
                    </Label>
                    <Select onValueChange={setSelectedChapterId} value={selectedChapterId || ''} disabled={isSending || !storyDetails}>
                        <SelectTrigger id="chapter-select" className="rounded-2xl bg-muted/20 border-none shadow-inner h-12">
                            <SelectValue placeholder={!storyDetails ? "Loading..." : "Select Part"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                           {publishedChapters.length > 0 ? publishedChapters.sort((a,b) => a.order - b.order).map(chapter => (
                               <SelectItem key={chapter.id} value={chapter.id} className="rounded-xl">Part {chapter.order}: {chapter.title}</SelectItem>
                           )) : (
                               <SelectItem value="none" disabled>No parts found.</SelectItem>
                           )}
                        </SelectContent>
                    </Select>
                </div>
              )}
            </div>
            
            {selectedChapterId && (
              <div className="space-y-3 animate-in fade-in duration-500">
                  <div className="flex justify-between items-end mb-1 px-1">
                      <Label htmlFor="letter-content" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          The Letter
                      </Label>
                      <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary hover:bg-primary/5 font-bold text-[10px] uppercase tracking-widest gap-2 h-7 px-2 rounded-lg"
                          onClick={handleMagicDraft}
                          disabled={isDrafting}
                      >
                          {isDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Magic Draft
                      </Button>
                  </div>
                  <Textarea 
                      id="letter-content"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder={`Write your heartfelt thoughts about "${storyDetails?.title}"...`}
                      className="rounded-2xl bg-muted/10 border-none shadow-inner text-sm md:text-base font-serif min-h-[220px] focus-visible:ring-primary/20 leading-relaxed p-5"
                      disabled={isSending || isDrafting}
                  />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Privacy:</span>
                          <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'private')} className="flex gap-4" disabled={isSending}>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="public" id="visPublic" className="h-4 w-4" />
                                  <Label htmlFor="visPublic" className="text-[10px] font-bold uppercase cursor-pointer opacity-70">Public</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="private" id="visPrivate" className="h-4 w-4" />
                                  <Label htmlFor="visPrivate" className="text-[10px] font-bold uppercase cursor-pointer opacity-70">Private</Label>
                              </div>
                          </RadioGroup>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <BookOpen className="h-3 w-3 opacity-50" />
                          <span>{content.length}/2000</span>
                      </div>
                  </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 bg-muted/30 border-t flex-shrink-0 gap-2 flex-row justify-end">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isSending || isDrafting} className="rounded-full px-6 font-bold text-xs uppercase tracking-widest h-11">
                Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleSendLetter} 
            disabled={isSending || isDrafting || !selectedStoryId || !selectedChapterId || content.trim().length < 20} 
            className="rounded-full px-8 h-11 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-sm font-bold uppercase tracking-widest"
          >
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Letter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
