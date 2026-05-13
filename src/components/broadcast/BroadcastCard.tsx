
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Broadcast, ReactionType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  MoreHorizontal, 
  Pin, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Clock, 
  Edit3,
  Loader2,
  Send,
  X
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import NextImage from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  increment, 
  onSnapshot, 
  collection, 
  runTransaction 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import ReactionButton from '../threads/ReactionButton';
import ThreadPostComments from '../threads/ThreadPostComments';

export default function BroadcastCard({ broadcast, isOwner }: { broadcast: Broadcast, isOwner: boolean }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(broadcast.content);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleTogglePin = () => {
        const ref = doc(db, 'broadcasts', broadcast.id);
        updateDoc(ref, { isPinned: !broadcast.isPinned })
            .then(() => toast({ title: broadcast.isPinned ? "Unpinned" : "Pinned to top" }));
    };

    const handleDelete = () => {
        setIsDeleting(true);
        const ref = doc(db, 'broadcasts', broadcast.id);
        deleteDoc(ref)
            .then(() => {
                toast({ title: "Broadcast deleted" });
                setIsDeleteDialogOpen(false);
            })
            .finally(() => setIsDeleting(false));
    };

    const handleSaveEdit = () => {
        if (!editedContent.trim() || editedContent === broadcast.content) {
            setIsEditing(false);
            return;
        }
        setIsUpdating(true);
        const ref = doc(db, 'broadcasts', broadcast.id);
        updateDoc(ref, { content: editedContent.trim(), timestamp: serverTimestamp() })
            .then(() => {
                toast({ title: "Broadcast updated" });
                setIsEditing(false);
            })
            .finally(() => setIsUpdating(false));
    };

    const getStatusIcon = (status: Broadcast['status']) => {
        switch(status) {
            case 'live': return <Zap className="h-3 w-3" />;
            case 'fixed': return <CheckCircle className="h-3 w-3" />;
            case 'progress': return <Clock className="h-3 w-3" />;
            default: return <AlertCircle className="h-3 w-3" />;
        }
    };

    return (
        <Dialog>
            <Card className={cn(
                "rounded-[32px] overflow-hidden border-border/40 shadow-sm relative transition-all duration-500 transform-gpu group",
                broadcast.priority === 'high' && "ring-2 ring-primary/20 bg-primary/5",
                broadcast.isPinned && "border-primary/20"
            )}>
                {broadcast.isPinned && (
                    <div className="absolute top-4 right-12 z-10 flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 animate-in fade-in zoom-in-95 duration-500">
                        <Pin className="h-3 w-3 fill-current" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Pinned Log</span>
                    </div>
                )}

                <CardHeader className="p-6 pb-4 flex flex-row items-center gap-4 space-y-0">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                        <AvatarImage src={broadcast.author.avatarUrl} />
                        <AvatarFallback>OW</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">@{broadcast.author.username}</h4>
                            <Badge variant="outline" className="bg-primary text-white border-none text-[8px] uppercase h-4 px-1.5 font-bold">Owner</Badge>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {broadcast.timestamp?.toDate ? formatDistanceToNow(broadcast.timestamp.toDate(), { addSuffix: true }) : 'Sending...'}
                        </p>
                    </div>
                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuItem onClick={handleTogglePin} className="gap-2">
                                    <Pin className="h-4 w-4" /> {broadcast.isPinned ? 'Unpin' : 'Pin to top'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                                    <Edit3 className="h-4 w-4" /> Edit Transmission
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2" onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }}>
                                    <Trash2 className="h-4 w-4" /> Delete Log
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-6">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-lg h-7 gap-1.5 px-3 font-bold text-[10px] uppercase tracking-wider bg-muted/40 text-muted-foreground border border-border/40">
                            {broadcast.category}
                        </Badge>
                        <Badge className={cn(
                            "rounded-lg h-7 gap-1.5 px-3 font-bold text-[10px] uppercase tracking-wider border-none",
                            broadcast.status === 'live' ? "bg-green-500 text-white animate-pulse" : 
                            broadcast.status === 'fixed' ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                        )}>
                            {getStatusIcon(broadcast.status)}
                            {broadcast.status}
                        </Badge>
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            <Textarea 
                                value={editedContent}
                                onChange={e => setEditedContent(e.target.value)}
                                className="min-h-[120px] bg-muted/20 border-none shadow-inner rounded-2xl resize-none font-medium"
                                disabled={isUpdating}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isUpdating}>Cancel</Button>
                                <Button size="sm" onClick={handleSaveEdit} disabled={isUpdating || !editedContent.trim()}>
                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className={cn(
                            "text-base md:text-lg font-medium leading-relaxed text-foreground/90 whitespace-pre-line",
                            broadcast.priority === 'high' && "font-bold"
                        )}>
                            {broadcast.content}
                        </p>
                    )}

                    {broadcast.imageUrl && (
                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-border/20 shadow-2xl group/img">
                            <NextImage src={broadcast.imageUrl} alt="Transmission Visual" fill className="object-cover transition-transform duration-700 group-hover/img:scale-105" />
                        </div>
                    )}
                </CardContent>

                <CardFooter className="p-4 bg-muted/10 border-t border-border/40 flex items-center justify-between">
                    <ReactionButton postId={broadcast.id} parentCollection="broadcasts" initialReactionsCount={broadcast.reactionsCount || 0} reactionCounts={broadcast.reactionCounts} />
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 px-4 gap-2 rounded-full font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
                            <MessageSquare className="h-4 w-4" />
                            <span>Discuss Update</span>
                            <Badge variant="ghost" className="h-5 px-1.5 min-w-5 font-bold">{broadcast.commentsCount || 0}</Badge>
                        </Button>
                    </DialogTrigger>
                </CardFooter>
            </Card>

            <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-3xl rounded-[32px]">
                <DialogHeader className="p-6 bg-muted/30 border-b">
                    <DialogTitle className="text-xl font-headline font-bold">Log Discussion</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Transmission Feedback Channel</DialogDescription>
                </DialogHeader>
                <div className="p-6">
                    <ThreadPostComments postId={broadcast.id} />
                </div>
            </DialogContent>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-headline font-bold">Delete Transmission?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently erase this log from the Broadcast Hub. Action is irreversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-full px-8 font-bold" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                            Erase Log
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
