'use server';

import { db } from '@/lib/firebase-server';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Permanently deletes a letter from Firestore.
 * Ensures that only the original sender can delete the letter.
 * @param letterId The ID of the letter to delete.
 * @param userId The ID of the user attempting the deletion.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function deleteLetter(
  letterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User is not authenticated.' };
  }

  const letterRef = doc(db, 'letters', letterId);

  try {
    const letterSnap = await getDoc(letterRef);

    if (!letterSnap.exists()) {
      // If the letter is already gone, it's a success from the user's perspective.
      return { success: true };
    }

    const letterData = letterSnap.data();

    // Security Check: Only the person who sent the letter (the reader) can delete it.
    if (letterData.reader?.id !== userId) {
      return { success: false, error: 'You do not have permission to delete this letter.' };
    }

    await deleteDoc(letterRef);

    revalidatePath('/letters');

    return { success: true };
  } catch (error) {
    console.error('Error deleting letter:', error);
    return { success: false, error: 'Could not delete the letter. Please try again.' };
  }
}
