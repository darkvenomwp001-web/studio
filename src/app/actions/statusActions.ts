
'use server';

import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function deleteStatusUpdate(
  statusId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  try {
    const statusRef = doc(db, 'statusUpdates', statusId);
    const statusSnap = await getDoc(statusRef);

    if (!statusSnap.exists()) {
      // It was already deleted, which is a success from the user's perspective
      return { success: true };
    }

    const statusData = statusSnap.data();
    if (statusData.authorId !== userId && statusData.authorInfo?.id !== userId) {
        return { success: false, error: 'You do not have permission to delete this status.' };
    }

    await deleteDoc(statusRef);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting status update:', error);
    return { success: false, error: 'Could not delete status.' };
  }
}
