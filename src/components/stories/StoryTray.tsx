'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateNoteDialog from './CreateStoryDialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, where } from 'firebase/firestore';
import type { UserNote } from '@/types';

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
    // It requires a composite index in Firestore. If it fails, Firebase will provide a link in the console to create it.
    const q = query(
        collection(db, 'userNotes'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NoteWithAuthor));
        
        // Filter notes based on visibility rules on the client
        const filteredNotes = fetchedNotes.filter(note => {
            if (note.visibility === 'public') {
                return true;
            }
            if (user && note.visibility === 'followers') {
                // Show if it's the current user's own note OR they follow the author
                return note.authorId === user.id || user.followingIds?.includes(note.authorId);
            }
            // If user is not logged in, they only see public notes (covered by the first check)
            return false;
        });

        setNotes(filteredNotes);
    }, (error) => {
        console.error("Error fetching notes for tray:", error);
        if (error.code === 'failed-precondition') {
             toast({
                title: "Database Index Required",
                description: "The Notes feature needs a database index. Check the browser console for a link to create it in Firebase.",
                variant: "destructive",
                duration: 10000,
            });
        } else if (error.code === 'permission-denied') {
             // This might still happen for logged-out users if rules are strict.
            // The rules should be public read for this to work for everyone.
            console.log("Permission error likely due to Firestore rules. Notes might not appear for logged-out users.");
        }
    });

    return () => unsubscribe();
  }, [toast, user]);
  
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
  
  // Filter out any notes that don't have a valid server timestamp yet to prevent crashes
  const validNotes = notes.filter(note => note.createdAt && typeof note.createdAt.toMillis === 'function');
  
  const authorsWithNotes = validNotes.reduce((acc, note) => {
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
            className="flex-shrink-0 w-24 h-32 bg-muted/50 rounded-lg p-2 flex flex-col items-center justify-center text-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer border-2 border-dashed border-border"
            aria-label="Add a new note"
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-xs font-medium">Add Note</span>
          </div>
          
          {uniqueAuthorNotes.map((note) => (
            <div
              key={note.authorId}
              className="relative flex-shrink-0 w-24 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg shadow-sm p-2 flex flex-col justify-between group cursor-pointer overflow-hidden"
              aria-label={`View ${note.author.displayName || note.author.username}'s note`}
            >
              <Avatar className="absolute top-1.5 left-1.5 h-7 w-7 border-2 border-background shadow-sm">
                <AvatarImage src={note.author.avatarUrl} alt={note.author.username} data-ai-hint="profile person" />
                <AvatarFallback>{(note.author.displayName || note.author.username).substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-end">
                <p className="text-xs font-medium text-foreground line-clamp-4 leading-snug">
                  {note.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateNoteDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </>
  );
}
