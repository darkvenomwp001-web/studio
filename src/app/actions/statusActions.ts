
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// This function is being replaced by the archive flow.
// It's kept here for reference but can be removed later.
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
      return { success: true };
    }

    const statusData = statusSnap.data();
    
    let postAuthorId: string | undefined = undefined;
    if (statusData.authorId) {
        postAuthorId = statusData.authorId;
    } else if (statusData.authorInfo && typeof statusData.authorInfo === 'object' && 'id' in statusData.authorInfo) {
        postAuthorId = (statusData.authorInfo as {id: string}).id;
    } else if (statusData.author && typeof statusData.author === 'object' && 'id' in statusData.author) {
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
    
    // Robust ownership check
    let postAuthorId: string | undefined = undefined;
    if (statusData.authorId) {
        postAuthorId = statusData.authorId;
    } else if (statusData.authorInfo && typeof statusData.authorInfo === 'object' && 'id' in statusData.authorInfo) {
        postAuthorId = (statusData.authorInfo as {id: string}).id;
    }

    if (!postAuthorId || postAuthorId !== userId) {
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
        const statusData = statusSnap.data();
        
        let postAuthorId: string | undefined = undefined;
        if (statusData.authorId) {
            postAuthorId = statusData.authorId;
        } else if (statusData.authorInfo && typeof statusData.authorInfo === 'object' && 'id' in statusData.authorInfo) {
            postAuthorId = (statusData.authorInfo as {id: string}).id;
        }

        if (!postAuthorId || postAuthorId !== userId) {
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
