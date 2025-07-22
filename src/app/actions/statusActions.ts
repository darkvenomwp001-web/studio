
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Helper function for robust ownership check
function isStatusOwner(userId: string, postData: { [key: string]: any }): boolean {
  if (!userId || !postData) return false;
  // Check for authorId at the top level
  if (postData.authorId === userId) return true;
  // Check for author object with an id property
  if (postData.author && typeof postData.author === 'object' && postData.author.id === userId) return true;
  // Check for authorInfo object with an id property
  if (postData.authorInfo && typeof postData.authorInfo === 'object' && postData.authorInfo.id === userId) return true;
  return false;
}

export async function archiveStatusUpdate(
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
      return { success: false, error: 'Status not found.' };
    }

    if (!isStatusOwner(userId, statusSnap.data())) {
        return { success: false, error: 'You do not have permission to archive this status.' };
    }

    await updateDoc(statusRef, {
        isArchived: true,
        archivedAt: serverTimestamp()
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error archiving status update:', error);
    return { success: false, error: 'Could not archive status.' };
  }
}


export async function permanentlyDeleteStatusUpdate(
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
            return { success: true, error: 'Status already deleted.' };
        }
        
        if (!isStatusOwner(userId, statusSnap.data())) {
            return { success: false, error: 'You do not have permission to delete this status.' };
        }

        await deleteDoc(statusRef);
        revalidatePath('/settings/archive');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting status:', error);
        return { success: false, error: 'Could not permanently delete status.' };
    }
}
