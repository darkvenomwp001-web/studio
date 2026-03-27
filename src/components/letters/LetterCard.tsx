'use client';

import { useState, useTransition } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Pin, PinOff, Trash2, MailOpen, Mail, ChevronRight, Send, Sparkles, BookOpen } from 'lucide-react';
import type { Letter as LetterType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { getMagicLetterDraft } from '@/app/actions/aiActions';

export default function LetterCard({ letter, isAuthorView, isOnline }: { letter: LetterType, isAuthorView: boolean, isOnline: boolean }) {
  const { user, addNotification } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [authorResponse, setAuthorResponse] = useState(letter.authorResponse || '');
  const [isResponding, setIsResponding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isDrafting, startDraftTransition] = useTransition();

  const handleMarkAsRead = async () => {
    if (isAuthorView && !letter.isReadByAuthor) {
      const letterRef = doc(db, 'letters', letter.id);
      updateDoc(letterRef, { isReadByAuthor: true }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: letterRef.path,
              operation: 'update',
              requestResourceData: { isReadByAuthor: true },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      });
    }
  };

  const handleTogglePin = async () => {
    setIsProcessing(true);
    const letterRef = doc(db, 'letters', letter.id);
    const newPinStatus = !letter.isPinned;
    updateDoc(letterRef, { isPinned: newPinStatus })
        .then(() => toast({ title: `Letter ${newPinStatus ? 'pinned' : 'unpinned'}!` }))
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: letterRef.path,
                operation: 'update',
                requestResourceData: { isPinned: newPinStatus },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsProcessing(false);
            setIsDialogOpen(false);
        });
  };
  
  const handleMagicDraft = () => {
    startDraftTransition(async () => {
        const result = await getMagicLetterDraft({
            context: `Author responding to a reader's letter about the story "${letter.storyTitle}".`,
            sender_type: 'author',
            recipient_name: letter.reader.displayName || letter.reader.username,
            original_letter: letter.content,
            tone: 'appreciative and warm'
        });
        if ('error' in result) {
            toast({ title: 'AI Error', description: result.error, variant: 'destructive'});
        } else {
            setAuthorResponse(result.draft);
        }
    });
  };

  const handleSendResponse = async () => {
    if (!authorResponse.trim()) return;
    setIsResponding(true);
    const letterRef = doc(db, 'letters', letter.id);
    updateDoc(letterRef, { authorResponse })
        .then(() => {
            if (user && user.id === letter.authorId) {
                addNotification({
                  userId: letter.reader.id,
                  type: 'letter_response',
                  message: `${letter.author.displayName || letter.author.username} has responded to your letter about "${letter.storyTitle}".`,
                  link: `/letters`,
                  actor: letter.author
                });
            }
            toast({ title: "Response sent!" });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: letterRef.path,
                operation: 'update',
                requestResourceData: { authorResponse },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsResponding(false);
            setIsDialogOpen(false);
        });
  };

  const handleDeleteLetter = async () => {
    if (!user) return;
    setIsProcessing(true);
    const letterRef = doc(db, 'letters', letter.id);
    deleteDoc(letterRef)
        .then(() => {
            toast({ title: "Letter Deleted" });
            setIsDialogOpen(false);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: letterRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsProcessing(false));
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
            "group relative overflow-hidden rounded-2xl border border-border/40 transition-all cursor-pointer hover:shadow-md hover:border-primary/20",
            isUnread ? "bg-primary/5 shadow-inner" : "bg-card hover:bg-muted/30"
        )}>
            {letter.isPinned && (
                <div className="absolute top-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-bl-xl shadow-sm z-10">
                    <Pin className="h-3 w-3 fill-current" />
                </div>
            )}
            <div className="p-4 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                    <Avatar className="h-14 w-14 border-2 border-background shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <AvatarImage src={displayUser.avatarUrl} alt={displayUser.username} />
                        <AvatarFallback className="bg-muted text-primary font-bold">{displayUser.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm animate-pulse" />
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className={cn("font-bold truncate text-base", isUnread ? "text-primary" : "text-foreground")}>
                            {displayUser.displayName || displayUser.username}
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap ml-2">
                            {letter.timestamp?.toDate ? formatDistanceToNow(letter.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-xs font-bold text-foreground/70 truncate uppercase tracking-tighter">
                            {letter.storyTitle}
                        </p>
                        <span className="w-1 h-1 bg-muted-foreground/30 rounded-full flex-shrink-0" />
                        <p className="text-[10px] font-medium text-muted-foreground truncate">{letter.chapterTitle}</p>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 group-hover:text-foreground/70 transition-colors">
                        {letter.content}
                    </p>
                </div>
                
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-5 w-5 text-primary" />
                </div>
            </div>
            {isUnread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"></div>}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <DialogHeader className="p-8 bg-muted/30 border-b relative">
          <div className="flex items-center gap-5">
             <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                <AvatarImage src={displayUser.avatarUrl} />
                <AvatarFallback className="bg-muted text-primary font-bold text-xl">{displayUser.username.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <DialogTitle className="text-2xl font-headline font-bold">
                    {isAuthorView ? `From: ${displayUser.displayName || displayUser.username}` : `To: ${displayUser.displayName || displayUser.username}`}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-1">
                    <BookOpen className="h-3 w-3" />
                    <span>"{letter.storyTitle}"</span> &bull; {letter.chapterTitle}
                </DialogDescription>
            </div>
          </div>
          <div className="absolute top-8 right-8 opacity-5 pointer-events-none">
            <Mail className="h-24 w-24" />
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] bg-background">
            <div className="p-8 space-y-8">
                <div className="bg-muted/20 p-8 rounded-3xl border border-border/40 relative shadow-inner">
                    <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90 font-serif">{letter.content}</p>
                    <div className="mt-6 pt-6 border-t border-dashed border-border/60 flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Correspondence ID: {letter.id.substring(0,8)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{letter.visibility} Letter</span>
                    </div>
                </div>

                {letter.authorResponse && (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest ml-2">
                            <MailOpen className="h-4 w-4" />
                            <span>Response from the Author</span>
                        </div>
                        <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20 shadow-sm">
                            <p className="whitespace-pre-line text-base leading-relaxed text-foreground/80 italic font-serif">"{letter.authorResponse}"</p>
                        </div>
                    </div>
                )}

                {isAuthorView && !letter.authorResponse && (
                    <div className="space-y-4 pt-4 border-t border-dashed">
                        <div className="flex justify-between items-center px-2">
                            <Label htmlFor="response" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Draft Your Response</Label>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-primary hover:text-primary hover:bg-primary/10 font-bold text-[10px] uppercase tracking-widest"
                                onClick={handleMagicDraft}
                                disabled={isDrafting}
                            >
                                {isDrafting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                AI Magic Response
                            </Button>
                        </div>
                        <Textarea 
                            id="response" 
                            value={authorResponse} 
                            onChange={e => setAuthorResponse(e.target.value)} 
                            placeholder="Write a heartfelt response to this reader..." 
                            rows={6}
                            className="bg-muted/10 focus-visible:ring-primary/20 rounded-2xl border-none shadow-inner text-base font-serif"
                            disabled={isResponding || isDrafting}
                        />
                        <Button onClick={handleSendResponse} disabled={isResponding || isDrafting || !authorResponse.trim()} className="w-full h-14 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/20 text-lg font-bold">
                            {isResponding ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                            Send Response
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-muted/30 border-t flex-row justify-between items-center">
            <div className="flex gap-2">
                {isAuthorView && letter.visibility === 'public' && (
                    <Button variant="ghost" size="sm" onClick={handleTogglePin} disabled={isProcessing} className={cn("rounded-full px-4 h-10 gap-2", letter.isPinned && "text-primary hover:text-primary bg-primary/10")}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : letter.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">{letter.isPinned ? 'Unpin' : 'Pin to Story'}</span>
                    </Button>
                )}
            </div>
            
            <div className="flex gap-2">
                {(!isAuthorView || (isAuthorView && letter.isReadByAuthor)) && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-10 w-10" disabled={isProcessing}>
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Permanently delete this letter?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This interaction will be removed from your mailbox history. This action cannot be reversed.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90 rounded-full px-8" onClick={handleDeleteLetter}>
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
