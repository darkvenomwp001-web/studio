
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserNote, deleteUserNote } from '@/app/actions/noteActions';
import Link from 'next/link';

// Component for a single bubble
function NoteBubble({ user }: { user: User }) {
  const [showNote, setShowNote] = useState(false);
  const hasActiveNote = user.note && user.note.expiresAt.toDate() > new Date();

  return (
    <Link href={`/profile/${user.id}`} passHref>
      <div 
        className="relative text-center flex-shrink-0 w-20 cursor-pointer group"
        onMouseEnter={() => hasActiveNote && setShowNote(true)}
        onMouseLeave={() => setShowNote(false)}
      >
        <div className="w-16 h-16 p-0.5 rounded-full bg-gradient-to-tr from-muted to-border mx-auto group-hover:from-primary group-hover:to-accent transition-all">
          <Avatar className="w-full h-full border-2 border-background">
            <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
            <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <p className="text-xs mt-1 truncate">{user.displayName || user.username}</p>
        
        {hasActiveNote && showNote && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] bg-card text-card-foreground p-2 rounded-lg shadow-lg text-sm z-10 animate-in fade-in-50">
            {user.note?.content}
          </div>
        )}
        {hasActiveNote && (
            <div className="absolute top-[-5px] right-1 bg-card rounded-full p-1 border-2 border-background shadow-md">
                <MessageSquare className="h-3 w-3 text-primary" />
            </div>
        )}
      </div>
    </Link>
  );
}


// Main component for the row of bubbles
export default function NotesBubbles() {
  const { user, loading: authLoading } = useAuth();
  const [followedUsersWithNotes, setFollowedUsersWithNotes] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.followingIds || user.followingIds.length === 0) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    // Firestore 'in' queries are limited to 30 items
    const usersToFetch = user.followingIds.slice(0, 30); 
    
    const q = query(
      collection(db, 'users'),
      where('__name__', 'in', usersToFetch)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => u.note && u.note.expiresAt.toDate() > new Date());
      
      setFollowedUsersWithNotes(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching followed users for notes:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.followingIds]);

  const handleOpenNoteDialog = () => {
      if (!user) return;
      setNoteContent(user.note?.content || '');
      setIsNoteDialogOpen(true);
  }
  
  const handleUpdateNote = async () => {
    setIsSubmitting(true);
    const result = await updateUserNote(noteContent);
    if(result.success) {
        toast({ title: 'Note Updated!', description: 'Your note is now visible for 24 hours.' });
        setIsNoteDialogOpen(false);
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  }

  const handleDeleteNote = async () => {
    setIsSubmitting(true);
    const result = await deleteUserNote();
     if(result.success) {
        toast({ title: 'Note Removed' });
        setIsNoteDialogOpen(false);
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  }

  if (authLoading) {
    return <div className="h-[98px] w-full bg-card rounded-lg animate-pulse" />;
  }

  if (!user) {
    return null;
  }

  const hasOwnActiveNote = user.note && user.note.expiresAt.toDate() > new Date();

  return (
    <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <div className="bg-card p-3 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
            {/* Add/Edit Note Bubble */}
            <div className="text-center flex-shrink-0 w-20">
                <button 
                    onClick={handleOpenNoteDialog} 
                    className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors relative group"
                >
                    {hasOwnActiveNote ? (
                        <Avatar className="h-full w-full">
                            <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
                            <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ) : (
                         <Plus className="h-6 w-6 text-primary" />
                    )}
                </button>
                <p className="text-xs mt-1 truncate">Your Note</p>
            </div>

            {/* Followed Users' Bubbles */}
            {isLoading ? (
                [...Array(4)].map((_, i) => <div key={i} className="h-24 w-16 bg-muted rounded-lg animate-pulse flex-shrink-0" />)
            ) : (
                followedUsersWithNotes.map((followedUser) => (
                    <NoteBubble key={followedUser.id} user={followedUser} />
                ))
            )}
        </div>
        </div>

        <DialogContent>
            <DialogHeader>
                <DialogTitle>{hasOwnActiveNote ? 'Edit your note' : 'Add a note'}</DialogTitle>
                <DialogDescription>Share a short note with your followers. It will disappear after 24 hours.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Input 
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder='What’s on your mind?'
                    maxLength={90}
                    disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground text-right">{noteContent.length} / 90</p>
            </div>
            <DialogFooter className="justify-between sm:justify-between w-full">
                 {hasOwnActiveNote ? (
                    <Button variant="destructive" onClick={handleDeleteNote} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete Note
                    </Button>
                 ) : <div></div>}
                 <div className="flex gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isSubmitting}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleUpdateNote} disabled={isSubmitting || noteContent.trim().length === 0}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Share
                    </Button>
                 </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
