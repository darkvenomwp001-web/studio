
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

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

    await updateDoc(statusRef, {
        isArchived: true,
        archivedAt: serverTimestamp()
    });
    revalidatePath('/'); // Revalidate the feed to remove the status bubble if needed
    revalidatePath('/settings/archive'); // Revalidate the archive page
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
        
        await deleteDoc(statusRef);
        revalidatePath('/settings/archive');
        revalidatePath('/settings/trash');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting status:', error);
        return { success: false, error: 'Could not permanently delete status.' };
    }
}
