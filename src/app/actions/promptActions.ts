
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { UserSummary } from '@/types';
import { revalidatePath } from 'next/cache';

// Universal ownership check for Prompts
function isOwner(userId: string, promptData: { [key: string]: any }): boolean {
  if (!userId || !promptData) return false;
  // Covers author summary object
  if (promptData.author && typeof promptData.author === 'object' && promptData.author.id === userId) return true;
  // Covers top-level authorId
  if (promptData.authorId === userId) return true;
  return false;
}

export async function createPrompt(data: {
  title: string;
  prompt: string;
  genre: string;
  author: UserSummary;
}): Promise<{ success: boolean; error?: string }> {
  if (!data.author) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (!data.title.trim() || !data.prompt.trim() || !data.genre.trim()) {
    return { success: false, error: 'All prompt fields are required.' };
  }

  try {
    await addDoc(collection(db, 'prompts'), {
      ...data,
      authorId: data.author.id, // Ensure consistent authorId
      createdAt: serverTimestamp(),
      isArchived: false,
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating prompt:', error);
    return { success: false, error: 'Could not create prompt.' };
  }
}

export async function updatePrompt(
  promptId: string,
  data: { title: string; prompt: string; genre: string },
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!data.title.trim() || !data.prompt.trim() || !data.genre.trim()) {
    return { success: false, error: 'All prompt fields are required.' };
  }
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const promptRef = doc(db, 'prompts', promptId);
    const promptSnap = await getDoc(promptRef);
    if (!promptSnap.exists()) {
        return { success: false, error: 'Prompt not found.' };
    }

    if (!isOwner(userId, promptSnap.data())) {
        return { success: false, error: 'You do not have permission to edit this prompt.' };
    }

    await updateDoc(promptRef, data);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating prompt:', error);
    return { success: false, error: 'Could not update prompt.' };
  }
}

export async function archivePrompt(
  promptId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  try {
    const promptRef = doc(db, 'prompts', promptId);
    const promptSnap = await getDoc(promptRef);
    if (!promptSnap.exists()) {
        return { success: false, error: 'Prompt not found.' };
    }

    if (!isOwner(userId, promptSnap.data())) {
        return { success: false, error: 'You do not have permission to archive this prompt.' };
    }

    await updateDoc(promptRef, {
      isArchived: true,
      archivedAt: serverTimestamp(),
    });
    revalidatePath('/');
    revalidatePath('/settings/archive');
    return { success: true };
  } catch (error) {
    console.error('Error archiving prompt:', error);
    return { success: false, error: 'Could not archive prompt.' };
  }
}

export async function permanentlyDeletePrompt(
  promptId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    try {
        const promptRef = doc(db, 'prompts', promptId);
        const promptSnap = await getDoc(promptRef);
        if (!promptSnap.exists()) {
            return { success: true, error: 'Prompt already deleted.' };
        }
        
        if (!isOwner(userId, promptSnap.data())) {
            return { success: false, error: 'You do not have permission to delete this prompt.' };
        }

        await deleteDoc(promptRef);
        revalidatePath('/settings/archive');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting prompt:', error);
        return { success: false, error: 'Could not permanently delete prompt.' };
    }
}
