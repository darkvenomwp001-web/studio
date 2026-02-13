
'use server';

import { db } from '@/lib/firebase-server';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { StatusUpdate } from '@/types';


export async function createStatusUpdate(userId: string, data: Partial<StatusUpdate>): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User is not authenticated.' };
    }
    try {
        const statusData = {
            ...data,
            authorId: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isHidden: false,
        };
        await addDoc(collection(db, 'statusUpdates'), statusData);
        revalidatePath('/'); // Revalidate the feed
        return { success: true };
    } catch(error) {
        console.error('Error creating status update:', error);
        return { success: false, error: 'Could not create status update.' };
    }
}


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
 * Marks a status update as hidden.
 * @param statusId The ID of the status update to hide.
 * @param userId The ID of the user performing the action. Ensures ownership.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function hideStatusUpdate(
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
            return { success: true }; // Already gone
        }

        if (!isOwner(userId, statusSnap.data())) {
             return { success: false, error: 'You do not have permission to hide this status.' };
        }

        await updateDoc(statusRef, { 
            isHidden: true,
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error hiding status:', error);
        return { success: false, error: 'Could not hide status.' };
    }
}

/**
 * Permanently deletes a status update from Firestore.
 * @param statusId The ID of the status update to delete.
 * @param userId The ID of the user performing the action. Ensures ownership.
 * @returns A promise that resolves to an object indicating success or failure.
 */
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
            return { success: true }; // Already gone
        }

        if (!isOwner(userId, statusSnap.data())) {
             return { success: false, error: 'You do not have permission to delete this status.' };
        }

        await deleteDoc(statusRef);
        revalidatePath('/settings/statuses');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting status:', error);
        return { success: false, error: 'Could not permanently delete status.' };
    }
}
