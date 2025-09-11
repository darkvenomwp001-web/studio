
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Pin, PinOff } from 'lucide-react';
import type { Letter as LetterType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function LetterCard({ letter, isAuthorView }: { letter: LetterType, isAuthorView: boolean }) {
  const { user, addNotification } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [authorResponse, setAuthorResponse] = useState(letter.authorResponse || '');
  const [isResponding, setIsResponding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkAsRead = async () => {
    if (isAuthorView && !letter.isReadByAuthor) {
      const letterRef = doc(db, 'letters', letter.id);
      await updateDoc(letterRef, { isReadByAuthor: true });
    }
  };

  const handleTogglePin = async () => {
    setIsProcessing(true);
    const letterRef = doc(db, 'letters', letter.id);
    try {
      await updateDoc(letterRef, { isPinned: !letter.isPinned });
      toast({ title: `Letter ${!letter.isPinned ? 'pinned' : 'unpinned'}!` });
    } catch (error) {
      toast({ title: "Error", description: "Could not update pin status.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setIsDialogOpen(false);
    }
  };
  
  const handleSendResponse = async () => {
    if (!authorResponse.trim()) return;
    setIsResponding(true);
    const letterRef = doc(db, 'letters', letter.id);
    try {
      await updateDoc(letterRef, { authorResponse });

      if (user && user.id === letter.authorId) {
        await addNotification({
          userId: letter.reader.id,
          type: 'letter_response',
          message: `${letter.author.displayName || letter.author.username} has responded to your letter about "${letter.storyTitle}".`,
          link: `/letters`,
          actor: letter.author
        });
      }

      toast({ title: "Response sent!" });
    } catch (error) {
       toast({ title: "Error", description: "Could not send response.", variant: "destructive" });
    } finally {
      setIsResponding(false);
      setIsDialogOpen(false);
    }
  };
  
  const fromUser = isAuthorView ? letter.reader.displayName || letter.reader.username : 'You';
  const toUser = isAuthorView ? 'You' : `the author of "${letter.storyTitle}"`;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if(open) handleMarkAsRead();
    }}>
      <DialogTrigger asChild>
        <div className={cn("p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors", !letter.isReadByAuthor && isAuthorView && "bg-primary/10 border-primary/50")}>
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-0.5 overflow-hidden">
                    <p className="text-xs text-muted-foreground">
                        {isAuthorView ? `From: ${fromUser}` : `To: ${toUser}`}
                    </p>
                    <h4 className="font-semibold text-foreground truncate text-sm">
                       <Link href={`/stories/${letter.storyId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {letter.storyTitle}
                       </Link>
                        <span className="text-muted-foreground font-normal text-xs"> - {letter.chapterTitle}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{letter.content}</p>
                </div>
                <div className="text-[10px] text-muted-foreground text-right ml-1 whitespace-nowrap pt-0.5">
                   {letter.timestamp?.toDate ? formatDistanceToNow(letter.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                </div>
            </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Letter regarding "{letter.chapterTitle}"</DialogTitle>
           <DialogDescription>
              Sent {letter.timestamp?.toDate ? formatDistanceToNow(letter.timestamp.toDate(), { addSuffix: true }) : 'just now'}
              {isAuthorView && ` by ${letter.reader.displayName || letter.reader.username}`}
              . This letter is <span className="font-semibold">{letter.visibility}</span>.
           </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="whitespace-pre-line text-foreground/90 bg-muted/50 p-4 rounded-md">{letter.content}</p>
            {letter.authorResponse && (
                <div className="p-4 border-l-4 border-accent bg-accent/10 rounded-r-md">
                    <p className="font-semibold text-accent mb-2">Author's Response:</p>
                    <p className="whitespace-pre-line text-foreground/80">{letter.authorResponse}</p>
                </div>
            )}
            {isAuthorView && !letter.authorResponse && (
                 <div className="space-y-2">
                    <Label htmlFor="response">Your Response:</Label>
                    <Textarea id="response" value={authorResponse} onChange={e => setAuthorResponse(e.target.value)} placeholder="Write a response..." rows={4} />
                    <Button onClick={handleSendResponse} disabled={isResponding}>
                        {isResponding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Response
                    </Button>
                </div>
            )}
        </div>
        <DialogFooter className="justify-start">
             {isAuthorView && letter.visibility === 'public' && (
                <Button variant="outline" onClick={handleTogglePin} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : letter.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                    {letter.isPinned ? 'Unpin Letter' : 'Pin to Story Page'}
                </Button>
             )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
