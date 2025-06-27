'use server';

import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function deleteStatusUpdate(
  statusId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'statusUpdates', statusId));
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting status update:', error);
    return { success: false, error: 'Could not delete status.' };
  }
}
