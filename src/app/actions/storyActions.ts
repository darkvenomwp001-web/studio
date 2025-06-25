
'use server';

import { db } from '@/lib/firebase';
import { UserSummary } from '@/types';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function createStoryMedia(
  author: UserSummary,
  mediaUrl: string,
  mediaType: 'image' | 'video'
): Promise<{ success: boolean; error?: string }> {
  if (!author || !author.id) {
    return { success: false, error: 'You must be logged in to post a story.' };
  }
  if (!mediaUrl) {
    return { success: false, error: 'Media URL is missing.' };
  }

  const sanitizedAuthor: UserSummary = {
      id: author.id,
      username: author.username,
      displayName: author.displayName || author.username,
      avatarUrl: author.avatarUrl || '',
  }

  const newStoryMedia = {
    userId: author.id,
    author: sanitizedAuthor,
    mediaUrl,
    mediaType,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  };

  try {
    await addDoc(collection(db, 'storyMedia'), newStoryMedia);
    revalidatePath('/'); // Revalidate the homepage to show the new story bubble
    return { success: true };
  } catch (error) {
    console.error('Error creating story media:', error);
    return { success: false, error: 'Could not post your story. Please try again.' };
  }
}
