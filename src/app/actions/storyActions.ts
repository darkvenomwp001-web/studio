
'use server';

import { db } from '@/lib/firebase';
import type { UserSummary, UserStory } from '@/types';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function createUserStory(
    author: UserSummary, 
    content: string, 
    backgroundColor: string
): Promise<{ success: boolean; error?: string }> {
  if (!author || !author.id) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Story content cannot be empty.' };
  }
  if (content.length > 280) { // Limit story length
    return { success: false, error: 'Story content cannot exceed 280 characters.' };
  }

  // Sanitize the author object to remove undefined fields before saving to Firestore.
  const authorForFirestore: UserSummary = {
    id: author.id,
    username: author.username,
  };
  if (author.displayName) {
    authorForFirestore.displayName = author.displayName;
  }
  if (author.avatarUrl) {
    authorForFirestore.avatarUrl = author.avatarUrl;
  }

  const newStory: Omit<UserStory, 'id' | 'createdAt' | 'expiresAt'> & { createdAt: any, expiresAt: any } = {
    author: authorForFirestore,
    type: 'text',
    content: content.trim(),
    backgroundColor,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours from now
  };

  try {
    await addDoc(collection(db, 'userStories'), newStory);
    revalidatePath('/'); // Revalidate homepage to show the new story
    return { success: true };
  } catch (error) {
    console.error('Error creating user story:', error);
    return { success: false, error: 'Could not create the story. Please try again.' };
  }
}
