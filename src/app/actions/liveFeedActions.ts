
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { UserSummary } from '@/types';
import { revalidatePath } from 'next/cache';

export async function createLiveFeedPost(
  author: UserSummary,
  content: string
): Promise<{ success: boolean; error?: string }> {
  if (!author) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Post content cannot be empty.' };
  }
  if (content.trim().length > 500) {
    return { success: false, error: 'Post cannot exceed 500 characters.' };
  }

  try {
    await addDoc(collection(db, 'liveFeed'), {
      author,
      authorId: author.id,
      content,
      timestamp: serverTimestamp(),
    });
    revalidatePath('/'); // Revalidate the homepage feed
    return { success: true };
  } catch (error) {
    console.error('Error creating live feed post:', error);
    return { success: false, error: 'Could not create post. Please try again.' };
  }
}

export async function updateLiveFeedPost(
  postId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  if (content.trim().length === 0) {
    return { success: false, error: 'Post content cannot be empty.' };
  }
  if (content.trim().length > 500) {
    return { success: false, error: 'Post cannot exceed 500 characters.' };
  }

  try {
    const postRef = doc(db, 'liveFeed', postId);
    await updateDoc(postRef, {
      content: content.trim(),
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating live feed post:', error);
    return { success: false, error: 'Could not update post.' };
  }
}

export async function deleteLiveFeedPost(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'liveFeed', postId));
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting live feed post:', error);
    return { success: false, error: 'Could not delete post.' };
  }
}
