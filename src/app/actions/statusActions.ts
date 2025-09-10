
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Universal ownership check for Status Updates
// This is the single source of truth for ownership verification on the server.
function isOwner(userId: string, statusData: { [key: string]: any }): boolean {
  if (!userId || !statusData) return false;
  // Covers authorInfo summary object: { id: '...', ... }
  if (statusData.authorInfo && typeof statusData.authorInfo === 'object' && statusData.authorInfo.id === userId) return true;
  // Covers top-level authorId string
  if (statusData.authorId === userId) return true;
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

    const statusData = statusSnap.data();
    if (!isOwner(userId, statusData)) {
      return { success: false, error: 'You do not have permission to archive this status.' };
    }
    
    await updateDoc(statusRef, {
        isArchived: true,
        archivedAt: serverTimestamp()
    });
    revalidatePath('/'); 
    revalidatePath('/settings/archive');
    return { success: true };
  } catch (error) {
    console.error('Error archiving status update:', error);
    return { success: false, error: 'Could not archive status.' };
  }
}

export async function trashStatusUpdate(
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

        const statusData = statusSnap.data();
        if (!isOwner(userId, statusData)) {
          return { success: false, error: 'You do not have permission to move this status to trash.' };
        }

        await updateDoc(statusRef, {
            isTrashed: true,
            trashedAt: serverTimestamp()
        });
        revalidatePath('/');
        revalidatePath('/settings/trash');
        return { success: true };
    } catch (error) {
        console.error('Error trashing status update:', error);
        return { success: false, error: 'Could not move status to trash.' };
    }
}

export async function restoreStatusUpdate(
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

        if (!isOwner(userId, statusSnap.data())) {
          return { success: false, error: 'You do not have permission to restore this status.' };
        }

        await updateDoc(statusRef, {
            isTrashed: false,
            trashedAt: null
        });
        revalidatePath('/settings/trash');
        return { success: true };
    } catch (error) {
        console.error('Error restoring status:', error);
        return { success: false, error: 'Could not restore status.' };
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
        
        if (!isOwner(userId, statusSnap.data())) {
          return { success: false, error: 'You do not have permission to delete this status.' };
        }

        await deleteDoc(statusRef);
        revalidatePath('/settings/archive');
        revalidatePath('/settings/trash');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting status:', error);
        return { success: false, error: 'Could not permanently delete status.' };
    }
}
