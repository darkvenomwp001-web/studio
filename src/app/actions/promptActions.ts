
'use server';

import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
      createdAt: serverTimestamp(),
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating prompt:', error);
    return { success: false, error: 'Could not create prompt.' };
  }
}
