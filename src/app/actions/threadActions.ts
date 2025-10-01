
'use server';

import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import type { UserSummary } from '@/types';
import { revalidatePath } from 'next/cache';

export async function sendGlobalChatMessage(
  author: UserSummary,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  if (!author || !author.id) {
    return { success: false, error: 'User is not authenticated.' };
  }
  if (content.trim().length === 0) {
    return { success: false, error: 'Message content cannot be empty.' };
  }

  try {
    const messageData = {
      author,
      content,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, 'globalChatMessages'), messageData);
    
    // While this is a real-time chat, revalidating can help in some edge cases
    // if we ever build a non-realtime view of this. It's a good practice.
    revalidatePath('/'); 

    return { success: true };
  } catch (error) {
    console.error('Error sending global chat message:', error);
    return { success: false, error: 'Could not send message. Please try again.' };
  }
}
