
'use server';

import { db } from '@/lib/firebase';
import type { UserSummary } from '@/types';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function createUserNote(
    author: UserSummary, 
    content: string, 
    visibility: 'public' | 'followers'
): Promise<{ success: boolean; error?: string }> {
  if (!author || !author.id) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Note content cannot be empty.' };
  }
  if (content.length > 60) {
    return { success: false, error: 'Note content cannot exceed 60 characters.' };
  }

  const authorForFirestore: UserSummary = {
    id: author.id,
    username: author.username,
  };
  if (author.displayName) {
    authorForFirestore.displayName = author.displayName;
  }
  if (author.avatarUrl) {
    authorForFirestore.avatarUrl = author.avatarUrl;
  }

  const newNote = {
    authorId: author.id,
    author: authorForFirestore,
    content: content.trim(),
    visibility,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours from now
  };

  try {
    await addDoc(collection(db, 'userNotes'), newNote);
    revalidatePath('/'); // Revalidate homepage to show the new note
    return { success: true };
  } catch (error) {
    console.error('Error creating user note:', error);
    return { success: false, error: 'Could not create the note. Please try again.' };
  }
}
