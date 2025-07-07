
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function removeStatusUpdate(
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
      // It was already removed or never existed, success from the user's perspective
      return { success: true };
    }

    const statusData = statusSnap.data();

    // Ultra-robust ownership check to handle all possible data structures
    let postAuthorId: string | undefined = undefined;
    if (statusData.authorId) { // Check for top-level `authorId`
        postAuthorId = statusData.authorId;
    } else if (statusData.authorInfo && typeof statusData.authorInfo === 'object' && 'id' in statusData.authorInfo) { // Check for `authorInfo.id`
        postAuthorId = (statusData.authorInfo as {id: string}).id;
    } else if (statusData.author && typeof statusData.author === 'object' && 'id' in statusData.author) { // Check for `author.id` (legacy)
        postAuthorId = (statusData.author as {id: string}).id;
    }

    if (!postAuthorId || postAuthorId !== userId) {
      console.error(`Permission denied: User ${userId} tried to remove status ${statusId} owned by ${postAuthorId}. Data:`, statusData);
      return { success: false, error: 'You do not have permission to remove this status.' };
    }
    
    await updateDoc(statusRef, {
        isRemoved: true,
        removedAt: serverTimestamp(),
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error removing status update:', error);
    return { success: false, error: 'Could not remove status.' };
  }
}
