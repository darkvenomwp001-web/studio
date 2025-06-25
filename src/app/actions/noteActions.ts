'use server';

import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const NOTE_MAX_LENGTH = 90;

export async function updateUserNote(
  content: string
): Promise<{ success: boolean; error?: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: 'You must be logged in to add a note.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Note cannot be empty.' };
  }
  if (content.length > NOTE_MAX_LENGTH) {
    return { success: false, error: `Note cannot exceed ${NOTE_MAX_LENGTH} characters.` };
  }

  const userRef = doc(db, 'users', user.uid);
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const noteData = {
    content: content.trim(),
    expiresAt,
  };

  try {
    await updateDoc(userRef, { note: noteData });
    revalidatePath('/');
    revalidatePath(`/profile/${user.uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating user note:', error);
    return { success: false, error: 'Could not update your note. Please try again.' };
  }
}

export async function deleteUserNote(): Promise<{ success: boolean; error?: string }> {
    const user = auth.currentUser;
    if (!user) {
        return { success: false, error: 'You must be logged in.' };
    }

    const userRef = doc(db, 'users', user.uid);

    try {
        await updateDoc(userRef, { note: null });
        revalidatePath('/');
        revalidatePath(`/profile/${user.uid}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting user note:', error);
        return { success: false, error: 'Could not delete your note. Please try again.' };
    }
}
