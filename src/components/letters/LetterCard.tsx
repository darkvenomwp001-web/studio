'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Pin, PinOff, Trash2, MailOpen, Mail, ChevronRight, Send, BookOpen, Quote, X } from 'lucide-react';
import type { Letter as LetterType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function LetterCard({ letter, isAuthorView, isOnline }: { letter: LetterType, isAuthorView: boolean, isOnline: boolean }) {
  const { user, addNotification } = useAuth();
  const { showIsland } = useDynamicIsland();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [authorResponse, setAuthorResponse] = useState(letter.authorResponse || '');
  const [isResponding, setIsResponding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
        .then(() => showIsland({ title: newPinStatus ? "Letter pinned" : "Letter unpinned", type: 'success' }))
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
            showIsland({ title: "Response sent", type: 'success' });
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
            showIsland({ title: "Letter deleted", type: 'success' });
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
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-3xl border-none shadow-2xl mx-auto w-[95vw] sm:w-full animate-in fade-in zoom-in-95 duration-500">
        <DialogHeader className="p-5 md:p-8 bg-muted/30 border-b relative">
          <div className="flex items-center gap-4 md:gap-5">
             <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-background shadow-md flex-shrink-0">
                <AvatarImage src={displayUser.avatarUrl} />
                <AvatarFallback className="bg-muted text-primary font-bold text-xl">{displayUser.username.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <DialogTitle className="text-xl md:text-2xl font-headline font-bold truncate">
                    {isAuthorView ? `From: ${displayUser.displayName || displayUser.username}` : `To: ${displayUser.displayName || displayUser.username}`}
                </DialogTitle>
                <DialogDescription className="text-xs md:sm font-medium text-muted-foreground flex items-center gap-2 mt-1 truncate">
                    <BookOpen className="h-3 w-3 shrink-0" />
                    <span className="truncate">"{letter.storyTitle}"</span> &bull; <span className="truncate">{letter.chapterTitle}</span>
                </DialogDescription>
            </div>
          </div>
          <div className="absolute top-8 right-8 opacity-[0.03] pointer-events-none hidden md:block">
            <Mail className="h-24 w-24" />
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] bg-background">
            <div className="p-5 md:p-8 space-y-6 md:space-y-8">
                <div className="bg-muted/10 p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-border/40 relative shadow-inner group">
                    <Quote className="absolute top-4 right-6 h-10 w-10 text-primary/5 -scale-x-100" />
                    <p className="whitespace-pre-line text-sm md:text-base leading-relaxed text-foreground/90 font-serif relative z-10">{letter.content}</p>
                </div>

                {letter.authorResponse && (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em] ml-2">
                            <MailOpen className="h-3.5 w-3.5" />
                            <span>Response</span>
                        </div>
                        <div className="bg-primary/5 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-primary/20 shadow-sm relative">
                             <Quote className="absolute top-4 right-6 h-10 w-10 text-primary/10 -scale-x-100" />
                            <p className="whitespace-pre-line text-sm md:text-base leading-relaxed text-foreground/80 italic font-serif relative z-10">"{letter.authorResponse}"</p>
                        </div>
                    </div>
                )}

                {isAuthorView && !letter.authorResponse && (
                    <div className="space-y-4 pt-4 border-t border-dashed border-border/40 animate-in fade-in duration-700">
                        <div className="px-1">
                            <Label htmlFor="response" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Your Response</Label>
                        </div>
                        <Textarea 
                            id="response" 
                            value={authorResponse} 
                            onChange={e => setAuthorResponse(e.target.value)} 
                            placeholder="Write back to your reader..." 
                            rows={5}
                            className="bg-muted/20 focus-visible:ring-primary/20 rounded-2xl border-none shadow-inner text-sm md:text-base font-serif p-4"
                            disabled={isResponding}
                        />
                        <Button onClick={handleSendResponse} disabled={isResponding || !authorResponse.trim()} className="w-full h-14 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/20 text-base font-bold uppercase tracking-widest">
                            {isResponding ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Response
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="p-4 md:p-6 bg-muted/30 border-t flex-row justify-between items-center gap-2">
            <div className="flex gap-2">
                {isAuthorView && (
                    <Button variant="ghost" size="sm" onClick={handleTogglePin} disabled={isProcessing} className={cn("rounded-full px-4 h-10 gap-2 border border-border/40 font-bold text-[10px] uppercase tracking-widest transition-all", letter.isPinned && "text-primary hover:text-primary bg-primary/10 border-primary/20")}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : letter.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                        <span>{letter.isPinned ? 'Unpin' : 'Pin'}</span>
                    </Button>
                )}
            </div>
            
            <div className="flex gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-10 w-10 border border-border/40" disabled={isProcessing}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-none shadow-3xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-headline text-2xl font-bold">Delete letter?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm leading-relaxed">
                                This will permanently remove the letter from your view.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel className="rounded-full px-8 font-bold">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 rounded-full px-8 font-bold" onClick={handleDeleteLetter}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
