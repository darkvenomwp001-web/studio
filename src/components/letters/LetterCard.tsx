
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Pin, PinOff, Trash2, MailOpen, Mail, ChevronRight } from 'lucide-react';
import type { Letter as LetterType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { deleteLetter } from '@/app/actions/letterActions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

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

  const handleDeleteLetter = async () => {
    if (!user) return;
    setIsProcessing(true);
    const result = await deleteLetter(letter.id, user.id);
    if (result.success) {
      toast({ title: "Letter Deleted", description: "Your letter has been permanently removed." });
      setIsDialogOpen(false);
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsProcessing(false);
  }
  
  const displayUser = isAuthorView ? letter.reader : letter.author;
  const isUnread = isAuthorView && !letter.isReadByAuthor;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if(open) handleMarkAsRead();
    }}>
      <DialogTrigger asChild>
        <div className={cn(
            "group bg-card hover:bg-muted/50 p-4 transition-all cursor-pointer flex items-center gap-4 border-b last:border-b-0",
            isUnread && "bg-primary/5 hover:bg-primary/10"
        )}>
            <div className="relative flex-shrink-0">
                <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage src={displayUser.avatarUrl} alt={displayUser.username} />
                    <AvatarFallback>{displayUser.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                {isUnread && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />
                )}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                    <h4 className={cn("text-sm font-semibold truncate", isUnread ? "text-primary" : "text-foreground")}>
                        {displayUser.displayName || displayUser.username}
                    </h4>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {letter.timestamp?.toDate ? formatDistanceToNow(letter.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                    </span>
                </div>
                <p className="text-xs font-medium text-foreground/80 line-clamp-1 mb-1">
                    {letter.storyTitle} <span className="text-muted-foreground font-normal">• {letter.chapterTitle}</span>
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1 group-hover:text-foreground/70 transition-colors">
                    {letter.content}
                </p>
            </div>
            
            <div className="flex-shrink-0 self-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-xl border-none shadow-2xl">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <div className="flex items-center gap-4">
             <Avatar className="h-10 w-10 border shadow-sm">
                <AvatarImage src={displayUser.avatarUrl} />
                <AvatarFallback>{displayUser.username.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <DialogTitle className="text-lg font-headline font-bold">
                    {isAuthorView ? `From: ${displayUser.displayName || displayUser.username}` : `To: ${displayUser.displayName || displayUser.username}`}
                </DialogTitle>
                <DialogDescription className="text-xs">
                    About <span className="font-semibold text-foreground">"{letter.storyTitle}"</span> &bull; {letter.chapterTitle}
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
            <div className="p-6 space-y-6">
                <div className="bg-muted/50 p-5 rounded-2xl border border-border/50 relative">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{letter.content}</p>
                    <div className="absolute top-4 right-4 opacity-20">
                        <Mail className="h-8 w-8" />
                    </div>
                </div>

                {letter.authorResponse && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-accent">
                            <MailOpen className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Author Response</span>
                        </div>
                        <div className="bg-accent/5 p-5 rounded-2xl border border-accent/20">
                            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80 italic">"{letter.authorResponse}"</p>
                        </div>
                    </div>
                )}

                {isAuthorView && !letter.authorResponse && (
                    <div className="space-y-4 pt-4 border-t border-dashed">
                        <div className="space-y-2">
                            <Label htmlFor="response" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Draft Your Response</Label>
                            <Textarea 
                                id="response" 
                                value={authorResponse} 
                                onChange={e => setAuthorResponse(e.target.value)} 
                                placeholder="Write a heartfelt response to this reader..." 
                                rows={4}
                                className="bg-background focus-visible:ring-primary rounded-xl"
                            />
                        </div>
                        <Button onClick={handleSendResponse} disabled={isResponding} className="w-full h-11 bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20">
                            {isResponding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Response
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="p-4 bg-muted/20 border-t flex-row justify-between items-center">
            <div className="flex gap-2">
                {isAuthorView && letter.visibility === 'public' && (
                    <Button variant="ghost" size="sm" onClick={handleTogglePin} disabled={isProcessing} className={cn(letter.isPinned && "text-primary hover:text-primary")}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : letter.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                        {letter.isPinned ? 'Unpin' : 'Pin to Story'}
                    </Button>
                )}
            </div>
            
            <div className="flex gap-2">
                {(!isAuthorView || (isAuthorView && letter.isReadByAuthor)) && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Letter?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove this letter from your view permanently.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteLetter}>
                                    Delete Permanently
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
