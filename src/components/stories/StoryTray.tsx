
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateNoteDialog from './CreateStoryDialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, where } from 'firebase/firestore';
import type { UserNote } from '@/types';
import { cn } from '@/lib/utils';

interface NoteWithAuthor extends UserNote {
  // The 'author' field is already part of UserNote, but this makes it explicit.
}

export default function NoteTray() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [notes, setNotes] = useState<NoteWithAuthor[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // This query fetches non-expired notes and orders them.
    // It requires a composite index in Firestore.
    const q = query(
        collection(db, 'userNotes'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NoteWithAuthor));
        setNotes(fetchedNotes);
    }, (error) => {
        console.error("Error fetching notes for tray:", error);
        if (error.code === 'failed-precondition') {
             toast({
                title: "Database Index Required",
                description: "The Notes feature needs a database index. Check the browser console for a link to create it in Firebase.",
                variant: "destructive",
                duration: 10000,
            });
        }
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleAddNoteClick = () => {
    if (user) {
      setIsCreateDialogOpen(true);
    } else {
      toast({
        title: "Please Sign In",
        description: "You need to be logged in to post a note.",
        variant: "destructive"
      });
    }
  };

  const authorsWithNotes = notes.reduce((acc, note) => {
      // Group notes by author, keeping only the most recent note per author
      if (!acc[note.authorId] || note.createdAt.toMillis() > acc[note.authorId].createdAt.toMillis()) {
          acc[note.authorId] = note;
      }
      return acc;
  }, {} as Record<string, NoteWithAuthor>);
  
  const uniqueAuthorNotes = Object.values(authorsWithNotes);

  return (
    <>
      <div className="w-full border-b pb-3">
        <div className="flex overflow-x-auto space-x-4 py-2 px-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
          <div
            onClick={handleAddNoteClick}
            className="text-center w-16 flex-shrink-0 cursor-pointer"
            aria-label="Add a new note"
          >
            <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-primary">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium truncate">Add Note</span>
            </div>
          </div>
          
          {uniqueAuthorNotes.map((note) => (
            <div 
              key={note.authorId}
              className="flex-shrink-0 w-16 text-center group relative cursor-pointer"
              aria-label={`View ${note.author.displayName || note.author.username}'s note`}
              onClick={user?.id === note.authorId ? handleAddNoteClick : undefined}
            >
              <div className={cn(
                  "absolute -top-6 left-1/2 -translate-x-1/2 z-10 w-auto max-w-[120px] bg-card text-card-foreground p-2 rounded-lg shadow-lg text-xs",
                  "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" // Show on hover for non-own notes
              )}>
                 {note.content}
                 <div className="absolute bottom-0 left-1/2 w-0 h-0 -translate-x-1/2 translate-y-1/2 border-x-8 border-x-transparent border-t-8 border-t-card"></div>
              </div>
              <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-primary/70 to-accent/70 group-hover:scale-105 transition-transform">
                <div className="bg-background p-0.5 rounded-full h-full w-full">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={note.author.avatarUrl} alt={note.author.username} data-ai-hint={'profile person'} />
                    <AvatarFallback>{(note.author.displayName || note.author.username).substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground truncate mt-1 group-hover:text-primary">{note.author.displayName || note.author.username}</p>
            </div>
          ))}
        </div>
      </div>

      <CreateNoteDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </>
  );
}
