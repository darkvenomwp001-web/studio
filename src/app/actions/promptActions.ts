
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import type { UserSummary } from '@/types';
import { revalidatePath } from 'next/cache';

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
      authorId: data.author.id, // Ensure authorId is saved
      createdAt: serverTimestamp(),
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

    const promptData = promptSnap.data();
    if (promptData.authorId !== userId && promptData.author?.id !== userId) {
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

export async function deletePrompt(
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

    const promptData = promptSnap.data();
    if (promptData.authorId !== userId && promptData.author?.id !== userId) {
        return { success: false, error: 'You do not have permission to delete this prompt.' };
    }

    await deleteDoc(promptRef);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return { success: false, error: 'Could not delete prompt.' };
  }
}
