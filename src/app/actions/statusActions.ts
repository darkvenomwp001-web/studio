
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Helper function for robust ownership check
function isStatusOwner(userId: string, statusData: { [key: string]: any }): boolean {
  if (!userId || !statusData) return false;
  // Check for authorId at the top level
  if (statusData.authorId === userId) return true;
  // Check for an 'author' object with an 'id' property
  if (statusData.author && typeof statusData.author === 'object' && statusData.author.id === userId) return true;
  // Check for an 'authorInfo' object with an 'id' property
  if (statusData.authorInfo && typeof statusData.authorInfo === 'object' && statusData.authorInfo.id === userId) return true;
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
