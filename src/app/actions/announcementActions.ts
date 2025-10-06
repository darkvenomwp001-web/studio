
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function updateAnnouncement(
  announcementId: string,
  newContent: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  const announcementRef = doc(db, 'announcements', announcementId);
  try {
    const announcementSnap = await getDoc(announcementRef);
    if (!announcementSnap.exists() || announcementSnap.data().author.id !== userId) {
      return { success: false, error: 'You do not have permission to edit this announcement.' };
    }
    await updateDoc(announcementRef, {
      content: newContent,
      updatedAt: serverTimestamp(), // Optional: to track edits
    });
    revalidatePath(`/profile/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating announcement:", error);
    return { success: false, error: 'Could not update announcement.' };
  }
}

export async function deleteAnnouncement(
  announcementId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  const announcementRef = doc(db, 'announcements', announcementId);
  try {
    const announcementSnap = await getDoc(announcementRef);
    if (!announcementSnap.exists()) {
        return { success: true }; // Already deleted
    }
    if (announcementSnap.data().author.id !== userId) {
      return { success: false, error: 'You do not have permission to delete this announcement.' };
    }
    await deleteDoc(announcementRef);
    revalidatePath(`/profile/${userId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, error: 'Could not delete announcement.' };
  }
}
