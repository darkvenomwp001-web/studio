
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
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

/**
 * Moves a published status back to drafts.
 * @param statusId The ID of the status update.
 * @param userId The ID of the user performing the action.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function moveStatusToDrafts(
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
      return { success: false, error: 'You do not have permission to edit this status.' };
    }

    if (statusData.status !== 'published') {
      return { success: false, error: 'Only published statuses can be moved to drafts.' };
    }

    await updateDoc(statusRef, {
      status: 'draft',
      expiresAt: null, // Drafts don't expire
      updatedAt: serverTimestamp()
    });

    revalidatePath('/'); // Revalidate home page feed
    return { success: true };
  } catch (error) {
    console.error('Error moving status to drafts:', error);
    return { success: false, error: 'Could not move status to drafts.' };
  }
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
        isTrashed: false, // Explicitly set isTrashed to false
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
        revalidatePath('/settings/archive');
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
            trashedAt: null,
            // Also reset expiry and archived status on restore
            expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
            isArchived: false, 
            archivedAt: null
        });
        revalidatePath('/settings/trash');
        revalidatePath('/settings/archive');
        revalidatePath('/');
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
        
        const statusData = statusSnap.data();
        if (!isOwner(userId, statusData)) {
          return { success: false, error: 'You do not have permission to delete this status.' };
        }

        await deleteDoc(statusRef);
        revalidatePath('/'); // Revalidate home page feed
        revalidatePath('/settings/archive');
        revalidatePath('/settings/trash');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting status:', error);
        return { success: false, error: 'Could not permanently delete status.' };
    }
}
